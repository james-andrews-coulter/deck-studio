import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store';
import { InlineRenameHeading } from './InlineRenameHeading';
import { Button } from './ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from './ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from './ui/dialog';

export function DeckDetailSheet() {
  const deckId = useAppStore((s) => s.ui.activeDeckDetail);
  const setDeckDetail = useAppStore((s) => s.setDeckDetail);
  const deck = useAppStore((s) => (deckId ? s.decks[deckId] : undefined));
  const referencingListCount = useAppStore((s) =>
    deckId ? Object.values(s.lists).filter((l) => l.deckId === deckId).length : 0,
  );
  const createList = useAppStore((s) => s.createList);
  const renameDeck = useAppStore((s) => s.renameDeck);
  const deleteDeck = useAppStore((s) => s.deleteDeck);
  const navigate = useNavigate();

  const [listName, setListName] = useState('');
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [exerciseId, setExerciseId] = useState<string>('');
  const [autoFillSource, setAutoFillSource] = useState<string | null>(null);

  const open = !!deckId && !!deck;

  // Reset the inline name input whenever the sheet opens for a different deck
  useEffect(() => {
    if (deckId) {
      setListName('');
      setExerciseId('');
      setAutoFillSource(null);
    }
  }, [deckId]);

  const closeSheet = () => setDeckDetail(null);

  const onCreateList = () => {
    if (!deckId || !listName.trim()) return;
    const newListId = createList(deckId, listName.trim(), exerciseId || undefined);
    closeSheet();
    navigate(`/lists/${newListId}`);
  };

  const onConfigure = () => {
    if (!deckId) return;
    closeSheet();
    navigate(`/decks/${deckId}/configure`);
  };

  const onDeleteConfirmed = () => {
    if (!deckId) return;
    deleteDeck(deckId);
    setConfirmDeleteOpen(false);
    closeSheet();
  };

  return (
    <>
      <Sheet open={open} onOpenChange={(o) => !o && closeSheet()}>
        <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle asChild>
              {deck && deckId ? (
                <span>
                  <InlineRenameHeading
                    value={deck.name}
                    onChange={(next) => renameDeck(deckId, next)}
                  />
                </span>
              ) : (
                <span>Deck</span>
              )}
            </SheetTitle>
            <SheetDescription>
              {deck ? `${deck.cards.length} ${deck.cards.length === 1 ? 'card' : 'cards'}` : ''}
            </SheetDescription>
            {deck && deck.exercises && deck.exercises.length > 0 && (
              <span className="mt-1 inline-block w-fit rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                {deck.exercises.length}{' '}
                {deck.exercises.length === 1 ? 'exercise' : 'exercises'}
              </span>
            )}
          </SheetHeader>

          <div className="mt-4 space-y-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium">
                Create a new list from this deck
                <input
                  className="mt-1 w-full rounded-md border bg-background p-2 text-base"
                  value={listName}
                  onChange={(e) => {
                    const v = e.target.value;
                    setListName(v);
                    if (autoFillSource && v !== autoFillSource) {
                      setAutoFillSource(null);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') onCreateList();
                  }}
                  placeholder="List name"
                />
              </label>
              {deck?.exercises && deck.exercises.length > 0 && (
                <label className="block text-sm font-medium">
                  Exercise (optional)
                  <select
                    className="mt-1 w-full rounded-md border bg-background p-2 text-base"
                    value={exerciseId}
                    onChange={(e) => {
                      const nextId = e.target.value;
                      setExerciseId(nextId);
                      const ex = deck.exercises!.find((x) => x.id === nextId);
                      const nameIsEmptyOrAutoFilled =
                        !listName.trim() || listName === autoFillSource;
                      if (ex && nameIsEmptyOrAutoFilled) {
                        setListName(ex.name);
                        setAutoFillSource(ex.name);
                      }
                    }}
                  >
                    <option value="">None — start empty</option>
                    {deck.exercises.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.name}
                      </option>
                    ))}
                  </select>
                  {(() => {
                    if (!exerciseId) return null;
                    const ex = deck.exercises!.find((x) => x.id === exerciseId);
                    if (!ex) return null;
                    return (
                      <p className="mt-1 truncate text-xs text-muted-foreground">
                        Seeds {ex.groups.length} group
                        {ex.groups.length === 1 ? '' : 's'}: {ex.groups.join(' · ')}
                      </p>
                    );
                  })()}
                </label>
              )}
              <Button onClick={onCreateList} disabled={!listName.trim()}>
                Create list
              </Button>
            </div>

            <div className="border-t pt-3 space-y-2">
              <Button variant="outline" className="w-full" onClick={onConfigure}>
                Re-configure mapping
              </Button>
              {/* View all cards — deferred for v1 (spec §6.2) */}
              <Button
                variant="destructive"
                className="w-full"
                onClick={() => setConfirmDeleteOpen(true)}
              >
                Delete deck
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this deck?</DialogTitle>
            <DialogDescription>
              {referencingListCount > 0
                ? `${referencingListCount} ${
                    referencingListCount === 1 ? 'list references' : 'lists reference'
                  } this deck and will lose their source.`
                : 'No lists reference this deck.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={onDeleteConfirmed}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
