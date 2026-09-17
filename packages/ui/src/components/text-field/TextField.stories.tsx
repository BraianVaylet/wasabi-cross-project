import type { Meta, StoryObj } from '@storybook/react-vite';
import { TextField } from './TextField.tsx';

const meta = {
  title: 'Cross/TextField',
  component: TextField,
  args: { label: 'Custom percentage', placeholder: 'Ej: 98' },
} satisfies Meta<typeof TextField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** El "%" del cálculo de porcentaje custom del mockup del ejercicio. */
export const WithSuffix: Story = {
  args: { suffix: '%', inputMode: 'numeric' },
};

export const WithError: Story = {
  args: { error: 'El valor cargado no es válido.', defaultValue: '-5' },
};

export const Disabled: Story = {
  args: { disabled: true, defaultValue: '98' },
};
