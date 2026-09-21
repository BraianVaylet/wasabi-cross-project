import { z } from 'zod';
import { userSchema } from './user.schema.ts';

/*
 * Contratos de login y registro (F1-10). El front valida con esto antes de llamar, y la
 * API configura Better Auth con los mismos largos: una sola fuente, sin números repetidos.
 */

/** Más largo que el default de 8: una frase corta se recuerda mejor y se rompe peor. */
export const PASSWORD_MIN_LENGTH = 10;
export const PASSWORD_MAX_LENGTH = 128;

export const passwordSchema = z
  .string()
  .min(
    PASSWORD_MIN_LENGTH,
    `La contraseña necesita al menos ${String(PASSWORD_MIN_LENGTH)} caracteres`,
  )
  .max(PASSWORD_MAX_LENGTH, `Como máximo ${String(PASSWORD_MAX_LENGTH)} caracteres`);

/**
 * Entrar (mockup 2). La contraseña sólo tiene que estar: el largo mínimo es para elegirla,
 * no para verificarla, y exigirlo acá dejaría afuera a quien la eligió con otras reglas.
 */
export const signInSchema = z.object({
  email: userSchema.shape.email,
  password: z.string().min(1, 'Ingresá tu contraseña'),
});

export type SignIn = z.infer<typeof signInSchema>;

/**
 * Registrarse (mockup 3). El "Username" del mockup es el **nombre visible** (el del
 * "Hi, Braian!" de Home), no un identificador para entrar (spec §5).
 */
export const signUpSchema = z
  .object({
    email: userSchema.shape.email,
    name: userSchema.shape.name,
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'Repetí la contraseña'),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  });

export type SignUp = z.infer<typeof signUpSchema>;

/** Lo que viaja a la API: la confirmación se queda en el formulario. */
export type SignUpRequest = Omit<SignUp, 'confirmPassword'>;
