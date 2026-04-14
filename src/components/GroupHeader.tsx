import { useState, type HTMLAttributes } from 'react';
import { ChevronDown, ChevronRight, GripVertical, Trash2 } from 'lucide-react';
import { ConfirmDialog } from './ConfirmDialog';
import { SwipeableRow } from './SwipeableRow';
import { useAppStore } from '@/store';
import type { Group } from '@/lib/types';

type Props = {
  listId: string;
  group: Group;
  dragHandleProps?: HTMLAttributes<HTMLDivElement>;
};

export function GroupHeader({ listId, group, dragHandleProps }: Props) {
  const collapsed = useAppStore((s) => !!s.ui.collapsedGroups[group.id]);
  const toggleCollapsed = useAppStore((s) => s.toggleGroupCollapsed);
  const renameGroup = useAppStore((s) => s.renameGroup);
  const deleteGroup = useAppStore((s) => s.deleteGroup);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(group.name);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  const onRename = () => {
    if (name.trim() && name !== group.name) renameGroup(listId, group.id, name.trim());
    setEditing(false);
  };

  return (
    <>
      <div className="flex items-stretch gap-1">
        <div className="flex-1 min-w-0">
          <SwipeableRow
            className="rounded-none"
            actions={[
              {
                label: 'Delete',
                icon: Trash2,
                onClick: () => setConfirmDeleteOpen(true),
                className: 'bg-red-600',
              },
            ]}
          >
            <div className="flex items-center gap-2 border-b border-border/80 bg-background pb-1.5 pt-2">
              <button
                aria-label={collapsed ? 'Expand' : 'Collapse'}
                onClick={() => toggleCollapsed(group.id)}
                className="flex items-center"
              >
                {collapsed ? (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
              {editing ? (
                <input
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onBlur={onRename}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') onRename();
                    if (e.key === 'Escape') {
                      setName(group.name);
                      setEditing(false);
                    }
                  }}
                  className="flex-1 rounded-md border bg-background px-2 py-1 text-sm font-bold uppercase tracking-[0.14em]"
                />
              ) : (
                <button
                  className="flex-1 truncate text-left text-sm font-bold uppercase tracking-[0.14em]"
                  onClick={() => setEditing(true)}
                >
                  {group.name}
                </button>
              )}
            </div>
          </SwipeableRow>
        </div>
        {dragHandleProps && (
          <div
            role="button"
            tabIndex={0}
            aria-label="Drag to reorder group"
            {...dragHandleProps}
            className="flex h-auto w-8 shrink-0 cursor-grab items-center justify-center rounded-md text-muted-foreground hover:bg-muted touch-none"
          >
            <GripVertical className="h-4 w-4" />
          </div>
        )}
      </div>
      <ConfirmDialog
        open={confirmDeleteOpen}
        onOpenChange={setConfirmDeleteOpen}
        title={`Delete group "${group.name}"?`}
        description="Cards in this group will move to Ungrouped."
        confirmLabel="Delete"
        destructive
        onConfirm={() => deleteGroup(listId, group.id)}
      />
    </>
  );
}
