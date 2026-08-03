export function jsonRequest(
  url: string,
  options: {
    method?: string;
    body?: unknown;
    token?: string;
    headers?: Record<string, string>;
  } = {},
): Request {
  const { method = 'GET', body, token, headers = {} } = options;
  const reqHeaders: Record<string, string> = {
    ...headers,
  };

  if (body !== undefined) {
    reqHeaders['Content-Type'] = 'application/json';
  }

  if (token) {
    reqHeaders.Authorization = `Bearer ${token}`;
  }

  return new Request(url, {
    method,
    headers: reqHeaders,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

export async function parseJson<T = unknown>(response: Response): Promise<T> {
  return response.json() as Promise<T>;
}

export function bearer(userId: string, role: number, signAuthToken: (claims: { user_id: string; role: number }) => string) {
  return signAuthToken({ user_id: userId, role });
}
