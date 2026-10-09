import type { Meta, StoryObj } from '@storybook/react-vite';
import { Avatar } from './Avatar.tsx';

/** Una foto de mentira, un cuadrado de color: sin pedir nada a la red. */
const FOTO =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 10 10'><rect width='10' height='10' fill='%23a76ef8'/><circle cx='5' cy='4' r='2' fill='%23fff'/><rect x='2' y='7' width='6' height='3' fill='%23fff'/></svg>";

const meta = {
  title: 'Cross/Avatar',
  component: Avatar,
  args: { name: 'Braian Vaylet' },
} satisfies Meta<typeof Avatar>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Sin foto: las iniciales de las dos primeras palabras. */
export const Initials: Story = {};

export const WithPhoto: Story = {
  args: { src: FOTO },
};

/** El tamaño del Perfil, arriba de todo. */
export const Large: Story = {
  args: { size: 'lg', src: FOTO },
};

export const LargeInitials: Story = {
  args: { size: 'lg', name: 'Ana' },
};

/** La foto que no carga (la API contesta 404): cae a las iniciales, sin ícono roto. */
export const BrokenPhoto: Story = {
  args: { size: 'lg', src: '/esta-foto-no-existe.png' },
};
