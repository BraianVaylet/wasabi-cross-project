import type { Meta, StoryObj } from '@storybook/react-vite';
import { Card } from './Card.tsx';

const meta = {
  title: 'Cross/Card',
  component: Card,
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

const row = (date: string, value: string, label?: string) => (
  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
    <span>
      <span style={{ display: 'block' }}>{date}</span>
      {label ? (
        <span className="wc-kicker" style={{ color: 'var(--wc-danger-on-subtle)' }}>
          {label}
        </span>
      ) : null}
    </span>
    <span className="wc-display" style={{ fontSize: '2rem' }}>
      {value}
    </span>
  </span>
);

export const Plain: Story = {
  args: { children: 'Back SQ · RM del 23/06/2026' },
};

/** Con onClick se renderiza como botón, para que ande con teclado. */
export const Clickable: Story = {
  args: {
    children: 'Back SQ · 100 kg',
    onClick: () => undefined,
  },
};

/** La marca actual en el historial del diseño. */
export const Current: Story = {
  args: { variant: 'current', children: row('23/06/2026', '100 KG', 'RM actual') },
};

/** Las marcas anteriores del mismo historial. */
export const Past: Story = {
  args: { variant: 'past', children: row('23/02/2026', '80 KG') },
};

/** El historial completo, como en el diseño. */
export const History: Story = {
  args: { children: null },
  render: () => (
    <div style={{ display: 'grid', gap: '0.5rem', maxWidth: '390px' }}>
      <Card variant="current">{row('23/06/2026', '100 KG', 'RM actual')}</Card>
      <Card variant="past">{row('23/02/2026', '80 KG')}</Card>
      <Card variant="past">{row('02/06/2025', '60 KG')}</Card>
    </div>
  ),
};
