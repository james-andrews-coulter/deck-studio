import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import type { CSSProperties, ReactNode } from 'react';

type Props = { id: string; children: ReactNode; leading?: ReactNode };

export function SortableCard({ id, children, leading }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };
  return (
    <li ref={setNodeRef} style={style} {...attributes} className="flex items-stretch gap-1">
      {leading}
      <div className="flex-1 min-w-0">{children}</div>
      <button
        type="button"
        aria-label="Drag to reorder"
        className="flex h-auto w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted touch-none"
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
    </li>
  );
}
