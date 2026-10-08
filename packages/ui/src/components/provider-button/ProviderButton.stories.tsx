import type { Meta, StoryObj } from '@storybook/react-vite';
import { ProviderButton } from './ProviderButton.tsx';

const meta = {
  title: 'Cross/ProviderButton',
  component: ProviderButton,
  args: { provider: 'google', children: 'Continuar con Google' },
  // La columna de la pantalla de ingreso: los botones van a todo su ancho.
  render: (args) => (
    <div style={{ maxWidth: '390px' }}>
      <ProviderButton {...args} />
    </div>
  ),
} satisfies Meta<typeof ProviderButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Google: Story = {};

export const Microsoft: Story = {
  args: { provider: 'microsoft', children: 'Continuar con Microsoft' },
};

/** El proveedor sin marca: el ingreso de desarrollo, que sólo existe fuera de producción. */
export const Generic: Story = {
  args: { provider: 'generic', children: 'Continuar con Ingreso de desarrollo' },
};

/** Mientras se pide la URL del proveedor: deshabilitado, para que no se apriete dos veces. */
export const Disabled: Story = {
  args: { disabled: true, 'aria-busy': true },
};

/** Los tres juntos, como los apila la pantalla de ingreso. */
export const Stack: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <ProviderButton provider="google">Continuar con Google</ProviderButton>
      <ProviderButton provider="microsoft">Continuar con Microsoft</ProviderButton>
      <ProviderButton provider="generic">Continuar con Ingreso de desarrollo</ProviderButton>
    </div>
  ),
};
