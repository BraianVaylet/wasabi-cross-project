import type { Db } from 'mongodb';
import type { UserRegistrar } from '../domain/user-registrar.ts';

/**
 * Un usuario fijo con plan Max, para tener siempre a mano en desarrollo sin pasar por un
 * proveedor de pago que todavía no existe (STATE.md, decisiones abiertas). La corre
 * `src/scripts/seed-admin.ts` (a mano, las veces que haga falta) y `scripts/ephemeral.ts`
 * (en cada arranque, porque ahí los datos no sobreviven un reinicio).
 */

interface UserDocument {
  _id: string;
  email: string;
  plan?: string;
}

export interface SeedAdminOptions {
  email?: string | undefined;
  password?: string | undefined;
  name?: string | undefined;
}

const DEFAULTS = {
  email: 'admin@wasabicross.dev',
  password: 'wasabi-cross-admin-dev',
  name: 'Admin',
};

/** Crea (si no existe) el usuario admin y le asegura el plan Max. Idempotente. */
export async function seedAdmin(
  registrar: UserRegistrar,
  db: Db,
  options: SeedAdminOptions = {},
): Promise<{ email: string; created: boolean }> {
  const email = options.email ?? DEFAULTS.email;
  const password = options.password ?? DEFAULTS.password;
  const name = options.name ?? DEFAULTS.name;

  const users = db.collection<UserDocument>('user');
  const existing = await users.findOne({ email });

  if (!existing) {
    // Por Better Auth (UserRegistrar), no un insert directo: así el hash de la contraseña
    // queda igual que el de cualquier otro usuario, y entra por el mismo camino que un
    // registro real.
    await registrar.signUp({ email, password, name });
  }

  await users.updateOne({ email }, { $set: { plan: 'max' } });

  return { email, created: !existing };
}
