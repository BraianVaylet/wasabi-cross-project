import type { ExerciseUsage } from './exercise-entitlement.ts';

/*
 * Puertos del módulo `subscriptions`. `Tx` es la transacción, genérica a propósito: el
 * dominio y la aplicación no saben que del otro lado hay una `ClientSession` de Mongo.
 */

/**
 * Corre `work` de forma exclusiva para un usuario: dos llamadas simultáneas del mismo
 * usuario no se pisan, y las de usuarios distintos no se esperan entre sí.
 *
 * Es lo que evita que dos altas simultáneas con 9 ejercicios dejen al usuario con 11.
 */
export interface UserSerializer<Tx> {
  runExclusive: <T>(userId: string, work: (tx: Tx) => Promise<T>) => Promise<T>;
}

/**
 * Cuenta los ejercicios de un usuario dentro de la transacción. Lo implementa el módulo
 * `exercises`, que es el dueño de esos datos, y llega inyectado: `subscriptions` no
 * conoce su modelo.
 */
export interface ExerciseUsageCounter<Tx> {
  count: (userId: string, tx: Tx) => Promise<ExerciseUsage>;
}
