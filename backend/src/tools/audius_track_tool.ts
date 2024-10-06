import { Tool } from "@langchain/core/tools";
import { sdk, Track } from '@audius/sdk';

const audiusSdk = sdk({
  apiKey: process.env.AUDIUS_API_KEY || '',
  apiSecret: process.env.AUDIUS_API_SECRET || '',
  appName: 'audius-ai-sdk'
});

export class AudiusTrackTool extends Tool {
  name = "audius-track-api";
  description = "Fetches play count for a specific track on Audius. Input should be in the format 'title|artist'.";

  async _call(input: string): Promise<string> {
    try {
      const [title, artist] = input.split('|').map(s => s.trim());
      if (!title || !artist) {
        return "Invalid input. Please provide both title and artist in the format 'title|artist'.";
      }

      console.log(`Searching for track: "${title}" by ${artist}`);
      const searchResults = await this.fetchWithTimeout(() => audiusSdk.tracks.searchTracks({
        query: `${title} ${artist}`
      }), 10000);

      console.log('Search results:', JSON.stringify(searchResults, null, 2));

      if (!searchResults.data || searchResults.data.length === 0) {
        return `No tracks found matching "${title}" by ${artist}.`;
      }

      const exactMatch = searchResults.data.find((track: Track) => 
        track.title.toLowerCase() === title.toLowerCase() && 
        track.user.name.toLowerCase() === artist.toLowerCase()
      );

      if (!exactMatch) {
        return `No exact match found for "${title}" by ${artist}. Here are some close matches:\n${this.formatCloseMatches(searchResults.data.slice(0, 3))}`;
      }

      return this.formatTrackInfo(exactMatch);
    } catch (error) {
      console.error('Error in AudiusTrackTool:', error);
      if (error instanceof Error) {
        return `Error searching for track: ${error.message}`;
      }
      return `Error searching for track: Unknown error`;
    }
  }

  private async fetchWithTimeout(fetchFunction: () => Promise<any>, timeoutMs: number): Promise<any> {
    return Promise.race([
      fetchFunction(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error(`Request timed out after ${timeoutMs}ms`)), timeoutMs)
      )
    ]);
  }

  private formatTrackInfo(track: Track): string {
    return `
      Title: ${track.title}
      Artist: ${track.user.name}
      Play Count: ${track.playCount || 'N/A'}
    `.trim();
  }

  private formatCloseMatches(tracks: Track[]): string {
    return tracks.map(track => `"${track.title}" by ${track.user.name} (Play Count: ${track.playCount || 'N/A'})`).join('\n');
  }
}
