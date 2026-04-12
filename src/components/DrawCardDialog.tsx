import { useState, useMemo, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { CardView } from './CardView';
import { useAppStore } from '@/store';

type Props = { listId: string };

export function DrawCardDialog({ listId }: Props) {
  const open = useAppStore((s) => s.ui.drawCardOpen);
  const setOpen = useAppStore((s) => s.setDrawCardOpen);
  const list = useAppStore((s) => s.lists[listId]);
  const deck = useAppStore((s) => (list ? s.decks[list.deckId] : undefined));
  const [currentId, setCurrentId] = useState<string | null>(null);

  const candidates = useMemo(
    () => (list ? list.cardRefs.filter((r) => !r.hidden).map((r) => r.cardId) : []),
    [list]
  );

  useEffect(() => {
    if (open && candidates.length) {
      setCurrentId(candidates[Math.floor(Math.random() * candidates.length)]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]); // draw once on open

  if (!list || !deck) return null;
  const card = deck.cards.find((c) => c.id === currentId) ?? null;

  const drawAnother = () => {
    if (!candidates.length) return;
    setCurrentId(candidates[Math.floor(Math.random() * candidates.length)]);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader><DialogTitle>Drawn card</DialogTitle></DialogHeader>
        {candidates.length === 0 ? (
          <p className="text-muted-foreground">No visible cards to draw from.</p>
        ) : card ? (
          <CardView card={card} mapping={deck.fieldMapping} />
        ) : null}
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Close</Button>
          <Button onClick={drawAnother} disabled={!candidates.length}>Draw another</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
