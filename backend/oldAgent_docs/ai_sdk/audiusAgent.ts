import { Tool } from "@langchain/core/tools";
import { AudiusAPI } from '../tools/audius/audiusAPI.js';
import { AudiusSdk } from '@audius/sdk';
import { AudiusAgentError } from './audiusAgentServer.js';

// Import a lightweight validation library or use basic validation
import Joi from 'joi';

export class AudiusAPITool extends Tool {
  name = "AudiusAPI";
  description = "Useful for querying information about tracks, artists, and playlists on the Audius platform.";
  private audiusApi: AudiusAPI;

  // Define a simple schema for input validation
  private inputSchema = Joi.object({
    apiMethod: Joi.string()
      .valid(
        'searchTracks',
        'getTrack',
        'getTrendingTracks',
        'searchUsers',
        'getUser',
        'searchPlaylists',
        'getPlaylist'
      )
      .required(),
    params: Joi.object().required(),
  });

  constructor(audiusSdk: AudiusSdk, appName: string) {
    super();
    try {
      this.audiusApi = new AudiusAPI(audiusSdk);
    } catch (error) {
      console.error('Failed to initialize AudiusAPITool:', error);
      throw new AudiusAgentError('API initialization error');
    }
  }

  async _call(apiMethod: string, params: any): Promise<any> {
    try {
      // Validate input
      const { error } = this.inputSchema.validate({ apiMethod, params });
      if (error) {
        throw new AudiusAgentError(`Invalid input: ${error.message}`);
      }

      const methodMap: { [key: string]: (params: any) => Promise<any> } = {
        searchTracks: this.audiusApi.searchTracks.bind(this.audiusApi),
        getTrack: this.audiusApi.getTrack.bind(this.audiusApi),
        getTrendingTracks: this.audiusApi.getTrendingTracks.bind(this.audiusApi),
        searchUsers: this.audiusApi.searchUsers.bind(this.audiusApi),
        getUser: this.audiusApi.getUser.bind(this.audiusApi),
        searchPlaylists: this.audiusApi.searchPlaylists.bind(this.audiusApi),
        getPlaylist: this.audiusApi.getPlaylist.bind(this.audiusApi),
      };

      if (!(apiMethod in methodMap)) {
        throw new AudiusAgentError(`Method ${apiMethod} does not exist on AudiusAPI.`);
      }

      const response = await methodMap[apiMethod](params);
      return response;
    } catch (error) {
      console.error('Error in AudiusAPITool._call:', error);
      throw new AudiusAgentError(error instanceof Error ? error.message : 'An unknown error occurred.');
    }
  }

  // Additional methods for specific API calls can be added here
}