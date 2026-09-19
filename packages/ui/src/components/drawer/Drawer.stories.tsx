import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Drawer } from './Drawer.tsx';
import { IconButton } from '../icon-button/IconButton.tsx';
import { MenuIcon } from '../icons/icons.tsx';

const meta = {
  title: 'Cross/Drawer',
  component: Drawer,
} satisfies Meta<typeof Drawer>;

export default meta;
type Story = StoryObj<typeof meta>;

/** El menú del mockup 4a. Probalo con teclado: el foco no sale, y Escape lo cierra. */
export const Menu: Story = {
  args: { open: false, label: 'Menú principal', onClose: () => undefined, children: null },
  render: function Menu() {
    const [open, setOpen] = useState(false);

    return (
      <div className="wc-root" style={{ minHeight: '24rem', padding: '1rem' }}>
        <IconButton
          label="Abrir menú"
          aria-expanded={open}
          onClick={() => {
            setOpen(true);
          }}
        >
          <MenuIcon />
        </IconButton>
        <Drawer
          open={open}
          label="Menú principal"
          closeLabel="Cerrar menú"
          onClose={() => {
            setOpen(false);
          }}
        >
          <nav aria-label="Principal">
            <a className="wc-drawer__item" href="#ejercicios" aria-current="page">
              Tus ejercicios
            </a>
            <a className="wc-drawer__item" href="#perfil">
              Perfil
            </a>
          </nav>
          <div className="wc-drawer__footer">
            <button type="button" className="wc-drawer__item">
              Cerrar sesión
            </button>
          </div>
        </Drawer>
      </div>
    );
  },
};
