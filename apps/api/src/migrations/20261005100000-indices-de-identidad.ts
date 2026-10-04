import type { Db } from 'mongodb';

/*
 * Índices únicos de la identidad (F9-05, ADR-0012).
 *
 * Better Auth no crea índices. La identidad de una persona es el par (proveedor, id que da el
 * proveedor), y se guarda en la colección `account`: sin un índice único, dos callbacks simultáneos
 * del mismo ingreso nuevo —un doble toque, un reintento del navegador— pueden crear dos cuentas.
 * El email de `user` también va único: con la vinculación apagada, un email repetido es justo lo
 * que no tiene que pasar, y hoy sólo lo impide el código, no la base.
 *
 * Si la base ya tiene repetidos de antes, falla con un error de clave duplicada en vez de dejar un
 * índice a medias: no hay datos de producción (ADR-0012) y las bases de desarrollo con cuentas
 * viejas se borran.
 *
 * Los nombres de colección están escritos acá y no importados: una migración describe un momento.
 */

const ACCOUNT_INDEX = 'account_provider_account';
const USER_EMAIL_INDEX = 'user_email';

/** Código de Mongo para "index not found" / "ns not found": no había nada que borrar. */
const NOTHING_TO_DROP = new Set([26, 27]);

async function dropIfPresent(db: Db, collection: string, name: string): Promise<void> {
  try {
    await db.collection(collection).dropIndex(name);
  } catch (error) {
    const code = (error as { code?: number }).code;
    if (code === undefined || !NOTHING_TO_DROP.has(code)) throw error;
  }
}

export async function up(db: Db): Promise<void> {
  await db
    .collection('account')
    .createIndex({ providerId: 1, accountId: 1 }, { unique: true, name: ACCOUNT_INDEX });
  await db.collection('user').createIndex({ email: 1 }, { unique: true, name: USER_EMAIL_INDEX });
}

export async function down(db: Db): Promise<void> {
  await dropIfPresent(db, 'account', ACCOUNT_INDEX);
  await dropIfPresent(db, 'user', USER_EMAIL_INDEX);
}
