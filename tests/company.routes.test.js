jest.mock('../src/middleware/auth', () => ({
  authRequired: (req, _res, next) => {
    req.user = { id: 'player-1' };
    next();
  }
}));

jest.mock('../src/services/company.service', () => ({
  getCompany: jest.fn().mockResolvedValue({ id: 'company-1', ownerId: 'player-1', name: 'Daily Byte', level: 1, reputation: 50 }),
  createCompany: jest.fn().mockResolvedValue({ id: 'company-1', ownerId: 'player-1', name: 'Daily Byte', level: 1, reputation: 50 }),
  upgradeCompany: jest.fn().mockResolvedValue({ id: 'company-1', ownerId: 'player-1', name: 'Daily Byte', level: 2, reputation: 55 })
}));

const request = require('supertest');
const { buildApp } = require('../src/app');

describe('company routes', () => {
  const app = buildApp();

  test('fetches company', async () => {
    const response = await request(app).get('/company');
    expect(response.status).toBe(200);
    expect(response.body.company.name).toBe('Daily Byte');
  });

  test('creates company', async () => {
    const response = await request(app).post('/company/create').send({ name: 'Daily Byte' });
    expect(response.status).toBe(201);
    expect(response.body.company.level).toBe(1);
  });

  test('upgrades company', async () => {
    const response = await request(app).post('/company/upgrade').send({});
    expect(response.status).toBe(200);
    expect(response.body.company.level).toBe(2);
  });
});