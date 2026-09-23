# 2026-09-22 — F3-02: un error del cliente responde 4xx, no 500

- Autor: Claude Opus 5.5 (agente), con Braian
- Duración aprox: corta

## Objetivo

Que un pedido roto no aparezca como un error del servidor. Encontrado en F1-14: un `Content-Length`
mentiroso respondía 500 aunque Fastify ya lo había marcado como 400.

## Qué se hizo

- El manejador de errores tiene un paso nuevo, antes del genérico: si el error ya trae un
  `statusCode` 4xx —los que arma Fastify antes de llegar a la ruta—, responde ese código con
  `WC-SYS-400-002` y lo loguea como aviso, con el código interno de Fastify para rastrearlo.
- Cuatro tests: JSON mal formado (400), cuerpo demasiado grande (413), tipo de contenido que no se
  entiende (415), y un error con un 5xx propio que sigue siendo un 500 nuestro.

## Decisiones tomadas

- **Ningún código nuevo**: `WC-SYS-400-002` ("revisá los datos enviados") ya dice lo que pasó; el
  status HTTP distingue los casos.
- **El 429 queda aparte**, antes de este paso: el rate limit tiene su propio código del catálogo.

## Bloqueos / lo que no funcionó

- Una prueba inversa sobrevivió: aceptar cualquier `statusCode >= 400` como error del cliente no
  rompía nada, porque ningún test tiraba un error con un 5xx propio. Se agregó ese test.

## Próximo paso

F3-03 espera la decisión sobre cómo comparten sitio el front y la API. Mientras tanto, lo que no
depende de ella: los runbooks (F3-11) necesitan F3-08 y F3-09, así que lo siguiente con sentido es
preparar F3-04 del lado que no depende de la decisión.
