import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Convert import.meta.url to a file path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../.env') });

export function getOpenAiApiKey(): string {
  const apiKey = process.env.OPENAI_API_KEY;
  // console.log("API Key:", apiKey); // Add this line for debugging
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not defined in the environment variables.');
  }
  return apiKey;
}

export function getAudiusApiKey(): string {
  const apiKey = process.env.AUDIUS_API_KEY;
  if (!apiKey) {
    throw new Error('AUDIUS_API_KEY is not defined in the environment variables.');
  }
  return apiKey;
}

export function getAudiusApiSecret(): string {
  const apiSecret = process.env.AUDIUS_API_SECRET;
  if (!apiSecret) {
    throw new Error('AUDIUS_API_SECRET is not defined in the environment variables.');
  }
  return apiSecret;
}

export function checkRequiredEnvVars() {
  getOpenAiApiKey();
  getAudiusApiKey();
  getAudiusApiSecret();
}
