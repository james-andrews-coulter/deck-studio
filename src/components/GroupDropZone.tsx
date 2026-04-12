import type { ReactNode } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import { GROUP_DROP_PREFIX, UNGROUPED_DROP_ID } from '@/lib/groupDnd';

type Props = {
  groupId: string | null;
  children: ReactNode;
};

/**
 * Wraps a group's card list with a dnd-kit droppable zone so drops
 * land correctly even when the group is empty (no sortable cards to
 * register as drop targets themselves).
 */
export function GroupDropZone({ groupId, children }: Props) {
  const droppableId = groupId ?? UNGROUPED_DROP_ID;
  const { setNodeRef, isOver } = useDroppable({ id: `${GROUP_DROP_PREFIX}${droppableId}` });
  return (
    <div
      ref={setNodeRef}
      className={cn('rounded-md', isOver && 'bg-muted/40 ring-2 ring-foreground/20')}
    >
      {children}
    </div>
  );
}
