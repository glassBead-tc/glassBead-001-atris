import { StructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { GraphState } from "../types.js";
import { logger } from '../logger.js';
import {
  extractParam,
} from './utils/extractionUtils/extractionUtils.js';
import { extractWebSearchQuery } from './extraction/searchExtraction.js';
import { extractTrendingTracksParameters } from './utils/extractionUtils/extractTrendingTracksParameters.js';
import { extractSearchTracksParameters } from './utils/extractionUtils/extractSearchTracksParameters.js';
import { extractUserParameters } from './utils/extractionUtils/extractUserParameters.js';
import { extractPlaylistParameters } from './utils/extractionUtils/extractPlaylistParameters.js';
import { extractTrackParameters } from './utils/extractionUtils/extractTrackParameters.js';
import { isTrackData, isUserData, isPlaylistData } from './utils/typeGuards.js';

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

  async _call({ state }: z.infer<typeof this.schema>): Promise<GraphState> {
    try {
      const { query, queryType, entity, entityName } = state;

      if (!queryType) {
        throw new Error('No query type specified');
      }

      let params: Record<string, any> = {};

      switch (queryType) {
        case 'trending_tracks':
          params = extractTrendingTracksParameters(query || '', null);
          break;

        case 'search_tracks':
          if (isTrackData(entity)) {
            params = extractSearchTracksParameters(query || '', entity.title);
          } else {
            params = extractSearchTracksParameters(query || '', entityName || null);
          }
          break;

        case 'user_info':
          if (isUserData(entity)) {
            params = extractUserParameters(query || '', entity.name);
          } else {
            params = extractUserParameters(query || '', entityName || null);
          }
          break;

        case 'playlist_info':
          if (isPlaylistData(entity)) {
            params = extractPlaylistParameters(query || '', entity.playlistName);
          } else {
            params = extractPlaylistParameters(query || '', entityName || null);
          }
          break;

        case 'track_info':
          if (isTrackData(entity)) {
            params = extractTrackParameters(query || '', entity.title);
          } else {
            params = extractTrackParameters(query || '', entityName || null);
          }
          break;

        case 'web_search':
          params = { searchQuery: extractWebSearchQuery(query || '') };
          break;

        // Add other cases as needed

        default:
          throw new Error(`Unsupported query type: ${queryType}`);
      }

      // Additional parameter extraction using extractParam if needed
      // Example:
      params.track_id = extractParam("track_id", query || '');
      params.limit = extractParam("limit", query || '');
      // ... and so on for other parameters.

      logger.info(`Extracted parameters: ${JSON.stringify(params)}`);
      return { ...state, params, error: false };
    } catch (error) {
      if (error instanceof Error) {
        logger.error(`Error in ExtractParametersTool: ${error.message}`, { stack: error.stack });
        return { ...state, error: true, message: error.message };
      } else {
        logger.error('Unknown error in ExtractParametersTool');
        return { ...state, error: true, message: 'Unknown error in ExtractParametersTool' };
      }
    }
  }
}
