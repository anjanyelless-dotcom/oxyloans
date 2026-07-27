import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.OPENAI_API_KEY;

if (!apiKey) {
  console.warn('WARNING: OPENAI_API_KEY is not defined in environment variables. AI operations will fail.');
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
  apiKey: apiKey || 'dummy-api-key-placeholder',
  httpAgent: keepAliveAgent
});

// Configure default model targeting
export const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o';
