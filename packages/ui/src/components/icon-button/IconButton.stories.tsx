import type { Meta, StoryObj } from '@storybook/react-vite';
import { IconButton } from './IconButton.tsx';
import { MenuIcon } from '../icons/icons.tsx';

const meta = {
  title: 'Cross/IconButton',
  component: IconButton,
} satisfies Meta<typeof IconButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Menu: Story = {
  args: { label: 'Abrir menú', children: <MenuIcon /> },
};
