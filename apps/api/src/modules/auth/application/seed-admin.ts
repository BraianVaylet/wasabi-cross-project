import type { Db } from 'mongodb';
import type { IdentityStore } from '../domain/identity-store.ts';

/**
 * Un usuario fijo con plan Pro, para tener siempre a mano en desarrollo sin pasar por un
 * proveedor de pago que todavía no existe (STATE.md, decisiones abiertas). Lo corren
 * `scripts/seed-admin.ts` (a mano, las veces que haga falta) y `scripts/ephemeral.ts` (en cada
 * arranque, porque ahí los datos no sobreviven un reinicio).
 *
 * Sin contraseña (ADR-0012): el usuario queda ligado a la cuenta de un proveedor, y quien lo corre
 * decide cuál. En desarrollo es la del IdP falso, que ofrece a este admin cargado por defecto.
 */

interface UserDocument {
  _id: string;
  email: string;
  plan?: string;
}

interface AccountDocument {
  userId: string;
  providerId: string;
  accountId: string;
}

export interface SeedAdminOptions {
  email: string;
  name: string;
  /** El proveedor al que se liga: `fake-idp` en desarrollo. */
  providerId: string;
  /** El id que ese proveedor da a esta cuenta (el `sub` de su ID token). */
  accountId: string;
}

/**
 * Crea (si no existe) el usuario admin, lo liga a su cuenta del proveedor y le asegura el plan Pro.
 * Idempotente: correrlo de nuevo no duplica nada.
 */
export async function seedAdmin(
  store: IdentityStore,
  db: Db,
  { email, name, providerId, accountId }: SeedAdminOptions,
): Promise<{ email: string; created: boolean }> {
  const users = db.collection<UserDocument>('user');
  const accounts = db.collection<AccountDocument>('account');

  const existing = await users.findOne({ email });
  const userId = existing?._id ?? (await store.createUser({ email, name }));

  const linked = await accounts.findOne({ providerId, accountId });
  if (!linked) {
    await store.linkAccount({ userId, providerId, accountId });
  } else if (linked.userId !== userId) {
    // Entrar con esa cuenta abriría la sesión de otro usuario: mejor frenar que adivinar.
    throw new Error(
      `La cuenta ${providerId}:${accountId} ya está ligada a otro usuario; el admin ${email} no se toca.`,
    );
  }

  await users.updateOne({ email }, { $set: { plan: 'pro' } });

  return { email, created: !existing };
}
