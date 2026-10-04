# Estado actual — Wasabi Cross

> Se lee al **empezar** cada sesión de trabajo. Se sobreescribe (no acumula historial — para eso está la [bitácora](./bitacora)).

## Fase actual

**Fases 0, 1 y 2: cerradas.** La 0 el 2026-09-17 (PR #1, CI verde), la 1 el 2026-09-22 con F1-18, y
la 2 el mismo día con F2-10. El monorepo corre: `apps/web`, `apps/api`, `packages/schemas` y
`packages/ui`. **Fase 3 — A producción, en curso** (spec §12): ver más abajo. **Fase 4 — Rediseño Toxic Cyberpunk: en curso, 0 de 18 tareas cerradas** (F4-01, F4-02, F4-12,
F4-03a/b/c, F4-04a/b y F4-05a a F4-11 mergeadas: el código de la fase está completo. Todas a la
espera de que el usuario cumpla el Definition of Done y las marque). 75 puntos en total. No depende de Railway/Atlas, puede avanzar
en paralelo a lo que quede bloqueado de la Fase 3. **Fase 5 — Catálogo ampliado: el código está
completo (F5-00 a F5-12, mergeado; F5-13, Hybrid y Pilates, en PR)**; ninguna tarea cerrada
todavía, a la espera del Definition of Done. Ver abajo.

- El plan de la fase (ADR-0008, spec §11, backlog F4-01 a F4-11): PR #55, mergeada.
- **F4-01 · Fundaciones del tema** (PR #56) y **F4-02 · Se retira la preferencia de tema** (PR
  #57): mergeadas. Paleta única, Share Tech Mono + Staatliches vía Fontsource, radios a 0,
  `.wc-plate-cut`; `theme` fuera de schemas/API/Mongo y de `packages/ui`.
- **Replanificada el 2026-09-27** (F4-12, PR #60): la app tenía la paleta nueva y la estructura
  vieja. Las decisiones del usuario sobre lo que el diseño contradice o no cubre quedaron en spec
  §5, §5.1, §5.2 (nueva) y §11; F4-03, F4-04 y F4-05 se partieron.
- **Componentes Cross**, mergeados: F4-03a (#61: titulares en Staatliches, tokens de escala y
  color, `Button` con `cta`, `Card` actual/anterior), F4-03c (#63: `SectionHeader`, `Measure`,
  `PercentTiles`, `BottomBar`), F4-03b (#64: formularios, casilla y radio dibujados,
  `TextField variant="inline"`) y F4-04b (#65: el gráfico de progreso, sin salir de TanStack
  Charts). Hallazgos que quedaron como regla: el recorte va en el propio elemento (con el fondo en
  un `::before` axe deja el contraste sin verificar) y el foco es un anillo interior; axe no mide
  texto adentro de un SVG, ahí lo garantizan los tokens.
- **F4-05a–d · El detalle de ejercicio** — PR #66, mergeada, un commit por tarea. La primera pantalla con el diseño real: cabecera con migas y lápiz, "ELEGÍ TU
  CARGA", progreso con el aumento (`improvement()` en schemas), historial con la cantidad de
  registros y la barra fija con la carga, su banda y "Registrar nuevo RM". Comparada a 390px con
  el PNG: sólo difiere el header de la app (F4-04a y F4-07).
- **F4-04a · Header, logo y menú** y **F4-07 · Home y shell** — PR #67, mergeada. Logo con la "W" del diseño, `Wordmark`
  ("WASABI // CROSS" que se lee "Wasabi Cross"), header con la línea, menú en la condensada; la
  app en la columna de 430px, Home con las filas del historial, splash, 404, aviso de versión y
  manifest en `#0f041c`. Con esto el detalle coincide con el PNG también arriba.
- **F4-06, F4-08, F4-09 y F4-10 · Las pantallas que quedaban** — PR #68, mergeada, un commit por
  tarea: login y registro con la marca del header;
  valores fijos y zona de borrado en nuevo/editar; el perfil con los porcentajes como el campo en
  línea del detalle; estadísticas con el período en casilleros, el acordeón recortado y los números
  con `Measure`. Con la app corriendo, axe en cada pantalla: 0 violaciones.
- **F4-11 · E2E y axe de punta a punta** — PR #69, mergeada. axe a 390px en las pantallas
  que faltaban (nuevo ejercicio, menú abierto, 404, detalle de un tiempo) y la captura de
  referencia del detalle con las marcas del PNG. La captura es la de Linux (la del CI): el job de
  E2E la genera si falta y se commitea en la misma PR; desde ahí, un cambio que mueva el detalle
  hace fallar la comparación.

**Fase 5 — Catálogo ampliado** (2026-09-28): el usuario trajo un catálogo nuevo de ejercicios y
pidió dos pestañas en el alta (elegir un precargado o crear uno propio), con el precargado
editable. Decidido con él y volcado en [ADR-0009](../adr/0009-catalogo-ampliado.md) y spec §5.1 y
§5.3 (F5-00):

- 62 ejercicios que **reemplazan de cero** a los 33 de la Fase 0 (no hay producción; la migración
  borra también los gestionados y marcas de dev/staging que apunten al catálogo viejo).
- Dos categorías nuevas: **cardio** (metros + calorías) y **distancia con carga** (metros + peso,
  para las versiones de Hyrox de Sled Push/Pull y Farmers Carry). Sin porcentajes.
- **Hipertrofia con RM estimado (Epley)**: la tabla pasa a kg y la mejor marca es la de mayor RM
  estimado.
- Capacidad **potencia**; grupos **espalda baja** y **trapecio**; grupo **primario** más
  secundarios, y el segmento del cuerpo sale sólo del primario. Disciplinas y equipo como campos
  nuevos.
- **Un precargado editado se guarda como propio** (hasta la Fase 8 contaba para el límite del
  plan). Se retira `WC-EXO-409-004`.
- **F5-13 · Hybrid y Pilates** (2026-09-30, [ADR-0010](../adr/0010-hybrid-y-pilates.md)): el usuario
  sumó 58 ejercicios (el catálogo pasa a **120**) y dos disciplinas nuevas, **hybrid** y
  **pilates**, con su equipo (colchoneta, reformer, aro y pelota de pilates, anillas, paralelas,
  GHD, BikeErg). Sin ampliar los schemas el seed fallaba y el catálogo respondía 500; ahora
  `disciplineSchema` y `equipmentSchema` los admiten. Sin migración de datos: los enums sólo se
  ensanchan. En una base ya sembrada, `seed` crea las 58 nuevas y actualiza las disciplinas de las
  que cambiaron.

**Fase 7 — Estadísticas ampliadas** (2026-10-02, spec §5.4): el usuario pidió donas con la
proporción de disciplinas según sus ejercicios, los grupos musculares más trabajados contando
primario y secundarios, y que se evaluaran otras métricas; de la evaluación eligió las cuatro
propuestas. **El código está completo (F7-00 a F7-07, mergeado en la PR #92)**, ninguna tarea cerrada:

- Dos endpoints nuevos en `stats`, sin tocar el resumen: `GET /stats/breakdown` (sin período:
  disciplina, categoría, segmento, grupo) y `GET /stats/activity` (constancia, récords nuevos, los
  tres que más mejoraron, para retestear). Se llama `breakdown` y no `composition` para no
  confundirlo con `src/composition.ts`.
- Una disciplina **cuenta entera en cada ejercicio** que la tiene (porcentaje sobre menciones);
  "Sin disciplina" aparte. Grupos: **primario 1, secundario ½**. Mejor marca nueva = supera a
  todas las anteriores (la primera y el empate no cuentan). Para retestear: **más de 56 días**.
- Componentes Cross nuevos: `Donut` (TanStack Charts `polar`), `RankBars` (HTML) y `ColumnChart`
  (`barY`). Paleta de gráficos `--wc-chart-*` validada con la skill dataviz sobre `--wc-surface`.
- Agregar, editar o borrar un ejercicio invalida ahora todo `stats` (antes el resumen podía
  quedar viejo 5 minutos).

**Fase 8 — Plan Pro** (2026-10-03, [ADR-0011](../adr/0011-plan-pro-y-estadisticas.md), spec §4 y
§5.5): el usuario cambió la monetización. Dos planes, **Free y Pro**, y lo único que los
diferencia es **ver las estadísticas**; los dos cargan todos los ejercicios y marcas que quieran.
**El código está completo (F8-00 a F8-06, mergeado en la PR #93)**, ninguna tarea cerrada:

- **Se fue el límite de cantidad** (10 ejercicios, 3 propios) y todo lo que lo sostenía: el
  serializador con su lock, el contador, `WC-SUBS-403-001` (retirado) y la colección
  `entitlement_locks` (una migración la borra). El alta corre en el `TransactionRunner`; dos altas
  simultáneas del mismo ejercicio las resuelve el índice único.
- **`max` pasa a `pro`** (migración reversible; `seed:admin` siembra Pro).
- **Las estadísticas son de Pro, y lo hace cumplir la API**: un guard `onRequest` después de la
  sesión responde 403 `WC-SUBS-403-002` en los cuatro endpoints de `stats`, sin mirar si el
  ejercicio existe. "Estadísticas" es todo lo de `stats`: la pantalla completa y el progreso del
  detalle. Con Free el front muestra un aviso con "Ver planes" y ni pide los datos; si la API
  igual dice 403 (plan cambiado en otro dispositivo), el mismo aviso y no un error.
- **Pantalla `/suscripcion`, sólo UI**: plan actual, lo que se paga ($0 en Free; Pro, **"A
  definir"**) y las dos tarjetas. "Pasar a Pro/Free" avisa que todavía no está disponible y no
  llama a la API: no hay endpoint de cambio de plan a propósito (sin cobro regalaría Pro). El
  Perfil suma "Tu plan" y, con Pro, el header muestra una etiqueta **PRO** que lleva ahí.
- Los E2E fijan el plan de sus atletas con un control que sólo existe en `dev:ephemeral`
  (`POST :3101/plan`, nunca en la API que se despliega).

**Fase 9 — Ingreso con OAuth 2.0, Google y Microsoft** (2026-10-04, **sólo planificada**, 11 tareas y
42 puntos en el [backlog](../ACTION-PLAN.md)): el usuario pidió un módulo nuevo y, después, que
**todo el login y el registro pase por OAuth**, sin email ni contraseña, que se olviden las cuentas
actuales (no hay producción), que se sume Outlook y que el Perfil muestre la foto. Wasabi Cross es
**cliente** OIDC con un módulo `oauth` sobre Better Auth; entrar por primera vez crea la cuenta Free.
**F9-00 está hecha y mergeada** (PR #94: spec §5.6 nueva y §5, §5.5, §6, §7, §12 y §13 al día,
[ADR-0012](../adr/0012-ingreso-solo-con-oauth.md)). **F9-01 y F9-02 están mergeadas** (PR #95): los
contratos y los códigos `WC-OAUTH-*` en schemas, y el módulo `oauth` con
`GET /api/v1/oauth/providers` y las variables de entorno (`GOOGLE_*`, `MICROSOFT_*`,
`OAUTH_DEV_IDP`, `MICROSOFT_AUTHORITY`) con sus guardas. **F9-03 está mergeada** (PR #96): el IdP falso
de desarrollo (`apps/api/dev-support/`, dos caras: genérica y Microsoft), `startServer` en
`src/bootstrap.ts` con los plugins de Better Auth inyectados, `scripts/dev.ts` (que corre `pnpm dev`)
y el cableado en `dev:ephemeral`, con cuatro guardas probadas con pruebas inversas. **F9-04 está
mergeada** (PR #99): los tests de la API abren sesión con `createTestSession` (el plugin `testUtils`,
sólo con `NODE_ENV=test`), el admin sembrado queda **sin contraseña** y ligado a la cuenta del IdP
falso, y se fue `UserRegistrar`. **F9-05 tiene el código hecho, en una PR** (la puerta de entrada,
de riesgo alto): **el email y la contraseña dejaron de existir** —Better Auth sin
`emailAndPassword`, y sólo cuatro de sus rutas llegan a la red—, las cuentas no se vinculan solas,
los tokens del proveedor no se guardan, un email sin verificar no crea usuario, el `tid` de Microsoft
se chequea, y la API no arranca sin ningún proveedor. **Desde F9-05 y hasta F9-07 las pantallas
`/login` y `/registro` no funcionan** (la API les responde 404): en local se entra como se explica
abajo, en "Cómo correrlo". El usuario confirmó los seis
supuestos (2026-10-04): Google y Microsoft sólo con cuentas personales (`consumers`), cualquier
cuenta verificada crea cuenta Free, el nombre sale del proveedor, la foto se muestra en el Perfil,
cada ingreso pide elegir la cuenta, y las cuentas no se vinculan solas. Hallazgos que cambian el diseño: sin contraseña no sirve nada de lo que hoy abre una sesión (once
tests de la API, `registrarse()` del E2E y `seed:admin`), así que el IdP falso pasa a ser el ingreso
de desarrollo —con guardas, porque en producción sería un bypass—; el email de Microsoft no es
confiable según su documentación, y F9-10 tiene que comprobar con una cuenta real si trae los _claims_
de verificación antes de dar por buena su cuenta; la foto hay que servirla desde la API porque la CSP
bloquearía la URL de Google; y el service worker de la PWA contestaba con `index.html` al callback
(no excluía `/api/`): **arreglado en F9-05**, porque el E2E de producción lo mostró. **Después de la fase:** un modal para promocionar Pro (sin tareas todavía).

**Fase 10 — Landing page con Astro** (2026-10-04, **planificada, F10-00 hecha**, 14 tareas y 40 puntos en el
[backlog](../ACTION-PLAN.md)): el usuario trajo el diseño en `docs/landing/` (un HTML y su PNG, más
16 capturas de la app) y pidió que se desarrolle con Astro. La spec la dejaba afuera (§1 y §5);
F10-00 la mete. Cuatro decisiones del usuario: **sitio aparte** (`apps/landing`, con su propio
servicio estático en Railway: la landing en el dominio raíz y la app en `app.`), la landing **lleva
a la app** ("Entrar" y "Empezar gratis" al `/login`, por la variable `PUBLIC_APP_URL`), **voseo
es-AR**, y **Free y Pro como dice la spec** (sin "anual", y el historial de marcas en lugar de la
"tendencia", que es de Pro). Hallazgos: el PNG del diseño salió con las imágenes rotas; el HTML trae
Tailwind y Google Fonts por CDN (se reescribe sobre los tokens, con Fontsource); el contraste del
diseño pasa AA; el diseño nombra 5 de las 7 disciplinas; y que un cambio de copy no reinicie la API
depende de los _watch paths_ de Railway, que el IaC no documenta (F10-12 lo comprueba). **El dominio
hay que fijarlo antes de F9-10** en staging y prod: las redirect URIs de OAuth llevan el host de la
app. **F10-00 (spec §5.7 y [ADR-0013](../adr/0013-la-landing-es-un-sitio-estatico-aparte.md))
está mergeada (PR #98), F10-01 (el workspace `apps/landing` con Astro) también (PR #100) y
F10-02 (tokens, fuentes y estilos base) está hecha en una PR**; ninguna tarea cerrada.

## Bloqueado

**F3-07 a F3-12**, en cadena, hasta que el usuario cree los ambientes de Railway (F3-07) y el
cluster de Mongo Atlas (F3-08). Son las dos únicas tareas 🔑 de la fase; el resto depende de ellas.

## Próximo paso

1. Fase 5: mergear la PR de F5-13 (Hybrid y Pilates); después no queda código (F5-00 a F5-13). El
   usuario cumple el Definition of Done de la fase, marca `[x]` sus tareas y sincroniza Trello
   (`/trello-sync`). Falta crear la tarjeta de F5-13 (`/trello-sync`).
2. El usuario revisa el Definition of Done de la Fase 4 (F4-01 a F4-12) y marca `[x]` y mueve
   las tarjetas a `Completadas`.
3. Después de la fase: decidir si Login, Perfil y Estadísticas merecen un diseño propio (hoy
   extrapolan el del detalle) o si la Fase 3 (Railway y Atlas) vuelve a ser la prioridad.
4. El usuario crea el proyecto en Railway (staging + production) y el cluster de Atlas. La IA
   prepara lo que se pueda automatizar alrededor (runbooks, workflow de CI) y confirma cada paso que
   toca la cuenta real antes de ejecutarlo.
5. Nombrar a mano las seis etiquetas del tablero para cerrar F0-08.
6. Decidir qué tareas de [prácticas de Claude Code](../claude-code-practices.md#tareas-propuestas)
   (IA-01 a IA-09) entran al plan. No dependen de Railway ni de Atlas: pueden avanzar mientras la
   Fase 3 espera.
7. Fase 7 (PR #92, mergeada): cumplir el Definition of Done —sobre todo las tres reglas de §5.4 y
   cómo se ven las donas en el teléfono— y crear las tarjetas (`/trello-sync`).
8. Fase 8 (PR #93, mergeada): correr las migraciones `fuera-locks-de-cupo` y `plan-pro` en cada
   ambiente antes de desplegar, cumplir el Definition of Done —sobre todo el alcance de
   "estadísticas" y el guard de la API, que es lo que regala o no la función de pago— y crear las
   tarjetas (`/trello-sync`).
9. **Segunda etapa de la suscripción** (todavía sin tareas): pasarela de pago, el endpoint de
   cambio de plan, el vencimiento y qué pasa al bajar de Pro. La UI de `/suscripcion` ya tiene
   los botones esperando esa lógica.
10. **Fase 9:** cumplir el Definition of Done de F9-00 a F9-04 (mergeadas) y **revisar la PR de F9-05,
    que es la puerta de entrada de toda la app: un error ahí regala cuentas** (los tests de
    `oauth-signin`, de la política de rutas y de los hooks necesitan ojo humano, spec §9). Después
    F9-06 (logs) y F9-07 (la pantalla de ingreso: con ella vuelven a andar `/login` y la web). F9-10
    necesita que el usuario cree el
    cliente OAuth en Google Cloud Console y el registro de la app en Microsoft Entra (🔑); staging y
    prod esperan a F3-07.
11. **Tests de `apps/web` bajo carga:** corridos todos juntos en local (`pnpm verify`,
    `pnpm test:coverage`) fallan por `Test timed out in 5000ms`, y cada corrida un conjunto distinto
    (19 y 14 tests, los de axe y los formularios); solos pasan 392 de 392, y **en el CI pasaron**
    (PR #95). Es de la máquina local con carga; si vuelve a verse en el CI, subir el `testTimeout`
    de `apps/web`.
12. **Fase 10 (landing):** revisar la PR de F10-02 (tokens, fuentes y estilos base; toca
    `packages/ui`: un export nuevo); después F10-03 (layout, header, footer, 404 y
    `Screenshot`). Crear las tarjetas (`/trello-sync`). Corre en paralelo a la Fase 9: no comparten código.
    **Decidir el dominio** (landing en la raíz, app en `app.`) antes de F9-10 en staging y
    prod.

## Decisiones abiertas

- **Proveedor de pago** para la suscripción Pro (Mercado Pago / Stripe / otro).
- **Precio de Pro** y su período (mensual o anual): a definir. La UI dice "A definir" y el texto
  vive en `apps/web/src/lib/plans.ts`.
- **Excepción a `minimumReleaseAge` en `pnpm-workspace.yaml`** (F10-01): `http-cache-semantics@4.3.0`,
  el parche de una vulnerabilidad alta que entra por `astro`, y un `overrides` que lo fuerza. Es
  una versión de 19 h al decidirla (mismo publicador que la anterior, firmada). Sacar las dos
  líneas cuando la versión cumpla la antigüedad y Astro suba su rango a `^4.3.0`.
- **Dominio** de Wasabi Cross: no hay. El plan de la landing asume la landing en la raíz y la
  app en `app.`, y de eso dependen el host de las redirect URIs de OAuth (F9-10) y el de
  `WEB_ORIGIN` y `BETTER_AUTH_URL`.
- **Color de Pro.** El diseño de la landing pinta Pro de rosa (`#C15EA7`); la etiqueta PRO de la
  app es lima. F10-02 sigue el diseño; unificarlos es cambiar un token.
- **TypeScript 7.** Hoy el monorepo está en 6.0.3 (PR #8) porque `typescript-eslint@8` declara
  `typescript >=4.8.4 <6.1.0` como peer, y con TS 7.0 directamente se niega a cargar (probado:
  build, typecheck y tests pasan; el lint muere). `.github/dependabot.yml` ignora
  `typescript >=6.1.0` con el mismo rango. Revisar cuando typescript-eslint lo soporte
  (typescript-eslint/typescript-eslint#10940, apunta a TS ≥7.1).
- **Prácticas de Claude Code.** [El análisis](../claude-code-practices.md) propone diez (permisos y
  `deny` versionados, `/entregar`, un `spec-reviewer`, verificación en navegador, guardas de git
  por hook, entre otras) y nueve tareas, 20 puntos. Falta elegir cuáles entran y sumar a la spec §9
  que el harness de `.claude/` se versiona como el resto del código.

Cerradas el 2026-09-18, ya volcadas en la spec §4, §5 y §5.1:

- Login sólo con email y contraseña en la Fase 1; username y Google, afuera. **Reemplazada el
  2026-10-04 (Fase 9): el ingreso es sólo con OAuth, Google y Microsoft** (spec §5.6, ADR-0012). Con
  ella se cierra también la decisión abierta "Proveedor de email": sin contraseñas no hay recupero.
- Los ejercicios de tiempo no tienen tabla de porcentajes.
- Los ejercicios del catálogo cuentan para el límite de 10 del plan Free. **Reemplazada el
  2026-10-03 (Fase 8): ya no hay límite de cantidad** (spec §4, ADR-0011).
- Bandas de esfuerzo: menos de 70% bajo, de 70% a 84% medio, desde 85% alto. Se llamaban "carga
  liviana/media/pesada"; desde 2026-10-02 el tag dice "Esfuerzo bajo/medio/alto" (spec §5.1). Los
  códigos internos (`liviana`/`media`/`pesada` en schemas) no cambian.
- El peso es sólo en kg. La opción de lb nunca estuvo en los mockups: la había agregado F0-02.
- Una marca no puede tener fecha futura (spec §5.1).

Defaults fijados sin consulta explícita, para revisar en la PR: carga redondeada al 0,5 kg,
repeticiones redondeadas hacia abajo con mínimo 1, "valor actual" = la marca de fecha más reciente, y
si la mejor marca se repite, cuenta la primera vez que se logró. Un tiempo se muestra como mm:ss (4:32)
y, por debajo del minuto, en segundos.

Cerradas en la Fase 0: herramienta de monorepo → pnpm ([ADR-0002](../adr/0002-pnpm-workspaces-como-monorepo.md));
framework HTTP → Fastify ([ADR-0003](../adr/0003-fastify-como-framework-http.md)); forma de los IDs
→ prefijo por entidad ([ADR-0004](../adr/0004-ids-de-dominio-con-prefijo.md)). Cerrada en F1-02:
herramienta de migraciones → migrate-mongo ([ADR-0005](../adr/0005-migraciones-con-migrate-mongo.md)).

## Cómo correrlo

```bash
pnpm install
pnpm verify                              # build + formato + lint + typecheck + test
pnpm e2e                                 # Playwright: flujo principal + axe (levanta todo solo)

# Para desarrollar contra datos que se tiran al cerrar: migra, siembra y crea el admin solo.
pnpm --filter @wasabi-cross/api dev:ephemeral   # API en :3100, Mongo efímero

# Contra un Mongo propio: copiar apps/api/.env.example a apps/api/.env (dev, migrate y seed
# lo leen solos), MONGODB_URI tiene que ser un replica set, y antes de levantar:
pnpm --filter @wasabi-cross/api migrate up      # sin esto, /ready responde no-listo
pnpm --filter @wasabi-cross/api seed            # catálogo de ejercicios
pnpm --filter @wasabi-cross/api seed:admin      # usuario admin con plan Pro, sin contraseña
pnpm dev                                        # API en :3000, web en :5173; con OAUTH_DEV_IDP=on, el IdP falso en :3102
```

**Usuario admin de desarrollo** (`seed:admin`, y de nuevo en cada arranque de `dev:ephemeral`):
`admin@wasabicross.dev`, plan Pro fijo y **sin contraseña** (F9-04, ADR-0012): queda ligado a la cuenta
del IdP falso, que lo ofrece cargado por defecto, así que entrar como él es un clic en la pantalla del
IdP (`OAUTH_DEV_IDP=on`). No hay proveedor de pago todavía (ver "Decisiones abiertas"): es la única
forma de ver las estadísticas sin que se puedan pagar. Un usuario que se registra nace Free.
Configurable con `SEED_ADMIN_EMAIL`/`SEED_ADMIN_NAME`. Sólo de desarrollo: el script se niega a correr
con `NODE_ENV=production`.

**Cómo entrar a la web en local hasta F9-07** (la pantalla de ingreso todavía no tiene el botón del IdP, y
el formulario de email y contraseña ya no existe): abrir `/login`, y en la consola del navegador
pedirle a la API la URL del IdP y seguirla:

```js
const r = await fetch('/api/auth/sign-in/social', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({
    provider: 'fake-idp',
    callbackURL: location.origin + '/',
    errorCallbackURL: location.origin + '/login',
  }),
});
location.href = (await r.json()).url;
```

La pantalla del IdP muestra al admin Pro cargado: un clic y se entra como él. Para entrar como un
usuario Free, cambiar el email y el nombre antes de apretar "Entrar". La API necesita `OAUTH_DEV_IDP=on`
(el `.env.example` ya lo trae): sin ningún proveedor, no arranca.

## Última actualización

2026-10-04 — **Fase 10, F10-02**: la landing usa los tokens de la app (`@wasabi-cross/ui/tokens.css`),
sus propios tokens y las tres tipografías de Fontsource, con el contraste cuidado por un test, en
una PR. Bitácora [2026-10-04](./bitacora/2026-10-04-f10-02-tokens-fuentes.md).

2026-10-04 — **Fase 10, F10-01**: el workspace `apps/landing` con Astro 7, ESLint y Prettier para
`.astro` y un test de build real, en una PR. Bitácora
[2026-10-04](./bitacora/2026-10-04-f10-01-workspace-astro.md).

2026-10-04 — **Fase 10, F10-00**: spec §5.7 (la landing) y ADR-0013 (sitio aparte), en una PR.
Bitácora [2026-10-04](./bitacora/2026-10-04-f10-00-spec-landing.md).

2026-10-04 — **Fase 10, landing page con Astro**: backlog (14 tareas, 40 puntos), sólo
planificación. Decididos con el usuario: sitio aparte, la landing lleva a la app, voseo y
Free/Pro según la spec. Bitácora [2026-10-04](./bitacora/2026-10-04-plan-landing.md).

2026-10-04 — **Fase 9, F9-05**: Better Auth sólo con OAuth, en una PR. Se fue el email y la
contraseña; sólo cuatro rutas de Better Auth llegan a la red; el `tid` de Microsoft se chequea; una
migración con los índices únicos de la identidad. De paso, el 429 del límite de intentos respondía 500.
Bitácora [2026-10-04](./bitacora/2026-10-04-f9-05-better-auth-solo-oauth.md).

2026-10-04 — **Fase 9, F9-04**: tests y seed sin contraseña: `createTestSession`, el admin ligado al
IdP falso, fuera `UserRegistrar`, mergeado en la PR #99. Bitácora
[2026-10-04](./bitacora/2026-10-04-f9-04-tests-y-seed-sin-contrasena.md).

2026-10-04 — **Fase 9, F9-03**: el IdP falso de desarrollo, el arranque con plugins inyectados y las
cuatro guardas, mergeado en la PR #96. Se descubrió que Better Auth no chequea el `tid` de Microsoft
en el flujo con `code`: va a F9-05. Bitácora
[2026-10-04](./bitacora/2026-10-04-f9-03-idp-falso.md).

2026-10-04 — **Fase 9, F9-01 y F9-02**: contratos de OAuth en schemas y el módulo `oauth` (proveedores
habilitados y entorno), mergeados en la PR #95. Bitácora
[2026-10-04](./bitacora/2026-10-04-f9-01-02-contratos-y-modulo-oauth.md).

2026-10-04 — **Fase 9, ingreso sólo con OAuth 2.0 (Google y Microsoft)**: backlog (11 tareas, 42
puntos) y F9-00 (spec §5.6, ADR-0012), mergeados en la PR #94. Bitácora
[2026-10-03](./bitacora/2026-10-03-plan-oauth.md).

2026-10-03 — **Fase 8, plan Pro**: spec §4 y §5.5, ADR-0011, backlog (7 tareas, 22 puntos) y el
código completo en una PR, un commit por tarea (F8-01 a F8-03 en tres capas a la vez porque el
contrato `usage` lo leían todas). Bitácora
[2026-10-03](./bitacora/2026-10-03-f8-plan-pro.md).

2026-10-02 — Fase 7, estadísticas ampliadas: spec §5.4, backlog (8 tareas, 23 puntos) y el código
completo en una PR, un commit por tarea. Bitácoras en [bitacora](./bitacora); la última es
[la de esta sesión](./bitacora/2026-10-02-f7-estadisticas-ampliadas.md).

2026-10-02 — La disciplina **Gimnasio pasa a llamarse Musculación**: el valor guardado es
`musculacion` (era `gimnasio`) en el schema, el catálogo y la web. La migración
`20261002120000-disciplina-musculacion` convierte los ejercicios ya guardados, catálogo y propios;
es reversible. Spec §5.1 y §5.3. Bitácora
[2026-10-02](./bitacora/2026-10-02-disciplina-musculacion.md).

2026-10-02 — Dos ajustes de texto pedidos por el usuario: las bandas de carga pasan a "esfuerzo
bajo/medio/alto" (aplica a cualquier tipo de ejercicio) y, fuera de fuerza, el campo de la marca
aclara que es la mejor marca (repeticiones máximas, mejor tiempo, distancia máxima), el equivalente
de un RM. Spec §5.1; bitácora [2026-10-02](./bitacora/2026-10-02-esfuerzo-y-mejor-marca.md).

2026-09-28 — Se planifica la Fase 5, catálogo ampliado: el usuario trajo 61 ejercicios en JSON con
disciplinas, equipo y grupo primario/secundarios, y pidió dos pestañas en el alta con el precargado
editable. Revisados los datos contra el modelo, salieron seis decisiones del usuario (reemplazo de
cero, Epley, cardio en metros + calorías, precargado editado = propio, running sólo de distancia
única, peso fijo = gimnástico) y la versión en metros de Hyrox: 62 ejercicios, 15 tareas y 59
puntos. F5-00 (spec, ADR-0009, backlog) en PR. PR #69 (F4-11) mergeada: el código de la Fase 4
está completo. Bitácoras en [bitacora](./bitacora); la última es
[la de esta sesión](./bitacora/2026-09-28-f5-00-catalogo-ampliado.md).
