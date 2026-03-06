import type { InputHTMLAttributes } from 'react';

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  variant?: 'default';
}

export function Input({ className = '', variant: _variant = 'default', ...rest }: Props) {
  return <input className={`input ${className}`.trim()} {...rest} />;
}
