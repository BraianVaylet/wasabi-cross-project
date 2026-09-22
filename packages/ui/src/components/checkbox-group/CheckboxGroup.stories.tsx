import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { CheckboxGroup } from './CheckboxGroup.tsx';

const CAPACIDADES = [
  { value: 'fuerza', label: 'Fuerza' },
  { value: 'resistencia', label: 'Resistencia' },
  { value: 'velocidad', label: 'Velocidad' },
] as const;

const GRUPOS = [
  { value: 'pectoral', label: 'Pectoral' },
  { value: 'espalda', label: 'Espalda' },
  { value: 'hombro', label: 'Hombro' },
  { value: 'biceps', label: 'Bíceps' },
  { value: 'triceps', label: 'Tríceps' },
  { value: 'core', label: 'Core' },
  { value: 'gluteo', label: 'Glúteo' },
  { value: 'cuadriceps', label: 'Cuádriceps' },
] as const;

const meta = {
  title: 'Cross/CheckboxGroup',
  component: CheckboxGroup,
} satisfies Meta<typeof CheckboxGroup<string>>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Las capacidades de un ejercicio propio (mockup 9): se eligen varias. */
export const Capacidades: Story = {
  args: { legend: 'Capacidades', options: CAPACIDADES, values: [], onChange: () => undefined },
  render: function Capacidades(args) {
    const [values, setValues] = useState<string[]>(['fuerza']);

    return (
      <div className="wc-root" style={{ padding: '1rem' }}>
        <CheckboxGroup {...args} values={values} onChange={setValues} />
      </div>
    );
  },
};

/** Con muchas opciones se acomoda en grilla en vez de hacer una columna infinita. */
export const GruposMusculares: Story = {
  args: {
    legend: 'Grupos musculares',
    options: GRUPOS,
    values: ['core', 'gluteo'],
    onChange: () => undefined,
  },
};

export const ConError: Story = {
  args: {
    legend: 'Capacidades',
    options: CAPACIDADES,
    values: [],
    onChange: () => undefined,
    error: 'Elegí al menos una capacidad',
  },
};
