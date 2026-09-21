import type { Meta, StoryObj } from '@storybook/react-vite';
import { Select } from './Select.tsx';

const meta = {
  title: 'Cross/Select',
  component: Select,
} satisfies Meta<typeof Select>;

export default meta;
type Story = StoryObj<typeof meta>;

const niveles = (
  <>
    <option value="" disabled>
      Elegí uno
    </option>
    <option value="principiante">Principiante</option>
    <option value="intermedio">Intermedio</option>
    <option value="avanzado">Avanzado</option>
    <option value="elite">Elite</option>
  </>
);

export const Nivel: Story = {
  args: { label: 'Nivel', defaultValue: '', children: niveles },
};

export const ConError: Story = {
  args: { label: 'Nivel', defaultValue: '', error: 'Elegí un nivel', children: niveles },
};
