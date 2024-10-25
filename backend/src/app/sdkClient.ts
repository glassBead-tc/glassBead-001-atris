import { sdk as createSdk, AudiusSdk } from '@audius/sdk';
import { SdkConfig } from '../../../node_modules/@audius/sdk/dist/sdk/types.js';
import dotenv from 'dotenv';

dotenv.config();

// Define the configuration for the SDK
const sdkConfig: SdkConfig = {
  appName: process.env.AUDIUS_APP_NAME!, // Replace with your actual app name
  apiKey: process.env.AUDIUS_API_KEY!, // If required
  // Add other configuration options if needed
};

// Create an instance of the Audius SDK
const sdk: AudiusSdk = createSdk(sdkConfig);

export { sdk };
