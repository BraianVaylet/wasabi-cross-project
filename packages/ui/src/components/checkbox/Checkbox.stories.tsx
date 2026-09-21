import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Checkbox } from './Checkbox.tsx';

const meta = {
  title: 'Cross/Checkbox',
  component: Checkbox,
} satisfies Meta<typeof Checkbox>;

export default meta;
type Story = StoryObj<typeof meta>;

/** El "con dolor" del mockup 9. Tocar el texto también la marca. */
export const ConDolor: Story = {
  args: { label: 'Con dolor' },
  render: function ConDolor(args) {
    const [checked, setChecked] = useState(false);

    return (
      <div className="wc-root" style={{ padding: '1rem' }}>
        <Checkbox
          {...args}
          checked={checked}
          onChange={(event) => {
            setChecked(event.target.checked);
          }}
        />
      </div>
    );
  },
};
