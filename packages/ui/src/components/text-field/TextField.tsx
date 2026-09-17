import { useId, type InputHTMLAttributes, type ReactNode } from 'react';
import './TextField.css';

export interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> {
  label: string;
  /** Mensaje de error del campo. Su presencia es lo que marca el campo como inválido. */
  error?: string;
  /** Unidad o símbolo a la derecha, como el "%" del porcentaje custom. */
  suffix?: ReactNode;
}

/**
 * Campo de texto con su label asociado. El label no es opcional a propósito: un input
 * sin label es la falla de accesibilidad más repetida y la más fácil de evitar.
 */
export function TextField({
  label,
  error,
  suffix,
  className,
  ...rest
}: TextFieldProps): React.JSX.Element {
  const id = useId();
  const errorId = `${id}-error`;

  const classes = ['wc-text-field', error ? 'wc-text-field--invalid' : '', className]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classes}>
      <label className="wc-text-field__label" htmlFor={id}>
        {label}
      </label>

      <div className="wc-text-field__control">
        <input
          id={id}
          className="wc-text-field__input"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          {...rest}
        />
        {suffix ? <span className="wc-text-field__suffix">{suffix}</span> : null}
      </div>

      {error ? (
        // role="alert" para que el lector de pantalla lo anuncie al aparecer.
        <p id={errorId} className="wc-text-field__error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
