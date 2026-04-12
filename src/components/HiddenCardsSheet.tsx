import { useAppStore } from '@/store';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from './ui/sheet';
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
      <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Hidden cards ({hiddenRefs.length})</SheetTitle>
        </SheetHeader>
        <div className="mt-2 flex justify-end">
          <Button size="sm" variant="outline" onClick={() => restoreAll(listId)} disabled={!hiddenRefs.length}>
            Restore all
          </Button>
        </div>
        <ul className="mt-3 space-y-2">
          {hiddenRefs.map((r) => {
            const card = deck.cards.find((c) => c.id === r.cardId);
            if (!card) return null;
            return (
              <li key={r.cardId} className="flex items-center gap-2">
                <div className="flex-1"><CardView card={card} mapping={deck.fieldMapping} /></div>
                <Button size="sm" onClick={() => setHidden(listId, r.cardId, false)}>Restore</Button>
              </li>
            );
          })}
        </ul>
      </SheetContent>
    </Sheet>
  );
}
