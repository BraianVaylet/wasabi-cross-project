import type { Meta, StoryObj } from '@storybook/react-vite';
import { Logo } from './Logo.tsx';

const meta = {
  title: 'Cross/Logo',
  component: Logo,
} satisfies Meta<typeof Logo>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Header: Story = { args: { size: 'small' } };

/** El del splash (mockup 1). */
export const Splash: Story = { args: { size: 'large' } };
