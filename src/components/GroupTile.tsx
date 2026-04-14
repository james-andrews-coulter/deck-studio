import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Folder } from 'lucide-react';
import { useAppStore } from '@/store';
import { GROUP_HEADER_PREFIX } from '@/lib/groupDnd';
import { cn } from '@/lib/utils';
import type { Group } from '@/lib/types';

type Props = {
  listId: string;
  group: Group;
  onOpen: () => void;
};

export function GroupTile({ listId, group, onOpen }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging, isOver } =
    useSortable({ id: `${GROUP_HEADER_PREFIX}${group.id}` });
  const count = useAppStore(
    (s) => s.lists[listId]?.cardRefs.filter((r) => r.groupId === group.id && !r.hidden).length ?? 0,
  );

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <button
      type="button"
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onOpen}
      className={cn(
        'group flex aspect-square flex-col items-start justify-between rounded-xl border-2 bg-card p-3 text-left transition-colors touch-none',
        isOver ? 'border-primary bg-primary/5' : 'border-border',
      )}
    >
      <div className="relative">
        <Folder className="h-6 w-6 text-muted-foreground" aria-hidden />
        {count > 0 && (
          <span
            aria-hidden
            className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-primary"
          />
        )}
      </div>
      <span className="line-clamp-2 break-words text-sm font-semibold uppercase tracking-[0.1em]">
        {group.name}
      </span>
    </button>
  );
}
