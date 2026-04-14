import { useState } from 'react';
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { EyeOff, FolderInput, Trash2 } from 'lucide-react';
import { useAppStore } from '@/store';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from './ui/sheet';
import { Button } from './ui/button';
import { ConfirmDialog } from './ConfirmDialog';
import { CardView } from './CardView';
import { SortableCard } from './SortableCard';
import { SwipeableRow } from './SwipeableRow';
import { MoveToGroupDialog } from './MoveToGroupDialog';

type Props = {
  listId: string;
  groupId: string | null;
  onOpenChange: (open: boolean) => void;
};

export function GroupDetailSheet({ listId, groupId, onOpenChange }: Props) {
  const list = useAppStore((s) => s.lists[listId]);
  const deck = useAppStore((s) => (list ? s.decks[list.deckId] : undefined));
  const group = list?.groups.find((g) => g.id === groupId);
  const renameGroup = useAppStore((s) => s.renameGroup);
  const deleteGroup = useAppStore((s) => s.deleteGroup);
  const setCardRefs = useAppStore((s) => s.setCardRefs);
  const setHidden = useAppStore((s) => s.setHidden);
  const moveCardToGroup = useAppStore((s) => s.moveCardToGroup);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [moveTarget, setMoveTarget] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  if (!list || !deck || !group) return null;

  const rows = list.cardRefs.filter((r) => r.groupId === groupId && !r.hidden);

  const startEditing = () => {
    setDraft(group.name);
    setEditing(true);
  };
  const commitRename = () => {
    if (draft.trim() && draft !== group.name) renameGroup(listId, group.id, draft.trim());
    setEditing(false);
  };

  const onDragEnd = (evt: DragEndEvent) => {
    const { active, over } = evt;
    if (!over || active.id === over.id) return;
    const from = list.cardRefs.findIndex((r) => r.cardId === active.id);
    const to = list.cardRefs.findIndex((r) => r.cardId === over.id);
    if (from < 0 || to < 0) return;
    const next = list.cardRefs.slice();
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setCardRefs(listId, next);
  };

  return (
    <>
      <Sheet open={!!groupId} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="flex max-h-[90vh] flex-col gap-0 p-0">
          <SheetHeader className="border-b px-4 py-3 pr-12 text-left">
            <SheetTitle className="text-base font-bold uppercase tracking-[0.14em]">
              {editing ? (
                <input
                  autoFocus
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onBlur={commitRename}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitRename();
                    if (e.key === 'Escape') setEditing(false);
                  }}
                  className="w-full rounded-md border bg-background px-2 py-1 text-base font-bold uppercase tracking-[0.14em]"
                />
              ) : (
                <button
                  type="button"
                  onClick={startEditing}
                  className="w-full truncate text-left"
                >
                  {group.name}
                </button>
              )}
            </SheetTitle>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-3 py-3">
            {rows.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No cards in this folder yet. Drag cards onto the folder tile to add them.
              </p>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={onDragEnd}
              >
                <SortableContext
                  items={rows.map((r) => r.cardId)}
                  strategy={verticalListSortingStrategy}
                >
                  <ul className="space-y-1.5">
                    {rows.map((r) => {
                      const card = deck.cards.find((c) => c.id === r.cardId);
                      return (
                        <SortableCard key={r.cardId} id={r.cardId}>
                          <SwipeableRow
                            actions={[
                              {
                                label: 'Hide',
                                icon: EyeOff,
                                onClick: () => setHidden(listId, r.cardId, true),
                                className: 'bg-amber-500',
                              },
                              {
                                label: 'Move',
                                icon: FolderInput,
                                onClick: () => setMoveTarget(r.cardId),
                                className: 'bg-sky-600',
                              },
                            ]}
                          >
                            {card ? (
                              <CardView card={card} mapping={deck.fieldMapping} />
                            ) : (
                              <div className="rounded border p-2 text-sm italic text-muted-foreground">
                                Missing card
                              </div>
                            )}
                          </SwipeableRow>
                        </SortableCard>
                      );
                    })}
                  </ul>
                </SortableContext>
              </DndContext>
            )}
          </div>

          <div className="border-t p-3">
            <Button
              variant="outline"
              className="w-full text-red-600"
              onClick={() => setConfirmDeleteOpen(true)}
            >
              <Trash2 className="mr-2 h-4 w-4" aria-hidden />
              Delete folder
            </Button>
          </div>
        </SheetContent>
      </Sheet>
      <ConfirmDialog
        open={confirmDeleteOpen}
        onOpenChange={setConfirmDeleteOpen}
        title={`Delete folder "${group.name}"?`}
        description="Cards in this folder will move to Ungrouped."
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          deleteGroup(listId, group.id);
          setConfirmDeleteOpen(false);
          onOpenChange(false);
        }}
      />
      <MoveToGroupDialog
        open={!!moveTarget}
        onOpenChange={(o) => !o && setMoveTarget(null)}
        groups={list.groups}
        onPick={(targetGroupId) => {
          if (moveTarget) moveCardToGroup(listId, moveTarget, targetGroupId);
          setMoveTarget(null);
        }}
      />
    </>
  );
}
