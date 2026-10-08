/*
 * Los textos que comparten las páginas, como datos tipados y no dentro del marcado (spec §5.7). En
 * voseo es-AR, como la app (§11). El texto de cada sección vive en su propio archivo
 * (F10-05 a F10-08).
 */

export const marca = {
  nombre: 'Wasabi Cross',
  /** El renglón chico bajo el nombre, como en el header de la app. */
  lema: 'Fuerza · registro de RM',
} as const;

/** Las secciones de la página, en orden, con el `id` al que apunta la nav. */
export const secciones = [
  { id: 'registro', nombre: 'Registro' },
  { id: 'funciones', nombre: 'Funciones' },
  { id: 'planes', nombre: 'Free / PRO' },
] as const;

export const textos = {
  saltarAlContenido: 'Saltar al contenido',
  navegacion: 'Secciones',
  entrar: 'Entrar',
  empezarGratis: 'Empezar gratis',
  verLaApp: 'Ver la app en acción',
  pieDescripcion: 'Registrá marcas de fuerza, tiempo, repeticiones y distancia en un solo lugar.',
} as const;
