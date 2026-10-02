import type { Meta, StoryObj } from '@storybook/react-vite';
import { RankBars } from './RankBars.tsx';

const meta = {
  title: 'Cross/RankBars',
  component: RankBars,
} satisfies Meta<typeof RankBars>;

export default meta;
type Story = StoryObj<typeof meta>;

function enCaja(args: React.ComponentProps<typeof RankBars>): React.JSX.Element {
  return (
    <div style={{ maxWidth: 'var(--wc-column-max)' }}>
      <RankBars {...args} />
    </div>
  );
}

const LEYENDA = { strong: 'Primario', soft: 'Secundario' };

/** Los grupos musculares de una lista de seis ejercicios, con primario y secundarios. */
export const GruposMusculares: Story = {
  args: {
    label: 'Grupos musculares',
    legend: LEYENDA,
    rows: [
      { key: 'cuadriceps', label: 'Cuádriceps', strong: 3, soft: 1, valueText: '31%' },
      { key: 'gluteo', label: 'Glúteo', strong: 0, soft: 2, valueText: '15%' },
      { key: 'pectoral', label: 'Pectoral', strong: 2, soft: 0, valueText: '15%' },
      { key: 'isquiotibiales', label: 'Isquiotibiales', strong: 1, soft: 0.5, valueText: '12%' },
      { key: 'core', label: 'Core', strong: 0, soft: 1.5, valueText: '12%' },
      { key: 'triceps', label: 'Tríceps', strong: 0, soft: 1, valueText: '8%' },
      { key: 'cuerpo_completo', label: 'Cuerpo completo', strong: 1, soft: 0, valueText: '8%' },
    ],
  },
  render: enCaja,
};

export const SinDatos: Story = {
  args: { label: 'Grupos musculares', legend: LEYENDA, rows: [], emptyMessage: 'Sin ejercicios' },
  render: enCaja,
};
