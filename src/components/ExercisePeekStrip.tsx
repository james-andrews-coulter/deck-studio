import { useAppStore } from '@/store';
import { Info } from 'lucide-react';

type Props = { listId: string };

export function ExercisePeekStrip({ listId }: Props) {
  const list = useAppStore((s) => s.lists[listId]);
  const deck = useAppStore((s) => (list ? s.decks[list.deckId] : undefined));
  const exercise = list?.exerciseId
    ? deck?.exercises?.find((e) => e.id === list.exerciseId)
    : undefined;
  const setOpen = useAppStore((s) => s.setExerciseSheetOpen);
  if (!exercise) return null;
  return (
    <button
      type="button"
      aria-label={`${exercise.name} — view guide`}
      onClick={() => setOpen(listId, true)}
      className="fixed inset-x-0 bottom-12 z-30 flex h-11 items-center justify-between border-t bg-background px-4 text-sm shadow-[0_-4px_12px_rgba(0,0,0,0.06)] md:inset-y-0 md:bottom-auto md:right-0 md:left-auto md:top-0 md:h-full md:w-10 md:flex-col md:justify-center md:gap-3 md:border-l md:border-t-0 md:px-0 md:shadow-[-4px_0_12px_rgba(0,0,0,0.06)]"
    >
      <span className="truncate font-medium md:hidden">{exercise.name}</span>
      <span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground md:ml-0 md:flex-col md:gap-2">
        <Info aria-hidden className="h-4 w-4" />
        <span className="md:[writing-mode:vertical-rl] md:rotate-180 md:text-[11px]">
          <span className="md:hidden">View guide →</span>
          <span className="hidden md:inline">{exercise.name}</span>
        </span>
      </span>
    </button>
  );
}
