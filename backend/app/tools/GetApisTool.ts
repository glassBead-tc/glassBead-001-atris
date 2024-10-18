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
      apis: z.array(z.any()).optional(),
      error: z.boolean().optional(),
      message: z.string().optional(),
    }),
  });

  async _call({ state }: z.infer<typeof this.schema>): Promise<string> {
    let { categories } = state;
    logger.debug(`GetApisTool called with categories: ${JSON.stringify(categories)}`);

    // Remove duplicates from categories and ensure it's non-empty
    categories = categories && categories.length > 0 ? [...new Set(categories)] as [string, ...string[]] : ['General'];
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
        return 'No APIs were found matching the given categories.';
      } 
      // Return a string summarizing the found APIs
      return `Found ${apis.length} APIs matching the categories: ${categories.join(', ')}.`;
    } catch (error: any) {
      logger.error('Error in GetApisTool:', error);
      return 'An error occurred while fetching APIs.';
    }
  }
}
