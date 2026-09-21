import type { MeasureKind, RecordInput } from '@wasabi-cross/schemas';
import { Button, Drawer, TextArea, TextField } from '@wasabi-cross/ui';
import { useState } from 'react';
import {
  MARK_FIELD,
  markValueError,
  parseMarkValue,
  performedAtFrom,
  today,
} from '../../lib/mark-input.ts';
import './new-mark.css';

export interface NewMarkProps {
  kind: MeasureKind;
  open: boolean;
  onClose: () => void;
  onSave: (input: RecordInput) => void;
}

/** "Nuevo RM" en fuerza; "Nueva marca" en el resto (leyenda del mockup 12). */
export function newMarkLabel(kind: MeasureKind): string {
  return kind === 'rm' ? 'Nuevo RM' : 'Nueva marca';
}

/**
 * El modal del mockup 11: valor, fecha y comentarios. Lo que la API pueda rechazar se
 * muestra en la pantalla de atrás: acá el guardado cierra la hoja y sigue de largo.
 */
export function NewMark({ kind, open, onClose, onSave }: NewMarkProps): React.JSX.Element {
  const [value, setValue] = useState('');
  const [date, setDate] = useState('');
  const [notes, setNotes] = useState('');
  const [valueError, setValueError] = useState<string | null>(null);

  const field = MARK_FIELD[kind];

  const close = () => {
    setValue('');
    setDate('');
    setNotes('');
    setValueError(null);
    onClose();
  };

  const submit = () => {
    const parsed = parseMarkValue(kind, value);
    if (parsed === null) {
      setValueError(markValueError(kind));
      return;
    }

    const performedAt = performedAtFrom(date);
    const comment = notes.trim();
    onSave({
      value: parsed,
      ...(performedAt === undefined ? {} : { performedAt }),
      ...(comment === '' ? {} : { notes: comment }),
    });
    close();
  };

  return (
    <Drawer
      open={open}
      placement="bottom"
      label={newMarkLabel(kind)}
      closeLabel="Cerrar"
      onClose={close}
    >
      <h2 className="new-mark__title">{newMarkLabel(kind)}</h2>

      <form
        className="new-mark__form"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <TextField
          label={field.label}
          placeholder={field.placeholder}
          inputMode={kind === 'time' ? 'text' : 'decimal'}
          value={value}
          error={valueError ?? undefined}
          onChange={(event) => {
            setValue(event.target.value);
            setValueError(null);
          }}
        />

        <TextField
          label="Fecha"
          type="date"
          max={today()}
          value={date}
          onChange={(event) => {
            setDate(event.target.value);
          }}
        />

        <TextArea
          label="Comentarios (opcional)"
          value={notes}
          onChange={(event) => {
            setNotes(event.target.value);
          }}
        />

        <div className="new-mark__actions">
          <Button variant="ghost" onClick={close}>
            Cancelar
          </Button>
          <Button type="submit">Guardar</Button>
        </div>
      </form>
    </Drawer>
  );
}
