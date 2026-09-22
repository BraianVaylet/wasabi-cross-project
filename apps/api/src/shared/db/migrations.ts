import { dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config, down, status, up } from 'migrate-mongo';
import type { Db, MongoClient } from 'mongodb';

/**
 * Migraciones versionadas y reversibles con migrate-mongo (spec §12, ADR-0005).
 *
 * Las migraciones viven en `src/migrations` como TypeScript. Este módulo se ubica según
 * desde dónde corre: en desarrollo y en los tests, desde `src/` con archivos `.ts`; en
 * producción, desde `dist/` con los `.js` compilados. Así producción no depende de
 * interpretar TypeScript en runtime.
 */
const HERE = fileURLToPath(import.meta.url);
const MIGRATIONS_DIR = join(dirname(HERE), '..', '..', 'migrations');
const MIGRATION_EXTENSION = extname(HERE);
const CHANGELOG_COLLECTION = 'migrations_changelog';

function configure(): void {
  config.set({
    mongodb: {
      // No se usa: la API le pasa a migrate-mongo su propia conexión (`db`, `client`), y
      // esta URL sólo sirve si la librería abriera una por su cuenta.
      url: 'no-se-usa: la conexion la inyecta la API',
    },
    // Todo archivo de esa carpeta es una migración, tests incluidos: los tests de una
    // migración viven acá al lado (`*.migration.test.ts`), no dentro de `migrations/`.
    migrationsDir: MIGRATIONS_DIR,
    migrationFileExtension: MIGRATION_EXTENSION,
    changelogCollectionName: CHANGELOG_COLLECTION,
    // El lock de migrate-mongo no es atómico (primero consulta si existe, después
    // inserta), así que no alcanza para dos instancias arrancando a la vez. Por eso las
    // migraciones corren una sola vez por deploy, antes de levantar la API (ADR-0005).
    // Queda activo igual, como segunda red.
    lockCollectionName: 'migrations_lock',
    lockTtl: 300,
    useFileHash: false,
    moduleSystem: 'esm',
  });
}

/**
 * migrate-mongo registra cada migración con su extensión: `…-indices.ts` si corrió desde
 * `src/`, `…-indices.js` si corrió desde `dist/`. Una base migrada en un modo y después
 * corrida en el otro vería todo como pendiente, y aplicaría dos veces cada migración:
 * inofensivo para un índice, destructivo para una que renombra un campo.
 *
 * No hay forma de que migrate-mongo ignore la extensión, así que se prohíbe mezclar.
 */
async function assertSameMode(db: Db): Promise<void> {
  const other = MIGRATION_EXTENSION === '.ts' ? '.js' : '.ts';
  const foreign = await db
    .collection(CHANGELOG_COLLECTION)
    .countDocuments({ fileName: other === '.js' ? /\.js$/ : /\.ts$/ });

  if (foreign > 0) {
    throw new Error(
      `Esta base se migró con archivos ${other} y ahora se está corriendo con ${MIGRATION_EXTENSION}. ` +
        'Usá siempre el mismo modo contra la misma base: `migrate` (src) en desarrollo, ' +
        '`migrate:dist` en los ambientes desplegados.',
    );
  }
}

/** Aplica todas las migraciones pendientes, en orden. Devuelve las que aplicó. */
export async function migrateUp(db: Db, client: MongoClient): Promise<string[]> {
  configure();
  await assertSameMode(db);
  return up(db, client);
}

/** Revierte la última migración aplicada. Devuelve la que revirtió. */
export async function migrateDown(db: Db, client: MongoClient): Promise<string[]> {
  configure();
  await assertSameMode(db);
  return down(db, client);
}

/** Migraciones que existen en el código y todavía no se aplicaron en esta base. */
export async function pendingMigrations(db: Db): Promise<string[]> {
  configure();
  await assertSameMode(db);
  const items = await status(db);

  return items.filter((item) => item.appliedAt === 'PENDING').map((item) => item.fileName);
}

/**
 * Para `/ready`: una instancia con migraciones pendientes no debe recibir tráfico.
 * Sin esto, un deploy que se saltó la migración correría sin sus índices únicos y
 * aceptaría duplicados sin avisar.
 */
export function migrationsProbe(db: Db): { name: string; check: () => Promise<boolean> } {
  return {
    name: 'migraciones',
    check: async () => {
      try {
        return (await pendingMigrations(db)).length === 0;
      } catch {
        return false;
      }
    },
  };
}
