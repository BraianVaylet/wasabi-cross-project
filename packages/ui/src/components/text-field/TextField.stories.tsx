import type { Decorator, Meta, StoryObj } from '@storybook/react-vite';
import { TextField } from './TextField.tsx';

/** El ancho de la columna del diseño. */
const narrow: Decorator = (Story) => (
  <div style={{ maxWidth: 'var(--wc-column-max)' }}>
    <Story />
  </div>
);

const meta = {
  title: 'Cross/TextField',
  component: TextField,
  args: { label: 'Email', placeholder: 'vos@ejemplo.com' },
} satisfies Meta<typeof TextField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithSuffix: Story = {
  args: { label: 'Peso', placeholder: 'Ej: 60', suffix: 'kg', inputMode: 'decimal' },
};

/** El "PORCENTAJE PERSONALIZADO" del diseño: en línea, subrayado en naranja. */
export const Inline: Story = {
  args: {
    label: 'Porcentaje personalizado',
    variant: 'inline',
    suffix: '%',
    placeholder: '—',
    inputMode: 'numeric',
  },
  decorators: [narrow],
};

export const InlineWithError: Story = {
  args: {
    ...Inline.args,
    label: 'Porcentaje personalizado',
    defaultValue: '180',
    error: 'Tiene que ser un porcentaje entre 1 y 100.',
  },
  decorators: [narrow],
};

export const WithError: Story = {
  args: { error: 'El valor cargado no es válido.', defaultValue: 'no-es-un-email' },
};

export const Disabled: Story = {
  args: { disabled: true, defaultValue: 'vos@ejemplo.com' },
};
