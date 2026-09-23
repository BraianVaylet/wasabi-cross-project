# ADR-0007: La API sirve el front

- Fecha: 2026-09-22
- Estado: propuesta — se acepta al mergear la PR de F3-03, o se reemplaza si el usuario elige la
  alternativa

## Contexto

Para salir a producción (Fase 3) hay que decidir cómo viven el front y la API. La cookie de sesión
de Better Auth es `SameSite=Lax`: el navegador sólo la manda si el front y la API son **el mismo
sitio**. En desarrollo lo son por casualidad —los dos en `127.0.0.1`, en puertos distintos—; en
producción hay que elegirlo a propósito.

Restricciones: un equipo de una persona, Railway como plataforma (spec §12), y el volumen inicial
de spec §12: uso personal, amigos y los primeros suscriptores.

## Opciones consideradas

1. **La API sirve el front compilado.** Un solo servicio en Railway, un dominio, el mismo origen.
2. **Dos servicios en subdominios del mismo dominio** (`app.` para el front, `api.` para la API).
   Mismo sitio, así que la cookie viaja, pero con dos deploys y CORS entre los dos.
3. **Dos servicios en dominios distintos**, con la cookie en `SameSite=None; Secure`. Descartada:
   abre la puerta a CSRF que hoy `Lax` cierra sola, y los navegadores vienen restringiendo las
   cookies de terceros.

## Decisión

La opción 1: la API sirve el front.

- **Mismo origen**: la cookie viaja sin pensarlo, y en producción no hace falta CORS.
- **Un deploy**: un solo servicio que versionar, monitorear y volver atrás. Para una persona, eso
  pesa más que la independencia de escalar el front aparte, que a este volumen no hace falta.
- **Una sola CSP** para las dos cosas. Obliga a que el front no tenga scripts inline —el bootstrap
  del tema pasó a ser un archivo—, que es lo que había que hacer de todas formas.

Cómo: con `WEB_DIST_DIR` apuntando al front compilado, la API registra `@fastify/static`. Una
navegación de la SPA (GET, que acepta HTML, fuera de `/api`, `/docs`, `/health` y `/ready`) cae en
el `index.html`; un asset que no existe sigue siendo un 404, y todo lo de la API sigue respondiendo
JSON. Sin `WEB_DIST_DIR` —desarrollo— la API no sirve páginas y el front lo sirve Vite como hasta
ahora.

## Consecuencias

- Front y API se deployan juntos: un cambio de sólo front también reinicia la API. Aceptable
  mientras el arranque tarde segundos.
- La caché de los assets la tiene que poner la API (F3-05): con hash, larga; el `index.html` y el
  service worker, sin caché.
- Si algún día el front necesita un CDN propio, esta decisión se revisa; la opción 2 queda como el
  paso natural, porque también es mismo sitio.
- El E2E de desarrollo sigue corriendo contra Vite; F3-05 suma una corrida contra el build servido
  por la API.
