/*
 * Astro define el JSX de sus plantillas como `HTMLElement | any`. Sin un framework que lo acote,
 * ese `any` hace que typescript-eslint marque como inseguro todo `{lista.map(...)}`. Se acota al
 * elemento del DOM (eslint-plugin-astro, "Unsafe return of an `any` typed value").
 */
import 'astro/astro-jsx';

declare global {
  namespace JSX {
    type Element = HTMLElement;
  }
}
