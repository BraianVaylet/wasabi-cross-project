import type { Meta, StoryObj } from '@storybook/react-vite';
import { Donut } from './Donut.tsx';

const meta = {
  title: 'Cross/Donut',
  component: Donut,
} satisfies Meta<typeof Donut>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Todas se ven en la columna del diseño, como en un teléfono. */
function enCaja(args: React.ComponentProps<typeof Donut>): React.JSX.Element {
  return (
    <div style={{ maxWidth: 'var(--wc-column-max)' }}>
      <Donut {...args} />
    </div>
  );
}

const ejercicios = (value: number): string =>
  value === 1 ? '1 ejercicio' : `${String(value)} ejercicios`;

export const UnaPorcion: Story = {
  args: {
    label: 'Segmento del cuerpo',
    slices: [{ key: 'tren_inferior', label: 'Tren inferior', value: 3, percent: 100 }],
    total: { value: '3', caption: 'ejercicios' },
    formatValue: ejercicios,
  },
  render: enCaja,
};

export const TresPorciones: Story = {
  args: {
    label: 'Disciplinas',
    slices: [
      { key: 'crossfit', label: 'CrossFit', value: 4, percent: 50 },
      { key: 'hyrox', label: 'Hyrox', value: 2, percent: 25 },
      { key: 'sin', label: 'Sin disciplina', value: 2, percent: 25, muted: true },
    ],
    total: { value: '8', caption: 'menciones' },
    formatValue: ejercicios,
  },
  render: enCaja,
};

/** Seis categorías: entran todas, cada una con su color. */
export const SeisPorciones: Story = {
  args: {
    label: 'Categorías',
    slices: [
      { key: 'fuerza', label: 'Fuerza', value: 6, percent: 30 },
      { key: 'gimnastico', label: 'Gimnástico', value: 4, percent: 20 },
      { key: 'hipertrofia', label: 'Hipertrofia', value: 3, percent: 15 },
      { key: 'running', label: 'Running', value: 3, percent: 15 },
      { key: 'cardio', label: 'Cardio', value: 2, percent: 10 },
      { key: 'distancia_carga', label: 'Distancia con carga', value: 2, percent: 10 },
    ],
    total: { value: '20', caption: 'ejercicios' },
    formatValue: ejercicios,
  },
  render: enCaja,
};

/** Ocho: las cinco más grandes y "Otras", que dice cuáles junta. */
export const OchoPorciones: Story = {
  args: {
    label: 'Disciplinas',
    slices: [
      { key: 'crossfit', label: 'CrossFit', value: 8, percent: 25 },
      { key: 'musculacion', label: 'Musculación', value: 6, percent: 19 },
      { key: 'hyrox', label: 'Hyrox', value: 5, percent: 16 },
      { key: 'funcional', label: 'Funcional', value: 4, percent: 13 },
      { key: 'running', label: 'Running', value: 3, percent: 9 },
      { key: 'hybrid', label: 'Hybrid', value: 2, percent: 6 },
      { key: 'pilates', label: 'Pilates', value: 2, percent: 6 },
      { key: 'sin', label: 'Sin disciplina', value: 2, percent: 6, muted: true },
    ],
    total: { value: '32', caption: 'menciones' },
    formatValue: ejercicios,
  },
  render: enCaja,
};

export const SinDatos: Story = {
  args: {
    label: 'Disciplinas',
    slices: [],
    total: { value: '0', caption: 'menciones' },
    emptyMessage: 'Todavía no tenés ejercicios',
  },
  render: enCaja,
};
