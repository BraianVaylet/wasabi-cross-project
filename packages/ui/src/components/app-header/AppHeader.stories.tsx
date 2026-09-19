import type { Meta, StoryObj } from '@storybook/react-vite';
import { AppHeader } from './AppHeader.tsx';
import { IconButton } from '../icon-button/IconButton.tsx';
import { MenuIcon } from '../icons/icons.tsx';
import { Logo } from '../logo/Logo.tsx';
import { ThemeToggle } from '../theme-toggle/ThemeToggle.tsx';

const meta = {
  title: 'Cross/AppHeader',
  component: AppHeader,
} satisfies Meta<typeof AppHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

/** El header del mockup 4: logo y nombre, tema y menú. */
export const Mockup4: Story = {
  args: {
    brand: (
      <a href="#home">
        <Logo />
        Wasabi Cross
      </a>
    ),
    actions: (
      <>
        <ThemeToggle theme="dark" onToggle={() => undefined} />
        <IconButton label="Abrir menú">
          <MenuIcon />
        </IconButton>
      </>
    ),
  },
  render: (args) => (
    <div className="wc-root" style={{ padding: '1rem' }}>
      <AppHeader {...args} />
    </div>
  ),
};
