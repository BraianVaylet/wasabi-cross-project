import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { ThemeToggle } from './ThemeToggle.tsx';
import type { Theme } from '../../theme/theme.ts';

const meta = {
  title: 'Cross/ThemeToggle',
  component: ThemeToggle,
} satisfies Meta<typeof ThemeToggle>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Dark: Story = {
  args: { theme: 'dark', onToggle: () => undefined },
};

export const Light: Story = {
  args: { theme: 'light', onToggle: () => undefined },
};

/** El toggle no guarda estado: acá lo maneja la story, en la app lo maneja `useTheme`. */
export const Interactivo: Story = {
  args: { theme: 'dark', onToggle: () => undefined },
  render: function Interactivo() {
    const [theme, setTheme] = useState<Theme>('dark');

    return (
      <div data-theme={theme} className="wc-root" style={{ padding: '1rem' }}>
        <ThemeToggle
          theme={theme}
          onToggle={() => {
            setTheme((current) => (current === 'dark' ? 'light' : 'dark'));
          }}
        />
      </div>
    );
  },
};
