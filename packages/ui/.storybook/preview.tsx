import type { Decorator, Preview } from '@storybook/react-vite';
import '@fontsource/share-tech-mono';
import '@fontsource/staatliches';
import '../src/styles/tokens.css';

/** Tema único (ADR-0008): cada story se ve con el fondo real de la app, sin variantes. */
const withRoot: Decorator = (Story) => (
  <div className="wc-root" style={{ padding: '2rem', minHeight: '100vh' }}>
    <Story />
  </div>
);

const preview: Preview = {
  decorators: [withRoot],
  parameters: {
    controls: { matchers: { color: /(background|color)$/i } },
    // WCAG 2.2 AA (spec §11). Un problema de accesibilidad se ve acá, no en producción.
    a11y: { test: 'error' },
  },
};

export default preview;
