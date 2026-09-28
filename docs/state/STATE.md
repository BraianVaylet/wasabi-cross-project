# Estado actual — Wasabi Cross

> Se lee al **empezar** cada sesión de trabajo. Se sobreescribe (no acumula historial — para eso está la [bitácora](./bitacora)).

## Fase actual

**Fases 0, 1 y 2: cerradas.** La 0 el 2026-09-17 (PR #1, CI verde), la 1 el 2026-09-22 con F1-18, y
la 2 el mismo día con F2-10. El monorepo corre: `apps/web`, `apps/api`, `packages/schemas` y
`packages/ui`. **Fase 3 — A producción, en curso** (spec §12): ver más abajo. **Fase 4 — Rediseño Toxic Cyberpunk: en curso, 0 de 18 tareas cerradas** (F4-01, F4-02, F4-12,
F4-03a/b/c, F4-04b y F4-05a–d mergeadas; F4-04a y F4-07 en una PR; todas a la espera de que el
usuario cumpla el Definition of Done y las marque). 75 puntos en total. No depende de Railway/Atlas, puede avanzar
en paralelo a lo que quede bloqueado de la Fase 3.

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
- **F4-04a · Header, logo y menú** y **F4-07 · Home y shell** — código hecho, PR abierta
  (`feat/f4-04a-07-header-home`), un commit por tarea. Logo con la "W" del diseño, `Wordmark`
  ("WASABI // CROSS" que se lee "Wasabi Cross"), header con la línea, menú en la condensada; la
  app en la columna de 430px, Home con las filas del historial, splash, 404, aviso de versión y
  manifest en `#0f041c`. Con esto el detalle coincide con el PNG también arriba.
- Quedan **F4-06, F4-08, F4-09, F4-10 y F4-11**: login/registro, nuevo/editar, perfil y
  estadísticas (ya con los componentes nuevos, les falta el ajuste fino), y el E2E que cierra la
  fase.

## Bloqueado

**F3-07 a F3-12**, en cadena, hasta que el usuario cree los ambientes de Railway (F3-07) y el
cluster de Mongo Atlas (F3-08). Son las dos únicas tareas 🔑 de la fase; el resto depende de ellas.

## Próximo paso

1. Revisar y mergear la PR de F4-04a y F4-07 (`feat/f4-04a-07-header-home`).
2. Seguir con las pantallas que quedan: F4-06 (login y registro), F4-08 (nuevo y editar), F4-09
   (perfil) y F4-10 (estadísticas); después F4-11 cierra la fase.
3. El usuario crea el proyecto en Railway (staging + production) y el cluster de Atlas. La IA
   prepara lo que se pueda automatizar alrededor (runbooks, workflow de CI) y confirma cada paso que
   toca la cuenta real antes de ejecutarlo.
4. Nombrar a mano las seis etiquetas del tablero para cerrar F0-08.
5. Decidir qué tareas de [prácticas de Claude Code](../claude-code-practices.md#tareas-propuestas)
   (IA-01 a IA-09) entran al plan. No dependen de Railway ni de Atlas: pueden avanzar mientras la
   Fase 3 espera.

## Decisiones abiertas

- **Proveedor de pago** para la suscripción Max (Mercado Pago / Stripe / otro).
- **Proveedor de email.** Sin él no hay recupero de contraseña, y el mockup de login tiene el link.
  Queda fuera de la Fase 1 hasta que se decida.
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

- Login sólo con email y contraseña en la Fase 1; username y Google, afuera.
- Los ejercicios de tiempo no tienen tabla de porcentajes.
- Los ejercicios del catálogo cuentan para el límite de 10 del plan Free.
- Bandas de carga: menos de 70% liviana, de 70% a 84% media, desde 85% pesada.
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
pnpm --filter @wasabi-cross/api seed:admin      # usuario admin con plan Max
pnpm dev                                        # API en :3000, web en :5173
```

**Usuario admin de desarrollo** (`seed:admin`, y de nuevo en cada arranque de `dev:ephemeral`):
`admin@wasabicross.dev` / `wasabi-cross-admin-dev`, plan Max fijo — no hay proveedor de pago
todavía (ver "Decisiones abiertas"), así que es la única forma de probar sin el límite del plan
Free. Configurable con `SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD`/`SEED_ADMIN_NAME`. Sólo de
desarrollo: el script se niega a correr con `NODE_ENV=production`.

## Última actualización

2026-09-27 — Arranca la Fase 4: llegó un mockup nuevo con un lenguaje visual completo
("Toxic Cyberpunk", `docs/design/`), y el usuario pidió aplicarlo a toda la app aunque sólo esa
pantalla (detalle de ejercicio) está diseñada. PR #55 (plan: ADR-0008, spec, ACTION-PLAN) y PR #56
(F4-01, tokens y tipografía) mergeadas. PR #57 (F4-02, se retira la preferencia de tema) abierta,
CI verde — de paso corrigió un bug real en `ExerciseDetailPage` que la propia refactorización
destapó (el detalle podía renderizar antes de que las preferencias llegaran). Fase 3 sin cambios
(F3-01, F3-02, F3-04, F3-05 y F3-06 cerradas, F3-03 parcial, el resto en cadena detrás de
F3-07/F3-08); no depende de la Fase 4, avanzan en paralelo. Bitácoras en [bitacora](./bitacora); la
última es [la de esta sesión](./bitacora/2026-09-27-fase-4-toxic-cyberpunk-inicio.md).
