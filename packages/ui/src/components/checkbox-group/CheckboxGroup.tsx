import { useId } from 'react';
import './CheckboxGroup.css';

export interface CheckboxOption<TValue extends string> {
  value: TValue;
  label: string;
}

export interface CheckboxGroupProps<TValue extends string> {
  legend: string;
  options: readonly CheckboxOption<TValue>[];
  values: readonly TValue[];
  /** Recibe cómo queda la selección completa, no lo que cambió. */
  onChange: (values: TValue[]) => void;
  error?: string | undefined;
  disabled?: boolean;
}

/**
 * Elegir varias de varias, como las capacidades y los grupos musculares de un ejercicio
 * propio (mockup 9). Es un `fieldset` con su `legend`: un lector de pantalla anuncia el
 * grupo entero y no tres casillas sin contexto.
 */
export function CheckboxGroup<TValue extends string>({
  legend,
  options,
  values,
  onChange,
  error,
  disabled = false,
}: CheckboxGroupProps<TValue>): React.JSX.Element {
  const id = useId();
  const errorId = `${id}-error`;

  const toggle = (value: TValue) => {
    // El orden sigue al de las opciones: así dos selecciones iguales se ven iguales.
    const next = values.includes(value)
      ? values.filter((chosen) => chosen !== value)
      : options
          .map((option) => option.value)
          .filter((option) => values.includes(option) || option === value);

    onChange([...next]);
  };

  return (
    <fieldset
      className={['wc-checkbox-group', error ? 'wc-checkbox-group--invalid' : '']
        .filter(Boolean)
        .join(' ')}
      aria-describedby={error ? errorId : undefined}
      disabled={disabled}
    >
      <legend className="wc-checkbox-group__legend">{legend}</legend>

      <div className="wc-checkbox-group__options">
        {options.map((option) => (
          <label key={option.value} className="wc-checkbox-group__option">
            <input
              type="checkbox"
              className="wc-checkbox-group__input"
              value={option.value}
              checked={values.includes(option.value)}
              onChange={() => {
                toggle(option.value);
              }}
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>

      {error ? (
        <p id={errorId} className="wc-checkbox-group__error" role="alert">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}
