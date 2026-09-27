import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from './Button.tsx';

const meta = {
  title: 'Cross/Button',
  component: Button,
  args: { children: 'Nuevo ejercicio' },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {};

export const Secondary: Story = {
  args: { variant: 'secondary', children: 'Ver más' },
};

export const Ghost: Story = {
  args: { variant: 'ghost', children: 'Cancelar' },
};

export const Danger: Story = {
  args: { variant: 'danger', children: 'Borrar ejercicio' },
};

/** El "Registrar nuevo RM" de la barra fija del diseño, en magenta. */
export const Cta: Story = {
  args: {
    variant: 'cta',
    children: (
      <>
        Registrar
        <br />
        nuevo RM
      </>
    ),
    style: { minHeight: '62px', paddingInline: '0.75rem', textAlign: 'left' },
  },
};

export const Disabled: Story = {
  args: { disabled: true, children: 'Alcanzaste el límite de tu plan' },
};

/** Como el "Nuevo ejercicio" de Home: ancho completo, al pie de la lista. */
export const Block: Story = {
  args: { block: true },
};

/** Todas juntas, para comparar el recorte y el foco (Tab) de cada una. */
export const Variants: Story = {
  render: () => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
      <Button>Guardar</Button>
      <Button variant="secondary">Ver más</Button>
      <Button variant="ghost">Cancelar</Button>
      <Button variant="danger">Borrar</Button>
      <Button variant="cta">Registrar nuevo RM</Button>
    </div>
  ),
};
