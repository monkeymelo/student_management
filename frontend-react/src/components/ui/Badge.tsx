import type { PropsWithChildren } from 'react';

export function Badge({ children }: PropsWithChildren) {
  return <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">{children}</span>;
}
