import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { useAppStore } from '@/store';

type Props = {
  listId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function BuildFromKeptDialog({ listId, open, onOpenChange }: Props) {
  const list = useAppStore((s) => s.lists[listId]);
  const deck = useAppStore((s) => (list ? s.decks[list.deckId] : undefined));
  const createListFromCards = useAppStore((s) => s.createListFromCards);
  const navigate = useNavigate();
  const [exerciseId, setExerciseId] = useState('');
  const [name, setName] = useState('');
  const [autoFillSource, setAutoFillSource] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setExerciseId('');
      setName('');
      setAutoFillSource(null);
    }
  }, [open]);

  if (!list || !deck) return null;
  const keptRefs = list.cardRefs.filter((r) => r.processed === 'keep');
  const exercises = deck.exercises ?? [];

  const onExerciseChange = (nextId: string) => {
    setExerciseId(nextId);
    const ex = exercises.find((e) => e.id === nextId);
    const nameIsEmptyOrAutoFilled = !name.trim() || name === autoFillSource;
    if (ex && nameIsEmptyOrAutoFilled) {
      setName(ex.name);
      setAutoFillSource(ex.name);
    }
  };

  const onCreate = () => {
    if (!name.trim() || keptRefs.length === 0) return;
    const keptIds = keptRefs.map((r) => r.cardId);
    const id = createListFromCards(
      list.deckId,
      name.trim(),
      keptIds,
      exerciseId || undefined,
    );
    onOpenChange(false);
    navigate(`/lists/${id}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Build new list from kept cards</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Creates a fresh list from the {keptRefs.length}{' '}
          {keptRefs.length === 1 ? 'card' : 'cards'} you've kept. The new list
          starts ungrouped with a clean swipe state so you can run a different
          exercise over the same subset.
        </p>
        {exercises.length > 0 && (
          <label className="mt-3 block text-sm font-medium">
            Exercise (optional)
            <select
              className="mt-1 w-full rounded-md border bg-background p-2 text-base"
              value={exerciseId}
              onChange={(e) => onExerciseChange(e.target.value)}
            >
              <option value="">None — start empty</option>
              {exercises.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="mt-3 block text-sm font-medium">
          Name
          <input
            className="mt-1 w-full rounded-md border bg-background p-2 text-base"
            value={name}
            onChange={(e) => {
              const v = e.target.value;
              setName(v);
              if (autoFillSource && v !== autoFillSource) setAutoFillSource(null);
            }}
            placeholder="New list name"
          />
        </label>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={onCreate}
            disabled={!name.trim() || keptRefs.length === 0}
          >
            Create list
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
