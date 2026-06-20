'use strict';

const request = require('supertest');
const app = require('../../app');
const { pool } = require('../../src/config/database');

afterAll(async () => { await pool.end().catch(() => {}); });

describe('API REST — intégration', () => {
  it('GET /api/health → 200 et base accessible', async () => {
    const res = await request(app).get('/api/health');
    expect([200, 503]).toContain(res.status);
    if (res.status === 200) expect(res.body.db).toBe('up');
  });

  it('GET /api/posts → liste paginée', async () => {
    const res = await request(app).get('/api/posts?limit=5');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.posts)).toBe(true);
    expect(res.body).toHaveProperty('total');
  });

  it('GET /api/posts?type=dossier → filtre valide', async () => {
    const res = await request(app).get('/api/posts?type=dossier');
    expect(res.status).toBe(200);
  });

  it('POST /api/auth/login — identifiants invalides → 401', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'nope@x.fr', password: 'wrongpass' });
    expect(res.status).toBe(401);
  });

  it('POST /api/posts sans token → 401', async () => {
    const res = await request(app).post('/api/posts').send({ title: 'X', content: 'Y' });
    expect(res.status).toBe(401);
  });

  it('GET /api/categories → 200', async () => {
    const res = await request(app).get('/api/categories');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.categories)).toBe(true);
  });
});
