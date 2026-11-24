export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

/**
 * Validate that a string is a non-empty, genuine 3-part JWT token.
 * Prevents sending "undefined", "null", or malformed headers to the backend.
 */
export function isValidToken(token: string | null | undefined): token is string {
  if (!token) return false;
  const trimmed = token.trim();
  if (
    !trimmed ||
    trimmed === 'undefined' ||
    trimmed === 'null' ||
    trimmed === 'none'
  ) {
    return false;
  }
  // JWT tokens must have exactly 3 dot-separated base64-encoded segments
  return trimmed.split('.').length === 3;
}

interface RequestOptions extends RequestInit {
  token?: string | null;
}

export async function apiRequest<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { token, headers = {}, ...rest } = options;

  const isFormData = rest.body instanceof FormData;

  const requestHeaders: Record<string, string> = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(headers as Record<string, string>),
  };

  // When submitting FormData, let the browser compute the multipart boundary header automatically
  if (isFormData && requestHeaders['Content-Type']) {
    delete requestHeaders['Content-Type'];
  }

  // Only attach Authorization header if the token is a verified, non-empty JWT
  if (token && isValidToken(token)) {
    requestHeaders['Authorization'] = `Bearer ${token.trim()}`;
  }

  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    headers: requestHeaders,
    ...rest,
  });

  if (!response.ok) {
    let errorMessage = `HTTP error ${response.status}: ${response.statusText}`;
    try {
      const errorJson = await response.json();
      if (errorJson.detail) {
        errorMessage = typeof errorJson.detail === 'string'
          ? errorJson.detail
          : JSON.stringify(errorJson.detail);
      }
    } catch {
      // Ignore json parse error
    }
    throw new Error(errorMessage);
  }

  return response.json() as Promise<T>;
}
