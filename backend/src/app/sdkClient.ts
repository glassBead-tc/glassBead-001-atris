import { Logger, sdk } from '@audius/sdk'
import type { Middleware, DiscoveryNodeSelectorService, ServiceSelectionEvents } from '@audius/sdk'
import { EventEmitter } from 'events'
import type { TypedEventEmitter } from 'typed-emitter'
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

dotenv.config();

// ES Module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '..', '..', 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Create a log file with timestamp
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const logFile = path.join(logsDir, `atris-${timestamp}.log`);

// Create file logger function
function logToFile(level: string, message: string, meta?: unknown): void {
  const logEntry = `[${new Date().toISOString()}] ${level.toUpperCase()}: ${message} ${
    meta ? JSON.stringify(meta, null, 2) : ''
  }\n`;
  fs.appendFileSync(logFile, logEntry);
}

// Create SDK logger
const logger = new Logger({
  logLevel: process.env.NODE_ENV !== 'production' ? 'debug' : 'info'
});

// Wrap logger methods to also write to file
const wrappedLogger = {
  info: (message: string, meta?: unknown) => {
    logger.info(message, meta);
    logToFile('info', message, meta);
  },
  error: (message: string, meta?: unknown) => {
    logger.error(message, meta);
    logToFile('error', message, meta);
  },
  debug: (message: string, meta?: unknown) => {
    logger.debug(message, meta);
    logToFile('debug', message, meta);
  }
};

const appName = process.env.AUDIUS_APP_NAME || 'Atris';
const apiKey = process.env.AUDIUS_API_KEY || '';
const apiSecret = process.env.AUDIUS_API_SECRET || '';
const environment = (process.env.AUDIUS_ENVIRONMENT as 'development' | 'staging' | 'production') || 'staging';

// Define EventEmitterTarget interface based on SDK's usage
interface EventEmitterTarget<T> {
  addEventListener: <E extends keyof T>(
    event: E,
    listener: T[E]
  ) => EventEmitterTarget<T>;
  removeEventListener: <E extends keyof T>(
    event: E,
    listener: T[E]
  ) => EventEmitterTarget<T>;
}

// Create a discovery node selector that implements the full interface
class CustomDiscoveryNodeSelector extends EventEmitter implements DiscoveryNodeSelectorService {
  private typedThis: TypedEventEmitter<ServiceSelectionEvents>;
  private baseUrl: string = 'https://audius-discovery-13.cultur3stake.com';

  constructor() {
    super();
    this.typedThis = this as unknown as TypedEventEmitter<ServiceSelectionEvents>;
  }

  async getSelectedEndpoint() {
    return this.baseUrl;
  }

  createMiddleware() {
    const middleware: Middleware = {
      pre: async (req) => {
        const baseUrl = await this.getSelectedEndpoint();
        
        if (baseUrl) {
          const url = new URL(req.url || '', baseUrl);
          req.url = url.toString();
        }
        
        return req;
      },
      post: async () => Promise.resolve()
    };
    return middleware;
  }

  async getUniquelyOwnedEndpoints(n: number, excludeOwners?: string[]) {
    return ['https://audius-discovery-13.cultur3stake.com'];
  }

  addEventListener<E extends keyof ServiceSelectionEvents>(
    event: E,
    listener: ServiceSelectionEvents[E]
  ): TypedEventEmitter<ServiceSelectionEvents> {
    this.on(event, listener);
    return this.typedThis;
  }

  removeEventListener<E extends keyof ServiceSelectionEvents>(
    event: E,
    listener: ServiceSelectionEvents[E]
  ): TypedEventEmitter<ServiceSelectionEvents> {
    this.off(event, listener);
    return this.typedThis;
  }
}

// Initialize SDK with our custom discovery node selector
const audiusSdk = sdk({
  appName,
  apiKey,
  apiSecret,
  environment,
  services: {
    logger,
    discoveryNodeSelector: new CustomDiscoveryNodeSelector()
  }
});

wrappedLogger.info('Audius SDK initialization attempt', {
  appName,
  environment,
  apiKeySet: !!apiKey,
  apiSecretSet: !!apiSecret
});

// Test connection and log discovery node details
async function verifyConnection() {
  try {
    // Try a simple API call
    const trending = await audiusSdk.tracks.searchTracks({ query: '115 SECONDS OF CLAMS' });
    wrappedLogger.info('Successfully connected to Audius', {
      environment,
      trackCount: trending.data!.length,
      sampleTrack: trending.data![0]?.title
    });
    return true;
  } catch (error) {
    wrappedLogger.error('Failed to connect to Audius', {
      environment,
      error: error instanceof Error ? error.message : String(error)
    });
    return false;
  }
}

// Run verification immediately
verifyConnection().catch(err => {
  wrappedLogger.error('Verification failed', err);
});

export { audiusSdk, verifyConnection };
