import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from '../button/Button.tsx';
import { Measure } from '../measure/Measure.tsx';
import { Tag } from '../tag/Tag.tsx';
import { BottomBar } from './BottomBar.tsx';

const meta = {
  title: 'Cross/BottomBar',
  component: BottomBar,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof BottomBar>;

export default meta;
type Story = StoryObj<typeof meta>;

const load = (
  <>
    <div style={{ minWidth: 0 }}>
      <p className="wc-kicker" style={{ margin: 0, color: 'var(--wc-text)' }}>
        65% de 100 kg
      </p>
      <Measure value={65} unit="kg" size="hero" tone="accent" />
      <p style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', margin: '0.25rem 0 0' }}>
        <span className="wc-kicker">Carga calculada</span>
        <Tag variant="success">Carga liviana</Tag>
      </p>
    </div>
    <Button variant="cta" style={{ minHeight: '62px', textAlign: 'left' }}>
      Registrar
      <br />
      nuevo RM
    </Button>
  </>
);

/** La barra del diseño: la carga calculada, su banda y la acción principal. */
export const Load: Story = {
  args: { label: 'Carga seleccionada', children: load },
};

/** Con contenido más largo que la pantalla: el último renglón queda arriba de la barra. */
export const LongPage: Story = {
  args: { label: 'Carga seleccionada', children: load },
  render: (args) => (
    <div style={{ maxWidth: '390px', margin: '0 auto', padding: '1rem 1.25rem 0' }}>
      {Array.from({ length: 40 }, (_, index) => (
        <p key={index} style={{ margin: '0 0 0.5rem' }}>
          Renglón {index + 1}
        </p>
      ))}
      <p style={{ margin: 0, color: 'var(--wc-accent-text)' }}>Último renglón: se ve entero.</p>
      <BottomBar {...args} />
    </div>
  ),
};
