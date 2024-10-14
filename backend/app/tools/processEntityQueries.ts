import { GraphState, UserData, TrackData, PlaylistData } from "../types.js";
import { logger } from '../logger.js';

/**
 * Processes user queries by formatting user data.
 * @param state - The current state of the GraphState.
 * @returns A formatted string with user information.
 */
export async function processUserQuery(state: GraphState): Promise<string> {
    const user = state.entity as UserData | null;
    if (!user) {
        logger.warn("User data is missing in state.");
        return "User information is unavailable.";
    }

    return `**User Profile**
- **Name:** ${user.name}
- **Handle:** @${user.handle}
- **Followers:** ${user.followerCount}
- **Following:** ${user.followeeCount}
- **Tracks:** ${user.trackCount}
- **Playlists:** ${user.playlistCount}
- **Verified:** ${user.isVerified ? 'Yes' : 'No'}
- **Bio:** ${user.bio || 'N/A'}
`;
}

/**
 * Processes track queries by formatting track data.
 * @param state - The current state of the GraphState.
 * @returns A formatted string with track information.
 */
export async function processTrackQuery(state: GraphState): Promise<string> {
    const track = state.entity as TrackData | null;
    if (!track) {
        logger.warn("Track data is missing in state.");
        return "Track information is unavailable.";
    }

    return `**Track Information**
- **Title:** ${track.title}
- **Artist:** ${track.user.name}
- **Genre:** ${track.genre}
- **Release Date:** ${track.releaseDate || 'N/A'}
- **Play Count:** ${track.playCount}
- **Duration:** ${formatDuration(track.duration)}
- **Description:** ${track.description || 'N/A'}
`;
}

/**
 * Processes playlist queries by formatting playlist data.
 * @param state - The current state of the GraphState.
 * @returns A formatted string with playlist information.
 */
export async function processPlaylistQuery(state: GraphState): Promise<string> {
    const playlist = state.entity as PlaylistData | null;
    if (!playlist) {
        logger.warn("Playlist data is missing in state.");
        return "Playlist information is unavailable.";
    }

    return `**Playlist Information**
- **Name:** ${playlist.playlistName}
- **Creator:** ${playlist.user.name}
- **Track Count:** ${playlist.trackCount}
- **Total Play Count:** ${playlist.totalPlayCount}
- **Reposts:** ${playlist.repostCount}
- **Favorites:** ${playlist.favoriteCount}
- **Description:** ${playlist.description || 'N/A'}
`;
}

/**
 * Formats duration from seconds to "minutes:seconds" format.
 * @param durationSeconds - Duration in seconds.
 * @returns Formatted duration string.
 */
function formatDuration(durationSeconds: number): string {
    const minutes = Math.floor(durationSeconds / 60);
    const seconds = durationSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
