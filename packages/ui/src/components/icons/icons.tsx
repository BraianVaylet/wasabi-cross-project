/*
 * Íconos de línea, del color del texto. Siempre decorativos: el nombre accesible lo pone
 * quien los usa (un `IconButton`, un texto al lado).
 */

const STROKE = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;

export function MenuIcon(): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" focusable="false" {...STROKE}>
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

export function CloseIcon(): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" focusable="false" {...STROKE}>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

/** El "entrar acá" de cada fila de la lista (mockup 4). */
export function ChevronIcon(): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" focusable="false" {...STROKE}>
      <path d="M9 5l7 7-7 7" />
    </svg>
  );
}

/** El marcador de imagen de los mockups, hasta que haya logo de marca. */
export function ImageIcon(): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" focusable="false" {...STROKE}>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="9" cy="9" r="2" />
      <path d="M21 15l-5-5L5 21" />
    </svg>
  );
}
