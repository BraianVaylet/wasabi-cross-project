import { useId } from 'react';
import '../../styles/forms.css';
import './RadioGroup.css';

export interface RadioOption<TValue extends string> {
  value: TValue;
  label: string;
}

export interface RadioGroupProps<TValue extends string> {
  legend: string;
  /** Une las opciones: es lo que hace que las flechas del teclado recorran el grupo. */
  name: string;
  options: readonly RadioOption<TValue>[];
  value?: TValue | undefined;
  onChange: (value: TValue) => void;
  error?: string | undefined;
  disabled?: boolean;
}

/** Elegir una de varias (la categoría del mockup 9), como un grupo y no como radios sueltas. */
export function RadioGroup<TValue extends string>({
  legend,
  name,
  options,
  value,
  onChange,
  error,
  disabled = false,
}: RadioGroupProps<TValue>): React.JSX.Element {
  const id = useId();
  const errorId = `${id}-error`;

  return (
    <fieldset
      className={['wc-radio-group', error ? 'wc-radio-group--invalid' : '']
        .filter(Boolean)
        .join(' ')}
      aria-describedby={error ? errorId : undefined}
      disabled={disabled}
    >
      <legend className="wc-field-label wc-radio-group__legend">{legend}</legend>

      <div className="wc-radio-group__options">
        {options.map((option) => (
          <label key={option.value} className="wc-choice-tile">
            <input
              type="radio"
              className="wc-choice"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => {
                onChange(option.value);
              }}
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>

      {error ? (
        <p id={errorId} className="wc-field-error" role="alert">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}
