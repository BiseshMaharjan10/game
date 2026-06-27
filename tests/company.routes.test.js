jest.mock('../src/middleware/auth', () => ({
  authRequired: (req, _res, next) => {
    req.user = { id: 'player-1' };
    next();
  }
}));

jest.mock('../src/services/company.service', () => ({
  getCompany: jest.fn().mockResolvedValue({ id: 'company-1', ownerId: 'player-1', name: 'Daily Byte', level: 1, reputation: 50 }),
  createCompany: jest.fn().mockResolvedValue({ id: 'company-1', ownerId: 'player-1', name: 'Daily Byte', level: 1, reputation: 50 }),
  upgradeCompany: jest.fn().mockResolvedValue({ id: 'company-1', ownerId: 'player-1', name: 'Daily Byte', level: 2, reputation: 55 }),
  syncPlayerCompanyValue: jest.fn().mockResolvedValue({ id: 'player-1', money: 1000, trustScore: 50 })
}));

const request = require('supertest');
const { buildApp } = require('../src/app');

describe('company routes', () => {
  const app = buildApp();

  test('fetches company', async () => {
    const response = await request(app).get('/company');
    expect(response.status).toBe(200);
    expect(response.body.name).toBe('Daily Byte');
    expect(response.body.coins).toBeDefined();
    expect(response.body.unlocked_desks).toBeDefined();
  });

  test('creates company', async () => {
    const response = await request(app).post('/company/create').send({ name: 'Daily Byte' });
    expect(response.status).toBe(201);
    expect(response.body.name).toBe('Daily Byte');
    expect(response.body.message).toBe('Company created');
  });

  test('upgrades company', async () => {
    const response = await request(app).post('/company/upgrade').send({});
    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Desk purchased');
    expect(response.body.unlocked_desks).toBeDefined();
  });
});

describe('system routes', () => {
  const app = buildApp();

  test('returns health contract', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('healthy');
    expect(response.body.game).toBe('Press & Influence — Five Grayon');
    expect(response.body.version).toBe('1.0.0');
  });
});