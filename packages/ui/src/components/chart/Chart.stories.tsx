import type { Meta, StoryObj } from '@storybook/react-vite';
import { Chart } from './Chart.tsx';

const meta = {
  title: 'Cross/Chart',
  component: Chart,
} satisfies Meta<typeof Chart>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Todas se ven en la columna del diseño, como en un teléfono. */
function enCaja(args: React.ComponentProps<typeof Chart>): React.JSX.Element {
  return (
    <div style={{ maxWidth: 'var(--wc-column-max)' }}>
      <Chart {...args} />
    </div>
  );
}

/** El "PROGRESO DEL RM" del diseño, con sus mismas tres marcas. */
export const Diseno: Story = {
  args: {
    label: 'RM registrado',
    unit: 'kg',
    points: [
      { label: '02/06/2025', value: 60 },
      { label: '23/02/2026', value: 80 },
      { label: '23/06/2026', value: 100 },
    ],
  },
  render: enCaja,
};

export const UnaSolaMarca: Story = {
  args: { label: 'RM registrado', unit: 'kg', points: [{ label: '23/06/2026', value: 70 }] },
  render: enCaja,
};

export const DosMarcas: Story = {
  args: {
    label: 'RM registrado',
    unit: 'kg',
    points: [
      { label: '10/01/2026', value: 90 },
      { label: '23/06/2026', value: 102.5 },
    ],
  },
  render: enCaja,
};

/** Un año de marcas: sólo la primera y la última llevan su valor; las fechas se adelgazan. */
export const UnAno: Story = {
  args: {
    label: 'RM registrado',
    unit: 'kg',
    points: [80, 82.5, 85, 85, 87.5, 90, 90, 92.5, 95, 97.5, 100, 102.5].map((value, index) => ({
      label: `${String(index + 1).padStart(2, '0')}/01/2026`,
      value,
    })),
  },
  render: enCaja,
};

function mmss(seconds: number): string {
  return `${String(Math.floor(seconds / 60))}:${String(seconds % 60).padStart(2, '0')}`;
}

/** Un tiempo baja cuando mejora: la curva no sabe de eso, sólo dibuja lo que le dan. */
export const Tiempo: Story = {
  args: {
    label: 'Tiempo registrado',
    unit: 'mm:ss',
    formatValue: mmss,
    points: [
      { label: '10/01/2026', value: 320 },
      { label: '12/03/2026', value: 300 },
      { label: '23/06/2026', value: 272 },
    ],
  },
  render: enCaja,
};

export const SinMarcas: Story = {
  args: { label: 'RM registrado', unit: 'kg', points: [] },
  render: enCaja,
};
