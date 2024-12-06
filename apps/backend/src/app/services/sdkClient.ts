// backend/src/app/services/sdkClient.ts

import dotenv from 'dotenv';
import { TrackSDKMethods } from './entity_methods/tracks/trackSDKMethods.js';
import { UserSDKMethods } from './entity_methods/users/userSDKMethods.js';
import { PlaylistSDKMethods } from './entity_methods/playlists/playlistSDKMethods.js';

dotenv.config();

export class MinimalAudiusSDK {
  public tracks: TrackSDKMethods;
  public users: UserSDKMethods;
  public playlists: PlaylistSDKMethods;

  constructor(apiKey: string) {
    const baseUrl = 'https://discovery-us-01.audius.openplayer.org/v1';
    this.tracks = new TrackSDKMethods(baseUrl, apiKey);
    this.users = new UserSDKMethods(baseUrl, apiKey);
    this.playlists = new PlaylistSDKMethods(baseUrl, apiKey);
  }
}

let audiusSdk: MinimalAudiusSDK | null = null;

export async function getAudiusSdk() {
  if (!audiusSdk) {
    console.log('Initializing SDK for the first time');
    const apiKey = process.env.AUDIUS_API_KEY;

    if (!apiKey) {
      throw new Error('Missing Audius API key');
    }

    audiusSdk = new MinimalAudiusSDK(apiKey);
  }
  return audiusSdk;
}