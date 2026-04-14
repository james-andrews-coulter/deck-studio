import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Folder, GripVertical } from 'lucide-react';
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
  const hasCards = useAppStore(
    (s) =>
      (s.lists[listId]?.cardRefs.filter((r) => r.groupId === group.id && !r.hidden).length ??
        0) > 0,
  );

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'relative flex min-w-[9rem] shrink-0 items-center gap-2 rounded-xl border-2 bg-card p-2.5 transition-colors',
        isOver ? 'border-primary bg-primary/5' : 'border-border',
      )}
    >
      <button
        type="button"
        onClick={onOpen}
        className="flex flex-1 items-center gap-2 text-left"
      >
        <div className="relative">
          <Folder className="h-5 w-5 text-muted-foreground" aria-hidden />
          {hasCards && (
            <span
              aria-hidden
              className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-primary"
            />
          )}
        </div>
        <span className="line-clamp-2 break-words text-xs font-semibold uppercase tracking-[0.1em]">
          {group.name}
        </span>
      </button>
      <div
        {...attributes}
        {...listeners}
        role="button"
        tabIndex={0}
        aria-label={`Drag to reorder ${group.name}`}
        className="flex h-7 w-5 shrink-0 cursor-grab touch-none items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
      >
        <GripVertical className="h-4 w-4" aria-hidden />
      </div>
    </div>
  );
}
