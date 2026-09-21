import type { Meta, StoryObj } from '@storybook/react-vite';
import { Skeleton } from './Skeleton.tsx';

const meta = {
  title: 'Cross/Skeleton',
  component: Skeleton,
} satisfies Meta<typeof Skeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

/** El hueco de la lista de Home mientras llega (mockup 4). */
export const Lista: Story = {
  args: { label: 'Cargando tus ejercicios', count: 4 },
  render: (args) => (
    <div className="wc-root" style={{ padding: '1rem', maxWidth: '26rem' }}>
      <Skeleton {...args} />
    </div>
  ),
};
