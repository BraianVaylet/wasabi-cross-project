import type { Meta, StoryObj } from '@storybook/react-vite';
import { Tag } from './Tag.tsx';

const meta = {
  title: 'Cross/Tag',
  component: Tag,
  args: { children: 'Light load' },
} satisfies Meta<typeof Tag>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Outline: Story = {};

export const Solid: Story = {
  args: { variant: 'solid', children: 'current' },
};

export const Neutral: Story = {
  args: { variant: 'neutral', children: 'running' },
};

export const Danger: Story = {
  args: { variant: 'danger', children: 'Con dolor' },
};

export const Success: Story = {
  args: { variant: 'success', children: 'Esfuerzo bajo' },
};

export const Warning: Story = {
  args: { variant: 'warning', children: 'Esfuerzo medio' },
};
