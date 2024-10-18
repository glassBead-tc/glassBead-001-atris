import { StructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { GraphState } from "../types.js";
import { logger } from '../logger.js';
import {
  extractTrendingTracksParameters,
  extractSearchTracksParameters,
  extractUserParameters,
  extractPlaylistParameters,
  extractTrackParameters,
  extractWebSearchQuery,
  extractTrackId,
  extractLimit,
  extractGenre,
  extractUserId,
  extractPlaylistId,
} from './utils/extractionUtils/index.js';
import { ChatPromptTemplate } from "@langchain/core/prompts";

export class ExtractParametersTool extends StructuredTool {
  name = "extract_parameters";
  description = "Extracts parameters from the GraphState based on the query type and entity.";

  schema = z.object({
    state: z.object({
      query: z.string().optional(),
      queryType: z.string().optional(),
      entityType: z.string().nullable().optional(),
      entityName: z.string().nullable().optional(),
      entity: z.any().optional(),
      params: z.record(z.any()).optional(),
      error: z.boolean().optional(),
      message: z.string().optional(),
      // ... include other necessary fields from GraphState
    }),
  });

  async _call({ state }: z.infer<typeof this.schema>): Promise<Partial<GraphState>> {
    try {
      const { query, queryType, entityName } = state;

      if (!queryType) {
        throw new Error('No query type specified');
      }

      let params: Record<string, any> = {};

      // Use a centralized extraction function based on queryType
      switch (queryType) {
        case 'trending_tracks':
          params = extractTrendingTracksParameters(query || '', entityName || null);
          break;

        case 'search_tracks':
          params = extractSearchTracksParameters(query || '', entityName || null);
          break;

        case 'user_info':
          params = extractUserParameters(query || '', entityName || null);
          break;

        case 'playlist_info':
          params = extractPlaylistParameters(query || '', entityName || null);
          break;

        case 'track_info':
          params = extractTrackParameters(query || '', entityName || null);
          break;

        case 'web_search':
          params = { searchQuery: extractWebSearchQuery(query || '') };
          break;

        // Add other cases as needed

        default:
          throw new Error(`Unsupported query type: ${queryType}`);
      }

      // Additional parameter extraction using extractParam if needed
      params.track_id = extractTrackId(query || '');
      params.limit = extractLimit(query || '');
      params.genre = extractGenre(query || '');
      params.user_id = extractUserId(query || '');
      params.playlist_id = extractPlaylistId(query || ''); 
      // ... and so on for other parameters.

      // Leverage ChatPromptTemplate for dynamic parameter extraction
      const prompt = ChatPromptTemplate.fromMessages([
        ["system", "You are an expert agent that extracts parameters from the GraphState based on the query type and entity."],
        ["human", `Query: {query}`],
      ]);

      const modelWithTools = state.llm!.withStructuredOutput(this);
      const chain = prompt.pipe(modelWithTools).pipe(this);
      const response = await chain.invoke({ state });
      const aiExtractedParams: Record<string, any> = JSON.parse(response);

      // Merge AI-extracted parameters with existing ones
      params = { ...params, ...aiExtractedParams };

      logger.info(`Extracted parameters: ${JSON.stringify(params)}`);
      return { ...state, params, error: false } as Partial<GraphState>;
    } catch (error) {
      logger.error(`Error in ExtractParametersTool: ${error instanceof Error ? error.message : String(error)}`);
      return { ...state, error: true, message: error instanceof Error ? error.message : 'Unknown error in ExtractParametersTool' } as Partial<GraphState>;
    }
  }
}

export async function extractParameters(state: GraphState): Promise<Partial<GraphState>> {
  const { llm, query, queryType, entityType, entityName, entity, params, error, message } = state;

  const prompt = ChatPromptTemplate.fromMessages([
    ["system", "You are an expert agent that extracts parameters from the GraphState based on the query type and entity."],
    ["human", "{query}"],
  ]);
  
  const tool = new ExtractParametersTool();

  const modelWithTools = llm!.withStructuredOutput(tool);
  const chain = prompt.pipe(modelWithTools).pipe(tool);
  const response = await chain.invoke({ state });
  const parameters: GraphState = JSON.parse(response);
  return parameters as Partial<GraphState>;
}
