# Diccionario de códigos de error — Wasabi Cross

Formato: `WC-<MÓDULO>-<HTTP>-<NNN>`

Documento vivo: cada vez que se agrega un error nuevo en el código, se agrega acá **en el mismo PR**. Un código que existe en el código y no está acá es un bug de documentación.

## Módulos

`AUTH` · `USER` · `EXO` (exercises) · `RM` (records) · `STATS` · `SUBS` (subscriptions) · `BILL` (billing) · `NOTF` (notifications) · `SYS`

## Semilla

| Código | HTTP | Significado | Mensaje al usuario |
|---|---|---|---|
| `WC-AUTH-401-001` | 401 | Credenciales inválidas | Email o contraseña incorrectos. |
| `WC-AUTH-403-002` | 403 | Sin permiso sobre el recurso | No tenés permisos para esta acción. |
| `WC-AUTH-429-003` | 429 | Demasiados intentos | Demasiados intentos. Probá en 5 minutos. |
| `WC-EXO-403-001` | 403 | Límite de ejercicios del plan alcanzado | Alcanzaste el máximo de ejercicios de tu plan {plan}. |
| `WC-EXO-404-002` | 404 | Ejercicio no encontrado | No encontramos ese ejercicio. |
| `WC-RM-422-001` | 422 | Valor de RM/tiempo/reps inválido | El valor cargado no es válido. |
| `WC-RM-404-002` | 404 | Registro no encontrado | No encontramos ese registro. |
| `WC-SUBS-403-001` | 403 | Límite de plan alcanzado | Alcanzaste el máximo de {limite} de tu plan {plan}. |
| `WC-BILL-402-001` | 402 | Pago rechazado | El pago fue rechazado por el emisor. |
| `WC-BILL-409-002` | 409 | Pago duplicado | Este pago ya fue registrado. |
| `WC-SYS-400-002` | 400 | Entrada inválida (falla la validación Zod en el borde) | Revisá los datos enviados. |
| `WC-SYS-404-003` | 404 | Ruta inexistente | No encontramos lo que buscás. |
| `WC-SYS-500-001` | 500 | Error no controlado | Ocurrió un error. Compartí el código {code} con soporte. |

Reglas de logging asociadas a estos códigos: ver [docs/architecture.md](./architecture.md).
