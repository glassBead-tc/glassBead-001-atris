import { sdk as createSdk, AudiusSdk } from '@audius/sdk';
import { SdkConfig } from '@audius/sdk/dist/sdk/types.js';
import { getAudiusApiKey, getAudiusApiSecret } from './config.js';

// Store original write function
const originalWrite = process.stdout.write;

// Override stdout.write to filter SDK logs
process.stdout.write = function(buffer: string | Uint8Array, ...args: any[]): boolean {
    if (buffer instanceof Uint8Array || 
        !buffer.includes('[audius-sdk][discovery-node-selector]') && 
        !buffer.includes('[audius-sdk][storage-node-selector]')) {
        return originalWrite.apply(process.stdout, [buffer, ...args] as [string | Uint8Array, BufferEncoding?, ((err?: Error) => void)?]);
    }
    return true;
};

// Define the configuration for the SDK
const sdkConfig: SdkConfig = {
  appName: "Atris",
  apiKey: getAudiusApiKey(),
  apiSecret: getAudiusApiSecret(),
};

// Create an instance of the Audius SDK
const sdk: AudiusSdk = createSdk(sdkConfig);

export { sdk };
