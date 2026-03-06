import type { ButtonHTMLAttributes, PropsWithChildren } from 'react';

type Variant = 'primary' | 'secondary' | 'danger';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

const variantClassMap: Record<Variant, string> = {
  primary: 'bg-blue-600 text-white hover:bg-blue-500',
  secondary: 'bg-slate-200 text-slate-700 hover:bg-slate-300',
  danger: 'bg-rose-600 text-white hover:bg-rose-500'
};

export function Button({ children, className = '', variant = 'primary', ...props }: PropsWithChildren<ButtonProps>) {
  return (
    <button
      className={`rounded-md px-3 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${variantClassMap[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
