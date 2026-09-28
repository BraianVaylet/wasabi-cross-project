import type { Meta, StoryObj } from '@storybook/react-vite';
import { Wordmark } from './Wordmark.tsx';

const meta = {
  title: 'Cross/Wordmark',
  component: Wordmark,
} satisfies Meta<typeof Wordmark>;

export default meta;
type Story = StoryObj<typeof meta>;

/** El del header del diseño. */
export const Header: Story = { args: { subtitle: 'Fuerza · Registro de RM' } };

/** El del splash. */
export const Splash: Story = { args: { size: 'large', subtitle: 'Fuerza · Registro de RM' } };
