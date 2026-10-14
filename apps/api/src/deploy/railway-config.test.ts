import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import railway from '../../../../.railway/railway.ts';

/*
 * F3-04 y F10-12: la configuración de Railway (`.railway/railway.ts`) es código, así que se prueba
 * como código. Estas son las cosas que, si alguien las cambia sin darse cuenta, se rompen en
 * producción y no en CI. Son dos servicios del mismo repo: la app (la API, que sirve el front) y la
 * landing (un servidor estático aparte, ADR-0013).
 */

const APP = 'wasabi-cross';
const LANDING = 'wasabi-cross-landing';
const AMBIENTES = ['production', 'staging'] as const;

/** La raíz del repo: los comandos de Railway se corren desde ahí. */
const RAIZ = fileURLToPath(new URL('../../../../', import.meta.url));

interface Variable {
  type: string;
  value?: string;
}

interface ServiceResource {
  type: string;
  name: string;
  source: { type: string; repo: string; branch: string };
  build?: { buildCommand?: string; watchPatterns?: string[] };
  deploy: {
    startCommand: string;
    preDeployCommand?: string[];
    healthcheckPath: string;
    healthcheckTimeout?: number;
  };
  variables: Record<string, Variable>;
}

function serviciosEn(environment: string): ServiceResource[] {
  const grafo = (railway as unknown as (ctx: { environment: string }) => { resources: unknown[] })({
    environment,
  });
  return grafo.resources.filter(
    (resource): resource is ServiceResource =>
      typeof resource === 'object' &&
      resource !== null &&
      'type' in resource &&
      resource.type === 'service',
  );
}

function servicioEn(environment: string, name: string): ServiceResource {
  const servicio = serviciosEn(environment).find((s) => s.name === name);
  if (!servicio) {
    throw new Error(`La config de ${environment} no declara el servicio ${name}`);
  }
  return servicio;
}

describe.each(AMBIENTES)('Railway, ambiente %s: los dos servicios (F10-12)', (environment) => {
  it('declara la app y la landing, y ningún servicio más', () => {
    expect(
      serviciosEn(environment)
        .map((servicio) => servicio.name)
        .sort(),
    ).toEqual([APP, LANDING]);
  });

  it('los dos se construyen desde el repo, rama main', () => {
    for (const name of [APP, LANDING]) {
      expect(servicioEn(environment, name).source, name).toMatchObject({
        type: 'github',
        repo: 'BraianVaylet/wasabi-cross-project',
        branch: 'main',
      });
    }
  });

  it('la app no compila la landing, y la landing no compila la API ni el front', () => {
    const app = servicioEn(environment, APP).build?.buildCommand ?? '';
    const landing = servicioEn(environment, LANDING).build?.buildCommand ?? '';

    // Cada uno, con sus dependencias (`...`): schemas y ui salen en los dos, a propósito.
    expect(app).toContain('@wasabi-cross/api...');
    expect(app).toContain('@wasabi-cross/web...');
    expect(app).not.toContain('landing');
    expect(app).not.toBe('pnpm build');

    expect(landing).toContain('@wasabi-cross/landing...');
    expect(landing).not.toContain('@wasabi-cross/api');
    expect(landing).not.toContain('@wasabi-cross/web');
  });

  it('un cambio de copy no redeploya la API, y uno de la API no redeploya la landing', () => {
    const app = servicioEn(environment, APP).build?.watchPatterns ?? [];
    const landing = servicioEn(environment, LANDING).build?.watchPatterns ?? [];

    expect(app).toEqual(expect.arrayContaining(['apps/api/**', 'apps/web/**', 'packages/**']));
    expect(app).not.toContain('apps/landing/**');

    expect(landing).toEqual(expect.arrayContaining(['apps/landing/**', 'packages/**']));
    expect(landing).not.toContain('apps/api/**');
    expect(landing).not.toContain('apps/web/**');
  });

  it('los dos redeployan si cambian las dependencias o la propia configuración', () => {
    for (const name of [APP, LANDING]) {
      expect(servicioEn(environment, name).build?.watchPatterns, name).toEqual(
        expect.arrayContaining([
          'pnpm-lock.yaml',
          'pnpm-workspace.yaml',
          'package.json',
          '.railway/**',
        ]),
      );
    }
  });
});

describe.each(AMBIENTES)('Railway, ambiente %s: la app (F3-04)', (environment) => {
  const servicio = servicioEn(environment, APP);

  it('arranca compilado: nada de tsx ni de dependencias de desarrollo', () => {
    expect(servicio.deploy.startCommand).toBe('node apps/api/dist/server.js');
  });

  it('migra antes de recibir tráfico, con las migraciones compiladas (ADR-0005)', () => {
    expect(servicio.deploy.preDeployCommand?.[0]).toBe(
      'pnpm --filter @wasabi-cross/api migrate:dist up',
    );
  });

  it('siembra el catálogo después de migrar, compilado: sin eso el ambiente arranca vacío (F3-13)', () => {
    // El orden importa: el seed se niega a correr con migraciones pendientes, y si las migraciones
    // fallan el preDeploy se corta antes de llegar a él.
    expect(servicio.deploy.preDeployCommand).toEqual([
      'pnpm --filter @wasabi-cross/api migrate:dist up',
      'pnpm --filter @wasabi-cross/api seed:dist',
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

  it('las credenciales de OAuth también se preservan: nunca escritas acá (F9-10)', () => {
    for (const credencial of [
      'GOOGLE_CLIENT_ID',
      'GOOGLE_CLIENT_SECRET',
      'MICROSOFT_CLIENT_ID',
      'MICROSOFT_CLIENT_SECRET',
    ]) {
      expect(servicio.variables[credencial], credencial).toEqual({ type: 'preserve' });
    }
  });

  it('el IdP de desarrollo no está declarado, ni el atajo de Microsoft: aceptaría a cualquiera', () => {
    expect(servicio.variables.OAUTH_DEV_IDP).toBeUndefined();
    expect(servicio.variables.MICROSOFT_AUTHORITY).toBeUndefined();
  });

  it('el límite de intentos de login no se apaga (spec §13)', () => {
    expect(servicio.variables.AUTH_RATE_LIMIT?.value).not.toBe('off');
  });
});

describe.each(AMBIENTES)('Railway, ambiente %s: la landing (F10-12)', (environment) => {
  const servicio = servicioEn(environment, LANDING);

  it('arranca el servidor estático de F10-11, que existe', () => {
    expect(servicio.deploy.startCommand).toBe('node apps/landing/server/server.ts');
    // El comando se corre desde la raíz del repo: si alguien mueve o renombra el archivo, esto avisa.
    expect(existsSync(`${RAIZ}apps/landing/server/server.ts`)).toBe(true);
  });

  it('el chequeo de salud es /health: no hay base de datos de la que depender', () => {
    expect(servicio.deploy.healthcheckPath).toBe('/health');
  });

  it('no migra nada antes de moverse: es un sitio estático', () => {
    expect(servicio.deploy.preDeployCommand ?? []).toEqual([]);
  });

  it('escucha en todas las interfaces', () => {
    expect(servicio.variables.HOST).toEqual({ type: 'literal', value: '0.0.0.0' });
  });

  it('no declara NODE_ENV: con `production` el build no instalaría astro, que es de desarrollo', () => {
    expect(servicio.variables.NODE_ENV).toBeUndefined();
  });

  it('LANDING_INDEXABLE es 1 sólo en production: el resto se publica sin indexar', () => {
    const esperado = environment === 'production' ? '1' : '0';

    expect(servicio.variables.LANDING_INDEXABLE).toEqual({ type: 'literal', value: esperado });
  });

  it('las URLs públicas dependen del dominio y se cargan en Railway, no acá', () => {
    expect(servicio.variables.PUBLIC_SITE_URL).toEqual({ type: 'preserve' });
    expect(servicio.variables.PUBLIC_APP_URL).toEqual({ type: 'preserve' });
  });

  it('el contacto de las páginas legales son datos de una persona: se cargan en Railway, no acá', () => {
    // Sin ellas, con LANDING_INDEXABLE=1 el build de la landing falla (F10-09, `contacto.ts`).
    expect(servicio.variables.PUBLIC_CONTACT_NAME).toEqual({ type: 'preserve' });
    expect(servicio.variables.PUBLIC_CONTACT_EMAIL).toEqual({ type: 'preserve' });
  });

  it('no declara ningún secreto ni nada de la base: es un sitio público', () => {
    const permitidas = [
      'HOST',
      'LOG_LEVEL',
      'LANDING_INDEXABLE',
      'PUBLIC_SITE_URL',
      'PUBLIC_APP_URL',
      'PUBLIC_CONTACT_NAME',
      'PUBLIC_CONTACT_EMAIL',
    ];

    expect(Object.keys(servicio.variables).sort()).toEqual([...permitidas].sort());
    expect(servicio.variables.MONGODB_URI).toBeUndefined();
    expect(servicio.variables.BETTER_AUTH_SECRET).toBeUndefined();
    // Las únicas que se preservan son las de build, públicas: las dos URLs y el contacto legal.
    const preservadas = Object.entries(servicio.variables)
      .filter(([, variable]) => variable.type === 'preserve')
      .map(([nombre]) => nombre);
    expect(preservadas.sort()).toEqual([
      'PUBLIC_APP_URL',
      'PUBLIC_CONTACT_EMAIL',
      'PUBLIC_CONTACT_NAME',
      'PUBLIC_SITE_URL',
    ]);
  });
});

describe('los scripts compilados que usa el preDeploy (F3-13)', () => {
  const scripts = (
    JSON.parse(readFileSync(`${RAIZ}apps/api/package.json`, 'utf8')) as {
      scripts: Record<string, string>;
    }
  ).scripts;

  // Cada `<nombre>:dist` corre `node dist/scripts/<archivo>.js`, que el build emite desde
  // `src/scripts/<archivo>.ts` (`rootDir: ./src`). Un script con otro nombre, o un archivo que
  // se mueve fuera de `src/`, rompería el deploy en el preDeploy y no en CI.
  it.each([
    ['migrate:dist', 'migrate'],
    ['seed:dist', 'seed'],
  ])('%s corre el archivo compilado y ese archivo existe en src/scripts', (nombre, archivo) => {
    expect(scripts[nombre]).toBe(`node dist/scripts/${archivo}.js`);
    expect(existsSync(`${RAIZ}apps/api/src/scripts/${archivo}.ts`)).toBe(true);
  });
});

describe('una base por ambiente', () => {
  it('staging no comparte base con prod: tiene datos sintéticos', () => {
    const prod = servicioEn('production', APP).variables.MONGODB_DB_NAME;
    const staging = servicioEn('staging', APP).variables.MONGODB_DB_NAME;

    expect(prod?.value).toBe('wasabi_cross');
    expect(staging?.value).toBe('wasabi_cross_staging');
  });
});
