import { z } from 'zod';

const HTML_TAG = /<[^>]*>/;

/**
 * Texto libre del usuario (notas, descripciones). No aceptamos HTML: en ningún lado de
 * la app se renderiza markup cargado por el usuario, así que se rechaza en el borde en
 * vez de sanitizarlo después y esperar no haber olvidado un caso (spec §13).
 */
export function plainText(maxLength: number) {
  return z
    .string()
    .trim()
    .max(maxLength, `Como máximo ${String(maxLength)} caracteres`)
    .refine((value) => !HTML_TAG.test(value), 'No se permite HTML en este campo');
}
