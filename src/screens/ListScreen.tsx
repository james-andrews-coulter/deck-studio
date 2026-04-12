import { useState, type CSSProperties, type ReactNode } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  closestCenter,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useAppStore } from '@/store';
import { CardView } from '@/components/CardView';
import { HiddenCardsSheet } from '@/components/HiddenCardsSheet';
import { InlineRenameHeading } from '@/components/InlineRenameHeading';
import { GroupHeader } from '@/components/GroupHeader';
import { SortableCard } from '@/components/SortableCard';
import { ListMenu } from '@/components/ListMenu';
import { SwipeSession } from '@/components/SwipeSession';
import { SwipeableRow } from '@/components/SwipeableRow';
import { MoveToGroupDialog } from '@/components/MoveToGroupDialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const UNGROUPED_DROP_ID = '__ungrouped__';

function GroupDropZone({
  groupId,
  children,
}: {
  groupId: string | null;
  children: ReactNode;
}) {
  const droppableId = groupId ?? UNGROUPED_DROP_ID;
  const { setNodeRef, isOver } = useDroppable({ id: `group:${droppableId}` });
  return (
    <div
      ref={setNodeRef}
      className={cn('rounded-md', isOver && 'bg-muted/40 ring-2 ring-foreground/20')}
    >
      {children}
    </div>
  );
}

const GROUP_HEADER_PREFIX = 'groupheader:';

function SortableGroupSection({
  groupId,
  children,
}: {
  groupId: string;
  children: (headerDragHandle: React.HTMLAttributes<HTMLDivElement>) => ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `${GROUP_HEADER_PREFIX}${groupId}`,
  });
  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };
  const handleProps: React.HTMLAttributes<HTMLDivElement> = {
    ...attributes,
    ...(listeners as React.HTMLAttributes<HTMLDivElement>),
  };
  return (
    <section ref={setNodeRef} style={style} className="mt-4">
      {children(handleProps)}
    </section>
  );
}

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
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [selectMode, setSelectMode] = useState(false);
  const toggleSelect = (cardId: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(cardId)) n.delete(cardId);
      else n.add(cardId);
      return n;
    });
  const clearSelection = () => setSelected(new Set());
  const toggleSelectMode = () => {
    setSelectMode((on) => {
      if (on) setSelected(new Set());
      return !on;
    });
  };

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
          className="mb-4 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900"
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

    if (overId.startsWith('group:')) {
      const rawGroupId = overId.slice('group:'.length);
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
    <div className="p-3 md:p-5">
      <header className="flex items-center gap-2">
        <InlineRenameHeading
          value={list.name}
          onChange={(next) => useAppStore.getState().renameList(list.id, next)}
        />
        {mode === 'view' && hiddenCount > 0 && (
          <button
            onClick={() => setHiddenSheetOpen(true)}
            aria-label="Show hidden cards"
            className="ml-auto rounded-full bg-muted px-3 py-1 text-xs"
          >
            {hiddenCount} hidden
          </button>
        )}
        {mode === 'view' &&
          (groupDraft === null ? (
            <Button
              size="sm"
              variant="outline"
              className={hiddenCount > 0 ? '' : 'ml-auto'}
              onClick={() => setGroupDraft('New group')}
            >
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
              className={cn(
                'rounded-md border bg-background px-2 py-1 text-sm',
                hiddenCount > 0 ? '' : 'ml-auto',
              )}
            />
          ))}
        {mode === 'view' && (
          <Button
            size="sm"
            variant={selectMode ? 'default' : 'outline'}
            onClick={toggleSelectMode}
          >
            {selectMode ? 'Done' : 'Select'}
          </Button>
        )}
        <div className={cn('inline-flex rounded-md border p-0.5 text-xs', mode === 'swipe' && 'ml-auto')}>
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
                      count={rows.length}
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

      {selectMode && selected.size > 0 && (
        <div className="fixed inset-x-0 bottom-14 z-20 mx-auto flex max-w-md items-center justify-between gap-2 rounded-full border bg-background p-2 shadow-lg md:bottom-4">
          <span className="pl-3 text-sm">{selected.size} selected</span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={clearSelection}>
              Clear
            </Button>
            <Button
              size="sm"
              onClick={() =>
                setMoveTarget({ cardIds: Array.from(selected) })
              }
            >
              Move to…
            </Button>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
}
