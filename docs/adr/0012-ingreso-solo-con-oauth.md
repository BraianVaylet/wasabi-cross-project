# ADR-0012: El ingreso es sólo con OAuth 2.0 (Google y Microsoft)

- Fecha: 2026-10-04
- Estado: aceptada

## Contexto

El ingreso de la Fase 0 y 1 (F0-03, F1-10) es con email y contraseña: Better Auth guarda el hash, el
formulario valida el largo, `haveIBeenPwned` mira las filtraciones y hay un límite de 5 intentos por
minuto. El 2026-09-18 se decidió que Google, que el mockup 2 ya mostraba, quedaba afuera de la
Fase 1. Dos cosas quedaron colgando de esa decisión: **no hay recupero de contraseña** (necesita un
proveedor de email que no se eligió) ni **verificación de email**.

El usuario cambió el rumbo (2026-10-04): **todo el login y el registro pasa por OAuth 2.0**, con
Google y con Outlook, y se olvidan las cuentas actuales porque todavía no hay producción ni Atlas.
También pidió mostrar la foto del usuario en el Perfil.

Better Auth, que ya está, trae los dos proveedores (`socialProviders`: _authorization code_, PKCE,
`state`, cookie de sesión) y un plugin de pruebas (`testUtils`).

## Opciones consideradas

1. **Sólo OAuth.** Sin contraseñas. El proveedor autentica, verifica el email y puede pedir 2FA.
2. **OAuth y contraseña, juntos.** Más puertas de entrada. Obliga a decidir cómo se vinculan las
   cuentas, a verificar el email (hoy ninguna cuenta con contraseña lo está, y Better Auth no
   vincula una cuenta local sin email verificado), y deja el recupero de contraseña sin resolver.
3. **Seguir sólo con contraseña.** Es lo que hay. No cumple lo pedido y deja abiertas las dos cosas
   de arriba.

Dentro de la 1, cuatro decisiones más, tomadas con el usuario:

- **Qué cuentas de Microsoft.** `consumers` (personales: Outlook, Hotmail, Live) o `common` (también
  las de trabajo o escuela). En una cuenta de trabajo el claim `email` lo controla el administrador
  del tenant: Microsoft documenta que "no está garantizado como correcto y es mutable" y que no se
  use para identificar ni guardar datos del usuario (el ataque _nOAuth_).
- **Vinculación de cuentas.** Apagada, o encendida sólo entre emails verificados.
- **Dónde vive.** Dentro de `auth`, o un módulo `oauth` aparte.
- **La foto.** Enlazar la del proveedor, o servirla desde la API.

## Decisión

**Opción 1.** Wasabi Cross es **cliente** OpenID Connect de los proveedores; no es un servidor OAuth
y no le entrega tokens a nadie.

- **Proveedores:** Google y Microsoft con tenant **`consumers`**. Las cuentas de trabajo o escuela
  quedan afuera. Cualquier cuenta con **email verificado por el proveedor** puede crear cuenta, que
  nace Free.
- **Identidad:** el par (proveedor, id del proveedor). Para Microsoft, el `oid`, que es inmutable y
  es lo que Better Auth ya usa. **Nunca el email.**
- **Verificación de email en Microsoft:** Better Auth sólo la da por hecha con `email_verified` o con
  el email dentro de `verified_primary_email` / `verified_secondary_email`, que son claims
  opcionales que hay que pedir en el registro de la app en Entra. Su documentación no dice si las
  cuentas personales los reciben. F9-10 lo comprueba con una cuenta real; si no vienen, se frena y
  se decide de nuevo. **No se fuerza `emailVerified: true`.**
- **Vinculación apagada** (`accountLinking.enabled: false`). Un email que ya tiene cuenta con el otro
  proveedor recibe `WC-OAUTH-409-003` y se le dice que entre con ese. Quien usa dos emails tiene dos
  cuentas separadas. Encender la vinculación exige sesión iniciada y que los dos emails estén
  verificados: es una función aparte.
- **Módulo `oauth`**, con `auth` quedándose con la sesión. `oauth` define la configuración de
  proveedores y las reglas de alta; la raíz de composición se la inyecta a `createAuth`, y `auth` no
  lo importa, como pasa con `requireSession`. El módulo sirve `GET /api/v1/oauth/providers`, público.
- **Scopes mínimos y sin acceso offline.** Google: `openid email profile`. Microsoft: `openid profile
email User.Read`, sin `offline_access`, que Better Auth agrega por defecto. `User.Read` sólo sirve
  para la foto.
- **Cada ingreso pide elegir la cuenta** (`prompt: select_account`): cerrar sesión en Wasabi no cierra
  la del proveedor.
- **Los tokens no se guardan.** El único uso del _access token_ es pedirle la foto a Microsoft Graph
  durante el ingreso (el ID token de Microsoft no la trae; Google manda la URL en el suyo). Si Better
  Auth no permite descartarlos antes de guardar, se guardan cifrados (`encryptOAuthTokens`).
  Refrescar la foto sin que la persona entre exigiría un _refresh token_, un secreto de larga vida
  en la base; se refresca en cada ingreso.
- **La foto se sirve desde la API** (`GET /api/v1/me/photo`) y `/me` sólo dice `hasPhoto`. La CSP
  por defecto (`img-src 'self' data:`) bloquearía la URL de Google, y el _data URL_ de Microsoft,
  de unos 6 KB, viajaría en cada `/me`. La API sólo baja imágenes de hosts de Google, sólo
  `png`/`jpeg`/`webp`.
- **El IdP falso es el ingreso de desarrollo y del E2E.** Sin contraseñas no hay otra forma de abrir
  una sesión en local. Como en producción sería un _bypass_ de la autenticación: vive fuera de `src/`,
  no entra a `dist/` y `parseEnv` se niega a arrancar con él en `production`. Los tests de la API usan
  `testUtils`.
- **Sin migración de cuentas.** Las bases de desarrollo con cuentas viejas se borran.
- Se retiran `WC-AUTH-401-001` (credenciales inválidas) y, de la spec §13, el recupero de contraseña
  y las listas de contraseñas filtradas.

## Consecuencias

- **Dependemos de dos proveedores.** Si los dos no responden, nadie entra; y quien pierde su cuenta
  de Google o de Microsoft pierde el acceso a sus ejercicios. Un tercer proveedor sería una entrada
  en el registro, sus credenciales y un botón, más la pregunta de la vinculación.
- **Dos cuentas para quien usa dos emails.** Es inherente a no vincular por email; la vinculación
  explícita, con sesión, lo resolvería.
- **Se cierra la decisión abierta "Proveedor de email":** sin contraseñas no hay nada que recuperar.
- **Se va mucho código:** los formularios de login y registro, `signInSchema`/`signUpSchema`/
  `passwordSchema`, `haveIBeenPwned`, `UserRegistrar` y la contraseña del `seed:admin`. Once archivos
  de test de la API y `registrarse()` del E2E dejan de poder abrir una sesión por formulario.
- **El IdP falso es un riesgo nuevo** y tiene tres guardas con su test.
- **El service worker de la PWA** responde `index.html` a toda navegación sin exclusión, y el
  callback de OAuth es una navegación: hay que excluir `/api/` de su `navigateFallback` (F9-07).
- **Los secretos de cliente de Microsoft vencen** (hasta 24 meses): el runbook anota la fecha.
- **Un email de Microsoft sin claims de verificación** impediría crear cuentas con Microsoft. Es
  preferible a forzar la verificación: con la vinculación apagada el email sólo importa para que
  nadie se adelante con el de otro, y eso lo impide pedirlo verificado.
