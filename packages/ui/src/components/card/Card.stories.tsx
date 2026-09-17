import type { Meta, StoryObj } from '@storybook/react-vite';
import { Card } from './Card.tsx';
import { Tag } from '../tag/Tag.tsx';

const meta = {
  title: 'Cross/Card',
  component: Card,
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { children: 'Back SQ · RM from 23/06/2026' },
};

/** Con onClick se renderiza como botón, para que ande con teclado. */
export const Clickable: Story = {
  args: {
    children: 'Back SQ · 100 kg',
    onClick: () => undefined,
  },
};

/** El RM vigente en el historial del ejercicio. */
export const Highlighted: Story = {
  args: {
    highlighted: true,
    children: (
      <span style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
        23/06/2026 <Tag variant="solid">current</Tag> 100 kg
      </span>
    ),
  },
};
