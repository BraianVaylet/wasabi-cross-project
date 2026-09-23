import { describe, expect, it } from 'vitest';
import railway from '../../../../.railway/railway.ts';

/*
 * F3-04: la configuración de Railway (`.railway/railway.ts`) es código, así que se prueba
 * como código. Estas son las cosas que, si alguien las cambia sin darse cuenta, se rompen en
 * producción y no en CI.
 */

interface Variable {
  type: string;
  value?: string;
}

interface ServiceResource {
  type: string;
  name: string;
  source: { type: string; repo: string; branch: string };
  build?: { buildCommand?: string };
  deploy: {
    startCommand: string;
    preDeployCommand: string[];
    healthcheckPath: string;
  };
  variables: Record<string, Variable>;
}

function servicioEn(environment: string): ServiceResource {
  const grafo = (railway as unknown as (ctx: { environment: string }) => { resources: unknown[] })({
    environment,
  });
  const servicio = grafo.resources.find(
    (resource): resource is ServiceResource =>
      typeof resource === 'object' &&
      resource !== null &&
      'type' in resource &&
      resource.type === 'service',
  );
  if (!servicio) {
    throw new Error(`La config de ${environment} no declara ningún servicio`);
  }
  return servicio;
}

describe.each(['production', 'staging'])('Railway, ambiente %s (F3-04)', (environment) => {
  const servicio = servicioEn(environment);

  it('se construye desde el repo, rama main', () => {
    expect(servicio.source).toMatchObject({
      type: 'github',
      repo: 'BraianVaylet/wasabi-cross-project',
      branch: 'main',
    });
  });

  it('arranca compilado: nada de tsx ni de dependencias de desarrollo', () => {
    expect(servicio.deploy.startCommand).toBe('node apps/api/dist/server.js');
  });

  it('migra antes de recibir tráfico, con las migraciones compiladas (ADR-0005)', () => {
    expect(servicio.deploy.preDeployCommand).toEqual([
      'pnpm --filter @wasabi-cross/api migrate:dist up',
    ]);
  });

  it('el chequeo de salud es /ready: con migraciones pendientes no tiene que recibir tráfico', () => {
    expect(servicio.deploy.healthcheckPath).toBe('/ready');
  });

  it('escucha en todas las interfaces y sirve el front (ADR-0007)', () => {
    expect(servicio.variables.HOST).toEqual({ type: 'literal', value: '0.0.0.0' });
    expect(servicio.variables.WEB_DIST_DIR).toEqual({ type: 'literal', value: 'apps/web/dist' });
    expect(servicio.variables.NODE_ENV).toEqual({ type: 'literal', value: 'production' });
  });

  it('ningún secreto está escrito en el repo: se preservan los de Railway', () => {
    for (const secreto of ['MONGODB_URI', 'BETTER_AUTH_SECRET', 'WEB_ORIGIN', 'BETTER_AUTH_URL']) {
      expect(servicio.variables[secreto], secreto).toEqual({ type: 'preserve' });
    }
  });

  it('el límite de intentos de login no se apaga (spec §13)', () => {
    expect(servicio.variables.AUTH_RATE_LIMIT?.value).not.toBe('off');
  });
});

describe('una base por ambiente', () => {
  it('staging no comparte base con prod: tiene datos sintéticos', () => {
    const prod = servicioEn('production').variables.MONGODB_DB_NAME;
    const staging = servicioEn('staging').variables.MONGODB_DB_NAME;

    expect(prod?.value).toBe('wasabi_cross');
    expect(staging?.value).toBe('wasabi_cross_staging');
  });
});
