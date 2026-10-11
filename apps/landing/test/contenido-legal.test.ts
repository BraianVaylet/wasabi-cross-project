import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { privacidad, terminos, type DocumentoLegal } from '../src/content/legal.ts';

/*
 * Lo que dicen la política de privacidad y los términos (F10-09, spec §5.6 y §13). Es un texto
 * legal, así que el borrador **no afirma nada que la API no haga**: cada cosa que dice que se
 * guarda, o que no, se cruza con la spec y con el código que la hace cumplir. Que el texto sea el
 * que corresponde lo aprueba una persona (spec §13).
 */

const RAIZ = resolve(import.meta.dirname, '..', '..', '..');
const leerArchivo = (...ruta: string[]): string => readFileSync(resolve(RAIZ, ...ruta), 'utf8');

const SPEC = leerArchivo('docs', 'spec', 'wasabi-cross.spec.md');
const AUTH = leerArchivo(
  'apps',
  'api',
  'src',
  'modules',
  'auth',
  'infrastructure',
  'better-auth.ts',
);

const CONTACTO = { nombre: 'Titular de Prueba', email: 'contacto@ejemplo.test' };

/** Todo el texto de un documento, un fragmento por párrafo, ítem o título. */
function fragmentos(doc: DocumentoLegal): string[] {
  return [
    doc.introduccion,
    ...doc.secciones.flatMap((s) => [
      s.titulo,
      ...s.bloques.flatMap((b) => {
        if (b.tipo === 'lista') return [...b.items];
        if (b.tipo === 'enlace') return [b.texto];
        return [b.texto];
      }),
    ]),
  ];
}

const textoDe = (doc: DocumentoLegal): string => fragmentos(doc).join('\n');
const PRIVACIDAD = privacidad(CONTACTO);
const TERMINOS = terminos(CONTACTO);

describe('la política dice lo que la API guarda (spec §5.6)', () => {
  const t = textoDe(PRIVACIDAD);

  it('la spec dice qué se guarda: email, nombre, foto y el id del proveedor', () => {
    expect(SPEC).toMatch(/\*\*Qué se guarda\.\*\* Email, nombre, foto y el id del proveedor\./);
  });

  it('la política nombra esos cuatro datos', () => {
    for (const dato of [/email/i, /nombre/i, /foto de perfil/i, /identificador que te asigna/i]) {
      expect(t, String(dato)).toMatch(dato);
    }
  });

  it('dice que la foto es un dato personal, como la spec', () => {
    expect(SPEC).toMatch(/\*\*Foto:\*\* es un dato personal/);
    expect(t).toMatch(/foto de perfil[^.]*dato personal/i);
  });

  it('dice que entrás con Google o Microsoft, y sólo cuentas personales', () => {
    expect(t).toMatch(/Google/);
    expect(t).toMatch(/Microsoft/);
    expect(t).toMatch(/personales/);
  });

  it('dice que no guarda contraseñas ni los tokens del proveedor, y la API lo hace cumplir', () => {
    expect(t).toMatch(/Contraseñas: no hay/i);
    expect(t).toMatch(/tokens[^.]*se descartan/i);
    // El código: ni tokens en la cuenta, ni ingreso con email y contraseña.
    expect(AUTH).toMatch(/accessToken: null,\s*refreshToken: null,\s*idToken: null/);
    expect(AUTH).toMatch(/updateAccountOnSignIn: false/);
    expect(AUTH).not.toMatch(/emailAndPassword\s*:/);
  });

  it('dice que no guarda datos de tarjeta, como la spec §13', () => {
    expect(SPEC).toMatch(/\*\*Nunca\*\* datos de tarjeta en la base/);
    expect(t).toMatch(/no guardamos el número de tu tarjeta/);
  });
});

describe('lo que la spec no decía y la API sí hace: la IP y el navegador', () => {
  const t = textoDe(PRIVACIDAD);

  it('Better Auth guarda la IP y el user agent con la sesión: la política lo dice', () => {
    expect(t).toMatch(/dirección IP y el navegador/);
    expect(t).toMatch(/contador por dirección IP/);
    expect(t).toMatch(/registros técnicos del servidor incluyen la dirección IP/);
  });

  it('y la spec lo dice también: la política no cuenta nada que la spec no tenga', () => {
    // §5.6 "Qué se guarda": se completó junto con esta política (F10-09).
    expect(SPEC).toMatch(/dirección IP y el navegador/);
    expect(SPEC).toMatch(/registros del servidor/);
  });
});

describe('cookies y sesión', () => {
  const t = textoDe(PRIVACIDAD);

  it('la sesión dura 30 días en la API y en la política', () => {
    expect(AUTH).toMatch(/expiresIn:\s*60 \* 60 \* 24 \* 30/);
    expect(t).toMatch(/dura 30 días/);
  });

  it('la cookie es httpOnly en la API y la política lo dice', () => {
    expect(AUTH).toMatch(/httpOnly:\s*true/);
    expect(t).toMatch(/httpOnly/);
  });

  it('sólo cookies técnicas: la de sesión y la temporal del ingreso, sin publicidad ni seguimiento', () => {
    expect(t).toMatch(/sólo cookies técnicas/i);
    expect(t).toMatch(/temporal que se usa mientras volvés del proveedor/);
    expect(t).toMatch(/No usamos cookies de publicidad ni de seguimiento/);
  });

  it('dice que la landing no tiene cookies ni analytics, como la spec §13', () => {
    expect(SPEC).toMatch(/\*\*Landing \(§5\.7\):\*\* sin cookies, analytics ni formularios/);
    expect(t).toMatch(/no usa ninguna cookie, no tiene analytics ni formularios/);
  });

  it('"analytics" aparece sólo para decir que no hay', () => {
    for (const f of fragmentos(PRIVACIDAD).filter((x) => /analytics/i.test(x))) {
      expect(f).toMatch(/\b(no|sin|ni)\b/i);
    }
  });
});

describe('quién responde y cómo se pide borrar la cuenta', () => {
  it('con contacto, la política dice quién y a qué email escribir', () => {
    const t = textoDe(PRIVACIDAD);
    expect(t).toContain(CONTACTO.nombre);
    expect(t).toContain(CONTACTO.email);
  });

  it('sin contacto (desarrollo y CI) lo avisa y no inventa uno', () => {
    for (const doc of [privacidad(null), terminos(null)]) {
      const t = textoDe(doc);
      expect(t).toMatch(
        /se completa antes de publicar el sitio|se informa antes de publicar el sitio/,
      );
      expect(t).not.toMatch(/@/);
    }
  });

  it('dice que la app todavía no tiene un botón para borrar la cuenta, y cómo se pide', () => {
    const t = textoDe(PRIVACIDAD);
    expect(t).toMatch(/no tiene un botón para borrar la cuenta/);
    expect(t).toMatch(/desde el email con el que entrás/);
  });
});

describe('los términos (spec §4)', () => {
  const t = textoDe(TERMINOS);

  it('describen Free y Pro como la spec: lo único que cambia son las estadísticas', () => {
    expect(SPEC).toMatch(/\*\*Lo único que los diferencia es poder ver las estadísticas\*\*/);
    expect(t).toMatch(/sin límite ejercicios y marcas/);
    expect(t).toMatch(/Pro suma las estadísticas/);
  });

  it('el precio está por definir, sin monto ni período', () => {
    expect(SPEC).toMatch(/El monto de Pro está \*\*a definir\*\*/);
    expect(t).toMatch(/precio está por definir y hoy no se cobra/);
    expect(t).not.toMatch(/anual|mensual|\$\s?\d/i);
  });

  it('son de uso personal y sin garantías', () => {
    expect(t).toMatch(/uso personal/);
    expect(t).toMatch(/tal como está/);
  });

  it('no prometen lo que la app no hace: nada de gimnasios, clubes ni entrenadores', () => {
    expect(t).toMatch(/No es un servicio para gimnasios/);
    expect(t).not.toMatch(/membres[ií]a|reserva|club|entrenador asignado/i);
  });

  it('remiten a la política de privacidad', () => {
    const hrefs = TERMINOS.secciones
      .flatMap((s) => s.bloques)
      .flatMap((b) => (b.tipo === 'enlace' ? [b.href] : []));
    expect(hrefs).toContain('/privacidad/');
  });
});

describe('forma de los dos documentos', () => {
  for (const [nombre, doc] of [
    ['privacidad', PRIVACIDAD],
    ['términos', TERMINOS],
  ] as const) {
    it(`${nombre}: ruta, título, descripción, fecha y secciones con id propio`, () => {
      expect(doc.ruta).toMatch(/^\/[a-z]+\/$/);
      expect(doc.titulo.length).toBeGreaterThan(5);
      expect(doc.descripcion.length).toBeGreaterThan(30);
      expect(doc.actualizado).toMatch(/^\d{1,2} de [a-z]+ de \d{4}$/);
      const ids = doc.secciones.map((s) => s.id);
      expect(new Set(ids).size).toBe(ids.length);
      for (const id of ids) expect(id).toMatch(/^[a-z-]+$/);
    });

    it(`${nombre}: sin marcas de borrador ni lugares sin completar`, () => {
      expect(textoDe(doc)).not.toMatch(/\bTODO\b|XXX|lorem|\{\{|\}\}|\[a completar\]/);
    });
  }

  it('las dos rutas son /privacidad/ y /terminos/, con barra final', () => {
    expect([PRIVACIDAD.ruta, TERMINOS.ruta]).toEqual(['/privacidad/', '/terminos/']);
  });
});
