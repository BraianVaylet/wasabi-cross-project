import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Button } from '../components/button/Button.tsx';
import { Checkbox } from '../components/checkbox/Checkbox.tsx';
import { CheckboxGroup } from '../components/checkbox-group/CheckboxGroup.tsx';
import { RadioGroup } from '../components/radio-group/RadioGroup.tsx';
import { Select } from '../components/select/Select.tsx';
import { TextArea } from '../components/text-area/TextArea.tsx';
import { TextField } from '../components/text-field/TextField.tsx';

/*
 * Todos los campos juntos, como en "Nuevo ejercicio" (mockup 9): para ver de un vistazo que
 * las etiquetas, las cajas y los casilleros son iguales entre sí (F4-03b).
 */
const meta = {
  title: 'Fundaciones/Formulario',
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

type Category = 'fuerza' | 'hipertrofia' | 'gimnastico' | 'running';
type Capacity = 'fuerza' | 'resistencia' | 'velocidad';

function Form(): React.JSX.Element {
  const [category, setCategory] = useState<Category>('fuerza');
  const [capacities, setCapacities] = useState<Capacity[]>(['fuerza']);

  return (
    <form
      style={{ display: 'grid', gap: '1rem', maxWidth: 'var(--wc-column-max)' }}
      onSubmit={(event) => {
        event.preventDefault();
      }}
    >
      <h1 style={{ margin: 0, fontSize: 'var(--wc-font-size-title)' }}>Nuevo ejercicio</h1>
      <TextField label="Nombre" placeholder="Ej: Clean, Back squat…" />
      <RadioGroup
        legend="Categoría"
        name="categoria"
        value={category}
        onChange={setCategory}
        options={[
          { value: 'fuerza', label: 'Fuerza' },
          { value: 'hipertrofia', label: 'Hipertrofia' },
          { value: 'gimnastico', label: 'Gimnástico' },
          { value: 'running', label: 'Running' },
        ]}
      />
      <CheckboxGroup
        legend="Capacidades"
        values={capacities}
        onChange={setCapacities}
        options={[
          { value: 'fuerza', label: 'Fuerza' },
          { value: 'resistencia', label: 'Resistencia' },
          { value: 'velocidad', label: 'Velocidad' },
        ]}
      />
      <TextField label="RM" placeholder="Ej: 100" suffix="kg" inputMode="decimal" />
      <TextField label="Fecha" type="date" />
      <Select label="Nivel" defaultValue="">
        <option value="" disabled>
          Elegí tu nivel
        </option>
        <option value="principiante">Principiante</option>
        <option value="intermedio">Intermedio</option>
      </Select>
      <TextArea label="Comentarios (opcional)" />
      <Checkbox label="Con dolor" />
      <TextField
        label="Porcentaje personalizado"
        variant="inline"
        suffix="%"
        placeholder="—"
        inputMode="numeric"
      />
      <Button type="submit" block>
        Guardar ejercicio
      </Button>
    </form>
  );
}

export const NuevoEjercicio: Story = {
  render: () => <Form />,
};
