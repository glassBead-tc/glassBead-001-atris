// import { StructuredTool } from "@langchain/core/tools";
// import { z } from "zod";
// import { GraphState } from "../types.js";
// import { logger } from "../logger.js";
// import { globalAudiusApi } from "../services/audiusApi.js";
// import { TrackResponse } from '@audius/sdk';
export {};
// export class MultiStepQueryTool extends StructuredTool {
//   name = "multi_step_query";
//   description = "Handles multi-step queries, such as genre_info, by updating the state accordingly.";
//   schema = z.object({
//     state: z.object({
//       query: z.string(),
//       queryType: z.string(),
//       params: z.object({
//         limit: z.number().optional(),
//         timeframe: z.string().optional()
//       }).optional(),
//       multiStepHandled: z.boolean().optional(),
//       response: z.any().optional(),
//       formattedResponse: z.string().optional(),
//       message: z.string().optional(),
//       error: z.boolean().optional(),
//       category: z.string().optional(),
//     }),
//   });
//   async _call({ state }: z.infer<typeof this.schema>): Promise<Partial<GraphState>> {
//     const { queryType, params } = state;
//     if (state.multiStepHandled) {
//       return {};
//     }
//     if (queryType !== 'genre_info') {
//       logger.warn(`MultiStepQueryTool called with unsupported queryType: ${queryType}`);
//       return { error: true, message: `Unsupported queryType for multi-step query: ${queryType}` };
//     }
//     try {
//       logger.info("Handling multi-step query for trending genres");
//       const limit = params?.limit || 5;
//       const timeframe = params?.timeframe || 'week';
//       const tracksData = await globalAudiusApi.getTrendingTracks(limit);
//       if (!tracksData || !Array.isArray(tracksData.data)) {
//         throw new Error("No data received from trending tracks endpoint.");
//       }
//       const genres = this.extractGenres(tracksData.data);
//       const topGenres = this.scoreAndRankGenres(genres);
//       const formattedResponse = this.formatGenresResponse(topGenres, limit);
//       return {
//         multiStepHandled: true,
//         response: topGenres, 
//         formattedResponse,
//         message: "Trending genres processed successfully.",
//         error: false,
//       };
//     } catch (error: any) {
//       logger.error(`Error handling multi-step query:`, error);
//       return { 
//         error: true, 
//         message: error instanceof Error ? error.message : "An error occurred during multi-step query processing." 
//       };
//     }
//   }
//   private extractGenres(tracks: TrackResponse[]): string[] {
//     const genres: string[] = [];
//     tracks.forEach(track => {
//       if (track.data?.genre) {
//         genres.push(track.data.genre.toLowerCase());
//       }
//     });
//     return genres;
//   }
//   private scoreAndRankGenres(genres: string[]): { genre: string; score: number }[] {
//     const genreCount: { [key: string]: number } = {};
//     genres.forEach(genre => {
//       genreCount[genre] = (genreCount[genre] || 0) + 1;
//     });
//     const genreScores = Object.entries(genreCount).map(([genre, count]) => ({
//       genre,
//       score: count,
//     }));
//     return genreScores.sort((a, b) => b.score - a.score);
//   }
//   private formatGenresResponse(topGenres: { genre: string; score: number }[], limit: number): string {
//     const formatted = topGenres.slice(0, limit).map((item, index) =>
//       `${index + 1}. ${this.capitalizeFirstLetter(item.genre)}`
//     ).join('\n');
//     return `Here are the top ${limit} genres on Audius based on trending tracks:\n\n${formatted}`;
//   }
//   private capitalizeFirstLetter(text: string): string {
//     return text.charAt(0).toUpperCase() + text.slice(1);
//   }
// }
