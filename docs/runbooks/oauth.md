# Runbook — Ingreso con OAuth (Google y Microsoft)

Cómo se crean, se cargan, se prueban y se rotan las credenciales con las que Wasabi Cross deja
entrar a la gente. Es la parte de [F9-10](../ACTION-PLAN.md) que necesita las cuentas del usuario;
el diseño está en [spec §5.6](../spec/wasabi-cross.spec.md) y en
[ADR-0012](../adr/0012-ingreso-solo-con-oauth.md).

> **Regla de oro.** Un secreto de cliente no se pega en el chat, en una issue, en un PR ni en un
> archivo del repo: vive en `apps/api/.env` (que está en `.gitignore`) y en las variables de Railway.
> Un ID token tampoco: contiene el email y el nombre de una persona. Lo que sí se puede compartir es
> lo que imprime `oauth:inspect-token`, que sólo trae nombres de claims y respuestas de sí o no.

## Qué se necesita, de un vistazo

| Qué                                          | Dev                                                 | Staging                                         | Prod                                         |
| -------------------------------------------- | --------------------------------------------------- | ----------------------------------------------- | -------------------------------------------- |
| Cliente OAuth de **Google** (Aplicación web) | `wasabi-cross-dev`                                  | `wasabi-cross-staging`                          | `wasabi-cross-prod`                          |
| Registro de la app en **Microsoft Entra**    | `wasabi-cross-dev`                                  | `wasabi-cross-staging`                          | `wasabi-cross-prod`                          |
| `BETTER_AUTH_URL` (origen público de la API) | `http://localhost:3000`                             | `https://<staging>`                             | `https://<prod>`                             |
| `WEB_ORIGIN` (origen del front)              | `http://localhost:5173`                             | `https://<staging>`                             | `https://<prod>`                             |
| Redirect URI de Google                       | `http://localhost:3000/api/auth/callback/google`    | `https://<staging>/api/auth/callback/google`    | `https://<prod>/api/auth/callback/google`    |
| Redirect URI de Microsoft                    | `http://localhost:3000/api/auth/callback/microsoft` | `https://<staging>/api/auth/callback/microsoft` | `https://<prod>/api/auth/callback/microsoft` |

- **Un cliente por ambiente, siempre.** Con uno solo compartido, el secreto filtrado de dev abre prod, y
  una redirect URI de más es una puerta de más.
- **La redirect URI es exacta**: esquema, host, puerto y path, sin barra al final. El proveedor
  rechaza cualquier otra, y eso es lo que se quiere.
- En staging y prod la API sirve el front desde el mismo origen (ADR-0007): `BETTER_AUTH_URL` y
  `WEB_ORIGIN` son el mismo valor. En dev son dos orígenes (`localhost` en los dos, para que la cookie
  sea del mismo sitio).
- **El dominio todavía no está decidido** (STATE.md → "Decisiones abiertas"): las URIs de staging y
  prod llevan el host real, así que esos dos ambientes esperan esa decisión y a F3-07 (crear los
  ambientes de Railway). Dev se puede hacer ya.

## Las variables

Se cargan en `apps/api/.env` (dev) y en las variables del servicio de Railway (staging y prod). Cada
par va completo o no va: con la mitad la API no arranca.

| Variable                  | Qué es                                                                   |
| ------------------------- | ------------------------------------------------------------------------ |
| `GOOGLE_CLIENT_ID`        | El id del cliente OAuth de Google.                                       |
| `GOOGLE_CLIENT_SECRET`    | Su secreto.                                                              |
| `MICROSOFT_CLIENT_ID`     | El "Application (client) ID" del registro en Entra.                      |
| `MICROSOFT_CLIENT_SECRET` | El **valor** del secreto (no su ID), que vence.                          |
| `BETTER_AUTH_URL`         | El origen público de la API: de acá sale la redirect URI.                |
| `WEB_ORIGIN`              | El origen del front: adónde vuelve la persona y qué acepta CORS.         |
| `OAUTH_DEV_IDP`           | **`off` o ausente** en staging y prod: con `on` la API no arranca.       |
| `MICROSOFT_AUTHORITY`     | **Sin definir** al probar con cuentas reales (sólo apunta al IdP falso). |

Un proveedor sin su par queda apagado y su botón no aparece. La API no arranca si no hay ninguno
(ni Google, ni Microsoft, ni el IdP de desarrollo).

## Google

1. **Proyecto.** En [Google Cloud Console](https://console.cloud.google.com), crear un proyecto
   (`wasabi-cross`; los tres clientes pueden vivir en el mismo proyecto).
2. **Pantalla de consentimiento** (APIs y servicios → Pantalla de consentimiento de OAuth):
   - Tipo de usuario: **Externo**.
   - Nombre de la app, email de asistencia al usuario y email de contacto del desarrollador.
   - **Dominios autorizados** y **política de privacidad**: Google los pide para publicar la app.
     Dependen del dominio, que no está decidido.
   - **Scopes: sólo `openid`, `.../auth/userinfo.email` y `.../auth/userinfo.profile`.** Ninguno es
     sensible, y no hay que pedir nada más (Wasabi no usa tokens después del ingreso).
3. **Publicar la app** (Estado de publicación → "Publicar la app" / _In production_). **En modo
   "Testing" sólo entran los usuarios de prueba cargados a mano** (hasta 100): una cuenta que no
   sea del usuario no podría entrar, y eso es justo lo que hay que probar. Con sólo scopes básicos, publicar no debería pedir la revisión de Google; si la
   consola pide algo (por ejemplo, verificación de marca si se sube un logo), anotarlo acá.
4. **Cliente OAuth** (Credenciales → Crear credenciales → ID de cliente de OAuth → _Aplicación
   web_), uno por ambiente:
   - **URIs de redireccionamiento autorizados**: la de la tabla de arriba, exacta.
   - Orígenes autorizados de JavaScript: se dejan vacíos; el flujo es del lado del servidor.
5. Copiar el **ID de cliente** y el **secreto** a `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET`. Google
   puede dejar de mostrar el secreto después de crearlo: guardarlo en el gestor de secretos en ese
   momento.

El secreto de Google **no vence**, pero se rota igual (abajo).

## Microsoft

1. En el [centro de administración de Microsoft Entra](https://entra.microsoft.com) → Identidad →
   Aplicaciones → _Registros de aplicaciones_ → **Nuevo registro**, uno por ambiente.
2. **Tipos de cuenta compatibles: "Sólo cuentas personales de Microsoft"** (Outlook, Hotmail, Live).
   Las de trabajo o escuela quedan afuera a propósito: ahí el email lo controla el administrador del
   tenant y no es una identidad (spec §5.6). La API además lo vuelve a exigir (`tid` de las cuentas
   personales, `iss` y `aud`).
3. **URI de redirección**: plataforma **Web**, con la de la tabla de arriba, exacta.
4. **Certificados y secretos → Nuevo secreto de cliente.** Elegir el vencimiento más largo que deje
   la consola (hasta 24 meses), **anotar la fecha en la tabla de abajo** y copiar el **Valor** en ese
   momento (el "Id. del secreto" no sirve, y después el valor ya no se muestra). Va a
   `MICROSOFT_CLIENT_SECRET`; el "Id. de aplicación (cliente)" va a `MICROSOFT_CLIENT_ID`.
5. **Configuración de tokens → Agregar notificación opcional → tipo de token _ID_**, y marcar
   **`email`**, **`verified_primary_email`** y **`verified_secondary_email`**. La consola puede
   pedir activar el permiso de Microsoft Graph `email`: aceptar.
   **Esto es lo que decide si alguien puede entrar con Microsoft.** La API crea la cuenta sólo si el
   email llega verificado, y para Microsoft lo decide así: usa `email_verified` si viene; si no, mira
   que el `email` esté dentro de `verified_primary_email` o `verified_secondary_email`. Sin esas
   notificaciones opcionales, el token no trae nada de eso y **nadie entra** (aviso `WC-OAUTH-400-002`).
6. **Permisos de API**: Microsoft Graph, delegados: `openid`, `profile`, `email` y `User.Read`. No
   hace falta consentimiento de administrador con cuentas personales. Wasabi pide exactamente esos
   cuatro, sin `offline_access` (no guarda tokens).

### Cuándo vence el secreto de Microsoft

| Ambiente | Creado | **Vence** | Quién rota | Aviso a los 30 días |
| -------- | ------ | --------- | ---------- | ------------------- |
| dev      |        |           |            |                     |
| staging  |        |           |            |                     |
| prod     |        |           |            |                     |

> **Completar al crear cada secreto.** Cuando vence, el ingreso con Microsoft falla para todos con el
> aviso genérico `WC-OAUTH-400-002`, y el de Google sigue andando. Poner un recordatorio en el
> calendario 30 días antes: es la única credencial que se rompe sola.

## Ver qué claims trae una cuenta real

Hay que hacerlo una vez, con una cuenta de Outlook de verdad, **antes de dar por buena la cuenta de
Microsoft** (F9-10, ADR-0012): lo que dice la documentación de Microsoft y lo que trae el token de
una cuenta personal pueden no coincidir. Si el token no trae ni `email_verified` ni los
`verified_*_email`, **se frena y se decide con el usuario**: no se fuerza el email a verificado.

La API nunca loguea el ID token. Para ver uno hay que sacarlo por afuera de la app:

1. **Sólo con el cliente de dev.** En el registro de dev → Autenticación → agregar la URI de
   redirección `https://jwt.ms` (la página de Microsoft que decodifica el token en el navegador) y
   tildar "Tokens de ID (usados para flujos implícitos e híbridos)".
2. En el navegador, con una ventana privada, abrir (con tu `client_id`):

   ```
   https://login.microsoftonline.com/consumers/oauth2/v2.0/authorize?client_id=<MICROSOFT_CLIENT_ID>&response_type=id_token&redirect_uri=https%3A%2F%2Fjwt.ms&scope=openid%20profile%20email&response_mode=fragment&nonce=prueba&prompt=select_account
   ```

3. Elegir la cuenta de Outlook. `jwt.ms` muestra el token decodificado; **copiar el token** (el texto
   largo con dos puntos).
4. Pasarlo por el informe, desde la raíz del repo, pegándolo cuando lo pida y cerrando con Ctrl+D (en
   Windows, Ctrl+Z y Enter). El token no se muestra y no queda en el historial del shell:

   ```bash
   pnpm --filter @wasabi-cross/api oauth:inspect-token
   ```

   Con `MICROSOFT_CLIENT_ID` en `apps/api/.env`, también dice si la audiencia es la del cliente de
   Wasabi. El código de salida es 0 si la cuenta se crearía, 2 si no, y 1 si el texto no es un ID token.

5. **Volver a sacar** la URI `https://jwt.ms` y destildar los tokens implícitos del registro de dev.
6. Anotar abajo lo que salió. **No** pegar el token, sólo esto:

| Fecha | Cuenta (personal o no) | `email` | `email_verified` | `verified_primary_email` | `verified_secondary_email` | La API la crearía | Quién lo probó |
| ----- | ---------------------- | ------- | ---------------- | ------------------------ | -------------------------- | ----------------- | -------------- |
|       |                        |         |                  |                          |                            |                   |                |

## Prueba guiada

Siempre en **dev y en staging, nunca en prod** (spec §12). Cada paso que toque una cuenta real se
confirma con el usuario antes de hacerlo. Resultado de cada corrida: en la bitácora del día, con esta
tabla completa.

**Preparación (dev).** En `apps/api/.env`, las dos credenciales de dev y `OAUTH_DEV_IDP=off` (así
`/login` muestra sólo los proveedores reales), sin `MICROSOFT_AUTHORITY`. `BETTER_AUTH_URL` y
`WEB_ORIGIN` con `localhost`. Después `pnpm dev` y abrir `http://localhost:5173/login`.

| #   | Qué se prueba                                       | Cómo                                                                 | Esperado                                                                                           | Resultado |
| --- | --------------------------------------------------- | -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | --------- |
| 1   | Alta con Google                                     | "Continuar con Google" con una cuenta nueva                          | Home, usuario Free, el nombre de la cuenta, y la foto en el Perfil                                 |           |
| 2   | Volver a entrar con Google                          | Cerrar sesión y volver a entrar con la misma cuenta                  | Es el mismo usuario (mismos ejercicios); el proveedor pide elegir la cuenta                        |           |
| 3   | Alta con Outlook                                    | "Continuar con Microsoft" con una cuenta personal nueva              | Home, usuario Free, el nombre y la foto (o las iniciales si la cuenta no tiene)                    |           |
| 4   | Volver a entrar con Outlook                         | Cerrar sesión y volver a entrar                                      | El mismo usuario                                                                                   |           |
| 5   | Los claims de la cuenta de Outlook                  | Ver la sección de arriba                                             | Anotado qué trae                                                                                   |           |
| 6   | Consentimiento denegado                             | En el proveedor, "Cancelar" / "No permitir"                          | `/login` con `WC-OAUTH-400-001`, sin sesión                                                        |           |
| 7   | Mismo email, otro proveedor                         | Entrar con Google y después con Outlook usando el mismo email        | `WC-OAUTH-409-003`, sin sesión, y la cuenta original intacta                                       |           |
| 8   | Una cuenta que no es del usuario (Google publicada) | Que otra persona entre con su cuenta de Google                       | Puede entrar: la app está publicada, no en modo "Testing"                                          |           |
| 9   | Una cuenta de trabajo o escuela en Microsoft        | Intentar con una                                                     | Microsoft no la deja, o la API la rechaza con `WC-OAUTH-400-002`; nunca entra                      |           |
| 10  | Redirect URI distinta                               | Cambiar el puerto de `BETTER_AUTH_URL` sin tocar el cliente y entrar | El proveedor rechaza el pedido (Google `redirect_uri_mismatch`; Microsoft `AADSTS50011`)           |           |
| 11  | Foto                                                | Mirar el Perfil con cada cuenta                                      | La foto de Google se ve (tiene que ser de `*.googleusercontent.com`); la de Microsoft, o iniciales |           |

**Staging**: repetir 1 a 4 y 10 con los clientes de staging y la URL de staging, cuando exista (F3-07).

### La PWA instalada

Spec §5.6 y F9-10 piden comprobar que, con la app instalada en un teléfono, la sesión queda en la
app. El ingreso navega a una página del proveedor y vuelve: en algunos navegadores el modo
_standalone_ abre el proveedor afuera, y la sesión queda en el otro contexto. **Esto no se sabe sin
probarlo en el aparato**; el service worker ya no se come el callback (`navigateFallbackDenylist`,
F9-05), pero el contexto de la cookie depende del sistema.

| Dónde                     | Cómo se instaló                | ¿Entra y la sesión queda en la app? | Notas / decisión tomada |
| ------------------------- | ------------------------------ | ----------------------------------- | ----------------------- |
| Android, Chrome           | "Instalar app"                 |                                     |                         |
| iPhone, Safari            | "Agregar a pantalla de inicio" |                                     |                         |
| Escritorio, Chrome o Edge | Instalar desde la barra        |                                     |                         |

Si en alguno la sesión queda en el navegador y no en la app, **anotar acá la decisión**: por ejemplo,
dejar el ingreso fuera del modo standalone y avisarlo en pantalla, o abrir la app con un enlace
después del ingreso. No decidirlo sin ver cómo se comporta.

## Rotar un secreto

Se rota en estas ocasiones: **antes de que venza** el de Microsoft, cada vez que alguien con acceso
deja el proyecto, y **de inmediato** si se sospecha una filtración (abajo). La idea es que haya un
momento en que los dos secretos —el viejo y el nuevo— sean válidos, para no cortar el ingreso.

**Microsoft**

1. Registro de la app → Certificados y secretos → **Nuevo secreto de cliente** (el viejo sigue vivo).
   Anotar el vencimiento nuevo en la tabla de arriba y copiar el valor.
2. Cargarlo en `MICROSOFT_CLIENT_SECRET` del ambiente (Railway, o `.env` en dev) y redeployar.
3. Probar el ingreso con una cuenta de Outlook (pasos 3 y 4 de la prueba guiada).
4. **Recién entonces**, borrar el secreto viejo en Entra.

**Google**

1. Cliente OAuth → agregar un secreto nuevo (Google deja tener más de uno). Copiarlo.
2. Cargarlo en `GOOGLE_CLIENT_SECRET` y redeployar.
3. Probar el ingreso con Google (pasos 1 y 2).
4. Deshabilitar el secreto viejo, y borrarlo cuando se confirme que nada lo usa.

**`BETTER_AUTH_SECRET`** (firma las cookies de sesión). Rotarlo **cierra la sesión de todos**: tienen
que volver a entrar. Es un cambio de un solo paso (cargar el nuevo y redeployar); hacerlo fuera de
horario y avisando.

## Si se filtra un secreto

1. **Rotarlo ya**, con los pasos de arriba, sin esperar al horario cómodo. Con el secreto viejo
   borrado, el filtrado deja de servir.
2. Con un secreto de cliente, alguien puede hacerse pasar por Wasabi **ante el proveedor**, pero no
   puede entrar a la cuenta de nadie sin un `code` de esa persona. De todos modos, revisar en los logs
   (`component: better-auth`, y los avisos `WC-OAUTH-*`) si hay ingresos o errores que no
   corresponden desde la fecha de la filtración.
3. Si estuvo en el repo o en un chat, sacarlo de ahí: borrar un commit no alcanza, porque queda en el
   historial; el secreto hay que darlo por perdido y rotarlo igual.
4. Anotar qué pasó, cuándo y qué se rotó, en la bitácora.

## Qué mirar si el ingreso falla

| Síntoma                                                                  | Causa probable                                                                                                                                                                                              |
| ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/login` dice "El ingreso no está disponible"                            | La API no lista ningún proveedor (faltan los pares `*_CLIENT_ID`/`*_CLIENT_SECRET`), o no responde.                                                                                                         |
| El proveedor muestra `redirect_uri_mismatch` o `AADSTS50011`             | La redirect URI del cliente no coincide, carácter por carácter, con `<BETTER_AUTH_URL>/api/auth/callback/<proveedor>`.                                                                                      |
| Vuelve a `/login` con `WC-OAUTH-400-002` sólo con Microsoft              | El secreto venció o está mal copiado (el _Id._ en lugar del _Valor_), o faltan las notificaciones opcionales `verified_*_email`: el email llega sin verificar. Correr `oauth:inspect-token` con una cuenta. |
| Vuelve a `/login` con `WC-OAUTH-400-002` con los dos proveedores         | `BETTER_AUTH_URL` o `WEB_ORIGIN` mal puestos, o la cookie del `state` no vuelve (otro sitio, `http` en producción).                                                                                         |
| Vuelve con `WC-OAUTH-409-003`                                            | El email ya tiene cuenta con el otro proveedor: es lo esperado (spec §5.6); entrar con el primero.                                                                                                          |
| Sólo en Google: "Acceso bloqueado: esta app no completó la verificación" | La app sigue en modo "Testing" y la cuenta no está entre los usuarios de prueba: publicarla.                                                                                                                |
| El Perfil muestra las iniciales con foto                                 | Ver `STATE.md` → "La foto no carga en desarrollo" (front y API en puertos distintos); en producción no pasa.                                                                                                |
| La API no arranca                                                        | Un par de credenciales con una sola mitad, `OAUTH_DEV_IDP=on` con `NODE_ENV=production`, o ningún proveedor habilitado. El mensaje dice cuál.                                                               |
