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
- **Un precargado editado se guarda como propio** y cuenta para el límite del plan. Se retira
  `WC-EXO-409-004`.
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
propuestas. **El código está completo (F7-00 a F7-07, en una PR)**, ninguna tarea cerrada:

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
7. Fase 7: revisar la PR de estadísticas ampliadas (sobre todo las tres reglas de §5.4 y cómo se
   ven las donas en el teléfono), mergear, cumplir el Definition of Done y crear las tarjetas
   (`/trello-sync`).

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
pnpm --filter @wasabi-cross/api seed:admin      # usuario admin con plan Max
pnpm dev                                        # API en :3000, web en :5173
```

**Usuario admin de desarrollo** (`seed:admin`, y de nuevo en cada arranque de `dev:ephemeral`):
`admin@wasabicross.dev` / `wasabi-cross-admin-dev`, plan Max fijo — no hay proveedor de pago
todavía (ver "Decisiones abiertas"), así que es la única forma de probar sin el límite del plan
Free. Configurable con `SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD`/`SEED_ADMIN_NAME`. Sólo de
desarrollo: el script se niega a correr con `NODE_ENV=production`.

## Última actualización

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
