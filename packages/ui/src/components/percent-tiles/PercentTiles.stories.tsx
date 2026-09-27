import type { Decorator, Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { PercentTiles, type PercentTileOption } from './PercentTiles.tsx';

const options: PercentTileOption[] = [65, 75, 80, 85, 90, 95].map((value) => ({
  value,
  label: `${String(value)}%`,
  detail: `${String(value)} kg`,
}));

/** El ancho de la columna del diseño. */
const narrow: Decorator = (Story) => (
  <div style={{ maxWidth: 'var(--wc-column-max)' }}>
    <Story />
  </div>
);

const meta = {
  title: 'Cross/PercentTiles',
  component: PercentTiles,
  args: {
    legend: 'Porcentaje del RM',
    name: 'porcentaje',
    options,
    value: 65,
    onChange: () => undefined,
  },
  decorators: [narrow],
} satisfies Meta<typeof PercentTiles>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Con estado: se elige con click o con las flechas. */
export const Interactive: Story = {
  render: (args) => {
    const [value, setValue] = useState<number | undefined>(args.value);
    return <PercentTiles {...args} value={value} onChange={setValue} />;
  },
};

/** Un porcentaje escrito a mano, que no está en la grilla: ninguno elegido. */
export const CustomValue: Story = {
  args: { value: 98 },
};

/** Repeticiones: el detalle habla de reps. */
export const Reps: Story = {
  args: {
    options: options.map((option) => ({
      ...option,
      detail: `${String(Math.max(1, Math.floor((12 * option.value) / 100)))} reps`,
    })),
  },
};
