import type { Profile, ProfileInput } from '../validation/schemas';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

export class APIError extends Error {
  public readonly code: string;
  public readonly status: number;
  public readonly details?: Array<{ field: string; message: string }>;

  constructor(
    status: number,
    code: string,
    message: string,
    details?: Array<{ field: string; message: string }>
  ) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Reusable core fetch wrapper that handles JSON parsing, network errors,
 * validation errors, and standardized response formatting.
 */
async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${BASE_URL}${path}`;
  
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const config: RequestInit = {
    ...options,
    headers,
  };

  try {
    const response = await fetch(url, config);
    
    let body: any = null;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      body = await response.json();
    }

    if (!response.ok) {
      const errorMsg = body?.message || `HTTP Request failed with status ${response.status}`;
      const errorCode = body?.code || 'HTTP_ERROR';
      const errorDetails = body?.details || undefined;
      throw new APIError(response.status, errorCode, errorMsg, errorDetails);
    }

    // Standard wrap in controllers is { status: 'success', data: ... }
    if (body && body.status === 'success' && 'data' in body) {
      return body.data as T;
    }

    return body as T;
  } catch (error) {
    if (error instanceof APIError) {
      throw error;
    }
    const message = error instanceof Error ? error.message : 'Unable to connect to the server.';
    throw new APIError(500, 'NETWORK_ERROR', message);
  }
}

export const apiClient = {
  get: <T>(path: string, options?: RequestInit) => 
    request<T>(path, { ...options, method: 'GET' }),
    
  post: <T, D = any>(path: string, data: D, options?: RequestInit) =>
    request<T>(path, {
      ...options,
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Simplified interview API
  setProfile: async (profile: ProfileInput) => 
    request('/interviews/profile', {
      method: 'POST',
      body: JSON.stringify(profile),
    }),

  getProfile: async () => 
    request<Profile>('/interviews/profile', {
      method: 'GET',
    }),

  ask: async (question: string, conversationHistory?: Array<{role: 'user' | 'assistant', content: string}>) => 
    request('/interviews/ask', {
      method: 'POST',
      body: JSON.stringify({ question, conversationHistory }),
    }),

  resetProfile: async () => 
    request('/interviews/profile', {
      method: 'DELETE',
    }),

  // Streaming interview API
  askStream: async (question: string, conversationHistory?: Array<{role: 'user' | 'assistant', content: string}>, onToken?: (token: string) => void) => {
    const url = `${BASE_URL}/interviews/ask-stream`;
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ question, conversationHistory }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new APIError(response.status, errorData.code || 'STREAM_ERROR', errorData.message || 'Stream request failed');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullAnswer = '';
      let finalData: any = null;

      if (!reader) {
        throw new APIError(500, 'STREAM_ERROR', 'Response body is not readable');
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data.trim() === '') continue;

            try {
              const parsed = JSON.parse(data);
              
              if (parsed.type === 'token' && onToken) {
                onToken(parsed.content);
                fullAnswer += parsed.content;
              } else if (parsed.type === 'done') {
                finalData = parsed;
              } else if (parsed.type === 'error') {
                throw new APIError(500, 'STREAM_ERROR', parsed.error);
              }
            } catch (e) {
              console.error('Failed to parse SSE data:', data, e);
            }
          }
        }
      }

      return finalData || { answer: fullAnswer };
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      const message = error instanceof Error ? error.message : 'Unable to connect to the server.';
      throw new APIError(500, 'NETWORK_ERROR', message);
    }
  },
};
