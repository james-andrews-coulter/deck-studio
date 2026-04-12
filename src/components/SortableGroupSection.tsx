import type { CSSProperties, HTMLAttributes, ReactNode } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GROUP_HEADER_PREFIX } from '@/lib/groupDnd';

type Props = {
  groupId: string;
  children: (headerDragHandle: HTMLAttributes<HTMLDivElement>) => ReactNode;
};

/**
 * A <section> that makes an entire group draggable for reorder by
 * spreading drag listeners onto a header-level handle via the render prop.
 */
export function SortableGroupSection({ groupId, children }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `${GROUP_HEADER_PREFIX}${groupId}`,
  });
  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };
  const handleProps: HTMLAttributes<HTMLDivElement> = {
    ...attributes,
    ...(listeners as HTMLAttributes<HTMLDivElement>),
  };
  return (
    <section ref={setNodeRef} style={style} className="mt-4">
      {children(handleProps)}
    </section>
  );
}
