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
import { useAppStore } from '@/store';
import { exportListToMarkdown } from '@/lib/markdownExporter';
import { downloadTextFile } from '@/lib/download';

type Props = { listId: string };

export function ListMenu({ listId }: Props) {
  const list = useAppStore((s) => s.lists[listId]);
  const deck = useAppStore((s) => (list ? s.decks[list.deckId] : undefined));
  const setCardRefs = useAppStore((s) => s.setCardRefs);
  const shuffleList = useAppStore((s) => s.shuffleList);
  const clearAllGroups = useAppStore((s) => s.clearAllGroups);
  const deleteList = useAppStore((s) => s.deleteList);
  const navigate = useNavigate();
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
    const today = new Date().toISOString().slice(0, 10);
    const md = exportListToMarkdown(list, deck, today);
    const slug = list.name.replace(/[^\w-]+/g, '-').toLowerCase();
    downloadTextFile(`${slug}-${today}.md`, md);
  };

  const onDelete = () => {
    if (confirm(`Delete list "${list.name}"?`)) {
      deleteList(listId);
      navigate('/lists');
    }
  };

  return (
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
        <DropdownMenuItem className="text-red-600" onClick={onDelete}>
          Delete list
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
