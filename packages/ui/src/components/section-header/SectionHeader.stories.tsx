import type { Decorator, Meta, StoryObj } from '@storybook/react-vite';
import { Measure } from '../measure/Measure.tsx';
import { SectionHeader } from './SectionHeader.tsx';

/** El ancho de la columna del diseño. */
const narrow: Decorator = (Story) => (
  <div style={{ maxWidth: 'var(--wc-column-max)' }}>
    <Story />
  </div>
);

const meta = {
  title: 'Cross/SectionHeader',
  component: SectionHeader,
  decorators: [narrow],
} satisfies Meta<typeof SectionHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

/** "ELIGE TU CARGA" del diseño. */
export const WithMeta: Story = {
  args: { title: 'Elegí tu carga', meta: 'Porcentaje del RM' },
};

/** "HISTORIAL DE RM" con la cantidad de registros. */
export const Count: Story = {
  args: { title: 'Historial de RM', meta: '03 registros' },
};

/** "PROGRESO DEL RM": etiqueta arriba, el aumento a la derecha y sin línea. */
export const Progress: Story = {
  args: {
    title: 'Progreso del RM',
    kicker: 'Tendencia de fuerza',
    divider: false,
    meta: (
      <span
        style={{
          display: 'block',
          paddingLeft: '0.5rem',
          borderLeft: '1px solid var(--wc-border)',
        }}
      >
        Aumento
        <br />
        <Measure value="+40" unit="kg" size="sm" tone="accent" />
      </span>
    ),
  },
};
