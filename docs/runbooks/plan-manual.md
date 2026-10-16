# Runbook — Otorgar el plan Pro a mano

Mientras no hay pasarela de pago (ADR-0011), nadie puede cambiarse el plan desde la app: todos
nacen Free, y las estadísticas son de Pro. Este runbook es la forma de que el dueño pruebe las
estadísticas en un ambiente desplegado, o de darle Pro a otra persona. La decisión y sus
alternativas están en [ADR-0014](../adr/0014-plan-manual-sin-pasarela.md); la regla, en
[spec §4](../spec/wasabi-cross.spec.md).

> **Esto no es una pasarela.** No cobra, no vence y no tiene precio. Un otorgamiento manual dura
> hasta que alguien lo revoque con el mismo script.

## Qué hace y qué no

- Cambia el campo `plan` de **un usuario que ya existe**, y anota `planSource: "manual"` y
  `planChangedAt`. Rige desde el pedido siguiente de esa persona, sin cerrar sesión.
- **No crea cuentas.** La cuenta nace cuando la persona entra con Google o Microsoft (spec §5.6).
  Si el email no existe, el script lo dice y no toca nada.
- **Sin `--apply` no escribe.** Imprime qué cambiaría y **en qué base**.
- No hay ruta HTTP: no se puede llamar desde la app ni desde afuera.

## Cómo se usa

1. **La persona entra una vez** a la app del ambiente con la cuenta (y el email) que quiere
   promover. Sin eso el usuario no existe.
2. **Elegir el ambiente** con la CLI de Railway y correr el script **compilado** con las variables
   de ese ambiente. Primero sin `--apply`:

   ```bash
   railway link        # elegir el proyecto y el ambiente (staging o production)
   railway run pnpm --filter @wasabi-cross/api plan:set:dist --email <email> --plan pro
   ```

3. **Leer la línea `Base:`.** Dice el nombre de la base y el ambiente. Si dice
   `wasabi_cross_staging` y se quería producción, el ambiente elegido no es el que se creía:
   parar y volver al paso 2.
4. Si es lo esperado, repetir **con `--apply`**:

   ```bash
   railway run pnpm --filter @wasabi-cross/api plan:set:dist --email <email> --plan pro --apply
   ```

5. Comprobar en la app: con Pro aparece la etiqueta PRO en el header y la pantalla de
   Estadísticas deja de mostrar el aviso de plan.

**Para revocarlo**, lo mismo con `--plan free --apply`. La persona conserva todos sus ejercicios y
marcas (spec §4); sólo deja de ver las estadísticas.

## Contra qué corre cada variante

| Comando         | Dónde                       | Lee `.env` local | Para qué                                          |
| --------------- | --------------------------- | ---------------- | ------------------------------------------------- |
| `plan:set:dist` | Staging o producción        | No               | **Usar éste** contra un ambiente desplegado       |
| `plan:set`      | Desarrollo (`tsx` y `.env`) | Sí               | La base local; en un ambiente desplegado no sirve |

`plan:set` carga el `.env` local, y un `OAUTH_DEV_IDP=on` de desarrollo mezclado con
`NODE_ENV=production` hace que la API se niegue a arrancar. `plan:set:dist` no lee ningún `.env`.

## Si falla

| Mensaje                                | Qué pasó                                                                                         |
| -------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `No hay ningún usuario con el email …` | La persona no entró nunca a ese ambiente, o entró con otro email. Paso 1.                        |
| `El plan "…" no existe`                | Los planes son `free` y `pro`.                                                                   |
| `Configuración de entorno inválida`    | Faltan variables del ambiente: el `railway run` no apunta al ambiente correcto (`railway link`). |
| `MongoServerSelectionError`            | Atlas no deja entrar a la IP de esta máquina: sumarla a la lista de acceso de red (F3-08).       |

## Cuando llegue la pasarela

El webhook de pago va a llamar al mismo caso de uso (`setPlan`, en `subscriptions`). Qué hace un
evento de baja con un usuario `planSource: "manual"` está **por decidir** (ADR-0014): antes de
conectar el cobro, listar quiénes tienen Pro a mano:

```js
db.user.find({ planSource: 'manual' }, { email: 1, plan: 1, planChangedAt: 1 });
```

(Es una consulta de sólo lectura, para mirar; los cambios se hacen con el script.)
