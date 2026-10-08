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

/**
 * El titular de la página. Lo usan el hero (F10-05) y la imagen para compartir (`pnpm og`): si
 * cambia acá, la imagen se regenera.
 */
export const titular = {
  primeraLinea: 'Entrenás en varias disciplinas.',
  acento: 'Tus marcas, en un solo lugar.',
} as const;

/** Lo que dicen de la landing los buscadores y las vistas previas de los chats. */
export const seo = {
  titulo: 'Wasabi Cross · Tus marcas, en un solo lugar',
  descripcion:
    'Registrá marcas de fuerza, repeticiones, distancia y tiempos, calculá porcentajes de carga a partir de tu RM y mirá tu historial en un solo lugar.',
  /** La imagen de 1200×630 que se ve al compartir el enlace (`public/og.png`). */
  imagen: {
    ruta: '/og.png',
    alt: 'Wasabi Cross: tus marcas en un solo lugar, con la pantalla de inicio de la app',
  },
  /** El color de la barra del navegador en el teléfono: el fondo de la marca (`--wc-bg`). */
  colorDelTema: '#0f041c',
} as const;

/** Las páginas que van al sitemap. F10-09 suma las legales. La 404 nunca. */
export const rutasIndexables = ['/'] as const;
