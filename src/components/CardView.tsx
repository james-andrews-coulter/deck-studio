import type { Card as CardT, FieldMapping } from '@/lib/types';
import { resolveCard } from '@/lib/cardFields';

type Props = { card: CardT; mapping: FieldMapping; className?: string };

export function CardView({ card, mapping, className }: Props) {
  const r = resolveCard(card, mapping);
  return (
    <article className={`rounded-xl border bg-white p-4 shadow-sm dark:bg-slate-900 ${className ?? ''}`}>
      {r.image && <img src={r.image} alt="" className="mb-3 max-h-48 w-full rounded-md object-cover" />}
      <h3 className="text-lg font-semibold leading-tight">{r.title || <span className="italic text-muted-foreground">(no title)</span>}</h3>
      {r.subtitle && <p className="mt-0.5 text-sm text-muted-foreground">{r.subtitle}</p>}
      {r.body && <p className="mt-2 whitespace-pre-wrap text-sm">{r.body}</p>}
      {r.meta.length > 0 && (
        <dl className="mt-3 space-y-0.5 text-xs text-muted-foreground">
          {r.meta.map((m) => (
            <div key={m.key} className="flex gap-2">
              <dt className="font-medium">{m.key}:</dt>
              <dd>{m.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </article>
  );
}
