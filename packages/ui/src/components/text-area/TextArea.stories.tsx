import type { Meta, StoryObj } from '@storybook/react-vite';
import { TextArea } from './TextArea.tsx';

const meta = {
  title: 'Cross/TextArea',
  component: TextArea,
} satisfies Meta<typeof TextArea>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Comentarios: Story = {
  args: { label: 'Comentarios', placeholder: 'Ej: molestia en el hombro' },
};

export const ConError: Story = {
  args: { label: 'Comentarios', error: 'Como máximo 500 caracteres' },
};
