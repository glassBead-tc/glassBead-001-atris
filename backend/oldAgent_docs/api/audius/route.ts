import { NextRequest, NextResponse } from 'next/server'; 
import { AudiusAPI } from '../../ai_sdk/tools/audius/audiusAPI.js';
import { sdk } from '@audius/sdk';

// Ensure environment variables are defined
const apiKey = process.env.NEXT_AUDIUS_API_KEY!;
const apiSecret = process.env.NEXT_AUDIUS_API_SECRET!;
const appName = process.env.NEXT_AUDIUS_APP_NAME!;

if (!apiKey || !apiSecret || !appName) {
  throw new Error('Missing required environment variables: NEXT_AUDIUS_API_KEY, NEXT_AUDIUS_API_SECRET, NEXT_AUDIUS_APP_NAME');
}

// Creating an instance of the AudiusAPI to interact with the Audius service
const audiusApi = new AudiusAPI(sdk({
  apiKey: apiKey, // TypeScript now knows these are strings
  apiSecret: apiSecret,
  appName: appName,
  environment: process.env.NODE_ENV === 'production' ? 'production' : 'development'
}));

export async function POST(request: NextRequest) {
  const { action, params } = await request.json();

  try {
    let result;

    switch (action) {
      case 'searchTracks':
        result = await audiusApi.searchTracks(params.query, params.limit);
        break;
      case 'getTrack':
        result = await audiusApi.getTrack(params.trackId);
        break;
      case 'getTrendingTracks':
        result = await audiusApi.getTrendingTracks(params);
        break;
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    return NextResponse.json(result || { error: 'No data found' });
  } catch (error) {
    console.error('Error in Audius API:', error);
    return NextResponse.json({ error: 'An error occurred' }, { status: 500 });
  }
}
