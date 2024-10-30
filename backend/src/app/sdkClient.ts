import { sdk, DiscoveryNodeSelector } from '@audius/sdk';
import dotenv from 'dotenv';
import { getAudiusApiKey, getAudiusApiSecret } from './config.js';

dotenv.config();

// Initialize with just the discovery node selector
const discoveryNodeSelector = new DiscoveryNodeSelector({
  initialSelectedNode: 'https://discoveryprovider3.audius.co'
});

const audiusSdk = sdk({
  appName: 'Atris',
  apiKey: getAudiusApiKey(),
  apiSecret: getAudiusApiSecret(),
  services: {
    discoveryNodeSelector
  }
});

export { audiusSdk as sdk };
