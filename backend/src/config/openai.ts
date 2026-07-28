import OpenAI from 'openai';
import dotenv from 'dotenv';
import path from 'path';

// Load .env from the backend root directory
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const apiKey = process.env.OPENAI_API_KEY;

if (!apiKey) {
  console.error('ERROR: OPENAI_API_KEY is not defined in environment variables. AI operations will fail.');
  console.error('Please ensure your .env file contains a valid OPENAI_API_KEY');
} else {
  console.log('OpenAI API key loaded successfully');
}

import http from 'http';
import https from 'https';

// Keep-alive agent pool for high concurrency and minimal connection handshake overhead
const keepAliveAgent = new https.Agent({
  keepAlive: true,
  maxSockets: 150,
  maxFreeSockets: 50,
  timeout: 60000, // 60 seconds socket timeout
});

// Initialize official OpenAI SDK client with connection pooling agent
export const openai = new OpenAI({
  apiKey: apiKey,
  httpAgent: keepAliveAgent
});

// Configure default model targeting
export const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o';
