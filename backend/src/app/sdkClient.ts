import { sdk as createSdk, AudiusSdk } from '@audius/sdk';
import { SdkConfig } from '../../../node_modules/@audius/sdk/dist/sdk/types.js';
import { getAudiusApiKey, getAudiusApiSecret } from './config.js';
// Define the configuration for the SDK
const sdkConfig: SdkConfig = {
  appName: "Atris", // Replace with your actual app name
  apiKey: getAudiusApiKey(), // If required
  apiSecret: getAudiusApiSecret() // If required
  // Add other configuration options if needed
};

// Create an instance of the Audius SDK
const sdk: AudiusSdk = createSdk(sdkConfig);

export { sdk };
