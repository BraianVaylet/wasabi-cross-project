/*
 * Aplica el tema antes del primer pintado. Si esperara al bundle de React, el usuario
 * vería un parpadeo claro/oscuro en cada carga. Decide igual que `resolveInitialTheme` de
 * @wasabi-cross/ui: un test verifica que no se separen.
 *
 * Es un archivo y no un <script> inline por la CSP (`script-src 'self'`, sin
 * 'unsafe-inline'): cuando la API sirve el front (F3-03), un inline queda bloqueado.
 */
(function () {
  try {
    var s = localStorage.getItem('wasabi-cross:theme');
    var t =
      s === 'dark' || s === 'light'
        ? s
        : window.matchMedia('(prefers-color-scheme: light)').matches
          ? 'light'
          : 'dark';
    document.documentElement.dataset.theme = t;
  } catch (e) {
    document.documentElement.dataset.theme = 'dark';
  }
})();
