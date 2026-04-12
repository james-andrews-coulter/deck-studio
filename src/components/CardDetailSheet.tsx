import { useAppStore } from '@/store';
import { CardView } from './CardView';
import { Button } from './ui/button';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from './ui/sheet';

type Props = { listId: string };

export function CardDetailSheet({ listId }: Props) {
  const active = useAppStore((s) => s.ui.activeCardDetail);
  const setCardDetail = useAppStore((s) => s.setCardDetail);
  const list = useAppStore((s) => s.lists[listId]);
  const deck = useAppStore((s) => (list ? s.decks[list.deckId] : undefined));
  const setHidden = useAppStore((s) => s.setHidden);
  const moveCardToGroup = useAppStore((s) => s.moveCardToGroup);
  const removeCard = useAppStore((s) => s.removeCard);

  const open = active?.listId === listId;
  const card = deck?.cards.find((c) => c.id === active?.cardId);
  const ref = list?.cardRefs.find((r) => r.cardId === active?.cardId);

  return (
    <Sheet open={!!open} onOpenChange={(o) => !o && setCardDetail(null)}>
      <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto">
        <SheetHeader><SheetTitle>Card</SheetTitle></SheetHeader>
        {card && deck && ref && (
          <div className="mt-3 space-y-4">
            <CardView card={card} mapping={deck.fieldMapping} />
            <div className="flex flex-wrap gap-2">
              <Button
                variant={ref.hidden ? 'default' : 'outline'}
                onClick={() => setHidden(listId, card.id, !ref.hidden)}
              >
                {ref.hidden ? 'Unhide' : 'Hide'}
              </Button>
              <select
                className="rounded-md border bg-background p-2 text-sm"
                value={ref.groupId ?? ''}
                onChange={(e) => moveCardToGroup(listId, card.id, e.target.value || null)}
              >
                <option value="">(Ungrouped)</option>
                {list!.groups.map((g) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
              <Button
                variant="destructive"
                onClick={() => {
                  removeCard(listId, card.id);
                  setCardDetail(null);
                }}
              >
                Remove from list
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
