import type { Meta, StoryObj } from '@storybook/react-vite';
import { Measure } from './Measure.tsx';

const meta = {
  title: 'Cross/Measure',
  component: Measure,
  args: { value: 100, unit: 'kg' },
} satisfies Meta<typeof Measure>;

export default meta;
type Story = StoryObj<typeof meta>;

/** El historial: 30px. */
export const Medium: Story = {};

/** El valor actual del detalle: 38px. */
export const Large: Story = {
  args: { size: 'lg' },
};

/** La carga calculada de la barra fija: 58px, en lima. */
export const Hero: Story = {
  args: { value: 65, size: 'hero', tone: 'accent' },
};

/** El aumento del progreso: 20px, en lima. */
export const Small: Story = {
  args: { value: '+40', size: 'sm', tone: 'accent' },
};

/** Un tiempo: sin unidad. */
export const Time: Story = {
  args: { value: '4:32', unit: undefined, size: 'lg' },
};
