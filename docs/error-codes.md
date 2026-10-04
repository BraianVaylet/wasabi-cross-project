# Diccionario de códigos de error — Wasabi Cross

Formato: `WC-<MÓDULO>-<HTTP>-<NNN>`

Documento vivo: cada vez que se agrega un error nuevo en el código, se agrega acá **en el mismo PR**. Un código que existe en el código y no está acá es un bug de documentación.

## Módulos

`AUTH` · `OAUTH` · `USER` · `EXO` (exercises) · `RM` (records) · `STATS` · `SUBS` (subscriptions) · `BILL` (billing) · `NOTF` (notifications) · `SYS`

## Semilla

| Código             | HTTP | Significado                                                           | Mensaje al usuario                                                 |
| ------------------ | ---- | --------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `WC-AUTH-401-001`  | 401  | Credenciales inválidas                                                | Email o contraseña incorrectos.                                    |
| `WC-AUTH-403-002`  | 403  | Sin permiso sobre el recurso                                          | No tenés permisos para esta acción.                                |
| `WC-AUTH-429-003`  | 429  | Demasiados intentos                                                   | Demasiados intentos. Esperá un minuto y probá de nuevo.            |
| `WC-AUTH-401-004`  | 401  | Sin sesión, o sesión vencida                                          | Iniciá sesión para continuar.                                      |
| `WC-OAUTH-400-001` | 400  | El ingreso se canceló en el proveedor (`?error=access_denied`)        | Cancelaste el ingreso. Probá de nuevo cuando quieras.              |
| `WC-OAUTH-400-002` | 400  | El ingreso falló por cualquier otra causa, o el `?error=` es raro     | No pudimos completar el ingreso. Probá de nuevo.                   |
| `WC-OAUTH-409-003` | 409  | El email ya tiene cuenta con el otro proveedor (`account_not_linked`) | Ya hay una cuenta con ese email. Entrá con el otro proveedor.      |
| `WC-EXO-404-002`   | 404  | Ejercicio no encontrado                                               | No encontramos ese ejercicio.                                      |
| `WC-EXO-409-003`   | 409  | El ejercicio ya está en la lista del usuario                          | Ya tenés ese ejercicio en tu lista.                                |
| `WC-RM-422-001`    | 422  | Valor de RM/tiempo/reps inválido                                      | El valor cargado no es válido.                                     |
| `WC-RM-404-002`    | 404  | Registro no encontrado                                                | No encontramos ese registro.                                       |
| `WC-STATS-404-001` | 404  | Ejercicio inexistente o de otro usuario, al pedir sus estadísticas    | No encontramos ese ejercicio.                                      |
| `WC-SUBS-403-002`  | 403  | Estadísticas: el plan del usuario no las incluye (sólo Pro)           | Las estadísticas son parte del plan Pro.                           |
| `WC-BILL-402-001`  | 402  | Pago rechazado                                                        | El pago fue rechazado por el emisor.                               |
| `WC-BILL-409-002`  | 409  | Pago duplicado                                                        | Este pago ya fue registrado.                                       |
| `WC-SYS-400-002`   | 400  | Entrada inválida (falla la validación Zod en el borde)                | Revisá los datos enviados.                                         |
| `WC-SYS-404-003`   | 404  | Ruta inexistente                                                      | No encontramos lo que buscás.                                      |
| `WC-SYS-500-001`   | 500  | Error no controlado                                                   | Ocurrió un error. Compartí el código {code} con soporte.           |
| `WC-SYS-503-004`   | 503  | API inalcanzable o respuesta sin envelope (lo genera el front)        | No pudimos conectarnos con el servidor. Probá de nuevo en un rato. |

## Retirados

Un código retirado no se reusa: sigue acá para que nadie le asigne otro significado.

| Código            | Retirado en | Por qué                                                                                                                                                       |
| ----------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `WC-EXO-409-004`  | F5-08       | Un propio puede llamarse como uno del catálogo: un precargado editado conserva su nombre ([ADR-0009](./adr/0009-catalogo-ampliado.md)).                       |
| `WC-SUBS-403-001` | F8-01       | Era el límite de ejercicios del plan. Free y Pro cargan sin tope; lo que los separa son las estadísticas ([ADR-0011](./adr/0011-plan-pro-y-estadisticas.md)). |

Reglas de logging asociadas a estos códigos: ver [docs/architecture.md](./architecture.md).
