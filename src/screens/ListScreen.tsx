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
import { DrawCardDialog } from '@/components/DrawCardDialog';
import { InlineRenameHeading } from '@/components/InlineRenameHeading';
import { GroupHeader } from '@/components/GroupHeader';
import { SortableCard } from '@/components/SortableCard';
import { ListMenu } from '@/components/ListMenu';
import { SwipeSession } from '@/components/SwipeSession';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function ListScreen() {
  const { listId = '' } = useParams();
  const list = useAppStore((s) => s.lists[listId]);
  const deck = useAppStore((s) => (list ? s.decks[list.deckId] : undefined));
  const addGroup = useAppStore((s) => s.addGroup);
  const collapsed = useAppStore((s) => s.ui.collapsedGroups);
  const setCardRefs = useAppStore((s) => s.setCardRefs);
  const moveCardToGroupAt = useAppStore((s) => s.moveCardToGroupAt);
  const setHiddenSheetOpen = useAppStore((s) => s.setHiddenSheetOpen);
  const setDrawOpen = useAppStore((s) => s.setDrawCardOpen);

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
    const activeRef = list.cardRefs.find((r) => r.cardId === active.id);
    const overRef = list.cardRefs.find((r) => r.cardId === over.id);
    if (!activeRef) return;
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
      moveCardToGroupAt(list.id, String(active.id), overRef.groupId, idx);
    }
  };

  const ungroupedRows = refsByGroup(null);

  return (
    <div className="p-3 md:p-5">
      <header className="flex items-center gap-2">
        <InlineRenameHeading
          value={list.name}
          onChange={(next) => useAppStore.getState().renameList(list.id, next)}
        />
        {hiddenCount > 0 && (
          <button
            onClick={() => setHiddenSheetOpen(true)}
            aria-label="Show hidden cards"
            className="ml-auto rounded-full bg-muted px-3 py-1 text-xs"
          >
            {hiddenCount} hidden
          </button>
        )}
        {groupDraft === null ? (
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
        )}
        <div className="ml-2 inline-flex rounded-md border p-0.5 text-xs">
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
        {list.groups.map((g) => {
          const rows = refsByGroup(g.id);
          return (
            <section key={g.id} className="mt-4">
              <GroupHeader listId={list.id} group={g} count={rows.length} />
              {!collapsed[g.id] && (
                <SortableContext
                  items={rows.map((r) => r.cardId)}
                  strategy={verticalListSortingStrategy}
                >
                  <ul className="mt-2 space-y-1.5">
                    {rows.map((r) => {
                      const card = deck.cards.find((c) => c.id === r.cardId);
                      return (
                        <SortableCard key={r.cardId} id={r.cardId}>
                          {card ? (
                            <CardView card={card} mapping={deck.fieldMapping} />
                          ) : (
                            <div className="rounded border p-2 text-sm italic text-muted-foreground">
                              Missing card
                            </div>
                          )}
                        </SortableCard>
                      );
                    })}
                  </ul>
                </SortableContext>
              )}
            </section>
          );
        })}

        {ungroupedRows.length > 0 && (
          <section className="mt-4">
            <h3 className="mb-2 text-sm font-semibold uppercase text-muted-foreground">(Ungrouped)</h3>
            <SortableContext
              items={ungroupedRows.map((r) => r.cardId)}
              strategy={verticalListSortingStrategy}
            >
              <ul className="space-y-1.5">
                {ungroupedRows.map((r) => {
                  const card = deck.cards.find((c) => c.id === r.cardId);
                  return (
                    <SortableCard key={r.cardId} id={r.cardId}>
                      {card ? (
                        <CardView card={card} mapping={deck.fieldMapping} />
                      ) : (
                        <div className="rounded border p-2 text-sm italic text-muted-foreground">
                          Missing card
                        </div>
                      )}
                    </SortableCard>
                  );
                })}
              </ul>
            </SortableContext>
          </section>
        )}
      </DndContext>

      <HiddenCardsSheet listId={list.id} />

      <button
        aria-label="Draw a random card"
        onClick={() => setDrawOpen(true)}
        className="fixed bottom-20 right-4 z-20 rounded-full bg-primary px-5 py-3 text-primary-foreground shadow-lg md:bottom-8"
      >
        🎲 Draw
      </button>
      <DrawCardDialog listId={list.id} />
        </>
      )}
    </div>
  );
}
