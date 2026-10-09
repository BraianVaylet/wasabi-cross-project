import { canViewStats, type Plan } from '@wasabi-cross/schemas';

/*
 * El texto de la sección de planes (F10-08, spec §4 y §5.7), en voseo es-AR.
 *
 * Es lo que la landing promete sobre el plan pago, así que **no repite la regla: la usa**. Las filas
 * de estadísticas de la tabla salen de `canViewStats`, la misma función que decide en la API quién
 * ve las estadísticas; si la spec cambiara qué plan las ve, la tabla cambia con ella y no puede
 * seguir diciendo otra cosa. Las tres de registro son "Sí" en los dos planes porque la spec §4 deja
 * cargar sin límite en los dos: no hay una regla en código que las dicte, y test/contenido-planes
 * las cruza con la tabla de la spec.
 *
 * El precio de Pro está **por definir** (spec §4): sin monto y sin período. Esta línea **duplica** a
 * `PLAN_INFO` de apps/web/src/lib/plans.ts, que dice "A definir": cuando haya precio hay que
 * cambiar los dos, y un test lo mira. Está anotado en los dos archivos.
 */

export type Valor = 'Sí' | 'Incluidas' | '—';

export interface FilaPlanes {
  etiqueta: string;
  /** `registro`: lo que los dos planes tienen. `estadisticas`: lo que decide `canViewStats`. */
  tipo: 'registro' | 'estadisticas';
  valores: Record<Plan, Valor>;
}

const DICE_SI: Record<Plan, Valor> = { free: 'Sí', pro: 'Sí' };

/** "Incluidas" sólo en el plan que ve las estadísticas; en el otro, el guion. */
const segunCanViewStats = (plan: Plan): Valor => (canViewStats(plan) ? 'Incluidas' : '—');

const filas: readonly FilaPlanes[] = [
  { etiqueta: 'Registrar ejercicios y marcas sin límite', tipo: 'registro', valores: DICE_SI },
  { etiqueta: 'Porcentajes de carga desde el RM', tipo: 'registro', valores: DICE_SI },
  { etiqueta: 'Historial de marcas por ejercicio', tipo: 'registro', valores: DICE_SI },
  {
    // El progreso del detalle de ejercicio es parte de las estadísticas (spec §4, §5.2): se nombra
    // para que "historial de marcas" y "progreso" no se lean como lo mismo.
    etiqueta: 'Progreso y estadísticas de cada ejercicio',
    tipo: 'estadisticas',
    valores: { free: segunCanViewStats('free'), pro: segunCanViewStats('pro') },
  },
  {
    etiqueta: 'Estadísticas generales',
    tipo: 'estadisticas',
    valores: { free: segunCanViewStats('free'), pro: segunCanViewStats('pro') },
  },
];

export const planes = {
  id: 'planes',
  titulo: ['Registro completo en Free.', 'Estadísticas extra en Pro.'],
  descripcion:
    'Los dos planes te dejan registrar ejercicios y marcas, calcular porcentajes de carga y consultar el historial de marcas. Pro suma las estadísticas.',
  tabla: {
    /** El `<caption>`: es también el nombre de la región que desplaza la tabla. */
    nombre: 'Comparación de funciones de Free y Pro',
    encabezados: { funciones: 'Funciones', free: 'Free', pro: 'Pro' },
    filas,
  },
  tarjetas: {
    free: {
      etiqueta: 'Registro sin límite',
      texto: 'Ejercicios, marcas, porcentajes de carga e historial de marcas.',
    },
    pro: {
      etiqueta: 'Estadísticas',
      /** Sin monto y sin período: la spec los deja por definir. */
      precio: 'Suscripción · precio por definir',
      texto: 'Todo lo de Free, y las estadísticas de cada ejercicio y generales.',
    },
  },
  /** Lo que ve cada plan, de la app. El orden es el de las tarjetas. */
  capturas: {
    free: {
      alt: 'Pantalla de estadísticas de una cuenta Free: en lugar de las estadísticas, el aviso "Las estadísticas son parte del plan Pro", un texto que dice que cargar ejercicios y marcas sigue siendo libre y el botón "Ver planes".',
      pie: 'ESTADÍSTICAS EN FREE — En lugar de las estadísticas, un aviso y el enlace a los planes. Cargar sigue siendo libre.',
    },
    suscripcion: {
      alt: 'Pantalla de suscripción de una cuenta Pro: el plan actual, lo que se paga (a definir, y el aviso de que todavía no se cobra) y las tarjetas de los dos planes: Free, a $0 y sin estadísticas, y Pro, a definir y con estadísticas de cada ejercicio y generales.',
      pie: 'SUSCRIPCIÓN — Los dos planes dentro de la app, con el precio de Pro por definir. La captura es de una cuenta Pro.',
    },
  },
} as const;
