import { useState } from 'react';
import { ChevronDown, ChevronRight, MoreVertical } from 'lucide-react';
import { Button } from './ui/button';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator,
} from './ui/dropdown-menu';
import { ConfirmDialog } from './ConfirmDialog';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/store';
import type { Group, GroupColor } from '@/lib/types';

const colorSwatch: Record<GroupColor, string> = {
  slate: 'bg-slate-400',
  rose: 'bg-rose-500',
  amber: 'bg-amber-500',
  emerald: 'bg-emerald-500',
  sky: 'bg-sky-500',
  violet: 'bg-violet-500',
};

type Props = { listId: string; group: Group; count: number };

export function GroupHeader({ listId, group, count }: Props) {
  const collapsed = useAppStore((s) => !!s.ui.collapsedGroups[group.id]);
  const toggleCollapsed = useAppStore((s) => s.toggleGroupCollapsed);
  const renameGroup = useAppStore((s) => s.renameGroup);
  const setGroupColor = useAppStore((s) => s.setGroupColor);
  const deleteGroup = useAppStore((s) => s.deleteGroup);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(group.name);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  const onRename = () => {
    if (name.trim() && name !== group.name) renameGroup(listId, group.id, name.trim());
    setEditing(false);
  };

  return (
    <div className="flex items-center gap-2 border-b pb-1.5">
      <button
        aria-label={collapsed ? 'Expand' : 'Collapse'}
        onClick={() => toggleCollapsed(group.id)}
        className="flex items-center"
      >
        {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>
      <span className={cn('h-3 w-3 rounded-full', colorSwatch[group.color])} aria-hidden />
      {editing ? (
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={onRename}
          onKeyDown={(e) => { if (e.key === 'Enter') onRename(); if (e.key === 'Escape') { setName(group.name); setEditing(false); }}}
          className="flex-1 rounded-md border bg-background p-1 text-sm"
        />
      ) : (
        <button className="flex-1 text-left font-semibold" onClick={() => setEditing(true)}>
          {group.name}
        </button>
      )}
      <span className="text-xs text-muted-foreground">{count}</span>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="icon" variant="ghost" aria-label="Group actions">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <div className="flex gap-1 p-1">
            {(Object.keys(colorSwatch) as GroupColor[]).map((c) => (
              <button
                key={c}
                aria-label={`Color ${c}`}
                className={cn('h-5 w-5 rounded-full', colorSwatch[c], group.color === c && 'ring-2 ring-foreground')}
                onClick={() => setGroupColor(listId, group.id, c)}
              />
            ))}
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setEditing(true)}>Rename</DropdownMenuItem>
          <DropdownMenuItem
            className="text-red-600"
            onClick={() => setConfirmDeleteOpen(true)}
          >
            Delete group
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ConfirmDialog
        open={confirmDeleteOpen}
        onOpenChange={setConfirmDeleteOpen}
        title={`Delete group "${group.name}"?`}
        description="Cards in this group will move to Ungrouped."
        confirmLabel="Delete"
        destructive
        onConfirm={() => deleteGroup(listId, group.id)}
      />
    </div>
  );
}
