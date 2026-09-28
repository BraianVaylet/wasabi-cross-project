import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Tabs } from './Tabs.tsx';

const MODOS = [
  { value: 'catalogo', label: 'Catálogo' },
  { value: 'crear', label: 'Crear' },
] as const;

const meta = {
  title: 'Cross/Tabs',
  component: Tabs,
} satisfies Meta<typeof Tabs<string>>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Las dos pestañas del alta de un ejercicio (spec §5.3). Las flechas mueven el foco; Enter
 * o Espacio activan.
 */
export const AltaDeEjercicio: Story = {
  args: {
    label: 'Cómo agregar el ejercicio',
    tabs: MODOS,
    value: 'catalogo',
    onChange: () => undefined,
    children: null,
  },
  render: function AltaDeEjercicio(args) {
    const [value, setValue] = useState('catalogo');

    return (
      <div className="wc-root" style={{ padding: '1rem', maxWidth: '430px' }}>
        <Tabs {...args} value={value} onChange={setValue}>
          <p>
            {value === 'catalogo'
              ? 'Buscá un ejercicio precargado.'
              : 'Cargá un ejercicio propio, campo por campo.'}
          </p>
        </Tabs>
      </div>
    );
  },
};
