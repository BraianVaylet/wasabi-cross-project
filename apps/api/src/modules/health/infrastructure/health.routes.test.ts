import { MongoMemoryServer } from 'mongodb-memory-server';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../../app.ts';
import { connectMongo, type MongoConnection } from '../../../shared/db/mongo.ts';
import { testEnv } from '../../../test/env.ts';

describe('health checks', () => {
  let mongod: MongoMemoryServer;
  let mongo: MongoConnection;
  let app: FastifyInstance;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    mongo = await connectMongo(testEnv({ MONGODB_URI: mongod.getUri() }));
    app = await buildApp({
      env: testEnv({ MONGODB_URI: mongod.getUri() }),
      probes: [{ name: 'mongo', check: mongo.ping }],
    });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    await mongo.close();
    await mongod.stop();
  });

  it('GET /health responde 200 con Mongo arriba', async () => {
    const response = await app.inject({ method: 'GET', url: '/health' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ status: 'ok' });
  });

  it('GET /ready responde 200 con Mongo arriba', async () => {
    const response = await app.inject({ method: 'GET', url: '/ready' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      status: 'ready',
      checks: [{ name: 'mongo', ok: true }],
    });
  });

  describe('con Mongo caído', () => {
    beforeAll(async () => {
      await mongod.stop();
    });

    it('GET /ready responde 503: el orquestador no debe enrutar tráfico acá', async () => {
      const response = await app.inject({ method: 'GET', url: '/ready' });

      expect(response.statusCode).toBe(503);
      expect(response.json()).toEqual({
        status: 'not-ready',
        checks: [{ name: 'mongo', ok: false }],
      });
    });

    it('GET /health sigue en 200: el proceso está vivo aunque Mongo no esté', async () => {
      const response = await app.inject({ method: 'GET', url: '/health' });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toMatchObject({ status: 'ok' });
    });
  });
});
