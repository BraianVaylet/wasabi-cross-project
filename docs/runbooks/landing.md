# Runbook — La landing: dominio, ambientes, smoke y cómo se despublica

Cómo se publica, se prueba y se saca del aire la landing de Wasabi Cross. Es la parte de
[F10-13](../ACTION-PLAN.md) que necesita las cuentas del usuario (Railway, el dominio y el DNS); el
diseño está en [spec §5.7](../spec/wasabi-cross.spec.md) y en
[ADR-0013](../adr/0013-la-landing-es-un-sitio-estatico-aparte.md), y lo que declara el IaC, en
[`.railway/README.md`](../../.railway/README.md).

> **Regla de oro.** Cada paso que toca la cuenta real —crear un servicio, cargar una variable,
> agregar un dominio, cambiar el DNS— lo confirma el usuario antes de ejecutarse, y se hace con su
> sesión: la IA no entra a Railway ni al proveedor de DNS por su cuenta. Las variables `PUBLIC_*` van
> al HTML publicado: nunca llevan un secreto.

## De un vistazo

|                     | La app                                                | La landing                                                 |
| ------------------- | ----------------------------------------------------- | ---------------------------------------------------------- |
| Servicio de Railway | `wasabi-cross` (la API, que sirve el front compilado) | `wasabi-cross-landing` (un sitio estático con su servidor) |
| Dominio             | `app.<dominio>`                                       | `<dominio>` (y `www.<dominio>`, que redirige)              |
| Qué la redeploya    | `apps/api/**`, `apps/web/**`, `packages/**`           | `apps/landing/**`, `packages/**`                           |
| Base de datos       | Mongo Atlas                                           | ninguna                                                    |
| Cookies y sesión    | sí (cookie de sesión, spec §5.6)                      | ninguna                                                    |
| Se enlazan          | la landing lleva a `https://app.<dominio>/login`      | la app no depende de la landing                            |

La dependencia va en un solo sentido: la landing **sabe** dónde está la app (`PUBLIC_APP_URL`), la
app **no sabe** que existe la landing. Por eso se puede despublicar sin tocar la app (sección 9).

## 1. Decidir el dominio — antes de F9-10

Hoy no hay dominio. **Hay que fijarlo antes de crear los clientes OAuth** (F9-10): las redirect URIs de
Google y de Microsoft llevan el host de la app, y cambiarlas después es volver a tocar cada
cliente de cada ambiente.

Lo que hay que decidir, y que el plan asume por defecto:

| Qué                   | Por defecto                                                         | Nota                                             |
| --------------------- | ------------------------------------------------------------------- | ------------------------------------------------ |
| Dominio de la landing | `<dominio>` (la raíz)                                               |                                                  |
| Dominio de la app     | `app.<dominio>`                                                     | de él salen `WEB_ORIGIN` y `BETTER_AUTH_URL`     |
| `www`                 | redirige a la raíz                                                  | o al revés: lo que decida el usuario (sección 4) |
| Hosts de staging      | los que dé Railway, o `staging.<dominio>` y `app-staging.<dominio>` | staging no se indexa en ningún caso              |

Registrar el dominio es del usuario: no hay un paso de esto que pueda hacer la IA.

## 2. Las variables de la landing

Todas **de build**: Astro las inlinea al compilar, así que tienen que estar cargadas **antes** del
deploy, y cambiar una obliga a un deploy nuevo. Cuáles existen, y por qué, está en
[`.railway/README.md`](../../.railway/README.md#las-variables-de-la-landing); acá, qué valor lleva
cada una en cada ambiente.

| Variable               | Staging                                   | Producción              |
| ---------------------- | ----------------------------------------- | ----------------------- |
| `PUBLIC_SITE_URL`      | `https://<host de la landing en staging>` | `https://<dominio>`     |
| `PUBLIC_APP_URL`       | `https://<host de la app en staging>`     | `https://app.<dominio>` |
| `PUBLIC_CONTACT_NAME`  | recomendada                               | **obligatoria**         |
| `PUBLIC_CONTACT_EMAIL` | recomendada                               | **obligatoria**         |
| `LANDING_INDEXABLE`    | `0` (lo fija el IaC)                      | `1` (lo fija el IaC)    |

- `PUBLIC_SITE_URL` y `PUBLIC_APP_URL` son **orígenes**: esquema y host, sin camino ni barra final. La
  landing agrega `/login` ella sola.
- `PUBLIC_CONTACT_NAME` y `PUBLIC_CONTACT_EMAIL` van **las dos o ninguna**, y en producción sin ellas el
  build **se rompe a propósito**: una política de privacidad sin responsable no se publica
  (spec §5.7). En staging, sin ellas, las páginas avisan que el contacto falta.
- Son datos de una persona: se cargan en Railway, nunca en el repo.
- `LANDING_INDEXABLE=1` sin `PUBLIC_SITE_URL` también rompe el build: no hay `canonical` sin sitio.

## 3. Crear el servicio y el primer deploy

Después de F3-07 (el proyecto y los dos ambientes ya existen en Railway):

1. En el ambiente (staging primero): `railway config plan`. Es de sólo lectura. **Tiene que aparecer
   `wasabi-cross-landing` como servicio nuevo, con sus `watchPatterns`, y ningún cambio destructivo en
   `wasabi-cross`.** Si aparece otra cosa, no se aplica: se avisa.
2. `railway config apply`, con el `plan` a la vista.
3. Cargar las variables de la sección 2 en el servicio de la landing.
4. Esperar el primer deploy y mirar el log de build.

**Si el build falla por una dependencia que falta**, mirar primero el caso de `NODE_ENV`: la landing
no lo declara a propósito (con `production`, el instalador omitiría `astro`, que es una dependencia de
desarrollo). No se pudo comprobar contra un Railway de verdad: es la primera sospecha
([`.railway/README.md`](../../.railway/README.md#las-variables-de-la-landing)).

## 4. Dominios y DNS

Agregar un dominio a un servicio es de la cuenta del usuario; el IaC de F10-12 no los declara.

1. En el servicio **de la landing**: agregar `<dominio>` y `www.<dominio>`.
2. En el servicio **de la app**: agregar `app.<dominio>`.
3. En el proveedor de DNS, crear los registros que Railway muestra para cada dominio. La raíz (el
   _apex_) necesita un proveedor que acepte `CNAME` en la raíz (a veces `ALIAS`, `ANAME` o
   _CNAME flattening_): depende del proveedor, y es lo primero que se mira si la raíz no resuelve.
4. Esperar a que el panel marque cada dominio como verificado y con certificado.

**El `www`.** El servidor de la landing **no redirige entre hosts**: sirve lo que le llegue
(F10-11). Hay dos formas de cumplir "`www` redirige a la raíz":

| Opción                                         | Cómo                                                                                         | Costo                                             |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| **A. Redirección del proveedor** (recomendada) | una regla de redirección del DNS o del registrador, de `www.<dominio>` a `https://<dominio>` | ningún código; depende del proveedor              |
| B. En el servidor                              | una variable con el host canónico y un 301 en `server/app.ts`                                | un cambio de código y de tests; hoy no está hecho |

El smoke lo comprueba con `--www` (sección 6). Si se elige la B, es una tarea aparte.

## 5. Lo que cambia en la app al pasar a `app.`

Va junto con F9-10, no con la landing, pero es la razón de decidir el dominio primero:

- `WEB_ORIGIN` y `BETTER_AUTH_URL` = `https://app.<dominio>` (en staging y prod son el mismo valor:
  la API sirve el front, ADR-0007).
- Las redirect URIs de OAuth, con ese host: `https://app.<dominio>/api/auth/callback/google` y
  `…/microsoft`. Cómo crearlas y probarlas: [`oauth.md`](./oauth.md).
- La cookie de sesión es del host de la app: cambiar de host invalida las sesiones que hubiera. En un
  ambiente nuevo no hay datos reales que perder.
- **La URL de la política de privacidad** que se carga en las consolas de Google y de Microsoft es la
  de la landing, con barra final: `https://<dominio>/privacidad/`. Es la forma que no pasa por una
  redirección.

## 6. El smoke

Un `GET` de sólo lectura contra la landing desplegada: no manda nada, no necesita credenciales y se
puede correr las veces que haga falta. Es el que F3-12 llama después de cada deploy a staging.

```bash
# Staging: no se indexa, y "Entrar" lleva a la app de staging.
pnpm --filter @wasabi-cross/landing smoke -- https://<landing staging> \
  --app-url https://<app staging>

# Producción: se indexa, con el canonical al dominio real; el www redirige.
pnpm --filter @wasabi-cross/landing smoke -- https://<dominio> --indexable \
  --app-url https://app.<dominio> --www https://www.<dominio>
```

Sale con código `0` si todo pasa, `1` si algo falla y `2` si se lo llama mal.

| Chequeo                       | Qué comprueba                                                                  | Si falla, mirar                                                       |
| ----------------------------- | ------------------------------------------------------------------------------ | --------------------------------------------------------------------- |
| `GET /health`                 | 200 `{"status":"ok"}`                                                          | el deploy y el healthcheck del servicio                               |
| `GET /`                       | 200, HTML, con un `<h1>`                                                       | el build; que `dist/` tenga el sitio                                  |
| headers de seguridad          | CSP con `script-src 'none'`, HSTS, `nosniff` y `no-referrer`                   | que no haya un proxy que los pise                                     |
| se indexa / no se indexa      | `robots` y `canonical`                                                         | `LANDING_INDEXABLE` y `PUBLIC_SITE_URL` **del build**, no del runtime |
| `robots.txt` y `sitemap.xml`  | permite todo y lista las 3 páginas (prod); bloquea todo y está vacío (staging) | lo mismo                                                              |
| `/privacidad/` y `/terminos/` | 200; en prod, con quién responde y sin el aviso de contacto faltante           | `PUBLIC_CONTACT_NAME` y `PUBLIC_CONTACT_EMAIL`                        |
| `/privacidad` sin barra       | 301 a `/privacidad/`                                                           | el servidor (F10-11)                                                  |
| "Entrar"                      | lleva a `<app>/login`; sin `--app-url`, no hay botón                           | `PUBLIC_APP_URL` del build                                            |
| 404                           | 404 con la página de la marca                                                  | el servidor                                                           |
| assets                        | el CSS de `/_astro/` con `immutable`                                           | el servidor                                                           |
| `--www`                       | redirige (3xx) al origen del sitio                                             | la regla de redirección (sección 4)                                   |

**El smoke no reemplaza al E2E de F3-12**: no inicia sesión ni toca la app. Mira la landing.

## 7. La primera vez en producción, en orden

1. El smoke de staging, en verde.
2. Producción: variables cargadas (sección 2), `plan` y `apply`, primer deploy.
3. `smoke … --indexable` contra producción, en verde.
4. Abrir `https://<dominio>` en un navegador, a 390 px y a escritorio: se ve completa, sin imágenes
   rotas, y "Entrar" lleva a `https://app.<dominio>/login`.
5. En esa pantalla de ingreso, entrar con una cuenta de verdad ([`oauth.md`](./oauth.md)): la app
   sigue andando en `app.` con su sesión.
6. Cargar `https://<dominio>/privacidad/` como URL de la política en las consolas de Google y de
   Microsoft.
7. Anotar el resultado en la bitácora, con la fecha y qué se comprobó.

## 8. Qué dispara un deploy, y cómo comprobarlo

La landing se redeploya sólo con `apps/landing/**`, `packages/**`, y los archivos de la raíz y
`.railway/**`; la app, con `apps/api/**`, `apps/web/**` y lo mismo. `docs/**` no dispara ninguno.

**Comprobarlo la primera vez** (con los dos servicios ya creados):

1. Un cambio sólo en `docs/` en `main`: no se redeploya ninguno de los dos.
2. Un cambio de texto en `apps/landing/src/content/`: se redeploya la landing y **no** la app.
3. Un cambio en `apps/api/`: se redeploya la app y **no** la landing.

Si un cambio de copy reinicia la API, los _watch paths_ no se aplicaron: mirar el `plan` de la
sección 3.

## 9. Despublicar la landing sin que la app se entere

La app y la landing son dos servicios con dos dominios, y la app no referencia a la landing. Para
sacarla del aire:

1. En el servicio **de la landing**, quitar los dominios `<dominio>` y `www.<dominio>`. Con eso deja de
   servirse; el servicio puede quedar en pie (sin tráfico) o pausarse.
2. En el DNS, quitar los registros de la raíz y del `www` (o apuntarlos a donde se quiera).
3. **No se toca nada del servicio de la app**: ni sus variables, ni su dominio, ni sus clientes OAuth.

**Comprobar que la app no se enteró:** `https://app.<dominio>/login` responde, el ingreso con OAuth
anda, y `/ready` de la API da 200.

Antes de hacerlo, dos cosas que sí cambian:

- **La política de privacidad deja de existir en esa URL**, y es la que está cargada en las consolas de
  Google y de Microsoft (F9-10): con el ingreso en producción, hay que mudarla o volver a cargarla
  **antes**, no después.
- **El ingreso desde la web pública desaparece**: la gente que llegaba por la landing no tiene a
  dónde ir. Quien ya tiene la app, entra por `app.<dominio>` igual.

Para volver a publicarla: agregar los dominios de nuevo y, si cambió algo del build, un deploy.

## 10. Un deploy malo

La landing no tiene estado: volver a la versión anterior es redeployar el deploy anterior desde el
panel de Railway. Después, arreglarlo en `main` por un PR, como cualquier cambio.

## Qué se anota en la bitácora

La fecha, el ambiente, el resultado del smoke (pegar la salida: no lleva nada sensible), lo que se
comprobó a mano (sección 7) y cualquier paso que no salió como dice acá.
