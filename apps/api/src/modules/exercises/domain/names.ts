/*
 * La forma de comparar nombres de ejercicios vive en @wasabi-cross/schemas: es la misma
 * regla que usa el buscador del catálogo en el front (F1-12), y no puede haber dos.
 */
export { nameMatches, normalizeName, sameName } from '@wasabi-cross/schemas';
