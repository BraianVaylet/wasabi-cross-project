import { useId, type ReactNode, type SelectHTMLAttributes } from 'react';
import './Select.css';

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'id'> {
  label: string;
  /** Mensaje de error del campo. Su presencia es lo que lo marca como inválido. */
  error?: string | undefined;
  children: ReactNode;
}

/** Lista desplegable con su label (el "Level" del mockup 9). Nativa: el teclado ya funciona. */
export function Select({
  label,
  error,
  className,
  children,
  ...rest
}: SelectProps): React.JSX.Element {
  const id = useId();
  const errorId = `${id}-error`;

  return (
    <div
      className={['wc-select', error ? 'wc-select--invalid' : '', className]
        .filter(Boolean)
        .join(' ')}
    >
      <label className="wc-select__label" htmlFor={id}>
        {label}
      </label>

      <select
        id={id}
        className="wc-select__input"
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        {...rest}
      >
        {children}
      </select>

      {error ? (
        <p id={errorId} className="wc-select__error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
