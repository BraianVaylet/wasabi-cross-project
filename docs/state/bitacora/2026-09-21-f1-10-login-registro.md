# 2026-09-21 — F1-10: login y registro

- Autor: Claude (Opus 5), a pedido de Braian
- Duración aprox: 1 sesión

## Objetivo

Las pantallas de los mockups 2 y 3: entrar y crear una cuenta, con los schemas compartidos.

## Qué se hizo

- **Contratos en `@wasabi-cross/schemas`** (`auth.api.ts`): `signInSchema`, `signUpSchema` (con la
  confirmación de contraseña) y los largos `PASSWORD_MIN_LENGTH` / `PASSWORD_MAX_LENGTH`, que ahora
  también configuran Better Auth en la API. El mínimo de 10 estaba escrito en un solo lado y el
  formulario no lo conocía: el registro habría fallado recién en la API.
- **`/login` y `/registro`** con TanStack Form. El email se normaliza a minúsculas antes de mandarlo
  (`parse`, no el valor crudo), y la confirmación de contraseña se queda en el formulario.
- El cliente de sesión suma `signIn` y `signUp`, por el mismo cliente HTTP que todo lo demás.
- Al entrar o registrarse se vuelve a pedir la sesión y el router hace el resto: login con sesión
  redirige a donde el usuario iba, así que no hay navegación a mano.
- Del mockup 2 quedan afuera **"Login with Google"** y **"Forgot your password?"**: los dos están
  fuera de la Fase 1 (el segundo necesita un proveedor de email sin decidir).

## Decisiones tomadas

- **El error de la API no se reparte por campo.** Un 401 dice "Email o contraseña incorrectos" y
  ningún campo queda marcado: decir cuál falló diría si el email existe (spec §13).
- **El largo mínimo de contraseña no se exige al entrar**, sólo al elegirla: exigirlo al entrar
  dejaría afuera a quien la eligió con otras reglas.
- **`WC-AUTH-429-003` decía "Probá en 5 minutos" con una ventana de un minuto** (spec §13: 5/min).
  Se corrigió el mensaje a "Esperá un minuto y probá de nuevo" en el diccionario y el catálogo.
- **El handler de errores de la API dejó de repetir los mensajes** y los lee del catálogo. Esa
  duplicación era justo la que había dejado pasar la incoherencia anterior.
- El "Username" del mockup 3 es el **nombre visible** (spec §5): en la pantalla se llama Nombre.

## Bloqueos / lo que no funcionó

- **Cinco pruebas inversas**, todas detectadas: login sin normalizar el email, login sin mostrar el
  error de la API, registro mandando la confirmación, registro sin validar y `signIn` pegándole al
  endpoint de registro.
- **axe** sin violaciones en las dos pantallas (regla `region` apagada: el landmark lo pone la
  pantalla completa, no el fragmento del test).
- **Enter no enviaba el formulario en el navegador automatizado.** Parecía un bug de accesibilidad,
  pero un formulario HTML común, creado a mano en la misma página, tampoco se enviaba: es el
  automatizador, que manda la tecla sin su acción por defecto. En jsdom sí envía, y quedó un test
  que lo cubre.
- **Probado a mano contra la API real** (Mongo en memoria): registro con email en mayúsculas —queda
  normalizado—, contraseña corta rechazada en el formulario, login con contraseña incorrecta
  mostrando el código y el requestId, y login correcto.

## Próximo paso

Debe coincidir con "Próximo paso" en [STATE.md](../STATE.md): mergear #17 (F1-07) y la PR de F1-10.
Sigue F1-11, la lista de ejercicios de Home.
