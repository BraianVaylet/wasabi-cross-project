import type { Meta, StoryObj } from '@storybook/react-vite';
import { ColumnChart } from './ColumnChart.tsx';

const meta = {
  title: 'Cross/ColumnChart',
  component: ColumnChart,
} satisfies Meta<typeof ColumnChart>;

export default meta;
type Story = StoryObj<typeof meta>;

function enCaja(args: React.ComponentProps<typeof ColumnChart>): React.JSX.Element {
  return (
    <div style={{ maxWidth: 'var(--wc-column-max)' }}>
      <ColumnChart {...args} />
    </div>
  );
}

const MESES = [
  'oct',
  'nov',
  'dic',
  'ene',
  'feb',
  'mar',
  'abr',
  'may',
  'jun',
  'jul',
  'ago',
  'sep',
  'oct',
];

/** Un año: trece meses, con huecos. */
export const UnAno: Story = {
  args: {
    label: 'Marcas por mes',
    columnLabel: 'Mes',
    valueLabel: 'Marcas',
    columns: MESES.map((label, index) => ({
      key: `m${String(index)}`,
      label,
      value: [2, 0, 1, 3, 5, 0, 0, 4, 6, 2, 1, 8, 1][index] ?? 0,
    })),
  },
  render: enCaja,
};

/** Tres meses: julio y septiembre con marcas, agosto vacío. */
export const TresMeses: Story = {
  args: {
    label: 'Marcas por mes',
    columnLabel: 'Mes',
    valueLabel: 'Marcas',
    columns: [
      { key: '2026-07', label: 'jul', value: 2 },
      { key: '2026-08', label: 'ago', value: 0 },
      { key: '2026-09', label: 'sep', value: 3 },
      { key: '2026-10', label: 'oct', value: 0 },
    ],
  },
  render: enCaja,
};
