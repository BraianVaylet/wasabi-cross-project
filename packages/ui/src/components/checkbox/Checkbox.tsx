import type { InputHTMLAttributes } from 'react';
import './Checkbox.css';

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
}

/**
 * Casilla con su texto al lado, como el "with pain" del mockup 9. El label envuelve al
 * input: tocar el texto también la marca, que en un celular es la diferencia.
 */
export function Checkbox({ label, className, ...rest }: CheckboxProps): React.JSX.Element {
  return (
    <label className={['wc-checkbox', className].filter(Boolean).join(' ')}>
      <input type="checkbox" className="wc-checkbox__input" {...rest} />
      <span>{label}</span>
    </label>
  );
}
