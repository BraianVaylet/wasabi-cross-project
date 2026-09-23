import type { MeasureKind, RecordInput } from '@wasabi-cross/schemas';
import { Button, Drawer, TextArea, TextField } from '@wasabi-cross/ui';
import { useState } from 'react';
import { autoColon } from '../../lib/format.ts';
import {
  ELEVATION_FIELD,
  elevationError,
  extraFieldKindFor,
  MARK_FIELD,
  markValueError,
  parseMarkValue,
  parsePlainNumber,
  performedAtFrom,
  today,
  WEIGHT_FIELD,
  weightError,
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
  const [extra, setExtra] = useState('');
  const [date, setDate] = useState('');
  const [notes, setNotes] = useState('');
  const [valueError, setValueError] = useState<string | null>(null);
  const [extraError, setExtraError] = useState<string | null>(null);

  const field = MARK_FIELD[kind];
  const extraKind = extraFieldKindFor(kind);
  const extraField = extraKind === 'weightKg' ? WEIGHT_FIELD : ELEVATION_FIELD;

  const close = () => {
    setValue('');
    setExtra('');
    setDate('');
    setNotes('');
    setValueError(null);
    setExtraError(null);
    onClose();
  };

  const submit = () => {
    const parsed = parseMarkValue(kind, value);
    if (parsed === null) {
      setValueError(markValueError(kind));
      return;
    }

    const extraParsed = extraKind === null ? null : parsePlainNumber(extra);
    if (extraKind !== null && extraParsed === null) {
      setExtraError(extraKind === 'weightKg' ? weightError : elevationError);
      return;
    }

    const performedAt = performedAtFrom(date);
    const comment = notes.trim();
    onSave({
      value: parsed,
      ...(performedAt === undefined ? {} : { performedAt }),
      ...(comment === '' ? {} : { notes: comment }),
      ...(extraKind === null || extraParsed === null ? {} : { [extraKind]: extraParsed }),
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
            setValue(kind === 'time' ? autoColon(event.target.value) : event.target.value);
            setValueError(null);
          }}
        />

        {extraKind === null ? null : (
          <TextField
            label={extraField.label}
            placeholder={extraField.placeholder}
            inputMode="decimal"
            value={extra}
            error={extraError ?? undefined}
            onChange={(event) => {
              setExtra(event.target.value);
              setExtraError(null);
            }}
          />
        )}

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
