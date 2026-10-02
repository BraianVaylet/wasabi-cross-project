import { useId, type InputHTMLAttributes, type ReactNode } from 'react';
import '../../styles/forms.css';
import './TextField.css';

export interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> {
  label: string;
  /** Mensaje de error del campo. Su presencia es lo que marca el campo como inválido. */
  error?: string | undefined;
  /** Aclaración debajo del campo: qué se espera que se escriba. La lee el lector de pantalla. */
  hint?: string | undefined;
  /** Unidad o símbolo a la derecha, como el "%" del porcentaje personalizado. */
  suffix?: ReactNode;
  /**
   * `stacked` es el de siempre: el label arriba, la caja abajo. `inline` es el "PORCENTAJE
   * PERSONALIZADO" del diseño: una caja con el label a la izquierda y un campo corto,
   * subrayado en naranja, a la derecha.
   */
  variant?: 'stacked' | 'inline';
}

/**
 * Campo de texto con su label asociado. El label no es opcional a propósito: un input
 * sin label es la falla de accesibilidad más repetida y la más fácil de evitar.
 */
export function TextField({
  label,
  error,
  hint,
  suffix,
  variant = 'stacked',
  className,
  ...rest
}: TextFieldProps): React.JSX.Element {
  const id = useId();
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ');

  const classes = [
    'wc-text-field',
    variant === 'inline' ? 'wc-text-field--inline' : '',
    error ? 'wc-text-field--invalid' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classes}>
      <div className="wc-text-field__field">
        <label className="wc-field-label wc-text-field__label" htmlFor={id}>
          {label}
        </label>

        <div className="wc-text-field__control">
          <input
            id={id}
            className="wc-text-field__input"
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy || undefined}
            {...rest}
          />
          {suffix ? <span className="wc-text-field__suffix">{suffix}</span> : null}
        </div>
      </div>

      {hint ? (
        <p id={hintId} className="wc-field-hint">
          {hint}
        </p>
      ) : null}

      {error ? (
        // role="alert" para que el lector de pantalla lo anuncie al aparecer.
        <p id={errorId} className="wc-field-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
