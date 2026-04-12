import { useState } from 'react';
import { toast } from 'sonner';
import { MoreVertical } from 'lucide-react';
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

type Props = { listId: string };

export function ListMenu({ listId }: Props) {
  const list = useAppStore((s) => s.lists[listId]);
  const deck = useAppStore((s) => (list ? s.decks[list.deckId] : undefined));
  const setCardRefs = useAppStore((s) => s.setCardRefs);
  const shuffleList = useAppStore((s) => s.shuffleList);
  const clearAllGroups = useAppStore((s) => s.clearAllGroups);
  const deleteList = useAppStore((s) => s.deleteList);
  const navigate = useNavigate();
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  if (!list) return null;

  const onShuffle = () => {
    const before = list.cardRefs;
    shuffleList(listId);
    toast('Shuffled', {
      duration: 5000,
      action: {
        label: 'Undo',
        onClick: () => setCardRefs(listId, before),
      },
    });
  };

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
          <DropdownMenuItem onClick={onShuffle}>Shuffle</DropdownMenuItem>
          <DropdownMenuItem onClick={onExport} disabled={!deck}>
            Export as markdown
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => clearAllGroups(listId)}>Clear all groups</DropdownMenuItem>
          <DropdownMenuItem className="text-red-600" onClick={() => setConfirmDeleteOpen(true)}>
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
