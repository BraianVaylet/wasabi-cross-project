/*
 * El catálogo de códigos `WC-<MÓDULO>-<HTTP>-<NNN>` vive en @wasabi-cross/schemas, porque lo
 * usan la API y el front. `error-codes.test.ts` lo compara con docs/error-codes.md.
 */
export { ERROR_CATALOG, isErrorCode, type ErrorCode } from '@wasabi-cross/schemas';
