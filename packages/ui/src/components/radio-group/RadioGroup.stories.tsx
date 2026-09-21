import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { RadioGroup } from './RadioGroup.tsx';

const CATEGORIAS = [
  { value: 'fuerza', label: 'Fuerza (RM en kg)' },
  { value: 'hipertrofia', label: 'Hipertrofia (repeticiones)' },
  { value: 'gimnastico', label: 'Gimnástico (repeticiones)' },
  { value: 'running', label: 'Running (tiempo)' },
] as const;

const meta = {
  title: 'Cross/RadioGroup',
  component: RadioGroup,
} satisfies Meta<typeof RadioGroup<string>>;

export default meta;
type Story = StoryObj<typeof meta>;

/** La categoría del mockup 9: se recorre con las flechas del teclado. */
export const Categoria: Story = {
  args: { legend: 'Categoría', name: 'categoria', options: CATEGORIAS, onChange: () => undefined },
  render: function Categoria(args) {
    const [value, setValue] = useState('fuerza');

    return (
      <div className="wc-root" style={{ padding: '1rem' }}>
        <RadioGroup {...args} value={value} onChange={setValue} />
      </div>
    );
  },
};

export const ConError: Story = {
  args: {
    legend: 'Categoría',
    name: 'categoria-error',
    options: CATEGORIAS,
    onChange: () => undefined,
    error: 'Elegí una categoría',
  },
};
