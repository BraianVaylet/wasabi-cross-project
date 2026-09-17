import type { Theme } from '../../theme/theme.ts';
import './ThemeToggle.css';

export interface ThemeToggleProps {
  theme: Theme;
  onToggle: () => void;
}

/**
 * Botón redondo del header (mockups 4 y 6). No maneja el estado del tema: lo recibe.
 * Así el mismo componente sirve en la app, en Storybook y en un test.
 */
export function ThemeToggle({ theme, onToggle }: ThemeToggleProps): React.JSX.Element {
  const goingTo = theme === 'dark' ? 'claro' : 'oscuro';

  return (
    <button
      type="button"
      className="wc-theme-toggle"
      onClick={onToggle}
      aria-label={`Cambiar a tema ${goingTo}`}
    >
      <span aria-hidden="true">{theme === 'dark' ? '🌙' : '☀️'}</span>
    </button>
  );
}
