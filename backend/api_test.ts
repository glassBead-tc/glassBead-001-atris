import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const API_KEY = process.env.AUDIUS_API_KEY;
const AUDIUS_SECRET = process.env.AUDIUS_API_SECRET;
const BASE_URL = 'https://discoveryprovider.audius.co/v1';

async function testApiConnection() {
  try {
    // Test the /v1/health_check endpoint
    const response = await axios.get(`${BASE_URL}/health_check`, {
      headers: {
        'Accept': 'application/json',
        'X-API-KEY': API_KEY,
        'User-Agent': 'Atris'
      }
    });

    console.log('API Health Check Response:', response.data);
    console.log('Status Code:', response.status);

    // If successful, try a simple data endpoint
    if (response.status === 200) {
      const tracksResponse = await axios.get(`${BASE_URL}/tracks/trending`, {
        params: { limit: 1 },
        headers: {
          'Accept': 'application/json',
          'X-API-KEY': API_KEY,
          'User-Agent': 'Atris'
        }
      });

      console.log('Trending Tracks Response:', tracksResponse.data);
      console.log('Status Code:', tracksResponse.status);
    }
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('API Error:', error.response?.data || error.message);
      console.error('Status Code:', error.response?.status);
    } else {
      console.error('Unexpected error:', error);
    }
  }
}

testApiConnection();
