import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

export const handlers = [
  http.get('http://localhost:3000/api/v1/trips', () => {
    return HttpResponse.json([]);
  }),
  http.post('http://localhost:3000/api/v1/auth/login', async ({ request }) => {
    const body = (await request.json()) as { email?: string; password?: string };
    if (body.email === 'good@test.com' && body.password === 'password') {
      return HttpResponse.json({ token: 'mock-jwt-token' });
    }
    return HttpResponse.json({ error: 'invalid credentials' }, { status: 401 });
  }),
  http.get('http://localhost:3000/api/v1/auth/me', ({ request }) => {
    const auth = request.headers.get('Authorization');
    if (!auth?.startsWith('Bearer ')) {
      return HttpResponse.json({ error: 'Missing Authorization header' }, { status: 401 });
    }
    return HttpResponse.json({
      id: 'user-1',
      email: 'good@test.com',
      role: 0,
      first_name: 'Test',
      last_name: 'User',
    });
  }),
];

export const server = setupServer(...handlers);
