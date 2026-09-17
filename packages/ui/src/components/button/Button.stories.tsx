import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from './Button.tsx';

const meta = {
  title: 'Cross/Button',
  component: Button,
  args: { children: 'New Exercice' },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {};

export const Secondary: Story = {
  args: { variant: 'secondary', children: 'All history' },
};

export const Ghost: Story = {
  args: { variant: 'ghost', children: 'Ver estadísticas' },
};

export const Danger: Story = {
  args: { variant: 'danger', children: 'Borrar ejercicio' },
};

export const Disabled: Story = {
  args: { disabled: true, children: 'Alcanzaste el límite de tu plan' },
};

/** Como el "New Exercice" del mockup de Home: ancho completo, al pie de la lista. */
export const Block: Story = {
  args: { block: true },
};
