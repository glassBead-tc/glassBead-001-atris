import { StructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { logger } from "../logger.js";
export class FormatResultsTool extends StructuredTool {
    name = "format_results";
    description = "Formats the API response into a user-friendly string.";
    schema = z.object({
        state: z.object({
            response: z.any(),
            formattedResponse: z.string().optional(),
            queryType: z.string(),
            query: z.string(),
            // Include other necessary state properties
        }),
    });
    async _call({ state }) {
        const { response, queryType, query } = state;
        logger.info("Formatting results");
        try {
            const formattedResponse = this.formatApiResults(response, queryType, query);
            return {
                formattedResponse,
                error: false,
            };
        }
        catch (error) {
            logger.error("Error in FormatResultsTool:", error);
            return {
                error: true,
                message: 'An error occurred while formatting the results.',
            };
        }
    }
    formatApiResults(response, queryType, query) {
        if (!response) {
            return "Unable to find the requested information.";
        }
        try {
            switch (queryType) {
                case "trending_tracks":
                    return this.formatTrendingTracks(response);
                case "search_tracks":
                    return this.formatSearchTracks(response, query);
                case "search_users":
                    return this.formatUserResults(response);
                case "search_playlists":
                    return this.formatPlaylistResults(response);
                case "genre_info":
                    return this.formatGenrePopularity(response);
                // Add more cases as needed
                default:
                    return "Unsupported query type for formatting.";
            }
        }
        catch (error) {
            logger.error("Error in formatApiResults:", error);
            return "An error occurred while processing the results.";
        }
    }
    formatTrendingTracks(tracks) {
        return tracks.map((track, index) => `${index + 1}. "${track.title}" by ${track.user.name}`).join('\n');
    }
    formatSearchTracks(tracks, query) {
        if (!tracks || tracks.length === 0) {
            return `No tracks found matching "${query}".`;
        }
        const trackInfo = tracks.map(track => `"${track.title}" by ${track.user.name} (Genre: ${track.genre || 'Unknown'}, ${track.playCount || 'Unknown'} plays)`).join('\n');
        return `Here are the tracks matching "${query}":\n${trackInfo}`;
    }
    formatUserResults(users) {
        return users.map((user, index) => `${index + 1}. ${user.name} (@${user.handle}) - ${user.followerCount || 'Unknown'} followers, ${user.trackCount || 'Unknown'} tracks`).join('\n');
    }
    formatPlaylistResults(playlists) {
        return playlists.map((playlist, index) => `${index + 1}. "${playlist.playlistName}" by ${playlist.user.name} (${playlist.totalPlayCount || 'Unknown'} plays)`).join('\n');
    }
    formatGenrePopularity(genreData) {
        const formatted = genreData.map((item, index) => `${index + 1}. ${this.capitalizeFirstLetter(item.genre)} (${item.score} tracks)`).join('\n');
        return `Top Genres:\n${formatted}`;
    }
    formatDuration(durationInSeconds) {
        if (!durationInSeconds) {
            return 'Unknown';
        }
        const minutes = Math.floor(durationInSeconds / 60);
        const seconds = durationInSeconds % 60;
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
    capitalizeFirstLetter(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    }
}
