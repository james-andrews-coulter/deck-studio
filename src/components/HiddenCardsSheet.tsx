import { useAppStore } from '@/store';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from './ui/sheet';
import { Button } from './ui/button';
import { CardView } from './CardView';

type Props = { listId: string };

export function HiddenCardsSheet({ listId }: Props) {
  const open = useAppStore((s) => s.ui.hiddenSheetOpen);
  const setOpen = useAppStore((s) => s.setHiddenSheetOpen);
  const list = useAppStore((s) => s.lists[listId]);
  const deck = useAppStore((s) => (list ? s.decks[list.deckId] : undefined));
  const setHidden = useAppStore((s) => s.setHidden);
  const restoreAll = useAppStore((s) => s.restoreAllHidden);
  if (!list || !deck) return null;
  const hiddenRefs = list.cardRefs.filter((r) => r.hidden);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent side="bottom" className="flex max-h-[80svh] flex-col gap-0 p-0">
        <SheetHeader className="shrink-0 flex flex-row items-center justify-between border-b px-4 py-3 pr-12 text-left">
          <SheetTitle>Hidden cards</SheetTitle>
          <Button
            size="sm"
            variant="outline"
            onClick={() => restoreAll(listId)}
            disabled={!hiddenRefs.length}
          >
            Restore all
          </Button>
        </SheetHeader>
        <div
          className="min-h-0 flex-1 overflow-y-auto px-4 py-3"
          style={{ overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch' }}
        >
          <ul className="space-y-2">
            {hiddenRefs.map((r) => {
              const card = deck.cards.find((c) => c.id === r.cardId);
              return (
                <li key={r.cardId} className="flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    {card ? (
                      <CardView card={card} mapping={deck.fieldMapping} />
                    ) : (
                      <div className="rounded border p-2 text-sm italic text-muted-foreground">
                        Missing card
                      </div>
                    )}
                  </div>
                  <Button
                    size="sm"
                    onClick={() => setHidden(listId, r.cardId, false)}
                  >
                    Restore
                  </Button>
                </li>
              );
            })}
          </ul>
        </div>
        <div className="shrink-0 border-t p-3">
          <Button className="w-full" onClick={() => setOpen(false)}>
            Done
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
