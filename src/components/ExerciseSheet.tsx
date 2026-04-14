import { useAppStore } from '@/store';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from './ui/sheet';
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
        className="max-h-[85vh] overflow-y-auto md:right-0 md:left-auto md:ml-auto md:max-w-md md:rounded-tl-xl md:rounded-tr-none md:rounded-bl-none md:rounded-br-none md:h-[85vh] md:max-h-none md:border-l md:border-r-0"
      >
        <SheetHeader>
          <SheetTitle>{exercise.name}</SheetTitle>
        </SheetHeader>
        <div className="mt-3 space-y-4 text-sm leading-relaxed">
          <div>{renderMarkdownLite(exercise.instructions)}</div>
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
              Your list's groups can differ — this is the original exercise template.
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
