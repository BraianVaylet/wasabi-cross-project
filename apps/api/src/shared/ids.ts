import { randomBytes } from 'node:crypto';

const ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';
const ID_LENGTH = 16;

/**
 * Genera un ID de dominio con prefijo (ver ADR-0004). Aleatorio y no secuencial:
 * no filtra cuántos recursos hay ni deja enumerar probando IDs contiguos.
 */
export function generateId(prefix: string): string {
  const bytes = randomBytes(ID_LENGTH);
  let id = '';

  for (const byte of bytes) {
    id += ALPHABET.charAt(byte % ALPHABET.length);
  }

  return `${prefix}_${id}`;
}
