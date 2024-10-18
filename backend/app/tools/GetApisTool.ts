import { StructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import fs from 'fs';
import { DatasetSchema, GraphState } from '../types.js';
import { TRIMMED_CORPUS_PATH } from '../constants.js';
import { logger } from '../logger.js';

export class GetApisTool extends StructuredTool {
  name = 'get_apis';
  description = 'Fetch APIs that match the given categories in the state.';

  schema = z.object({
    state: z.object({
      categories: z.array(z.string()).nonempty("Categories cannot be empty").describe("Categories extracted from the query"),
      // Include other essential fields from GraphState as required
      error: z.boolean().optional(),
      message: z.string().optional(),
      query: z.string().optional(),
      queryType: z.string().optional(),
      apis: z.array(z.any()).optional(),
      params: z.record(z.any()).optional(),
      response: z.any().optional(),
      bestApi: z.any().nullable().optional(),
      isEntityQuery: z.boolean().optional(),
      entityType: z.enum(['user', 'track', 'playlist']).nullable().optional(),
      complexity: z.string().optional(),
      // ... include other necessary fields from GraphState
    }),
  });

  async _call({ state }: z.infer<typeof this.schema>): Promise<GraphState> {
    let { categories } = state;
    logger.debug(`GetApisTool called with categories: ${JSON.stringify(categories)}`);

    // Remove duplicates from categories
    categories = categories ? [...new Set(categories)] : [];
    logger.debug(`Unique categories: ${JSON.stringify(categories)}`);

    try {
      logger.debug(`Reading data from TRIMMED_CORPUS_PATH: ${TRIMMED_CORPUS_PATH}`);
      const allData: { endpoints: DatasetSchema[] } = JSON.parse(
        await fs.promises.readFile(TRIMMED_CORPUS_PATH, 'utf-8')
      );
      logger.debug(`Data read successfully. Total endpoints: ${allData.endpoints.length}`);
      
      let apis: DatasetSchema[];

      if (categories.length === 0) {
        logger.warn('No categories provided, returning all APIs');
        apis = allData.endpoints;
      } else {
        const categorySet = new Set(categories.map((cat: string) => cat.toLowerCase()));
        apis = allData.endpoints.filter(api => {
          const apiCategories = api.category_name.split(',').map((cat: string) => cat.trim().toLowerCase());
          return apiCategories.some((cat: string) => categorySet.has(cat));
        });
      }

      logger.info(`Found ${apis.length} APIs matching the categories: ${categories.join(', ')}`);
      logger.debug(`APIs found: ${JSON.stringify(apis)}`);

      if (apis.length === 0) {
        logger.warn('No APIs found matching the given categories');
        return {
          ...state,
          apis: [],
          error: true,
          message: 'No APIs were found matching the given categories.'
        };
      }

      return { 
        ...state,
        apis,
        error: false,
        message: `Found ${apis.length} APIs matching the categories: ${categories.join(', ')}.`,
      };
    } catch (error: any) {
      logger.error('Error in GetApisTool:', error);
      return { 
        ...state,
        apis: [], 
        error: true,
        message: 'An error occurred while fetching APIs.'
      };
    }
  }
}
