import { useState } from 'react';
import { BookOpen, Copy, MoreVertical } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { ConfirmDialog } from './ConfirmDialog';
import { useAppStore } from '@/store';
import { exportListFile } from '@/lib/exportListFile';

type Props = {
  listId: string;
  /** How many cards are currently visible in the ungrouped panel (0 if not on
   * the main list view). The Build new list action is hidden when zero. */
  ungroupedVisibleCount?: number;
  onBuildFromUngrouped?: () => void;
};

export function ListMenu({
  listId,
  ungroupedVisibleCount = 0,
  onBuildFromUngrouped,
}: Props) {
  const list = useAppStore((s) => s.lists[listId]);
  const deck = useAppStore((s) => (list ? s.decks[list.deckId] : undefined));
  const clearAllGroups = useAppStore((s) => s.clearAllGroups);
  const deleteList = useAppStore((s) => s.deleteList);
  const setExerciseSheetOpen = useAppStore((s) => s.setExerciseSheetOpen);
  const navigate = useNavigate();
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  if (!list) return null;

  const exercise = list.exerciseId
    ? deck?.exercises?.find((e) => e.id === list.exerciseId)
    : undefined;

  const onExport = () => {
    if (!deck) return;
    exportListFile(list, deck);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="icon" variant="ghost" aria-label="List actions">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {exercise && (
            <>
              <DropdownMenuItem onClick={() => setExerciseSheetOpen(listId, true)}>
                <BookOpen className="mr-2 h-4 w-4" aria-hidden />
                View guide
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}
          {onBuildFromUngrouped && (
            <DropdownMenuItem
              onClick={onBuildFromUngrouped}
              disabled={ungroupedVisibleCount === 0}
            >
              <Copy className="mr-2 h-4 w-4" aria-hidden />
              Build new list from these cards
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={onExport} disabled={!deck}>
            Export as markdown
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => clearAllGroups(listId)}>
            Clear all folders
          </DropdownMenuItem>
          <DropdownMenuItem
            className="text-red-600"
            onClick={() => setConfirmDeleteOpen(true)}
          >
            Delete list
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ConfirmDialog
        open={confirmDeleteOpen}
        onOpenChange={setConfirmDeleteOpen}
        title={`Delete list "${list.name}"?`}
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          deleteList(listId);
          navigate('/lists');
        }}
      />
    </>
  );
}
