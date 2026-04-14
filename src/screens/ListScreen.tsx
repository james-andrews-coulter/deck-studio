import { useMemo, useState } from 'react';
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
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { useAppStore } from '@/store';
import { CardView } from '@/components/CardView';
import { HiddenCardsSheet } from '@/components/HiddenCardsSheet';
import { ExerciseSheet } from '@/components/ExerciseSheet';
import { InlineRenameHeading } from '@/components/InlineRenameHeading';
import { GroupTile } from '@/components/GroupTile';
import { GroupDetailSheet } from '@/components/GroupDetailSheet';
import { SortableCard } from '@/components/SortableCard';
import { ListMenu } from '@/components/ListMenu';
import { SwipeSession } from '@/components/SwipeSession';
import { SwipeableRow } from '@/components/SwipeableRow';
import { NavHamburger } from '@/components/NavHamburger';
import { MoveToGroupDialog } from '@/components/MoveToGroupDialog';
import { SelectionActionBar } from '@/components/SelectionActionBar';
import { GroupNameInput } from '@/components/GroupNameInput';
import { GroupDropZone } from '@/components/GroupDropZone';
import { MetaFilterBar } from '@/components/MetaFilterBar';
import { cardMatchesFilters, getMetaFilterOptions } from '@/lib/metaFilters';
import { useListSelection } from '@/hooks/useListSelection';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { EyeOff, FolderInput } from 'lucide-react';
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
  const setCardRefs = useAppStore((s) => s.setCardRefs);
  const moveCardToGroupAt = useAppStore((s) => s.moveCardToGroupAt);
  const moveCardToGroup = useAppStore((s) => s.moveCardToGroup);
  const setHidden = useAppStore((s) => s.setHidden);
  const setHiddenSheetOpen = useAppStore((s) => s.setHiddenSheetOpen);

  const [moveTarget, setMoveTarget] = useState<{ cardIds: string[] } | null>(null);
  const [newGroupFromSelectionOpen, setNewGroupFromSelectionOpen] = useState(false);
  const [openGroupId, setOpenGroupId] = useState<string | null>(null);
  const [metaFilters, setMetaFilters] = useState<Record<string, Set<string>>>({});
  const { selectMode, selected, toggleSelect, clearSelection, toggleSelectMode } =
    useListSelection();

  const metaOptions = useMemo(
    () => (deck ? getMetaFilterOptions(deck) : {}),
    [deck],
  );

  const toggleMetaFilter = (key: string, value: string) => {
    setMetaFilters((prev) => {
      const next = { ...prev };
      const set = new Set(next[key] ?? []);
      if (set.has(value)) set.delete(value);
      else set.add(value);
      next[key] = set;
      return next;
    });
  };

  const clearMetaFilter = (key: string) => {
    setMetaFilters((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
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
  const activeFilterCount = Object.values(metaFilters).reduce((n, s) => n + s.size, 0);
  const ungroupedRows = list.cardRefs
    .filter((r) => r.groupId === null && !r.hidden)
    .filter((r) => {
      if (activeFilterCount === 0) return true;
      const card = deck.cards.find((c) => c.id === r.cardId);
      if (!card) return true;
      return cardMatchesFilters(card, metaFilters);
    });

  const onDragEnd = (evt: DragEndEvent) => {
    const { active, over } = evt;
    if (!over || active.id === over.id) return;
    const activeId = String(active.id);
    const overId = String(over.id);

    // Group tile reorder
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

    // Card drop
    const activeRef = list.cardRefs.find((r) => r.cardId === activeId);
    if (!activeRef) return;

    // Dropped on a group tile — nest into that group
    if (overId.startsWith(GROUP_HEADER_PREFIX)) {
      const targetGroupId = overId.slice(GROUP_HEADER_PREFIX.length);
      if (activeRef.groupId === targetGroupId) return;
      moveCardToGroupAt(list.id, activeId, targetGroupId, 0);
      return;
    }

    // Dropped on the ungrouped zone
    if (overId.startsWith(GROUP_DROP_PREFIX)) {
      const rawGroupId = overId.slice(GROUP_DROP_PREFIX.length);
      const targetGroupId = rawGroupId === UNGROUPED_DROP_ID ? null : rawGroupId;
      if (activeRef.groupId === targetGroupId) return;
      moveCardToGroupAt(list.id, activeId, targetGroupId, 0);
      return;
    }

    // Dropped on another card in the same panel → reorder
    const overRef = list.cardRefs.find((r) => r.cardId === over.id);
    if (overRef && overRef.groupId === activeRef.groupId) {
      const from = list.cardRefs.findIndex((r) => r.cardId === active.id);
      const to = list.cardRefs.findIndex((r) => r.cardId === over.id);
      if (from >= 0 && to >= 0 && from !== to) {
        const next = list.cardRefs.slice();
        const [moved] = next.splice(from, 1);
        next.splice(to, 0, moved);
        setCardRefs(list.id, next);
      }
    }
  };

  const renderRow = (cardId: string) => {
    const card = deck.cards.find((c) => c.id === cardId);
    const body = (
      <SwipeableRow
        actions={[
          {
            label: 'Hide',
            icon: EyeOff,
            onClick: () => setHidden(list.id, cardId, true),
            className: 'bg-amber-500',
          },
          {
            label: 'Move',
            icon: FolderInput,
            onClick: () => setMoveTarget({ cardIds: [cardId] }),
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
    <div>
      <header className="sticky top-0 z-20 border-b bg-background px-3 supports-[backdrop-filter]:bg-background/85 supports-[backdrop-filter]:backdrop-blur-md md:px-5">
        <div className="flex items-center gap-2 py-2">
          <NavHamburger />
          <div className="min-w-0 flex-1">
            <InlineRenameHeading
              value={list.name}
              onChange={(next) => useAppStore.getState().renameList(list.id, next)}
            />
          </div>
          <ListMenu listId={list.id} />
        </div>
      </header>

      {mode === 'swipe' ? (
        <div className="pb-20">
          <SwipeSession listId={list.id} onDone={() => setMode('view')} />
        </div>
      ) : (
        <div className="flex flex-col gap-3 p-3 pb-20 md:p-5 md:pb-20">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={onDragEnd}
          >
            {/* Folders panel */}
            <section className="rounded-xl border bg-card">
              <div className="flex items-center gap-2 border-b px-3 py-2">
                <h3 className="flex-1 text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
                  Folders
                </h3>
                {groupDraft === null ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setGroupDraft('New folder')}
                  >
                    + New folder
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
                    aria-label="New folder name"
                    className="rounded-md border bg-background px-2 py-1 text-base"
                  />
                )}
              </div>
              <div className="max-h-[38svh] overflow-y-auto p-3">
                {list.groups.length === 0 ? (
                  <p className="py-6 text-center text-xs text-muted-foreground">
                    No folders yet. Create one, then drag cards onto it.
                  </p>
                ) : (
                  <SortableContext
                    items={list.groups.map((g) => `${GROUP_HEADER_PREFIX}${g.id}`)}
                    strategy={rectSortingStrategy}
                  >
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                      {list.groups.map((g) => (
                        <GroupTile
                          key={g.id}
                          listId={list.id}
                          group={g}
                          onOpen={() => setOpenGroupId(g.id)}
                        />
                      ))}
                    </div>
                  </SortableContext>
                )}
              </div>
            </section>

            {/* Ungrouped panel */}
            <section className="rounded-xl border bg-card">
              <div className="flex items-center gap-2 border-b px-3 py-2">
                <h3 className="flex-1 text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
                  Cards
                </h3>
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
                  >
                    <EyeOff className="h-4 w-4" aria-hidden />
                  </Button>
                )}
              </div>
              <MetaFilterBar
                optionsByKey={metaOptions}
                filters={metaFilters}
                onToggle={toggleMetaFilter}
                onClear={clearMetaFilter}
              />
              <div className="max-h-[50svh] overflow-y-auto p-3">
                <GroupDropZone groupId={null}>
                  <SortableContext
                    items={ungroupedRows.map((r) => r.cardId)}
                    strategy={verticalListSortingStrategy}
                  >
                    {ungroupedRows.length === 0 ? (
                      <p className="py-6 text-center text-xs text-muted-foreground">
                        {activeFilterCount > 0
                          ? 'No cards match the current filters.'
                          : 'No ungrouped cards.'}
                      </p>
                    ) : (
                      <ul className="space-y-1.5">
                        {ungroupedRows.map((r) => renderRow(r.cardId))}
                      </ul>
                    )}
                  </SortableContext>
                </GroupDropZone>
              </div>
            </section>
          </DndContext>

          <ExerciseSheet listId={list.id} />
          <HiddenCardsSheet listId={list.id} />
          <GroupDetailSheet
            listId={list.id}
            groupId={openGroupId}
            onOpenChange={(o) => !o && setOpenGroupId(null)}
          />
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
                  <DialogTitle>New folder from {selected.size} cards</DialogTitle>
                </DialogHeader>
                <GroupNameInput
                  onConfirm={(name) => {
                    const id = addGroup(list.id, name);
                    selected.forEach((cardId) => moveCardToGroup(list.id, cardId, id));
                    setNewGroupFromSelectionOpen(false);
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
        </div>
      )}

      <nav
        aria-label="View mode"
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-2 border-t bg-background supports-[backdrop-filter]:bg-background/90 supports-[backdrop-filter]:backdrop-blur-md"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <button
          type="button"
          onClick={() => setMode('view')}
          className={cn(
            'flex items-center justify-center gap-2 py-3 text-sm font-medium',
            mode === 'view' ? 'text-foreground' : 'text-muted-foreground',
          )}
        >
          List
        </button>
        <button
          type="button"
          onClick={() => setMode('swipe')}
          className={cn(
            'flex items-center justify-center gap-2 py-3 text-sm font-medium',
            mode === 'swipe' ? 'text-foreground' : 'text-muted-foreground',
          )}
        >
          Swipe
        </button>
      </nav>
    </div>
  );
}
