import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { ERROR_CATALOG, isErrorCode, type ErrorCode } from './error-codes.ts';

const DICTIONARY_PATH = fileURLToPath(new URL('../../../../../docs/error-codes.md', import.meta.url));

interface DictionaryEntry {
  code: string;
  status: number;
  userMessage: string;
}

/** Lee la tabla "Semilla" de docs/error-codes.md y devuelve sus filas. */
function readDictionary(): DictionaryEntry[] {
  const markdown = readFileSync(DICTIONARY_PATH, 'utf8');
  const rowPattern = /^\|\s*`(WC-[A-Z]+-\d{3}-\d{3})`\s*\|\s*(\d{3})\s*\|[^|]*\|\s*([^|]+?)\s*\|$/gm;

  return [...markdown.matchAll(rowPattern)].map((match) => ({
    code: match[1] ?? '',
    status: Number(match[2]),
    userMessage: match[3] ?? '',
  }));
}

describe('catálogo de códigos de error', () => {
  const dictionary = readDictionary();

  it('la tabla del diccionario se puede parsear y no está vacía', () => {
    expect(dictionary.length).toBeGreaterThan(0);
  });

  it('todo código del código fuente está documentado en docs/error-codes.md', () => {
    const documented = new Set(dictionary.map((entry) => entry.code));
    const undocumented = Object.keys(ERROR_CATALOG).filter((code) => !documented.has(code));

    expect(
      undocumented,
      `Códigos en el código sin entrada en docs/error-codes.md: ${undocumented.join(', ')}`,
    ).toEqual([]);
  });

  it('todo código documentado existe en el catálogo del código fuente', () => {
    const missing = dictionary
      .map((entry) => entry.code)
      .filter((code) => !Object.hasOwn(ERROR_CATALOG, code));

    expect(
      missing,
      `Códigos en docs/error-codes.md que no existen en ERROR_CATALOG: ${missing.join(', ')}`,
    ).toEqual([]);
  });

  it('el HTTP status y el mensaje al usuario coinciden con el diccionario', () => {
    for (const entry of dictionary) {
      const catalogEntry = ERROR_CATALOG[entry.code as ErrorCode] as
        | { status: number; userMessage: string }
        | undefined;
      expect(catalogEntry, `${entry.code} no está en ERROR_CATALOG`).toBeDefined();
      expect(catalogEntry?.status, `status de ${entry.code}`).toBe(entry.status);
      expect(catalogEntry?.userMessage, `mensaje de ${entry.code}`).toBe(entry.userMessage);
    }
  });

  it('el HTTP del código coincide con el status que declara', () => {
    for (const [code, entry] of Object.entries(ERROR_CATALOG)) {
      const httpInCode = Number(code.split('-')[2]);
      expect(entry.status, `${code} declara ${String(entry.status)} pero su nombre dice ${String(httpInCode)}`).toBe(
        httpInCode,
      );
    }
  });

  it('isErrorCode reconoce los códigos del catálogo y rechaza el resto', () => {
    expect(isErrorCode('WC-SYS-500-001')).toBe(true);
    expect(isErrorCode('WC-NOPE-500-999')).toBe(false);
    expect(isErrorCode('toString')).toBe(false);
  });
});
