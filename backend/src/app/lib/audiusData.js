import { logger } from '../logger.js';
// Define each of these types (TrackData, ArtistData, etc.) with their specific properties
if (!process.env.AUDIUS_API_KEY || !process.env.AUDIUS_API_SECRET) {
    throw new Error('Audius API key or secret is not defined in the environment variables.');
}
const apiKey = process.env.AUDIUS_API_KEY;
const apiSecret = process.env.AUDIUS_API_SECRET;
export async function fetchAudiusData(query) {
    try {
        const response = await fetch('/api/audius', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'searchTracks', params: { query } }),
        });
        const data = await response.json();
        if (data.data && data.data.length > 0) {
            const track = data.data[0];
            return {
                type: 'track',
                data: track
            };
        }
        // If no track is found, you might want to search for artists or playlists
        // You can add additional API calls here if needed
        return null;
    }
    catch (error) {
        logger.error("Error fetching Audius data:", error);
        return null;
    }
}
async function searchRemixes(query) {
    try {
        const response = await fetch('/api/audius', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'searchTracks', params: { query } }),
        });
        const data = await response.json();
        // Filter for tracks that are remixes
        const remixes = data.data?.filter((track) => track.remixOf !== null);
        if (remixes && remixes.length > 0) {
            const remix = remixes[0];
            // Fetch original track details
            const originalTrackId = remix.remix_of.tracks[0].parent_track_id;
            const originalTrackResponse = await fetch('/api/audius', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'getTrack', params: { trackId: originalTrackId } }),
            });
            const originalTrack = await originalTrackResponse.json();
            return {
                type: 'remix',
                data: {
                    id: remix.id,
                    title: remix.title,
                    artist: remix.user.name,
                    remixOf: {
                        id: originalTrack.data.id,
                        type: 'track',
                        title: originalTrack.data.title,
                        artwork: originalTrack.data.artwork,
                        description: originalTrack.data.description || null,
                        genre: originalTrack.data.genre,
                        mood: originalTrack.data.mood || null,
                        releaseDate: originalTrack.data.release_date || null,
                        remixOf: null,
                        repostCount: originalTrack.data.repost_count,
                        favoriteCount: originalTrack.data.favorite_count,
                        commentCount: originalTrack.data.comment_count,
                        tags: Array.isArray(originalTrack.data.tags) ? originalTrack.data.tags : null,
                        user: originalTrack.data.user,
                        duration: originalTrack.data.duration,
                        isDownloadable: originalTrack.data.downloadable,
                        playCount: originalTrack.data.play_count,
                        permalink: originalTrack.data.permalink,
                        isStreamable: originalTrack.data.is_streamable || false
                    }
                }
            };
        }
        return null;
    }
    catch (error) {
        logger.error("Error searching for remixes:", error);
        return null;
    }
}
// Export the searchRemixes function if you need to use it elsewhere
export { searchRemixes };
