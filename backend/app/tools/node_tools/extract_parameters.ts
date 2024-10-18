import { logger } from '../../logger.js';
import { GraphState } from "../../types.js";
import {
  extractParam,
} from '../utils/extractionUtils/extractionUtils.js';
import { extractWebSearchQuery } from '../extraction/searchExtraction.js';
import { extractTrendingTracksParameters } from '../utils/extractionUtils/extractTrendingTracksParameters.js';
import { extractSearchTracksParameters } from '../utils/extractionUtils/extractSearchTracksParameters.js';
import { extractUserParameters } from '../utils/extractionUtils/extractUserParameters.js';
import { extractPlaylistParameters } from '../utils/extractionUtils/extractPlaylistParameters.js';
import { extractTrackParameters } from '../utils/extractionUtils/extractTrackParameters.js';
import { isTrackData, isUserData, isPlaylistData } from '../utils/typeGuards.js';

/**
 * Extracts parameters from the GraphState based on the query type and entity.
 * @param state - The current state of the GraphState.
 * @returns The updated GraphState with extracted parameters or an error message.
 */
export async function extractParameters(state: GraphState): Promise<GraphState> {
  // ... implementation ...
}
