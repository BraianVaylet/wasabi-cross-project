/*
 * El texto de la sección Registro (F10-06, spec §5.7), en voseo es-AR.
 *
 * Es una sección de lo que **tiene Free** (spec §4): cargar sin límite, porcentajes de carga e
 * historial de marcas. No promete el progreso de un ejercicio, que es de Pro; por eso no usa las
 * palabras "tendencia" ni "evolución" (lo cuida test/contenido-free.test.ts). Y como las capturas
 * son de un usuario Pro, el pie de cada una que lo muestra lo dice (`muestraPro`).
 */
export const registro = {
  id: 'registro',
  /** Las dos líneas del titular. */
  titulo: ['Registrá ahora.', 'Consultá el historial cuando quieras.'],
  descripcion:
    'Free incluye registro ilimitado de ejercicios y marcas, porcentajes de carga desde tu RM e historial por ejercicio. El análisis estadístico se suma con PRO.',
  nota: 'El porcentaje de carga y el historial no se bloquean en Free.',
  capturas: {
    porcentajes: {
      alt: 'Detalle de sentadilla trasera con el RM actual de 140 kg y los porcentajes de carga del 65 % al 95 %, con el 65 % elegido: 91 kg. Debajo asoma el bloque de progreso del RM.',
      pie: 'PORCENTAJES — Elegí un porcentaje del RM y consultá la carga calculada. El progreso que asoma abajo es de Pro.',
      /** La captura es de un usuario Pro: se ve su etiqueta y el comienzo del gráfico de progreso. */
      muestraPro: true,
    },
    historial: {
      alt: 'Detalle completo de sentadilla trasera: los porcentajes de carga, el progreso del RM con un aumento de 40 kg y el historial de seis registros, con el de 140 kg del 14/09/2026 como actual.',
      pie: 'HISTORIAL — Las marcas anteriores del ejercicio, con su fecha. El gráfico de progreso, arriba, es de Pro.',
      muestraPro: true,
    },
  },
} as const;
