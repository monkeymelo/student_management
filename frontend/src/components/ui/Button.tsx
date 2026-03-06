import type { ButtonHTMLAttributes } from 'react';

type Variant = 'default' | 'secondary' | 'danger';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

const variantClass: Record<Variant, string> = {
  default: 'btn btn-default',
  secondary: 'btn btn-secondary',
  danger: 'btn btn-danger'
};

export function Button({ variant = 'default', className = '', ...rest }: Props) {
  return <button className={`${variantClass[variant]} ${className}`.trim()} {...rest} />;
}
