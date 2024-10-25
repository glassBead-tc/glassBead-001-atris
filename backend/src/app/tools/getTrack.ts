import { sdk } from '../sdkClient.js';
import { Track } from '@audius/sdk';

/**
 * Fetches detailed track information using the track_id.
 *
 * @param {string} track_id - The ID of the track to fetch.
 * @returns {Promise<Track>} - The detailed track information.
 */
export async function getTrack(track_id: string): Promise<Track> {
  if (!track_id) {
    throw new Error('track_id is required to fetch track details.');
  }

  try {
    const response = await sdk.tracks.getTrack({ trackId: track_id });
    const track: Track = response.data!;
    
    if (!track) {
      throw new Error(`No track found with ID "${track_id}".`);
    }

    return track;
  } catch (error) {
    console.error('Error in getTrack:', error);
    throw error;
  }
}
