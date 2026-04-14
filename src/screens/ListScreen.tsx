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
} from '@dnd-kit/sortable';
import { useAppStore } from '@/store';
import { CardView } from '@/components/CardView';
import { HiddenCardsSheet } from '@/components/HiddenCardsSheet';
import { ExerciseSheet } from '@/components/ExerciseSheet';
import { InlineRenameHeading } from '@/components/InlineRenameHeading';
import { GroupTile } from '@/components/GroupTile';
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
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { BuildFromKeptDialog } from '@/components/BuildFromKeptDialog';
import { cardMatchesFilters, getMetaFilterOptions } from '@/lib/metaFilters';
import { shuffle } from '@/lib/shuffle';
import { useListSelection } from '@/hooks/useListSelection';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { ArrowLeft, EyeOff, FolderInput, Shuffle, Trash2 } from 'lucide-react';
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
  const renameGroup = useAppStore((s) => s.renameGroup);
  const deleteGroup = useAppStore((s) => s.deleteGroup);
  const setCardRefs = useAppStore((s) => s.setCardRefs);
  const moveCardToGroupAt = useAppStore((s) => s.moveCardToGroupAt);
  const moveCardToGroup = useAppStore((s) => s.moveCardToGroup);
  const setHidden = useAppStore((s) => s.setHidden);
  const setHiddenSheetOpen = useAppStore((s) => s.setHiddenSheetOpen);

  const [moveTarget, setMoveTarget] = useState<{ cardIds: string[] } | null>(null);
  const [newGroupFromSelectionOpen, setNewGroupFromSelectionOpen] = useState(false);
  const [metaFilters, setMetaFilters] = useState<Record<string, Set<string>>>({});
  const [confirmDeleteFolder, setConfirmDeleteFolder] = useState(false);
  const [buildFromKeptOpen, setBuildFromKeptOpen] = useState(false);
  const {
    selectMode,
    selected,
    toggleSelect,
    clearSelection,
    selectAll,
    toggleSelectMode,
  } = useListSelection();

  const [params, setParams] = useSearchParams();
  const mode = (params.get('mode') ?? 'view') as 'view' | 'swipe';
  const folderScope = params.get('folder');
  const setMode = (m: 'view' | 'swipe') =>
    setParams((p) => {
      p.set('mode', m);
      return p;
    });
  const openFolder = (groupId: string) =>
    setParams((p) => {
      p.set('folder', groupId);
      return p;
    });
  const closeFolder = () =>
    setParams((p) => {
      p.delete('folder');
      return p;
    });

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
      </div>
    );
  }

  // Resolve folder scope. If the URL points at a folder that no longer exists,
  // drop the param silently.
  const scopedGroup = folderScope
    ? list.groups.find((g) => g.id === folderScope)
    : undefined;
  if (folderScope && !scopedGroup) {
    closeFolder();
  }
  const inFolder = !!scopedGroup;

  const hiddenCount = list.cardRefs.filter((r) => r.hidden).length;
  const activeFilterCount = Object.values(metaFilters).reduce((n, s) => n + s.size, 0);

  // Cards the current panel shows: either the selected folder's cards, or
  // top-level ungrouped cards. Filters apply to either.
  const panelRows = list.cardRefs
    .filter((r) => {
      if (r.hidden) return false;
      if (inFolder) return r.groupId === scopedGroup!.id;
      return r.groupId === null;
    })
    .filter((r) => {
      if (activeFilterCount === 0) return true;
      const card = deck.cards.find((c) => c.id === r.cardId);
      if (!card) return true;
      return cardMatchesFilters(card, metaFilters);
    });

  const panelDropZoneGroupId: string | null = inFolder ? scopedGroup!.id : null;

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

    const activeRef = list.cardRefs.find((r) => r.cardId === activeId);
    if (!activeRef) return;

    if (overId.startsWith(GROUP_HEADER_PREFIX)) {
      const targetGroupId = overId.slice(GROUP_HEADER_PREFIX.length);
      if (activeRef.groupId === targetGroupId) return;
      moveCardToGroupAt(list.id, activeId, targetGroupId, 0);
      return;
    }

    if (overId.startsWith(GROUP_DROP_PREFIX)) {
      const rawGroupId = overId.slice(GROUP_DROP_PREFIX.length);
      const targetGroupId = rawGroupId === UNGROUPED_DROP_ID ? null : rawGroupId;
      if (activeRef.groupId === targetGroupId) return;
      moveCardToGroupAt(list.id, activeId, targetGroupId, 0);
      return;
    }

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

  const onShufflePanel = () => {
    if (panelRows.length < 2) return;
    // Pull in-scope-and-visible positions + their refs out of list.cardRefs,
    // shuffle the refs, and write them back into the same positions.
    const originals = list.cardRefs;
    const positions: number[] = [];
    for (let i = 0; i < originals.length; i++) {
      const r = originals[i];
      if (r.hidden) continue;
      const inScope = inFolder
        ? r.groupId === scopedGroup!.id
        : r.groupId === null;
      if (!inScope) continue;
      if (activeFilterCount > 0) {
        const card = deck.cards.find((c) => c.id === r.cardId);
        if (!card || !cardMatchesFilters(card, metaFilters)) continue;
      }
      positions.push(i);
    }
    if (positions.length < 2) return;
    const shuffledRefs = shuffle(positions.map((i) => originals[i]));
    const next = originals.slice();
    positions.forEach((idx, n) => {
      next[idx] = shuffledRefs[n];
    });
    setCardRefs(list.id, next);
  };

  const onHideSelected = () => {
    for (const cardId of selected) setHidden(list.id, cardId, true);
    clearSelection();
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

  const panelTitle = inFolder ? null : 'Cards';
  const emptyMessage = activeFilterCount > 0
    ? 'No cards match the current filters.'
    : inFolder
      ? 'No cards in this folder yet.'
      : 'No ungrouped cards.';

  return (
    <div>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={onDragEnd}
      >
        {/* Everything above the scrolling card list is one sticky block so
            header + folder strip + panel chrome + filters all stay visible.
            Solid bg — avoids backdrop-filter creating a stacking context
            that fights with Radix portaled dropdowns on iOS Safari. */}
        <div className="sticky top-0 z-20 border-b bg-background">
          <header className="flex items-center gap-2 px-3 py-2 md:px-5">
            {inFolder ? (
              <Button
                size="icon"
                variant="ghost"
                aria-label="Back to list"
                onClick={closeFolder}
              >
                <ArrowLeft className="h-5 w-5" aria-hidden />
              </Button>
            ) : (
              <NavHamburger />
            )}
            <div className="min-w-0 flex-1">
              {inFolder ? (
                <InlineRenameHeading
                  value={scopedGroup!.name}
                  onChange={(next) => renameGroup(list.id, scopedGroup!.id, next)}
                />
              ) : (
                <InlineRenameHeading
                  value={list.name}
                  onChange={(next) => useAppStore.getState().renameList(list.id, next)}
                />
              )}
            </div>
            {inFolder ? (
              <Button
                size="icon"
                variant="ghost"
                aria-label="Delete folder"
                onClick={() => setConfirmDeleteFolder(true)}
              >
                <Trash2 className="h-5 w-5 text-red-600" aria-hidden />
              </Button>
            ) : (
              <ListMenu
                listId={list.id}
                onBuildFromKept={() => setBuildFromKeptOpen(true)}
              />
            )}
          </header>

          {mode === 'view' && !inFolder && (
            <div
              className="flex max-h-[9rem] flex-col gap-1.5 overflow-y-auto border-t px-3 py-2 md:px-5"
              style={{ overscrollBehavior: 'contain' }}
            >
              <SortableContext
                items={list.groups.map((g) => `${GROUP_HEADER_PREFIX}${g.id}`)}
                strategy={verticalListSortingStrategy}
              >
                {list.groups.map((g) => (
                  <GroupTile
                    key={g.id}
                    listId={list.id}
                    group={g}
                    onOpen={() => openFolder(g.id)}
                    onDelete={() => deleteGroup(list.id, g.id)}
                  />
                ))}
              </SortableContext>
              {groupDraft === null ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setGroupDraft('New folder')}
                  className="self-start"
                >
                  + Folder
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
          )}

          {mode === 'view' && (
            <div className="flex items-center gap-2 border-t px-3 py-2 md:px-5">
              {panelTitle ? (
                <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
                  {panelTitle}
                </h3>
              ) : null}
              <Button
                size="sm"
                variant={selectMode ? 'default' : 'outline'}
                onClick={toggleSelectMode}
              >
                {selectMode ? 'Done' : 'Select'}
              </Button>
              <Button
                size="icon"
                variant="outline"
                aria-label="Shuffle cards"
                onClick={onShufflePanel}
                disabled={panelRows.length < 2}
              >
                <Shuffle className="h-4 w-4" aria-hidden />
              </Button>
              {!inFolder && hiddenCount > 0 && (
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
          {/* Filters apply to both view and swipe so the user can refine the
              swipe queue mid-session without leaving the screen. */}
          <MetaFilterBar
            optionsByKey={metaOptions}
            filters={metaFilters}
            onToggle={toggleMetaFilter}
            onClear={clearMetaFilter}
            onSelectAll={(key) => {
              setMetaFilters((prev) => ({
                ...prev,
                [key]: new Set(metaOptions[key] ?? []),
              }));
            }}
          />
        </div>

        {mode === 'swipe' ? (
          <div className="pb-20">
            <SwipeSession
              listId={list.id}
              metaFilters={metaFilters}
              scopeGroupId={inFolder ? scopedGroup!.id : undefined}
              onDone={() => setMode('view')}
            />
          </div>
        ) : (
          <div className="p-3 pb-24 md:p-5 md:pb-24">
            <GroupDropZone groupId={panelDropZoneGroupId}>
              <SortableContext
                items={panelRows.map((r) => r.cardId)}
                strategy={verticalListSortingStrategy}
              >
                {panelRows.length === 0 ? (
                  <p className="py-8 text-center text-xs text-muted-foreground">
                    {emptyMessage}
                  </p>
                ) : (
                  <ul className="space-y-1.5">
                    {panelRows.map((r) => renderRow(r.cardId))}
                  </ul>
                )}
              </SortableContext>
            </GroupDropZone>
          </div>
        )}
      </DndContext>

      <ExerciseSheet listId={list.id} />
      <HiddenCardsSheet listId={list.id} />
      <BuildFromKeptDialog
        listId={list.id}
        open={buildFromKeptOpen}
        onOpenChange={setBuildFromKeptOpen}
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
      <ConfirmDialog
        open={confirmDeleteFolder}
        onOpenChange={setConfirmDeleteFolder}
        title={scopedGroup ? `Delete folder "${scopedGroup.name}"?` : 'Delete folder?'}
        description="Cards in this folder will move to Ungrouped."
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          if (scopedGroup) {
            deleteGroup(list.id, scopedGroup.id);
            closeFolder();
          }
          setConfirmDeleteFolder(false);
        }}
      />

      {selectMode && (
        <SelectionActionBar
          count={selected.size}
          onClear={clearSelection}
          onSelectAll={() => selectAll(panelRows.map((r) => r.cardId))}
          onHide={onHideSelected}
          onNewGroup={() => setNewGroupFromSelectionOpen(true)}
          onMoveTo={() => setMoveTarget({ cardIds: Array.from(selected) })}
        />
      )}

      <nav
        aria-label="View mode"
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-2 border-t bg-background"
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
