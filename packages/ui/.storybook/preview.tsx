import type { Decorator, Preview } from '@storybook/react-vite';
import '../src/styles/tokens.css';

/** Cada story se ve en el tema que elija la toolbar, con el fondo real de la app. */
const withTheme: Decorator = (Story, context) => {
  const theme = context.globals.theme === 'light' ? 'light' : 'dark';

  return (
    <div data-theme={theme} className="wc-root" style={{ padding: '2rem', minHeight: '100vh' }}>
      <Story />
    </div>
  );
};

const preview: Preview = {
  decorators: [withTheme],
  globalTypes: {
    theme: {
      description: 'Tema de la app',
      defaultValue: 'dark',
      toolbar: {
        title: 'Tema',
        icon: 'circlehollow',
        items: [
          { value: 'dark', title: 'Oscuro' },
          { value: 'light', title: 'Claro' },
        ],
        dynamicTitle: true,
      },
    },
  },
  parameters: {
    controls: { matchers: { color: /(background|color)$/i } },
    // WCAG 2.2 AA (spec §11). Un problema de accesibilidad se ve acá, no en producción.
    a11y: { test: 'error' },
  },
};

export default preview;
