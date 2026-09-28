import type { Meta, StoryObj } from '@storybook/react-vite';
import { AppHeader } from './AppHeader.tsx';
import { IconButton } from '../icon-button/IconButton.tsx';
import { MenuIcon } from '../icons/icons.tsx';
import { Logo } from '../logo/Logo.tsx';
import { Wordmark } from '../wordmark/Wordmark.tsx';

const meta = {
  title: 'Cross/AppHeader',
  component: AppHeader,
} satisfies Meta<typeof AppHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

/** El header del diseño, con el botón de menú que el diseño no muestra (spec §5.2). */
export const Diseno: Story = {
  args: {
    brand: (
      <a href="#home">
        <Logo />
        <Wordmark subtitle="Fuerza · Registro de RM" />
      </a>
    ),
    actions: (
      <IconButton label="Abrir menú">
        <MenuIcon />
      </IconButton>
    ),
  },
  render: (args) => (
    <div style={{ maxWidth: 'var(--wc-column-max)' }}>
      <AppHeader {...args} />
    </div>
  ),
};
