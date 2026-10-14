# ADR-0014: El plan Pro se otorga con un script de operador mientras no hay pasarela

- Fecha: 2026-10-14
- Estado: propuesta

## Contexto

[ADR-0011](./0011-plan-pro-y-estadisticas.md) dejó la suscripción como UI y nada más: no hay
endpoint de cambio de plan, porque sin cobro regalaría Pro, y el plan de un usuario lo fija "el seed
de desarrollo o la base". Eso alcanzó mientras todo corría en desarrollo.

Producción sale **sin pasarela de pago** y, al principio, con el dueño como único usuario. Ese
usuario nace Free, y lo que tiene que probar es justamente lo que es de Pro: las estadísticas.
Quedan tres caminos para que sea Pro en un ambiente desplegado, y ninguno está resuelto:

- `seed:admin` es de desarrollo: el guard `assertDevelopmentOnly` lo frena con `NODE_ENV=production`,
  y siembra una cuenta del IdP falso, que en producción no existe.
- Editar el documento en Atlas a mano está prohibido (CLAUDE.md: todo cambio de datos va por código
  versionado), y no deja registro de quién ni cuándo.
- Una migración con el email de una persona escribe un dato personal en el repo y corre en todos
  los ambientes.

## Opciones consideradas

1. **Un script de operador, compilado, sin HTTP** (`plan:set`): lo corre quien ya tiene las
   variables del ambiente. Pasa por un caso de uso de `subscriptions`.
2. **Una lista de emails Pro en una variable de entorno** (`PRO_EMAILS`): la API la consulta al
   resolver el plan.
3. **Una migración** que pone `plan: "pro"` a un email.
4. **Un endpoint de administración** protegido por rol o por secreto.
5. **Editar Mongo a mano.**

## Decisión

**Opción 1.**

- **`setPlan`**, caso de uso de `subscriptions`, es el único lugar que escribe el plan de un
  usuario. El script lo llama; cuando llegue la pasarela, su webhook llama al mismo. Valida el plan
  con `planSchema` (el mismo del resto de la app) y no crea usuarios: la identidad nace del ingreso
  por un proveedor (spec §5.6). Si el email no existe, el script dice que hay que entrar una vez.
- **Dry-run por defecto.** Sin `--apply` imprime qué cambiaría y en qué base, y no escribe. Con
  `--apply`, cambia el plan y guarda **`planSource: "manual"`** y `planChangedAt`. Es idempotente
  (pedir el plan que ya tiene no escribe) y reversible (`--plan free`).
- **Rige desde el pedido siguiente**, sin cerrar sesión: el plan se lee de la base en cada pedido
  (`requireSession`).
- **`planSource`** existe para que la pasarela, cuando llegue, distinga un otorgamiento manual de
  una suscripción y no lo pise a ciegas. Qué hace con un plan manual se decide entonces.
- **El script se compila** (`dist/scripts/set-plan.js`) y se corre contra un ambiente con
  `railway run`, que le inyecta las variables de ese ambiente. No hay ruta HTTP.

Por qué no las otras:

- **2, la variable de entorno:** deja dos fuentes de verdad para el plan (la variable y la base), un
  otorgamiento exige un redeploy, y el plan de un usuario ya no se ve en un solo lugar.
- **3, la migración:** un dato de una persona en un archivo versionado que corre en todos los
  ambientes, incluido staging, que tiene que tener sólo datos sintéticos.
- **4, el endpoint:** es una superficie nueva para atacar, y un endpoint que regala Pro es justo lo
  que ADR-0011 evitó. Un script no está en la red.
- **5, a mano:** lo prohíbe CLAUDE.md, y no deja rastro.

## Consecuencias

- **Quien otorga Pro tiene que tener acceso a las variables del ambiente.** Es la misma persona que
  ya puede tocar la base: no abre ningún privilegio nuevo.
- **Sirve también para regalar Pro a otra persona** (amigos, probadores) mientras no hay cobro. No
  tiene vencimiento: un otorgamiento manual dura hasta que alguien lo revoque.
- **Un solo registro del último cambio** (`planSource`, `planChangedAt`), no un historial. Si hace
  falta auditar cambios, es una colección aparte, y entra con la pasarela.
- **La spec §4 deja de decir "lo fija el seed de desarrollo o la base"**: en un ambiente desplegado
  lo fija este script.
- **Falta decidir con la pasarela:** qué hace un evento de baja con un usuario `manual`, y si una
  suscripción activa pasa a `billing` sobre un otorgamiento previo.
