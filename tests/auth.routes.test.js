jest.mock('../src/services/auth.service', () => ({
  register: jest.fn().mockResolvedValue({ accessToken: 'access', refreshToken: 'refresh', player: { id: 'p1' } }),
  login: jest.fn().mockResolvedValue({ accessToken: 'access', refreshToken: 'refresh', player: { id: 'p1' } }),
  refresh: jest.fn().mockResolvedValue({ accessToken: 'access', refreshToken: 'refresh', player: { id: 'p1' } }),
  logout: jest.fn().mockResolvedValue({ ok: true })
}));

const request = require('supertest');
const { buildApp } = require('../src/app');

describe('auth routes', () => {
  const app = buildApp();

  test('register returns tokens', async () => {
    const response = await request(app)
      .post('/auth/register')
      .send({ username: 'alice', email: 'alice@example.com', password: 'password123' });

    expect(response.status).toBe(201);
    expect(response.body.accessToken).toBe('access');
  });

  test('login returns tokens', async () => {
    const response = await request(app)
      .post('/auth/login')
      .send({ identifier: 'alice@example.com', password: 'password123' });

    expect(response.status).toBe(200);
    expect(response.body.refreshToken).toBe('refresh');
  });
});