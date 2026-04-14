import { useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
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
import { useAppStore } from '@/store';
import { CardView } from '@/components/CardView';
import { HiddenCardsSheet } from '@/components/HiddenCardsSheet';
import { ExercisePeekStrip } from '@/components/ExercisePeekStrip';
import { ExerciseSheet } from '@/components/ExerciseSheet';
import { InlineRenameHeading } from '@/components/InlineRenameHeading';
import { GroupHeader } from '@/components/GroupHeader';
import { SortableCard } from '@/components/SortableCard';
import { ListMenu } from '@/components/ListMenu';
import { SwipeSession } from '@/components/SwipeSession';
import { SwipeableRow } from '@/components/SwipeableRow';
import { MoveToGroupDialog } from '@/components/MoveToGroupDialog';
import { SelectionActionBar } from '@/components/SelectionActionBar';
import { GroupNameInput } from '@/components/GroupNameInput';
import { GroupDropZone } from '@/components/GroupDropZone';
import { SortableGroupSection } from '@/components/SortableGroupSection';
import { useListSelection } from '@/hooks/useListSelection';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { EyeOff } from 'lucide-react';
import {
  GROUP_DROP_PREFIX,
  GROUP_HEADER_PREFIX,
  UNGROUPED_DROP_ID,
} from '@/lib/groupDnd';

export default function ListScreen() {
  const { listId = '' } = useParams();
  const list = useAppStore((s) => s.lists[listId]);
  const deck = useAppStore((s) => (list ? s.decks[list.deckId] : undefined));
  const addGroup = useAppStore((s) => s.addGroup);
  const collapsed = useAppStore((s) => s.ui.collapsedGroups);
  const setCardRefs = useAppStore((s) => s.setCardRefs);
  const moveCardToGroupAt = useAppStore((s) => s.moveCardToGroupAt);
  const moveCardToGroup = useAppStore((s) => s.moveCardToGroup);
  const setHidden = useAppStore((s) => s.setHidden);
  const setHiddenSheetOpen = useAppStore((s) => s.setHiddenSheetOpen);

  const [moveTarget, setMoveTarget] = useState<{ cardIds: string[] } | null>(null);
  const [newGroupFromSelectionOpen, setNewGroupFromSelectionOpen] = useState(false);
  const { selectMode, selected, toggleSelect, clearSelection, toggleSelectMode } =
    useListSelection();

  const [params, setParams] = useSearchParams();
  const mode = (params.get('mode') ?? 'view') as 'view' | 'swipe';
  const setMode = (m: 'view' | 'swipe') =>
    setParams((p) => {
      p.set('mode', m);
      return p;
    });

  const [groupDraft, setGroupDraft] = useState<string | null>(null);
  const commitNewGroup = () => {
    if (groupDraft && groupDraft.trim()) addGroup(list!.id, groupDraft.trim());
    setGroupDraft(null);
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  if (!list) return <div className="p-6">List not found.</div>;
  if (!deck) {
    return (
      <div className="p-4 md:p-6">
        <div
          role="alert"
          className="mb-4 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200"
        >
          The deck that this list was created from is missing. Re-import the deck or delete this list.
        </div>
        <header className="flex items-center gap-2">
          <InlineRenameHeading
            value={list.name}
            onChange={(n) => useAppStore.getState().renameList(list.id, n)}
          />
        </header>
        <ul className="mt-4 space-y-2">
          {list.cardRefs.map((r) => (
            <li
              key={r.cardId}
              className="rounded border p-3 text-sm italic text-muted-foreground"
            >
              Missing card
            </li>
          ))}
        </ul>
      </div>
    );
  }

  const hiddenCount = list.cardRefs.filter((r) => r.hidden).length;
  const hasResolvedExercise = !!(
    list.exerciseId && deck.exercises?.some((e) => e.id === list.exerciseId)
  );

  const refsByGroup = (gid: string | null) =>
    list.cardRefs.filter((r) => r.groupId === gid && !r.hidden);

  const onDragEnd = (evt: DragEndEvent) => {
    const { active, over } = evt;
    if (!over || active.id === over.id) return;
    const activeId = String(active.id);
    const overId = String(over.id);

    // Group reorder
    if (activeId.startsWith(GROUP_HEADER_PREFIX)) {
      if (!overId.startsWith(GROUP_HEADER_PREFIX)) return;
      const fromGid = activeId.slice(GROUP_HEADER_PREFIX.length);
      const toGid = overId.slice(GROUP_HEADER_PREFIX.length);
      const from = list.groups.findIndex((g) => g.id === fromGid);
      const to = list.groups.findIndex((g) => g.id === toGid);
      if (from >= 0 && to >= 0 && from !== to) {
        useAppStore.getState().reorderGroups(list.id, from, to);
      }
      return;
    }

    const activeRef = list.cardRefs.find((r) => r.cardId === activeId);
    if (!activeRef) return;

    if (overId.startsWith(GROUP_DROP_PREFIX)) {
      const rawGroupId = overId.slice(GROUP_DROP_PREFIX.length);
      const targetGroupId = rawGroupId === UNGROUPED_DROP_ID ? null : rawGroupId;
      if (activeRef.groupId === targetGroupId) return;
      moveCardToGroupAt(list.id, activeId, targetGroupId, 0);
      return;
    }

    const overRef = list.cardRefs.find((r) => r.cardId === over.id);

    const sameGroup = overRef && overRef.groupId === activeRef.groupId;
    if (sameGroup) {
      const from = list.cardRefs.findIndex((r) => r.cardId === active.id);
      const to = list.cardRefs.findIndex((r) => r.cardId === over.id);
      if (from >= 0 && to >= 0 && from !== to) {
        const next = list.cardRefs.slice();
        const [moved] = next.splice(from, 1);
        next.splice(to, 0, moved);
        setCardRefs(list.id, next);
      }
    } else if (overRef) {
      // cross-group: place before overRef in its group
      const groupRefs = list.cardRefs.filter((r) => r.groupId === overRef.groupId);
      const idx = groupRefs.findIndex((r) => r.cardId === overRef.cardId);
      moveCardToGroupAt(list.id, activeId, overRef.groupId, idx);
    }
  };

  const ungroupedRows = refsByGroup(null);

  const renderRow = (cardId: string) => {
    const card = deck.cards.find((c) => c.id === cardId);
    const body = (
      <SwipeableRow
        onHide={() => setHidden(list.id, cardId, true)}
        onRequestMove={() => setMoveTarget({ cardIds: [cardId] })}
      >
        {card ? (
          <CardView card={card} mapping={deck.fieldMapping} />
        ) : (
          <div className="rounded border p-2 text-sm italic text-muted-foreground">
            Missing card
          </div>
        )}
      </SwipeableRow>
    );
    if (selectMode) {
      return (
        <li key={cardId} className="flex items-stretch gap-1">
          <span className="flex w-7 shrink-0 items-center justify-center">
            <input
              type="checkbox"
              aria-label={`Select card ${cardId}`}
              checked={selected.has(cardId)}
              onChange={() => toggleSelect(cardId)}
              className="h-4 w-4 cursor-pointer"
            />
          </span>
          <div className="flex-1 min-w-0">{body}</div>
        </li>
      );
    }
    return (
      <SortableCard key={cardId} id={cardId}>
        {body}
      </SortableCard>
    );
  };

  return (
    <div
      className={cn(
        'p-3 md:p-5',
        hasResolvedExercise && mode === 'view' && 'pb-24 md:pr-16',
      )}
    >
      <header className="sticky top-0 z-20 -mx-3 border-b bg-background/90 px-3 backdrop-blur-sm supports-[backdrop-filter]:bg-background/70 md:-mx-5 md:px-5">
        <div className="flex items-center gap-2 py-2">
          <div className="min-w-0 flex-1">
            <InlineRenameHeading
              value={list.name}
              onChange={(next) => useAppStore.getState().renameList(list.id, next)}
            />
          </div>
          <div className="inline-flex shrink-0 rounded-md border p-0.5 text-xs">
            <button
              className={cn('px-2 py-1', mode === 'view' && 'bg-muted')}
              onClick={() => setMode('view')}
            >
              List
            </button>
            <button
              className={cn('px-2 py-1', mode === 'swipe' && 'bg-muted')}
              onClick={() => setMode('swipe')}
            >
              Swipe
            </button>
          </div>
          <ListMenu listId={list.id} />
        </div>
        {mode === 'view' && (
          <div className="flex flex-wrap items-center gap-2 pb-2">
            {groupDraft === null ? (
              <Button size="sm" variant="outline" onClick={() => setGroupDraft('New group')}>
                + Group
              </Button>
            ) : (
              <input
                autoFocus
                value={groupDraft}
                onChange={(e) => setGroupDraft(e.target.value)}
                onBlur={commitNewGroup}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitNewGroup();
                  if (e.key === 'Escape') setGroupDraft(null);
                }}
                aria-label="New group name"
                className="rounded-md border bg-background px-2 py-1 text-base"
              />
            )}
            <Button
              size="sm"
              variant={selectMode ? 'default' : 'outline'}
              onClick={toggleSelectMode}
            >
              {selectMode ? 'Done' : 'Select'}
            </Button>
            {hiddenCount > 0 && (
              <Button
                size="icon"
                variant="outline"
                aria-label="Show hidden cards"
                onClick={() => setHiddenSheetOpen(true)}
                className="ml-auto"
              >
                <EyeOff className="h-4 w-4" aria-hidden />
              </Button>
            )}
          </div>
        )}
      </header>

      {mode === 'swipe' ? (
        <SwipeSession listId={list.id} onDone={() => setMode('view')} />
      ) : (
        <>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext
          items={list.groups.map((g) => `${GROUP_HEADER_PREFIX}${g.id}`)}
          strategy={verticalListSortingStrategy}
        >
          {list.groups.map((g) => {
            const rows = refsByGroup(g.id);
            return (
              <SortableGroupSection key={g.id} groupId={g.id}>
                {(dragHandleProps) => (
                  <>
                    <GroupHeader
                      listId={list.id}
                      group={g}
                      dragHandleProps={selectMode ? undefined : dragHandleProps}
                    />
                    {!collapsed[g.id] && (
                      <GroupDropZone groupId={g.id}>
                        <SortableContext
                          items={rows.map((r) => r.cardId)}
                          strategy={verticalListSortingStrategy}
                        >
                          {rows.length === 0 ? (
                            <div className="py-4 text-center text-xs text-muted-foreground">
                              Drop cards here
                            </div>
                          ) : (
                            <ul className="mt-2 space-y-1.5">
                              {rows.map((r) => renderRow(r.cardId))}
                            </ul>
                          )}
                        </SortableContext>
                      </GroupDropZone>
                    )}
                  </>
                )}
              </SortableGroupSection>
            );
          })}
        </SortableContext>

        {(list.groups.length > 0 || ungroupedRows.length > 0) && (
          <section className="mt-4">
            {list.groups.length > 0 && (
              <h3 className="mb-2 text-sm font-semibold uppercase text-muted-foreground">
                (Ungrouped)
              </h3>
            )}
            <GroupDropZone groupId={null}>
              <SortableContext
                items={ungroupedRows.map((r) => r.cardId)}
                strategy={verticalListSortingStrategy}
              >
                {ungroupedRows.length === 0 ? (
                  <div className="py-4 text-center text-xs text-muted-foreground">
                    Drop cards here
                  </div>
                ) : (
                  <ul className="space-y-1.5">
                    {ungroupedRows.map((r) => renderRow(r.cardId))}
                  </ul>
                )}
              </SortableContext>
            </GroupDropZone>
          </section>
        )}
      </DndContext>

      <ExercisePeekStrip listId={list.id} />
      <ExerciseSheet listId={list.id} />
      <HiddenCardsSheet listId={list.id} />
      <MoveToGroupDialog
        open={!!moveTarget}
        onOpenChange={(o) => !o && setMoveTarget(null)}
        groups={list.groups}
        onPick={(groupId) => {
          if (!moveTarget) return;
          for (const cid of moveTarget.cardIds) {
            moveCardToGroup(list.id, cid, groupId);
          }
          setMoveTarget(null);
          clearSelection();
        }}
      />
      {newGroupFromSelectionOpen && (
        <Dialog
          open
          onOpenChange={(o) => !o && setNewGroupFromSelectionOpen(false)}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New group from {selected.size} cards</DialogTitle>
            </DialogHeader>
            <GroupNameInput
              onConfirm={(name) => {
                const id = addGroup(list.id, name);
                selected.forEach((cardId) => moveCardToGroup(list.id, cardId, id));
                setNewGroupFromSelectionOpen(false);
                // toggleSelectMode both flips the flag off and clears the selection
                toggleSelectMode();
              }}
              onCancel={() => setNewGroupFromSelectionOpen(false)}
            />
          </DialogContent>
        </Dialog>
      )}

      {selectMode && (
        <SelectionActionBar
          count={selected.size}
          onClear={clearSelection}
          onNewGroup={() => setNewGroupFromSelectionOpen(true)}
          onMoveTo={() => setMoveTarget({ cardIds: Array.from(selected) })}
        />
      )}
        </>
      )}
    </div>
  );
}
