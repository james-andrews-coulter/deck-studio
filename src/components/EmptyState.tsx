import type { ReactNode } from 'react';

type Props = { title: string; body?: string; action?: ReactNode };

export function EmptyState({ title, body, action }: Props) {
  return (
    <div className="flex flex-col items-center gap-3 p-10 text-center text-muted-foreground">
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      {body && <p className="max-w-sm">{body}</p>}
      {action}
    </div>
  );
}
