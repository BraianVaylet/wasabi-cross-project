/*
 * El texto de la sección Funciones (F10-06, spec §5.7), en voseo es-AR. Como Registro, es una
 * sección sin marca de Pro: habla del **historial de marcas**, no de su evolución (spec §4), y el
 * pie de la captura que muestra el progreso lo avisa.
 */
export const funciones = {
  id: 'funciones',
  titulo: ['Encontrá el ejercicio.', 'Guardá la marca que toca.'],
  descripcion:
    'Buscá en el catálogo por nombre y filtrá por disciplina. En los ejercicios de tiempo, registrá la marca y volvé a consultar tu historial.',
  capturas: {
    catalogo: {
      // Sin la lista de disciplinas en el pie: la del diseño nombraba cinco y la captura muestra siete.
      alt: 'Catálogo de ejercicios con un campo de búsqueda y filtros por disciplina: todas, musculación, CrossFit, Hyrox, funcional, running, hybrid y pilates.',
      pie: 'CATÁLOGO — Búsqueda por nombre y filtros por disciplina.',
      muestraPro: false,
    },
    running: {
      alt: 'Detalle de carrera de 5 kilómetros con la marca actual de 25:30, el progreso del tiempo y el historial de marcas.',
      pie: 'CARRERA 5 KM — Marcas en mm:ss y su historial. El progreso que se ve en la captura es de Pro.',
      /** La captura es de un usuario Pro: se ve su etiqueta y el gráfico de progreso. */
      muestraPro: true,
    },
  },
  resumenes: [
    { titulo: 'Catálogo', texto: 'Buscá ejercicios por nombre y disciplina.' },
    { titulo: 'Marcas', texto: 'Registrá RM, repeticiones, distancia o tiempo.' },
    { titulo: 'Historial', texto: 'Consultá las marcas anteriores de cada ejercicio.' },
  ],
} as const;
