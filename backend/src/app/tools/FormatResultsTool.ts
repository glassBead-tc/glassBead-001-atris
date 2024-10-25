import { StructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { GraphState, QueryType } from "../types.js";
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

  async _call({ state }: z.infer<typeof this.schema>): Promise<Partial<GraphState>> {
    const { response, queryType, query } = state;
    logger.info("Formatting results");

    try {
      const formattedResponse = this.formatApiResults(response, queryType as QueryType, query);
      return {
        formattedResponse,
        error: false,
      };
    } catch (error) {
      logger.error("Error in FormatResultsTool:", error);
      return {
        error: true,
        message: 'An error occurred while formatting the results.',
      };
    }
  }

  private formatApiResults(response: any, queryType: QueryType, query: string): string {
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
    } catch (error) {
      logger.error("Error in formatApiResults:", error);
      return "An error occurred while processing the results.";
    }
  }

  private formatTrendingTracks(tracks: any[]): string {
    return tracks.map((track: any, index: number) => 
      `${index + 1}. "${track.title}" by ${track.user.name}`
    ).join('\n');
  }

  private formatSearchTracks(tracks: any[], query: string): string {
    if (!tracks || tracks.length === 0) {
      return `No tracks found matching "${query}".`;
    }

    const trackInfo = tracks.map(track => 
      `"${track.title}" by ${track.user.name} (Genre: ${track.genre || 'Unknown'}, ${track.playCount || 'Unknown'} plays)`
    ).join('\n');

    return `Here are the tracks matching "${query}":\n${trackInfo}`;
  }

  private formatUserResults(users: any[]): string {
    return users.map((user: any, index: number) => 
      `${index + 1}. ${user.name} (@${user.handle}) - ${user.followerCount || 'Unknown'} followers, ${user.trackCount || 'Unknown'} tracks`
    ).join('\n');
  }

  private formatPlaylistResults(playlists: any[]): string {
    return playlists.map((playlist: any, index: number) => 
      `${index + 1}. "${playlist.playlistName}" by ${playlist.user.name} (${playlist.totalPlayCount || 'Unknown'} plays)`
    ).join('\n');
  }

  private formatGenrePopularity(genreData: { genre: string; score: number }[]): string {
    const formatted = genreData.map((item, index) =>
      `${index + 1}. ${this.capitalizeFirstLetter(item.genre)} (${item.score} tracks)`
    ).join('\n');

    return `Top Genres:\n${formatted}`;
  }

  private formatDuration(durationInSeconds: number): string {
    if (!durationInSeconds) {
      return 'Unknown';
    }
    const minutes = Math.floor(durationInSeconds / 60);
    const seconds = durationInSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  private capitalizeFirstLetter(string: string): string {
    return string.charAt(0).toUpperCase() + string.slice(1);
  }

  // Add other formatting functions as needed
}
