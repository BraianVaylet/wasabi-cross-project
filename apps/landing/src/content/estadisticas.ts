/*
 * El texto de la sección de estadísticas (F10-07, spec §5.7), en voseo es-AR.
 *
 * A diferencia de Registro y Funciones, ésta es **la sección de Pro** y lo dice (la etiqueta y el
 * titular): puede hablar de la evolución. Lo que cuenta que incluye sale de la spec §5.4, y el umbral
 * de "para retestear" (más de 8 semanas, 56 días) lo cruza test/contenido-pro.test.ts con la spec.
 */
export const estadisticas = {
  id: 'estadisticas',
  /** La etiqueta de Pro, en el rosa del diseño. */
  etiqueta: 'PRO · ESTADÍSTICAS',
  titulo: ['Pro suma estadísticas a tus registros.'],
  descripcion:
    'Revisá la evolución de cada ejercicio y consultá una lectura general de tu actividad, tus capacidades y tus grupos musculares.',
  retestear: {
    titulo: 'Constancia y ejercicios para volver a testear.',
    /** El umbral de la spec §5.4: más de 8 semanas (56 días) desde la última marca. */
    semanas: 8,
    descripcion:
      'Las estadísticas incluyen las marcas y los récords del período, una lista de los ejercicios cuya última marca tiene más de ocho semanas y un acceso directo para cargarles una marca nueva.',
  },
  /** El orden es el del diseño: el período y un ejercicio; lo general y el entrenamiento; y lo demás. */
  capturas: {
    periodo: {
      alt: 'Pantalla de estadísticas con el selector de período (últimos 3 meses, últimos 6 meses, último año y todo el historial) y la lista de ejercicios, con la sentadilla trasera desplegada.',
      pie: 'ESTADÍSTICAS — Elegí un período y revisá los ejercicios registrados.',
    },
    ejercicio: {
      alt: 'Estadística de la sentadilla trasera: el gráfico de evolución del RM, de 100 a 140 kg, con el valor actual (140 kg), el mejor (140 kg), el peor (100 kg) y la variación (+40 %).',
      pie: 'POR EJERCICIO — La evolución del RM, junto a los valores actual, mejor y peor, y la variación.',
    },
    general: {
      alt: 'Variación del período por capacidad (fuerza, potencia y resistencia) y por grupo muscular, de bíceps a tríceps, con el porcentaje de cada una y la cantidad de ejercicios.',
      pie: 'EN GENERAL — La variación del período por capacidad y por grupo muscular.',
    },
    entrenamiento: {
      alt: 'Cómo se reparten los ejercicios: gráficos de dona por disciplina, por categoría y por segmento del cuerpo, y barras por grupo muscular, con el nombre, la cantidad y el porcentaje de cada porción.',
      pie: 'TU ENTRENAMIENTO — Cómo se reparten tus ejercicios: por disciplinas, categorías, segmentos del cuerpo y grupos musculares.',
    },
    constancia: {
      alt: 'Constancia del período: 36 marcas, 26 récords nuevos, última marca hace 7 días, columnas de marcas por mes y los tres ejercicios que más mejoraron.',
      pie: 'CONSTANCIA — Las marcas, los récords nuevos, la última marca y las marcas por mes, y lo que más mejoró.',
    },
    retestear: {
      alt: 'Lista de ejercicios para retestear, con la última marca de hace más de 8 semanas: wall ball, hace 99 días, y burpee, hace 94 días.',
      pie: 'PARA RETESTEAR — Wall ball y burpee, con la fecha de su última marca y los días que pasaron.',
    },
  },
} as const;
