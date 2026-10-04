# Wasabi Cross — Spec del Producto

> Spec fuente de verdad para desarrollo asistido por IA. Si el código o un LLM proponen algo fuera de esta spec, se actualiza la spec primero, después se codea (ver [§9 Buenas prácticas con IA](#9-buenas-prácticas-con-ia)).

## 1. Resumen

|                            |                                                                              |
| -------------------------- | ---------------------------------------------------------------------------- |
| Nombre                     | Wasabi Cross                                                                 |
| Qué es                     | Webapp para gestionar ejercicios y RMs (repetición máxima) de un atleta      |
| Alcance de este desarrollo | Webapp + API + landing page (un sitio estático aparte, §5.7).                |
| Monetización               | Suscripción Free / Pro                                                       |
| Origen                     | Evolución (v2) de bv-cross, para uso personal, amigos y algunos suscriptores |

## 2. Qué NO es Wasabi Cross

Esta spec parte de una anterior (un SaaS de gestión para gimnasios, tipo Laplace) y todavía puede arrastrar ideas de ahí. Explícitamente, Wasabi Cross:

- **No es multi-tenant.** No hay organizaciones, clubes ni gimnasios como entidad del sistema.
- **No gestiona clases, reservas ni asistencia** (nada de booking, attendance, lista de espera).
- **No gestiona membresías ni contratos** de un club sobre un socio.
- **No tiene CRM** ni funciones de venta o seguimiento de leads.
- **No es una app de salud regulada.** El tag "pain" es una etiqueta de UX sobre el ejercicio, no un registro clínico con consentimiento formal.
- La relación es **usuario ↔ sus propios ejercicios**. Nada de jerarquías tenant/venue/socio.

Si una tarea o un LLM proponen alguno de estos conceptos, es señal de que se está copiando de la spec equivocada — parar y revisar contra este documento.

## 3. Descripción del producto

Webapp donde el usuario carga sus ejercicios (o los elige de un listado pre-cargado en la base de datos) y registra su RM, tiempo, repeticiones o distancia según el tipo de ejercicio. La app calcula automáticamente los porcentajes de carga sobre el RM y guarda el histórico para ver la evolución del entrenamiento en el tiempo.

## 4. Monetización

Dos planes, Free y Pro. **Lo único que los diferencia es poder ver las estadísticas**: cargar es igual de libre en los dos.

| Plan     | Ejercicios (catálogo y propios) | Marcas por ejercicio | Estadísticas |
| -------- | ------------------------------- | -------------------- | ------------ |
| **Free** | Los que quiera                  | Todas las que quiera | No           |
| **Pro**  | Los que quiera                  | Todas las que quiera | Sí           |

Antes de la Fase 8 el plan limitaba la cantidad de ejercicios (Free: 10, de ellos 3 propios; Max:
ilimitado). Ese límite **ya no existe** ([ADR-0011](../adr/0011-plan-pro-y-estadisticas.md)).

**Qué es "ver las estadísticas".** Todo lo que sale de los endpoints de `stats`: la pantalla
Estadísticas completa —por ejercicio y generales, con constancia, récords, para retestear y tu
entrenamiento (§5, §5.4)— y el **progreso del detalle de ejercicio** con su aumento (§5.2). Un
usuario Free sigue viendo lo que carga: el valor actual, la mejor marca, la tabla de porcentajes y
el historial de marcas (§5.1, §5.2).

**El plan es un entitlement por usuario** y se valida en el backend —nunca sólo en el frontend—:
los endpoints de estadísticas responden **403 `WC-SUBS-403-002`** a un usuario Free, sin mirar si el
ejercicio existe. El front además no los pide y muestra el aviso de §5.5, pero eso es cortesía, no
la regla.

**Quien baja de Pro a Free no pierde nada de lo que cargó**: ejercicios y marcas quedan, y vuelve
a verlos en cuanto sube de nuevo. Sólo deja de ver las estadísticas.

**Precio y pago.** El monto de Pro está **a definir**, y la pasarela de pago es una segunda etapa
(proveedor: decisión abierta). Mientras tanto la app tiene la pantalla de suscripción (§5.5) pero
no cambia el plan: el plan de un usuario lo fija el seed de desarrollo o la base, no el usuario.

## 5. Páginas y componentes

Mockups en [`../mockup`](../mockup).

| Página                     | Mockup                                              | Descripción                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| -------------------------- | --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Presentación               | `wasabi (1).png`                                    | Splash con logo y nombre al abrir la app.                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Ingreso                    | `wasabi (2).png`, `../design`                       | Una sola pantalla, `/login`, para entrar y para crear la cuenta: un botón por proveedor habilitado (**Google** y **Microsoft**). No hay email, contraseña ni pantalla de registro: la primera vez que alguien entra se crea su cuenta, con plan Free. Los mockups `wasabi (2)` y `wasabi (3)`, con sus campos, quedan reemplazados. Reglas en §5.6.                                                                                                                         |
| Header (componente global) | `wasabi (4a).png`, `../design`                      | Logo + nombre a la izquierda; menú a la derecha. Menú: Tus ejercicios, Estadísticas, Perfil, Cerrar sesión. Con plan Pro, una etiqueta "PRO" al lado del botón de menú (§5.5). Presente en todas las páginas. **Sin toggle de tema ni "Color"** (ADR-0008: tema único). El diseño de `../design` no muestra el botón de menú: se mantiene, cuadrado y con borde (§5.2).                                                                                                     |
| Home                       | `wasabi (4).png`                                    | Lista de ejercicios gestionados: nombre, fecha del valor actual, valor actual con su unidad. Botón "New Exercise".                                                                                                                                                                                                                                                                                                                                                          |
| Estadísticas               | `wasabi (10).png`                                   | Accesible desde la navegación; **sólo Pro** (§4), con Free se ve el aviso de §5.5. Por ejercicio: gráficos y números de evolución, máximos y mínimos. Sección de estadísticas generales: evolución por capacidad (fuerza, potencia, resistencia, velocidad) y por grupo muscular — ej. detectar si el tren inferior progresa más rápido que el tren superior. Además, constancia, récords del período, ejercicios para retestear y cómo se reparte el entrenamiento (§5.4). |
| Ejercicio                  | `../design`; antes `wasabi (5)`, `(6)` y `(11).png` | Detalle de un ejercicio gestionado: valor actual, tags, tabla de porcentajes y porcentaje custom, progreso, historial. Acciones: editar, ver estadísticas, cargar una marca nueva (modal "New RM", o "New Record" si no se mide en RM). Reglas en §5.1; estructura en §5.2.                                                                                                                                                                                                 |
| Nuevo ejercicio            | `wasabi (9).png`                                    | Dos pestañas: **Catálogo** (buscar y elegir un precargado, que llena el formulario y se puede editar) y **Crear** (uno propio, campo por campo). En las dos: primera marca con su fecha, nivel, comentarios y "con dolor". Reglas en §5.3.                                                                                                                                                                                                                                  |
| Perfil                     | —                                                   | Tu foto, nombre y email (§5.6), porcentajes de carga por defecto y **tu plan**: la etiqueta Free o Pro y un link a la suscripción. Reglas en §5.5.                                                                                                                                                                                                                                                                                                                          |
| Suscripción                | —                                                   | `/suscripcion`: el plan actual, lo que se paga y los dos planes con el botón para pasar de uno al otro. **Sólo la UI** hasta que haya pasarela de pago (§4). Reglas en §5.5.                                                                                                                                                                                                                                                                                                |

Vista general de todas las pantallas y leyenda de tags: `wasabi (12).png`.

**PWA**: instalable en el dispositivo. Al haber una nueva versión, se notifica al usuario con un popup para actualizar.

**Landing page**: un sitio estático aparte de la app, en `apps/landing` (§5.7).

### 5.1 Ejercicios, marcas y porcentajes

**La categoría define qué se mide.** No se elige por separado:

| Categoría           | Se mide en                     | Porcentajes                                                  |
| ------------------- | ------------------------------ | ------------------------------------------------------------ |
| Fuerza              | RM, en kg                      | Sí: carga = RM × %                                           |
| Hipertrofia         | Repeticiones, con su peso (kg) | Sí: carga = RM estimado × %, en kg (fórmula de Epley, abajo) |
| Gimnástico          | Repeticiones                   | Sí: repeticiones = máximo × %                                |
| Running             | Tiempo, con su desnivel (m)    | No: se muestran la mejor marca y el historial                |
| Cardio              | Metros, con sus calorías       | No: se muestran la mejor marca y el historial                |
| Distancia con carga | Metros, con su peso (kg)       | No: se muestran la mejor marca y el historial                |

El peso se registra sólo en kg. El desnivel es siempre en metros y siempre se carga: una carrera
plana es 0, no un campo vacío. Lo mismo el dato extra de las otras categorías: las calorías en
cardio y el peso en distancia con carga se cargan siempre.

**RM estimado (hipertrofia).** Con la fórmula de Epley: RM = peso × (1 + repeticiones / 30), y con
una sola repetición el RM es el peso. Se calcula, no se guarda: sale del peso y las repeticiones de
cada marca. La mejor marca de hipertrofia es la de mayor RM estimado —no la de más repeticiones—,
porque 10 × 80 kg y 6 × 90 kg sólo se comparan así; el progreso del detalle y de Estadísticas
también grafica el RM estimado.

**Tres conceptos distintos:**

- **Ejercicio**: la definición — nombre, categoría, capacidades, grupo muscular primario y secundarios, disciplinas y equipo. Es del catálogo (sin dueño, lo ven todos, §5.3) o propio (lo creó un usuario y sólo lo ve él). En los del catálogo vienen cargados; en los propios los elige el usuario al crearlo, porque sin ellos ese ejercicio queda afuera de las estadísticas generales.
- **Ejercicio gestionado**: la entrada de un ejercicio en la lista de un usuario. Lleva lo que es del usuario y no del ejercicio: nivel, "con dolor" y comentarios. Un ejercicio aparece una sola vez en la lista de cada usuario.
- **Marca**: un valor con su fecha de realización y un comentario opcional, sobre un ejercicio gestionado. Lleva además el dato extra de su categoría: el peso en hipertrofia y en distancia con carga, el desnivel en running, las calorías en cardio. La mejor marca se calcula sobre el valor principal (tiempo, repeticiones o metros), salvo en hipertrofia, donde es el RM estimado; los demás datos extra viajan como dato informativo de la marca.

**Capacidades y grupos musculares.** Las capacidades son fuerza, potencia, resistencia y velocidad: al menos una, y admiten más de una. Cada ejercicio tiene **un grupo muscular primario** y, opcionalmente, secundarios (sin repetir el primario). Los grupos son pectoral, espalda, espalda baja, trapecio, hombro, bíceps, tríceps, antebrazo, core, glúteo, cuádriceps, isquiotibiales, gemelo y cuerpo completo. Capacidades y grupos son el eje de las estadísticas generales (§5, mockup 10): la evolución por grupo muscular cuenta el primario y los secundarios. El **segmento del cuerpo** —tren superior, tren inferior, core o cuerpo completo— no se pregunta: **se deriva del grupo primario** (espalda baja cuenta como core; trapecio, como tren superior). Los secundarios no lo mueven: una sentadilla con core de secundario sigue siendo tren inferior. Un dato que se puede calcular no se le pide al usuario.

**Disciplinas y equipo.** Una disciplina es el contexto de entrenamiento: musculación, crossfit, hyrox, funcional, running, hybrid o pilates (las dos últimas llegaron con [ADR-0010](../adr/0010-hybrid-y-pilates.md)). Un ejercicio puede tener más de una (el Wall Ball es de crossfit y de hyrox). El equipo es uno solo (barra, mancuerna, kettlebell, máquina, sin equipo, entre otros; los de pilates son colchoneta, reformer, aro y pelota de pilates). En el catálogo los dos vienen cargados y sirven para buscar; en uno propio son opcionales. Ninguno cambia qué se mide ni qué se calcula: eso lo decide sólo la categoría.

**La fecha de realización no puede ser futura**: una marca de mañana pasaría a ser el valor actual antes de existir. Se tolera un margen de 5 minutos por la diferencia de reloj entre el dispositivo y el servidor. Vale también para la primera marca, al agregar un ejercicio.

**Tags:**

- **Categoría**: Fuerza, Hipertrofia, Gimnástico, Running, Cardio, Distancia con carga.
- **Nivel**: Principiante, Intermedio, Avanzado, Elite. Del usuario sobre ese ejercicio.
- **Con dolor**: sí o no. Del usuario. Etiqueta de UX, no registro clínico (§2).
- **Esfuerzo**: bajo, medio o alto. Se llamaba "carga" (liviana, media, pesada); se cambió porque "esfuerzo" vale igual para un ejercicio de peso, de repeticiones o de distancia. **Se calcula, no se guarda**: menos de 70% es esfuerzo bajo, de 70% a 84% medio, desde 85% alto. Cada banda tiene su color — verde bajo, ámbar medio, rojo alto — en su tag ("Esfuerzo bajo", "Esfuerzo medio", "Esfuerzo alto"), que va en la barra fija del detalle, al lado de la carga calculada (§5.2). No hay barra de progreso: el diseño de `../design` no la tiene, y el porcentaje ya se lee en la grilla.

**Valor actual y mejor marca:**

- **Valor actual**: la marca con la fecha de realización más reciente. Sobre ella se calculan los porcentajes, porque refleja la capacidad de hoy.
- **Mejor marca**: el máximo histórico (el mínimo, en tiempo; el mayor RM estimado, en hipertrofia). Es lo que dispara `pr.achieved`.
- **Fuera de fuerza no hay RM, y se le dice al usuario**: al anotar una marca (el alta y "Nueva marca") el campo aclara que lo que va ahí es su mejor marca —las repeticiones máximas, su mejor tiempo, la distancia máxima—, el equivalente de un RM para esa disciplina. En fuerza no hace falta: el campo ya se llama "RM".

**Redondeo:**

- Carga y RM estimado: al 0,5 kg más cercano. La carga de hipertrofia sale del RM estimado sin
  redondear; sólo se redondea lo que se muestra.
- Repeticiones: hacia abajo, con mínimo 1. Nunca por encima de la intensidad pedida.

**Porcentajes por defecto**: 65, 75, 80, 85, 90 y 95%, configurables por usuario en su perfil.

### 5.2 Detalle de ejercicio: la estructura del diseño

Es la única pantalla con diseño real (`../design`, ADR-0008); el resto de la app extrapola su
lenguaje. De arriba abajo:

1. **Header** global (§5): el logo del diseño (una "W" con una barra), "WASABI // CROSS" con su
   subtítulo y una línea abajo. El botón de menú va a la derecha, cuadrado y con borde: el diseño no
   lo muestra, pero sin él no hay navegación.
2. **Cabecera del ejercicio**:
   - Arriba, en chico: "‹ EJERCICIOS / {CATEGORÍA}". "‹ EJERCICIOS" es un link a Home con target
     táctil de 44px. Reemplaza el "MOVIMIENTO" del diseño: una PWA instalada en iOS no tiene botón
     atrás.
   - El nombre, en mayúsculas, tal cual el del catálogo o el del ejercicio propio. No hay nombre
     traducido ni abreviatura (el "BACK SQ" del diseño): eso sería un cambio de datos aparte.
   - Debajo: "{NIVEL} // {RM | MARCA} VIGENTE", y "CON DOLOR" en magenta si corresponde. Los tags de
     categoría, nivel y dolor (§5.1) se leen en estas dos líneas, no como pastillas sueltas.
   - Editar: un ícono de lápiz a la derecha del nombre.
   - La fila del valor actual: "RM ACTUAL", "REGISTRADO EL dd/mm/aaaa" y el valor grande con su
     unidad.
3. **Elegí tu carga** (sólo si el ejercicio tiene porcentajes, §5.1): grilla de tres columnas con
   los porcentajes del perfil, el elegido resaltado; debajo, el porcentaje personalizado en una sola
   fila. En gimnástico los textos hablan de repeticiones, no de RM; en hipertrofia, de "RM
   estimado", y la carga va en kg.
4. **Progreso**: la evolución de todo el historial, con el valor de cada punto y su fecha, y al lado
   del título el aumento — el valor actual menos la primera marca; en tiempo, la mejora es hacia
   abajo. Debajo del gráfico, "Ver estadísticas ›", que abre Estadísticas con este ejercicio
   desplegado. **Es una estadística (§4): con plan Free el bloque se reemplaza por el aviso de §5.5**
   —el título "Progreso" y el link a los planes— y no se pide nada a la API.
5. **Historial**, con la cantidad de registros al lado del título. La marca actual va resaltada y
   con "RM ACTUAL" ("MARCA ACTUAL" si no es RM); las anteriores, más sobrias. "Ver más" si hay más
   páginas.
6. **Barra fija abajo**: "{porcentaje}% DE {valor actual}", la carga calculada en grande, el tag de
   su banda de esfuerzo (§5.1) y el botón "Registrar nuevo RM" ("Registrar nueva marca" si no es RM),
   que abre el modal de siempre. En las categorías sin porcentajes (running, cardio y distancia con
   carga) la barra muestra la mejor marca en lugar de la carga calculada. El contenido deja lugar abajo para que la barra no
   tape el final del historial.

### 5.3 Catálogo pre-cargado y alta de un ejercicio

**Reglas del catálogo** ([ADR-0009](../adr/0009-catalogo-ampliado.md)):

- Cada entrada tiene una **clave estable** (`back-squat`, `wall-ball`): el seed la usa para saber
  qué ya existe, así que un ejercicio se puede renombrar sin duplicarse.
- Lo que depende de la categoría no se guarda por ejercicio: qué campos se registran, si hay
  porcentajes y cómo se calcula la referencia (RM directo en fuerza, RM estimado en hipertrofia)
  salen de la categoría (§5.1).
- Un ejercicio de **running** tiene una única distancia: "Carrera 5 km" sí, "Long run" o
  "Fartlek" no, porque "mejor marca = menor tiempo" sólo compara carreras iguales.
- Un ejercicio con **peso fijo o corporal** (balón, kettlebell, crunch) es gimnástico: medir un RM
  estimado sobre un peso que no se elige no dice nada.
- Si una disciplina mide un ejercicio distinto, es otro ejercicio: el Sled Push de funcional va en
  repeticiones y el de Hyrox, en metros.

**El catálogo inicial: 120 ejercicios.** Son los 62 de [ADR-0009](../adr/0009-catalogo-ampliado.md),
que reemplazaron al de la Fase 0 (33 ejercicios, borrados por migración: no había producción, así
que no había datos reales que conservar), más 58 de [ADR-0010](../adr/0010-hybrid-y-pilates.md):
huecos de musculación, CrossFit, funcional y running, y las dos disciplinas nuevas, Hybrid y Pilates.
El detalle de cada entrada (grupos, capacidad, equipo) vive en el código del módulo `exercises`,
validado contra los schemas.

La tabla agrupa cada ejercicio bajo su **primera** disciplina y anota las otras entre paréntesis.
**Hybrid** no aparece anotada: es una etiqueta que llevan 33 ejercicios que ya tienen otra
disciplina (la búsqueda por Hybrid los encuentra a todos), y figura sola en uno, Sandbag Over
Shoulder. El filtro por disciplina del catálogo trae todos los que la llevan, en
cualquier posición.

| Disciplina  | Categoría           | Ejercicios                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ----------- | ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Musculación | Fuerza              | Sentadilla trasera (también CrossFit), Sentadilla frontal (también CrossFit), Peso muerto convencional (también CrossFit), Press militar (también CrossFit), Dominadas lastradas (también CrossFit)                                                                                                                                                                                                                                                                                                                                                                                      |
| Musculación | Hipertrofia         | Peso muerto rumano, Press banca plano (también CrossFit), Press banca inclinado, Remo con barra, Curl bíceps con barra, Curl martillo, Extensión tríceps en polea, Press francés, Prensa de piernas, Curl femoral, Elevación de gemelos, Hip thrust, Elevaciones laterales, Jalón al pecho, Press con mancuernas plano, Aperturas con mancuernas, Remo con mancuerna, Remo en polea baja, Zancadas con mancuernas, Sentadilla búlgara, Extensión de cuádriceps, Face pull, Extensión lumbar (back extension), Encogimientos de trapecio, Abducción de cadera en máquina, Crunch en polea |
| Musculación | Gimnástico          | Crunch abdominal, Fondos en paralelas, Elevación de piernas colgado                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| CrossFit    | Fuerza              | Snatch, Clean and Jerk, Push Press, Overhead Squat, Power Clean, Squat Clean, Hang Clean, Power Snatch, Push Jerk, Split Jerk, Dumbbell Snatch                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| CrossFit    | Hipertrofia         | Thruster, Devil Press                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| CrossFit    | Gimnástico          | Wall Ball (también Hyrox y Funcional), Kettlebell Swing (también Funcional), Pull-up (también Musculación y Funcional), Toes to Bar, Muscle Up, Handstand Push-up, Box Jump, Burpee (también Funcional), Double Under, Rope Climb, Air Squat (también Funcional), Push-up (también Funcional), Sit-up (también Funcional), Walking Lunge (también Funcional), Chest to Bar, Ring Dips, GHD Sit-up                                                                                                                                                                                        |
| CrossFit    | Cardio              | Remo (ergómetro) (también Hyrox), Assault Bike, SkiErg (también Hyrox), BikeErg                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| Hyrox       | Hipertrofia         | Sandbag Lunges                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| Hyrox       | Gimnástico          | Burpee Broad Jump                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Hyrox       | Running             | Carrera 1km (estación Hyrox)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| Hyrox       | Distancia con carga | Sled Push (Hyrox), Sled Pull (Hyrox), Farmers Carry (Hyrox)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Funcional   | Hipertrofia         | Kettlebell Goblet Squat, Sled Push, Sled Pull, Farmers Carry, Kettlebell Deadlift, Kettlebell Clean and Press, Turkish Get-up                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| Funcional   | Gimnástico          | Battle Ropes, TRX Row, TRX Push-up, Mountain Climbers, Jumping Jacks, Bear Crawl, Medicine Ball Slam, Box Step-up, Lateral Band Walk, Jump Squat, Puente de glúteo (también Pilates), Dead Bug (también Pilates), Bird Dog (también Pilates), Russian Twist, TRX Squat                                                                                                                                                                                                                                                                                                                   |
| Running     | Running             | Carrera 100 m, Carrera 200 m, Carrera 400 m (también CrossFit), Carrera 800 m, Carrera 1 km, Carrera 1500 m, Carrera 3 km, Carrera 5 km, Carrera 10 km, Carrera 21 km (media maratón), Carrera 42 km (maratón)                                                                                                                                                                                                                                                                                                                                                                           |
| Hybrid      | Hipertrofia         | Sandbag Over Shoulder                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Pilates     | Gimnástico          | The Hundred, Roll Up, Single Leg Stretch, Criss Cross, Teaser, Swan, Side Leg Series, Leg Circles, Reformer Footwork, Reformer Rowing, Aro Pilates Press de pecho, Pelota Pilates Curl femoral                                                                                                                                                                                                                                                                                                                                                                                           |

**Alta de un ejercicio: dos pestañas.** La pestaña elegida va en la URL, así un link o el botón
atrás vuelven a la misma.

- **Catálogo** (la de entrada): un buscador por nombre (sin distinguir mayúsculas ni acentos) y un
  filtro por disciplina. Cada resultado muestra nombre, categoría, grupo primario y equipo. Los que
  el usuario ya tiene en su lista aparecen pero no se pueden elegir (un ejercicio va una sola vez
  por lista, §5.1). Al elegir uno, el formulario se llena con toda su definición.
- **Crear**: el formulario vacío, campo por campo: nombre, categoría (seis casilleros),
  capacidades, grupo primario, secundarios, y —opcionales— disciplinas y equipo. Si el nombre
  coincide con uno del catálogo se avisa, sin bloquear: el nombre no decide nada, la pestaña sí.

**Un precargado editado pasa a ser propio.** Si el usuario elige uno del catálogo y guarda sin
tocar la definición, se agrega el del catálogo. Si cambió cualquier campo de la definición
(nombre, categoría, capacidades, grupos, disciplinas o equipo), se guarda como **ejercicio propio**
con los valores editados, y el formulario lo avisa antes de guardar, apenas se edita el primer
campo. (Hasta la Fase 8 esto contaba contra un límite de propios del plan y el aviso lo mencionaba;
el límite ya no existe, §4.) Nivel, comentarios, "con dolor" y la primera
marca son del usuario y se cargan igual en los dos casos: editarlos no convierte nada.

### 5.4 Estadísticas: constancia, récords y tu entrenamiento

Debajo de "En general", Estadísticas suma cuatro secciones (Fase 7, pedido del usuario del
2026-10-02). Las dos primeras miran el **período** elegido arriba; las otras dos, no, y lo dicen.

**Constancia** (del período):

- Cuántas marcas cargó en el período y cuántos días pasaron desde la última (ésta, sin importar
  el período: una marca de hace un año sigue siendo la última).
- Las marcas por mes en columnas, con los meses sin marcas en cero: un hueco es un dato. El mes es
  el de la fecha de la marca en UTC, que coincide con el del usuario porque la marca se guarda al
  mediodía de su zona (§5.1). En "Todo el historial", desde el mes de la primera marca.

**Récords del período**:

- Cuántas **mejores marcas nuevas** logró: una marca que supera a todas las anteriores de su
  ejercicio, con la misma vara que la mejor marca (§5.1: en tiempo, menos; en hipertrofia, el RM
  estimado). La primera marca de un ejercicio no cuenta —no superó a nada— y el empate tampoco.
- Los **tres ejercicios que más mejoraron**: la variación del período (la misma de cada
  ejercicio, §5), con al menos dos marcas y sólo si es mejora. Cada uno lleva al detalle.

**Para retestear** (sin período): los ejercicios cuya última marca tiene **más de 8 semanas**
(56 días), del más olvidado al más reciente, cada uno con su link al detalle para cargar una
marca. Sin ninguno, la sección no aparece.

**Tu entrenamiento** (sin período): cómo se reparten los ejercicios que el atleta tiene cargados.

| Qué                 | Gráfico                             | Cómo se cuenta                                                                                                                                                                                                           |
| ------------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Disciplinas         | Dona                                | Un ejercicio **cuenta entero en cada disciplina** que tiene (el Wall Ball suma a CrossFit y a Hyrox): el porcentaje es sobre el total de menciones, no de ejercicios. Los propios sin disciplina van a "Sin disciplina". |
| Categorías          | Dona                                | Una por ejercicio: fuerza, hipertrofia, gimnástico, running, cardio, distancia con carga.                                                                                                                                |
| Segmento del cuerpo | Dona                                | El derivado del grupo primario (§5.1): tren superior, tren inferior, core, cuerpo completo.                                                                                                                              |
| Grupos musculares   | Barras horizontales, de más a menos | **El primario suma 1 y cada secundario ½.** La barra muestra los dos tramos (primario lleno, secundario más claro) y el número. Catorce grupos no se leen en una torta. Sólo aparecen los que suman algo.                |

- Una dona tiene **a lo sumo seis porciones**: con más, las cinco más grandes y "Otras", que
  dice cuáles junta. "Sin disciplina" y "Otras" van en gris y al final.
- Los porcentajes se muestran enteros y **suman 100** (se reparte el redondeo por resto mayor).
- Ningún dato vive sólo en el color: cada porción y cada barra tiene su nombre, su cantidad y su
  porcentaje escritos al lado (§11). El dibujo queda fuera del árbol de accesibilidad.
- Los colores de las porciones salen de una paleta de seis validada para daltonismo y contraste
  sobre el fondo del tema (tokens `--wc-chart-*`), asignados en orden; el gris de "Otras" no es
  uno de ellos.

### 5.5 Perfil, suscripción y el plan en la interfaz

El plan es lo único que separa a Free de Pro (§4). Esta sección dice dónde se ve y qué hace la
pantalla de suscripción mientras no haya pasarela de pago.

**Perfil.** Arriba de todo, la persona: foto (o iniciales), nombre y email (§5.6). Después, arriba de
los porcentajes, la sección **Tu plan**: el plan en una etiqueta ("Free" o "Pro"), una línea de lo
que incluye y el link "Administrar suscripción" a `/suscripcion`.

**Etiqueta en el header.** Con plan Pro, al lado del botón de menú va una etiqueta **"PRO"** —lima,
con el recorte de esquina— que lleva a la suscripción. Con Free no hay etiqueta: no se marca lo que
no se tiene. Para el lector de pantalla dice "Plan Pro", no sólo "Pro".

**Suscripción** (`/suscripcion`). Una página aparte, sin entrada en el menú: se llega desde el
Perfil, desde la etiqueta del header y desde los avisos de lo bloqueado. De arriba abajo:

1. **Tu plan actual**: el nombre del plan y **lo que pagás**, en filas de "etiqueta · valor". En
   Free, `$0`. En Pro, "A definir" mientras no haya precio (§4): la app no inventa un monto.
2. **Los dos planes**, una tarjeta por cada uno: nombre, precio, qué incluye y su acción. Los dos
   incluyen cargar sin límite ejercicios y marcas; **Pro suma las estadísticas**. La tarjeta del plan
   actual dice "Tu plan actual" y no tiene botón; la otra tiene "Pasar a Pro" o "Pasar a Free".
3. **Cambiar de plan todavía no hace nada**: el botón muestra un aviso (`role="status"`) —"Cambiar de
   plan todavía no está disponible: se habilita junto con el pago"— y no llama a la API, que no
   tiene endpoint para eso. La lógica llega con la pasarela (segunda etapa, §4).

**Lo bloqueado con Free.** En la pantalla Estadísticas y en el Progreso del detalle (§5.2) se
muestra un aviso en lugar del contenido: el título de la sección, "Las estadísticas son parte del
plan Pro" y un link "Ver planes" a la suscripción. El front no pide los datos —ahorra el viaje y
no depende de que alguien mire el 403—, pero la regla está en el backend (§4).

### 5.6 Ingreso con OAuth 2.0

Wasabi Cross no guarda contraseñas: **todo el ingreso y el registro pasa por un proveedor OAuth 2.0 /
OpenID Connect** ([ADR-0012](../adr/0012-ingreso-solo-con-oauth.md)). Es **cliente** de los
proveedores, no un servidor OAuth: no le entrega tokens a nadie (§2).

**Proveedores.** Google y Microsoft. De Microsoft, sólo las **cuentas personales** (Outlook, Hotmail,
Live): las de trabajo o escuela quedan afuera, porque ahí el email lo controla el administrador del
tenant y no es confiable. Un proveedor está habilitado si la API tiene sus credenciales (§12); una
API sin ningún proveedor no arranca, porque nadie podría entrar.

**Pantalla `/login`.** Los botones "Continuar con Google" y "Continuar con Microsoft", y un texto que
dice "Entrá o creá tu cuenta": es lo mismo, porque no hay un registro aparte. Cada ingreso le pide
al proveedor que haga **elegir la cuenta**: cerrar sesión en Wasabi Cross no cierra la del proveedor,
y en un teléfono compartido entraría solo a la cuenta equivocada. Al terminar, vuelve a donde iba
(sólo rutas internas) o, si no iba a ningún lado, a Home. Si la lista de proveedores no carga o viene
vacía, se avisa que el ingreso no está disponible, con "Reintentar".

**Primera vez y después.** La primera vez se crea la cuenta, con plan **Free** (§4), el nombre y la
foto del proveedor; las siguientes, se entra a la misma. **La identidad es el par (proveedor, id que
da el proveedor), nunca el email.** Para crear la cuenta, el proveedor tiene que haber **verificado
el email**; si no, no se crea. El nombre visible ("Hi, Braian!") es el del proveedor, o la parte
local del email si no lo trae; no hay una pantalla para cambiarlo. En cada ingreso se refrescan el
nombre y la foto.

**Cuando algo no sale**, `/login` muestra el aviso con el mensaje del catálogo y nunca el texto que
mande el proveedor:

| Caso                                                                                          | Código             |
| --------------------------------------------------------------------------------------------- | ------------------ |
| La persona cancela en el proveedor                                                            | `WC-OAUTH-400-001` |
| Cualquier otra falla: estado inválido, código vencido, email sin verificar, cuenta de trabajo | `WC-OAUTH-400-002` |
| El email ya tiene cuenta con el otro proveedor                                                | `WC-OAUTH-409-003` |

**Las cuentas no se vinculan solas.** Quien entra con un email que ya tiene cuenta con el otro
proveedor ve un aviso para entrar con ese. Quien usa Google y Microsoft con emails distintos tiene
dos cuentas separadas, cada una con sus ejercicios. Vincularlas es una función aparte, con sesión
iniciada, que esta spec no incluye.

**Foto.** El Perfil la muestra arriba, con el nombre y el email; sin foto, o si no carga, las
iniciales. La API la sirve desde su propio origen (`GET /api/v1/me/photo`): la del proveedor no se
enlaza directo. Es un dato personal (§13).

**Sesión.** Cookie `httpOnly` de 30 días, como hasta ahora. "Cerrar sesión" cierra la de Wasabi
Cross, no la del proveedor.

**Qué se guarda.** Email, nombre, foto y el id del proveedor. **Los tokens del proveedor no se
guardan**: el único uso del _access token_ es pedirle la foto a Microsoft durante el ingreso, y
después se descarta (si Better Auth no permitiera descartarlo, se guarda cifrado: ADR-0012). No hay
contraseña, recupero de contraseña ni verificación de email propios: los resuelve el proveedor.

### 5.7 Landing page

La landing es **el sitio público de Wasabi Cross**: le presenta el producto a quien todavía no lo usa
y lo lleva a la app. Es un **sitio estático aparte** ([ADR-0013](../adr/0013-la-landing-es-un-sitio-estatico-aparte.md)), no una pantalla de la PWA:
vive en `apps/landing` (Astro), no tiene sesión, no llama a la API y no guarda nada de quien la
visita. El diseño está en [`../landing`](../landing): un HTML y su PNG, y las capturas de la app
que muestra.

**Estructura.** Una página larga, `/`, con estas secciones en este orden: header, hero, Registro,
Funciones, Estadísticas Pro, Planes y footer. Además, `/privacidad` y `/terminos`, y una 404 con la
marca.

**Qué promete de cada plan, y qué no.** Lo que la landing dice de Free y Pro no puede ir más allá de
lo que dice §4:

- Los dos cargan todos los ejercicios y marcas que quieran, con porcentajes de carga e historial de
  marcas. Lo único que los diferencia es ver las estadísticas.
- Como "estadísticas" incluye el progreso del detalle de ejercicio (§4, §5.2), la landing **no
  presenta ese progreso como parte de Free**: en las secciones que no están marcadas como Pro habla
  de historial de marcas, no de "tendencia" ni de "evolución". Las capturas que muestran el progreso
  o las estadísticas se presentan como lo que son, de Pro.
- El precio y el período de Pro están **por definir** (§4): la landing dice "precio por definir",
  sin monto y sin decir si es mensual o anual, hasta que §4 los fije.
- La fila de estadísticas de la tabla de planes sale de la misma regla que hace cumplir la API
  (`canViewStats`, en `@wasabi-cross/schemas`): la landing no la repite a mano.
- Las disciplinas que nombra existen en el catálogo (§5.1), y el "más de ocho semanas" de los
  ejercicios para retestear es el umbral de §5.4: 56 días.

**Entrada a la app.** "Entrar", en el header, y "Empezar gratis", el CTA principal, llevan al ingreso
de la app (`/login`, §5.6) en la URL que dice la variable de build `PUBLIC_APP_URL`. "Ver la app en
acción" queda como enlace secundario a la captura del hero. Sin `PUBLIC_APP_URL` —mientras la app no
esté en producción— no se muestran ni "Entrar" ni "Empezar gratis". La landing sólo enlaza: nunca
arma ni toca el ingreso por OAuth.

**Voz.** es-AR con voseo, como la app (§11). Los textos son datos tipados en el código, no están en
el marcado.

**Qué no lleva.** Cookies, analytics y banner de consentimiento; formularios; JavaScript de cliente;
manifest y service worker (no es una PWA: no se instala); Tailwind (§6, §11).

**Indexación y compartir.** Sólo producción es indexable: el build trae `PUBLIC_SITE_URL` y
`LANDING_INDEXABLE=1`. Staging y CI salen con `noindex` y un `robots.txt` que bloquea todo (§12).
Lleva metadatos para compartir el enlace: título, descripción e imagen de 1200×630.

## 6. Stack

- React
- Node
- TypeScript
- MongoDB
- Better Auth (autenticación, sólo con proveedores OAuth 2.0: Google y Microsoft — §5.6)
- Zod (validaciones)
- Temporal (fechas)
- Tanstack (Table, Form, Charts, Query, Router…)
- Motion (animaciones)
- Fontsource (fuentes; la landing suma Figtree para el texto corrido)
- Zustand (estado global)
- pragmatic-drag-and-drop (drag and drop)
- Nuqs (estado en URL)
- Swagger (documentación de API)
- Astro (la landing page: sitio estático, sin JavaScript de cliente — §5.7)

La landing no usa Tailwind: el HTML de su diseño lo trae por CDN y la CSP (§13) no deja correr un script de otro origen. Se escribe CSS propio sobre los tokens de la app ([ADR-0013](../adr/0013-la-landing-es-un-sitio-estatico-aparte.md)).

## 7. Arquitectura

- SDD (Spec-Driven Development) — **la spec manda**: si la IA propone algo fuera de spec, se actualiza la spec primero, después se codea.
- TDD
- Modular monolith + hexagonal-lite
- API REST
- Atomic Design, con criterio — lo que importa es que `@wasabi-cross/ui` no importe lógica de negocio, no la discusión de si un botón es molécula u organismo.
- Componentes Cross: librería de UI compartida, con Storybook.

### Módulos de dominio

Un solo deployable de backend, módulos aislados (`domain / application / infrastructure` cada uno). Se comunican por interfaces o eventos internos — nunca importando modelos de otro módulo directamente.

| Módulo          | Responsabilidad                                                                                                                         |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `auth`          | Sesión: quién es el usuario y cerrar sesión (Better Auth). No tiene credenciales propias (§5.6)                                         |
| `oauth`         | Ingreso y registro con proveedores OAuth 2.0 / OpenID Connect (Google, Microsoft): configuración de proveedores y reglas de alta (§5.6) |
| `users`         | Perfil (nombre y foto), configuración (porcentajes de carga default)                                                                    |
| `exercises`     | Catálogo pre-cargado, ejercicios propios y la lista de ejercicios gestionados de cada usuario (nivel, con dolor)                        |
| `records`       | Carga y evolución de RM / tiempos / repeticiones / distancias, cálculo de porcentajes                                                   |
| `stats`         | Agregaciones y análisis (por ejercicio y generales)                                                                                     |
| `subscriptions` | Plan Free/Pro y qué puede ver cada uno (entitlements)                                                                                   |
| `billing`       | Pago de la suscripción Pro                                                                                                              |
| `notifications` | Popup de nueva versión PWA, avisos                                                                                                      |

### Eventos de dominio (in-process, cola si hace falta después)

`exercise.created`, `record.logged`, `pr.achieved` (nuevo RM/tiempo/reps supera el anterior), `subscription.upgraded`, `subscription.expiring`, `subscription.downgraded`, `payment.received`.

### Packages compartidos

- `@wasabi-cross/schemas`: Zod compartido front/back, fuente única de verdad de validaciones y tipos (`z.infer`).
- `@wasabi-cross/ui`: librería de componentes (Componentes Cross), con Storybook.
- API REST versionada + OpenAPI **generado** desde los schemas Zod (nunca escrito a mano).

`apps/landing` (§5.7) no es un módulo de dominio: no importa de `apps/api` ni de `apps/web`. Lee `@wasabi-cross/schemas` (las reglas que cuenta, como `canViewStats`) y los tokens de `@wasabi-cross/ui`.

Detalle de estructura de carpetas, logs y observabilidad: ver [docs/architecture.md](../architecture.md).

## 8. Buenas prácticas

- SOLID, YAGNI, patrones de diseño donde agreguen valor real.
- Logs estructurados (ver [docs/architecture.md](../architecture.md)).
- Conventional commits + PRs pequeñas + changelog automático.
- ADRs cortos para cada decisión estructural (contexto, opciones, decisión, consecuencias) — ver [docs/adr](../adr).
- Sin `any`. `strict: true` en TypeScript.
- Sin lógica de negocio en componentes React.

## 9. Buenas prácticas con IA

- **CLAUDE.md** en la raíz (y por app si el monorepo lo justifica): stack, convenciones, comandos, estructura, cosas prohibidas.
- Copia de CLAUDE.md como AGENT.md para otros LLM.
- **Flujo 4D** por tarea: _Delegation_ (qué hace la IA y qué no) → _Description_ (spec de la tarea con criterios de aceptación) → _Discernment_ (revisar salida contra los criterios) → _Diligence_ (tests, seguridad, atribución).
- **La spec manda**: ver §7.
- Tests de flujos de dinero (billing) y permisos, escritos o revisados por humano. Ahí no aplica autopiloto.
- Subagentes por rol cuando el flujo los use: `spec-reviewer`, `test-writer`, `security-reviewer`.
- Cómo una sesión de IA retoma contexto sin releer todo el historial: ver [§15 Bitácora y Estado del proyecto](#15-bitácora-y-estado-del-proyecto).

## 10. Testing

- TDD
- Estáticos (linters)
- Unitarios
- E2E
- Coverage > 90%

## 11. UX/UI

- Referencia: [uiguideline.com](https://www.uiguideline.com/)
- Imagen de marca propia: "Toxic Cyberpunk" (ver [docs/design](../design) y [ADR-0008](../adr/0008-tema-unico-toxic-cyberpunk.md)) — fondo casi negro violáceo, acento lima tóxico, magenta y violeta como bordes/superficies, tipografía monoespaciada + condensada de afiche en mayúsculas, recorte de esquina en diagonal ("plate-cut") como firma visual
- Mismos componentes y paleta en toda la app
- Mobile first. Una sola columna de **430px como máximo**, la del diseño, centrada en pantallas más anchas
- **Tema único**, sin selector dark/light (ADR-0008): el lenguaje visual es neón-sobre-oscuro por diseño, no una variante de un tema claro
- Accesibilidad **WCAG 2.2 AA**: contraste ≥ 4.5:1, foco visible, teclado completo, labels/`aria-*` correctos, `prefers-reduced-motion` respetado, targets táctiles ≥ 44×44px. Auditoría con axe en CI.
- El diseño no pasa AA en dos lugares, y ahí se aparta de él: el botón magenta con texto blanco (4.19:1) usa un magenta apenas más oscuro, `#DD1964` (4.78:1), y el "RM ACTUAL" magenta sobre el fondo oliva del historial (3.08:1) usa un rosa más claro, `#F576A7` (4.95:1)
- Ningún texto por debajo de 10px, y el que lleva información (fechas, estados, valores) desde 11px: el diseño usa 9px en varias etiquetas, que se suben
- DnD accesible
- Estados vacíos con acción ("Todavía no tenés ejercicios → Agregar el primero")
- Skeletons, no spinners, en listas
- Confirmación destructiva con nombre del recurso escrito, para borrados irreversibles
- Formato fecha/hora/moneda es-AR; semana empieza lunes
- Tipografía fluida, mínimo 16px en inputs (evita zoom automático de iOS)
- Optimistic UI
- El campo de tiempo (mm:ss) inserta los ":" solo, cada dos cifras tipeadas: no hace falta que el usuario los escriba.
- La **landing** (§5.7) usa el mismo tema y los mismos tokens, pero a **todo el ancho** (hasta 1280px): la columna de 430px es la de la app, y en la landing sólo es el tamaño con el que se muestran sus capturas.
- Tipografía de la landing: Staatliches y Share Tech Mono, como la app, y **Figtree** para el texto corrido (§6). Figtree es sólo de la landing.
- Los colores del diseño de la landing se llevan a los tokens `--wc-*`; lo que la app no tiene entra como token nuevo: la banda `#13071F` y el **rosa de Pro** (`#C15EA7` de borde y relleno, `#D989C0` de texto). La etiqueta PRO de la app es lima: si se unifican es una decisión abierta. Los textos del diseño de la landing pasan AA sin apartarse de él (el peor par da 5,2:1); se recalcula con los tokens finales.
- Voseo es-AR (Entrá, Elegí, Registrá) en la app y en la landing.

## 12. Infra

- Railway
- Mongo Atlas
- Backblaze

- **Ambientes**: `dev` (local) · `staging` (datos sintéticos) · `prod`. Prohibido probar en prod.
- **Mongo Atlas**: replica set, backups con PITR, alertas de conexión/storage. RPO ≤ 24h, RTO ≤ 4h, restauración probada al menos una vez.
- **Backblaze B2**: buckets privados + URLs firmadas de corta vida, límites de tamaño, CDN delante para media de ejercicios.
- **Secrets** en el gestor de la plataforma, nunca en el repo. Rotación documentada. Incluye los secretos de cliente OAuth, uno por ambiente (`GOOGLE_*`, `MICROSOFT_*`): el de Microsoft vence.
- **Migraciones de esquema** versionadas y reversibles (`migrate-mongo` o similar); nunca cambios manuales en Atlas.
- **Health checks** `/health` (liveness) y `/ready` (readiness con ping a Mongo).
- **Landing:** un servicio estático aparte en Railway (`wasabi-cross-landing`), en el dominio raíz. La app y la API siguen siendo un solo servicio, en `app.` ([ADR-0013](../adr/0013-la-landing-es-un-sitio-estatico-aparte.md), [ADR-0007](../adr/0007-la-api-sirve-el-front.md)). Con la app en `app.`, `WEB_ORIGIN`, `BETTER_AUTH_URL` y las redirect URIs de OAuth (§5.6) llevan el host de la app. **El dominio todavía no está elegido**: hay que fijarlo antes de crear los clientes OAuth de staging y prod. La landing no tiene secretos: `PUBLIC_SITE_URL`, `PUBLIC_APP_URL` y `LANDING_INDEXABLE` son públicas y de build. Con dos servicios del mismo repo, un push redeploya los dos salvo que se configuren _watch paths_ por servicio.
- Uptime monitoring externo con alerta a WhatsApp/Telegram.
- Plan de escala: Railway alcanza para el volumen inicial (uso personal + amigos + early subscribers); el disparador para migrar a VPS/Coolify es costo o límite de recursos, no estética.

## 13. Seguridad, privacidad y cumplimiento

- OWASP Top 10 como checklist de revisión por módulo.
- **Autorización en cada endpoint** (recurso + acción + usuario dueño del recurso). El riesgo real acá es **IDOR** — un usuario cambiando un ID en la URL para ver/editar ejercicios de otro. Test obligatorio. Un recurso de otro usuario responde **404, no 403**: confirmar que existe ya es filtrar información.
- Rate limiting: ingreso por OAuth (`/sign-in/social` y los callbacks, 5/min/IP), webhooks de pago.
- Validación de entrada con Zod en el borde; sanitización de HTML en notas/descripciones de ejercicio.
- Prevención de NoSQL injection (nunca pasar objetos del usuario directo a `find`).
- Headers: CSP, HSTS, X-Content-Type-Options, Referrer-Policy. CORS restrictivo por origen.
- Subida de archivos (si aplica a media de ejercicios): mime real, tamaño máximo, nombre aleatorio, sin ejecución.
- Dependencias: `npm audit` + Dependabot en CI.
- **Nunca** datos de tarjeta en la base — el pago de la suscripción Pro pasa por el proveedor de pago, nunca se guarda el número de tarjeta.
- **Sin contraseñas.** No hay credenciales propias que guardar, hashear ni recuperar: las del usuario las protege el proveedor (§5.6).
- **OAuth 2.0:** _authorization code_ con PKCE y `state` (los maneja Better Auth); redirect URIs exactas y un cliente OAuth por ambiente; cookie `sameSite: lax`, para que la de `state` sobreviva el regreso del proveedor; la identidad es (proveedor, id del proveedor), nunca el email, y el email tiene que venir verificado por el proveedor para crear la cuenta; las cuentas no se vinculan solas.
- **Tokens del proveedor:** scopes mínimos (`openid`, `email`, `profile`; en Microsoft, también `User.Read`, que permite la foto), sin acceso offline, y no se guardan. En los logs, nunca `code`, `state`, `idToken` ni secretos de cliente.
- **Foto:** es un dato personal. La API sólo baja imágenes de hosts de Google, sólo `png`, `jpeg` o `webp`, con tamaño y tiempo máximos; un SVG serviría script en el origen de la app.
- **IdP falso de desarrollo:** nunca en producción. Vive fuera de `src/` y de `dist/`, y la API se niega a arrancar con él con `NODE_ENV=production`.
- **Landing (§5.7):** sin cookies, analytics ni formularios: no recibe datos de quien la visita. CSP propia y estricta: `script-src 'none'` (no tiene JavaScript), sin `unsafe-inline` en estilos (todo el CSS va en archivos), y los mismos headers que la API (HSTS, `X-Content-Type-Options`, `Referrer-Policy`). Ningún recurso de otro origen: ni fuentes ni scripts de CDN. Las variables `PUBLIC_*` van al navegador: nunca llevan un secreto. Staging y CI no se indexan. La política de privacidad dice lo que §5.6 y este apartado dicen que se guarda, y nada más; el texto lo aprueba el usuario.

## 14. Observabilidad, logs y códigos de error

Formato de log (JSON, Pino) y reglas de qué nunca loguear: ver [docs/architecture.md](../architecture.md).

Diccionario de códigos de error (`WC-<MÓDULO>-<HTTP>-<NNN>`), vivo y creciente: ver [docs/error-codes.md](../error-codes.md).

## 15. Bitácora y Estado del proyecto

Cómo retomar contexto entre sesiones de trabajo (humano o IA) sin releer todo el historial de git: ver [docs/state/STATE.md](../state/STATE.md) y [docs/state/bitacora](../state/bitacora).

- **STATE.md**: foto del presente, se sobreescribe. Toda sesión lo lee al empezar y lo actualiza al terminar si algo relevante cambió.
- **Bitácora**: historial append-only, un archivo por sesión de trabajo real, nunca se edita retroactivamente.

## 16. Gestión de tareas y Trello

El trabajo se divide siempre en tareas chicas, nunca en bloques grandes sin desglosar. Mismo patrón que en Laplace y bow-sight:

- **Backlog vivo** en [docs/ACTION-PLAN.md](../ACTION-PLAN.md): formato de tarea fijo (title, module, description, acceptance-criteria, example, story-points, depends_on, risk, test_plan, error-codes, data-model-impact).
- **Story points Fibonacci** 1/2/3/5/8/13. Ninguna tarea supera 8 — toda tarea de 13 se parte antes de empezar.
- **Una tarea no arranca** si sus `depends_on` no están cerradas.
- **Tablero de Trello**: https://trello.com/b/pK3RPkCT/wasabi-cross — listas `Sin iniciar` / `En proceso` / `Bloqueadas` / `Completadas` / `Canceladas`.
- **Dirección de la sincronización**: `docs/ACTION-PLAN.md` es la fuente de verdad del _contenido_; Trello es la fuente de verdad del _estado_. Si difieren en contenido, gana el plan; si difieren en estado, gana el tablero.
- **Definition of Done** de una tarea: tests pasando · error codes nuevos documentados en [docs/error-codes.md](../error-codes.md) · entrada en la [bitácora](../state/bitacora) · **tarjeta movida en Trello**. No se marca `[x]` en el plan sin las cuatro cosas.
- Nadie mueve una tarjeta a `Completadas` salvo quien terminó la tarea y cumplió el Definition of Done — no lo hace la IA por su cuenta.
