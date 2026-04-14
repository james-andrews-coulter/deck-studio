import { useAppStore } from '@/store';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from './ui/sheet';
import { Button } from './ui/button';
import { renderMarkdownLite } from '@/lib/markdownLite';

type Props = { listId: string };

export function ExerciseSheet({ listId }: Props) {
  const open = useAppStore((s) => !!s.ui.exerciseSheetOpenByListId[listId]);
  const setOpen = useAppStore((s) => s.setExerciseSheetOpen);
  const list = useAppStore((s) => s.lists[listId]);
  const deck = useAppStore((s) => (list ? s.decks[list.deckId] : undefined));
  const exercise = list?.exerciseId
    ? deck?.exercises?.find((e) => e.id === list.exerciseId)
    : undefined;

  if (!exercise) return null;

  return (
    <Sheet open={open} onOpenChange={(o) => setOpen(listId, o)}>
      <SheetContent
        side="bottom"
        className="flex max-h-[80svh] flex-col gap-0 p-0"
      >
        <SheetHeader className="shrink-0 border-b px-4 py-3 pr-12 text-left">
          <SheetTitle>{exercise.name}</SheetTitle>
        </SheetHeader>
        <div
          className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4 text-sm leading-relaxed"
          style={{ overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch' }}
        >
          <div className="space-y-2">{renderMarkdownLite(exercise.instructions)}</div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Template
            </div>
            <ul className="mt-2 space-y-1">
              {exercise.groups.map((label, i) => (
                <li
                  key={`${label}-${i}`}
                  className="rounded-md border bg-muted/40 px-3 py-1.5 text-sm"
                >
                  {label}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-muted-foreground">
              Your list's folders can differ — this is the original exercise template.
            </p>
          </div>
        </div>
        <div className="shrink-0 border-t p-3">
          <Button className="w-full" onClick={() => setOpen(listId, false)}>
            Done
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
