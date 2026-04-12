import { useParams } from 'react-router-dom';
import { useAppStore } from '@/store';
import { CardView } from '@/components/CardView';
import { CardDetailSheet } from '@/components/CardDetailSheet';
import { InlineRenameHeading } from '@/components/InlineRenameHeading';

export default function ListScreen() {
  const { listId = '' } = useParams();
  const list = useAppStore((s) => s.lists[listId]);
  const deck = useAppStore((s) => (list ? s.decks[list.deckId] : undefined));
  const setCardDetail = useAppStore((s) => s.setCardDetail);

  if (!list) return <div className="p-6">List not found.</div>;
  if (!deck) return <div className="p-6">This list's deck is missing. Re-import it or delete the list.</div>;

  const byGroup = new Map<string | null, typeof list.cardRefs>();
  for (const r of list.cardRefs) {
    if (r.hidden) continue;
    const key = r.groupId;
    const bucket = byGroup.get(key) ?? [];
    bucket.push(r);
    byGroup.set(key, bucket);
  }

  return (
    <div className="p-4 md:p-6">
      <header className="flex items-center gap-2">
        <InlineRenameHeading
          value={list.name}
          onChange={(next) => useAppStore.getState().renameList(list.id, next)}
        />
      </header>

      {list.groups.map((g) => {
        const rows = byGroup.get(g.id) ?? [];
        if (!rows.length) return null;
        return (
          <section key={g.id} className="mt-6">
            <h3 className="mb-2 text-sm font-semibold uppercase text-muted-foreground">{g.name}</h3>
            <ul className="space-y-2">
              {rows.map((r) => {
                const card = deck.cards.find((c) => c.id === r.cardId);
                if (!card) return <li key={r.cardId} className="rounded border p-2 text-sm italic text-muted-foreground">Missing card</li>;
                return (
                  <li key={r.cardId}>
                    <button
                      type="button"
                      className="w-full text-left"
                      onClick={() => setCardDetail({ listId: list.id, cardId: r.cardId })}
                    >
                      <CardView card={card} mapping={deck.fieldMapping} />
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}

      {(byGroup.get(null)?.length ?? 0) > 0 && (
        <section className="mt-6">
          <h3 className="mb-2 text-sm font-semibold uppercase text-muted-foreground">(Ungrouped)</h3>
          <ul className="space-y-2">
            {byGroup.get(null)!.map((r) => {
              const card = deck.cards.find((c) => c.id === r.cardId);
              if (!card) return <li key={r.cardId} className="rounded border p-2 text-sm italic text-muted-foreground">Missing card</li>;
              return (
                <li key={r.cardId}>
                  <button
                    type="button"
                    className="w-full text-left"
                    onClick={() => setCardDetail({ listId: list.id, cardId: r.cardId })}
                  >
                    <CardView card={card} mapping={deck.fieldMapping} />
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <CardDetailSheet listId={list.id} />
    </div>
  );
}
