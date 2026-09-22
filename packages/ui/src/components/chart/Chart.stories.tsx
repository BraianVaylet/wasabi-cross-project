import type { Meta, StoryObj } from '@storybook/react-vite';
import { Chart } from './Chart.tsx';

const EVOLUCION = [
  { label: '10/01/2026', value: 90 },
  { label: '12/02/2026', value: 95 },
  { label: '03/04/2026', value: 102.5 },
  { label: '18/05/2026', value: 110 },
  { label: '23/06/2026', value: 120 },
];

const meta = {
  title: 'Cross/Chart',
  component: Chart,
} satisfies Meta<typeof Chart>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Todas se ven en una caja angosta, como en un teléfono. */
function enCaja(args: React.ComponentProps<typeof Chart>): React.JSX.Element {
  return (
    <div className="wc-root" style={{ padding: '1rem', maxWidth: '26rem' }}>
      <Chart {...args} />
    </div>
  );
}

/** La curva del mockup 10. Los números exactos están en la tabla, que no se ve pero se lee. */
export const Evolucion: Story = {
  args: { label: 'Evolución de Back squat', unit: 'kg', points: EVOLUCION },
  render: enCaja,
};

/** Un tiempo baja cuando mejora: la curva no sabe de eso, sólo dibuja lo que le dan. */
export const Tiempo: Story = {
  args: {
    label: 'Evolución de Carrera 1 km',
    unit: 's',
    points: [
      { label: '10/01/2026', value: 320 },
      { label: '12/03/2026', value: 300 },
      { label: '23/06/2026', value: 272 },
    ],
  },
  render: enCaja,
};

export const UnaSolaMarca: Story = {
  args: { label: 'Evolución de Clean', unit: 'kg', points: [{ label: '23/06/2026', value: 70 }] },
  render: enCaja,
};

export const SinMarcas: Story = {
  args: { label: 'Evolución de Snatch', unit: 'kg', points: [] },
  render: enCaja,
};
