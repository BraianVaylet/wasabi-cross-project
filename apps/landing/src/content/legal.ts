import type { Contacto } from '../lib/contacto.ts';

/*
 * El texto de la política de privacidad y de los términos (F10-09, spec §5.7 y §13), en voseo es-AR.
 *
 * **Es un borrador que una persona tiene que aprobar** (spec §13): lo escribió una IA con lo que la
 * spec dice y con lo que la API hace, y cada afirmación de qué se guarda o qué no la cruza
 * test/contenido-legal.test.ts con la spec y con el código. No lleva cláusulas que la spec no
 * respalda (jurisdicción, edad mínima, limitación de responsabilidad): si hacen falta, las decide
 * quien responde por el servicio.
 *
 * Quién responde sale de las variables de build (`lib/contacto.ts`): sin ellas, fuera de
 * producción, el texto avisa que falta y no inventa un contacto.
 */

export type Bloque =
  | { tipo: 'parrafo'; texto: string }
  | { tipo: 'lista'; items: readonly string[] }
  | { tipo: 'enlace'; texto: string; href: string };

export interface SeccionLegal {
  /** El `id` de la sección y la base del de su título. */
  id: string;
  titulo: string;
  bloques: readonly Bloque[];
}

export interface DocumentoLegal {
  ruta: '/privacidad' | '/terminos';
  titulo: string;
  descripcion: string;
  /** La fecha de la versión, para quien la lee: "11 de octubre de 2026". */
  actualizado: string;
  introduccion: string;
  secciones: readonly SeccionLegal[];
  /** El contacto con que se armó, para que la página lo enlace. `null` si el build no lo trae. */
  contacto: Contacto | null;
}

/** La fecha de esta versión. Quien la aprueba la actualiza. */
const ACTUALIZADO = '11 de octubre de 2026';

const SIN_CONTACTO = 'El contacto de quien responde se completa antes de publicar el sitio.';

const parrafo = (texto: string): Bloque => ({ tipo: 'parrafo', texto });
const lista = (...items: string[]): Bloque => ({ tipo: 'lista', items });

export function privacidad(contacto: Contacto | null): DocumentoLegal {
  const quien =
    contacto === null
      ? SIN_CONTACTO
      : `Wasabi Cross lo mantiene ${contacto.nombre}. Para cualquier consulta sobre tus datos, escribí a ${contacto.email}.`;
  const pedido =
    contacto === null
      ? 'El email al que escribir se completa antes de publicar el sitio.'
      : `Escribí a ${contacto.email} desde el email con el que entrás y la borramos, con tus ejercicios y marcas.`;

  return {
    ruta: '/privacidad',
    titulo: 'Política de privacidad',
    descripcion:
      'Qué datos guarda Wasabi Cross, para qué los usa, dónde se guardan y cómo pedir que se borren.',
    actualizado: ACTUALIZADO,
    contacto,
    introduccion:
      'Wasabi Cross es una aplicación para registrar tus ejercicios y marcas. Esta página cuenta qué datos guarda, para qué los usa y cómo podés pedir que se borren.',
    secciones: [
      {
        id: 'quien-responde',
        titulo: 'Quién responde',
        bloques: [parrafo(quien)],
      },
      {
        id: 'tu-cuenta',
        titulo: 'Los datos de tu cuenta',
        bloques: [
          parrafo(
            'No hay registro con usuario y contraseña: entrás con tu cuenta de Google o de Microsoft (en Microsoft, sólo las cuentas personales). La primera vez que entrás guardamos:',
          ),
          lista(
            'tu email, que el proveedor tiene que haber verificado;',
            'tu nombre;',
            'tu foto de perfil, que es un dato personal;',
            'el identificador que te asigna el proveedor, que es lo que nos dice quién sos (no tu email);',
            'tu plan, Free o Pro.',
          ),
          parrafo('Cada vez que entrás actualizamos el nombre y la foto con los del proveedor.'),
        ],
      },
      {
        id: 'lo-que-cargas',
        titulo: 'Lo que cargás',
        bloques: [
          parrafo(
            'Los ejercicios propios que creás y las marcas que registrás en cada ejercicio, con su valor, su fecha y, si las completás, las notas y los datos extra. Son tuyos: ninguna otra persona que use Wasabi Cross los ve.',
          ),
        ],
      },
      {
        id: 'lo-que-no-guardamos',
        titulo: 'Lo que no guardamos',
        bloques: [
          lista(
            'Contraseñas: no hay, las maneja tu proveedor.',
            'Los tokens que nos da el proveedor al ingresar: se usan durante el ingreso y se descartan.',
            'Datos de tarjeta: la suscripción todavía no se cobra y, cuando se cobre, el pago va a pasar por un proveedor de pagos, y no guardamos el número de tu tarjeta.',
          ),
        ],
      },
      {
        id: 'datos-de-conexion',
        titulo: 'Datos de conexión',
        bloques: [
          parrafo(
            'Cuando iniciás sesión guardamos, junto con la sesión, la dirección IP y el navegador (el user agent) desde donde entraste. Para limitar los intentos de ingreso guardamos un contador por dirección IP, y los registros técnicos del servidor incluyen la dirección IP de cada pedido. Los usamos para la seguridad y para encontrar errores.',
          ),
        ],
      },
      {
        id: 'cookies',
        titulo: 'Cookies',
        bloques: [
          parrafo(
            'La aplicación usa sólo cookies técnicas, necesarias para que funcione el ingreso: la de sesión, que dura 30 días y no puede leerla ningún script de la página (httpOnly), y una temporal que se usa mientras volvés del proveedor de ingreso. No usamos cookies de publicidad ni de seguimiento.',
          ),
          parrafo(
            'Esta página de presentación no usa ninguna cookie, no tiene analytics ni formularios y no recibe datos de quien la visita.',
          ),
          parrafo('Cerrar sesión termina la sesión de Wasabi Cross; no cierra la de tu proveedor.'),
        ],
      },
      {
        id: 'para-que',
        titulo: 'Para qué los usamos',
        bloques: [
          lista(
            'Identificarte y mantener tu sesión.',
            'Mostrarte tus ejercicios, tus marcas y los porcentajes de carga que se calculan con ellas.',
            'Darte las estadísticas, si tenés el plan Pro.',
            'Cuidar la seguridad del servicio.',
          ),
          parrafo(
            'No los vendemos, no los usamos para publicidad y no los compartimos con nadie más que con los servicios que hacen funcionar la aplicación.',
          ),
        ],
      },
      {
        id: 'donde-se-guardan',
        titulo: 'Dónde se guardan',
        bloques: [
          parrafo(
            'Los datos se alojan en servicios de terceros: la aplicación corre en Railway y la base de datos está en MongoDB Atlas. Tu proveedor de ingreso, Google o Microsoft, sabe que usás Wasabi Cross porque es con quien entrás.',
          ),
        ],
      },
      {
        id: 'tus-derechos',
        titulo: 'Ver, corregir o borrar tus datos',
        bloques: [
          parrafo(
            'Podés pedirnos que te mostremos, corrijamos o borremos lo que guardamos de vos. Hoy la aplicación no tiene un botón para borrar la cuenta, así que se pide por email.',
          ),
          parrafo(pedido),
          parrafo(
            'Si pasás de Pro a Free no perdés nada de lo que cargaste: sólo dejás de ver las estadísticas.',
          ),
        ],
      },
      {
        id: 'cambios',
        titulo: 'Cambios',
        bloques: [
          parrafo(
            'Si esta política cambia, publicamos la nueva versión en esta página, con su fecha.',
          ),
        ],
      },
    ],
  };
}

export function terminos(contacto: Contacto | null): DocumentoLegal {
  const escribir =
    contacto === null
      ? SIN_CONTACTO.replace('se completa', 'se informa')
      : `Wasabi Cross lo mantiene ${contacto.nombre}. Para cualquier consulta sobre estos términos, escribí a ${contacto.email}.`;

  return {
    ruta: '/terminos',
    titulo: 'Términos y condiciones',
    descripcion:
      'Qué es Wasabi Cross, qué incluyen los planes Free y Pro y bajo qué condiciones se usa.',
    actualizado: ACTUALIZADO,
    contacto,
    introduccion:
      'Estos términos explican qué es Wasabi Cross y bajo qué condiciones lo podés usar. Al entrar con tu cuenta de Google o de Microsoft, los aceptás.',
    secciones: [
      {
        id: 'que-es',
        titulo: 'Qué es Wasabi Cross',
        bloques: [
          parrafo(
            'Es una aplicación de uso personal para registrar tus ejercicios y marcas, calcular porcentajes de carga a partir de tu RM y consultar tu historial. No es un servicio para gimnasios ni de entrenamiento: no te arma rutinas ni te da indicaciones médicas.',
          ),
        ],
      },
      {
        id: 'tu-cuenta',
        titulo: 'Tu cuenta',
        bloques: [
          parrafo(
            'Entrás con una cuenta de Google o de Microsoft (en Microsoft, personal). Sos responsable de esa cuenta y de lo que cargás en Wasabi Cross. Si entrás con dos proveedores o con dos emails distintos, tenés dos cuentas separadas, cada una con sus ejercicios y marcas.',
          ),
        ],
      },
      {
        id: 'planes',
        titulo: 'Planes: Free y Pro',
        bloques: [
          parrafo(
            'Los dos planes te dejan cargar sin límite ejercicios y marcas, con porcentajes de carga e historial de marcas. Pro suma las estadísticas.',
          ),
          parrafo(
            'Pro es una suscripción. Su precio está por definir y hoy no se cobra. Si pasás de Pro a Free no perdés lo que cargaste: sólo dejás de ver las estadísticas.',
          ),
        ],
      },
      {
        id: 'como-usarlo',
        titulo: 'Cómo usarlo',
        bloques: [
          lista(
            'Usalo para tu propio entrenamiento.',
            'No intentes entrar a las cuentas ni a los datos de otras personas.',
            'No interfieras con el funcionamiento del servicio ni lo sobrecargues a propósito.',
          ),
        ],
      },
      {
        id: 'sin-garantias',
        titulo: 'Sin garantías',
        bloques: [
          parrafo(
            'El servicio se ofrece tal como está: puede tener errores, cortes o cambios, y no garantizamos que esté siempre disponible.',
          ),
          parrafo(
            'Los porcentajes de carga son un cálculo a partir de las marcas que cargaste, no una indicación de entrenamiento ni médica. Con qué cargas entrenás lo decidís vos; ante la duda, consultá con un profesional.',
          ),
        ],
      },
      {
        id: 'tus-datos',
        titulo: 'Tus datos',
        bloques: [
          parrafo(
            'Lo que cargás es tuyo. Qué datos guardamos y cómo pedir que se borren está en la política de privacidad.',
          ),
          { tipo: 'enlace', texto: 'Leer la política de privacidad', href: '/privacidad' },
        ],
      },
      {
        id: 'dejar-de-usarlo',
        titulo: 'Dejar de usarlo',
        bloques: [
          parrafo(
            'Podés dejar de usar Wasabi Cross cuando quieras; para que borremos tu cuenta, seguí lo que dice la política de privacidad. Podemos suspender una cuenta que use el servicio de una forma que perjudique a otras personas o al servicio.',
          ),
        ],
      },
      {
        id: 'cambios',
        titulo: 'Cambios',
        bloques: [
          parrafo(
            'Si estos términos cambian, publicamos la nueva versión en esta página, con su fecha.',
          ),
        ],
      },
      {
        id: 'contacto',
        titulo: 'Contacto',
        bloques: [parrafo(escribir)],
      },
    ],
  };
}
