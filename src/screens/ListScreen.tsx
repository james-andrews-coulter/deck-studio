import { useParams } from 'react-router-dom';
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
import { CardDetailSheet } from '@/components/CardDetailSheet';
import { HiddenCardsSheet } from '@/components/HiddenCardsSheet';
import { InlineRenameHeading } from '@/components/InlineRenameHeading';
import { GroupHeader } from '@/components/GroupHeader';
import { SortableCard } from '@/components/SortableCard';
import { Button } from '@/components/ui/button';

export default function ListScreen() {
  const { listId = '' } = useParams();
  const list = useAppStore((s) => s.lists[listId]);
  const deck = useAppStore((s) => (list ? s.decks[list.deckId] : undefined));
  const setCardDetail = useAppStore((s) => s.setCardDetail);
  const addGroup = useAppStore((s) => s.addGroup);
  const collapsed = useAppStore((s) => s.ui.collapsedGroups);
  const setCardRefs = useAppStore((s) => s.setCardRefs);
  const moveCardToGroupAt = useAppStore((s) => s.moveCardToGroupAt);
  const setHiddenSheetOpen = useAppStore((s) => s.setHiddenSheetOpen);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  if (!list) return <div className="p-6">List not found.</div>;
  if (!deck) return <div className="p-6">This list's deck is missing. Re-import it or delete the list.</div>;

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
    <div className="p-4 md:p-6">
      <header className="flex items-center gap-2">
        <InlineRenameHeading
          value={list.name}
          onChange={(next) => useAppStore.getState().renameList(list.id, next)}
        />
        {hiddenCount > 0 && (
          <button
            onClick={() => setHiddenSheetOpen(true)}
            className="ml-auto rounded-full bg-muted px-3 py-1 text-xs"
          >
            {hiddenCount} hidden
          </button>
        )}
        <Button
          size="sm"
          variant="outline"
          className={hiddenCount > 0 ? '' : 'ml-auto'}
          onClick={() => {
            const name = prompt('Group name', 'New group');
            if (name && name.trim()) addGroup(list.id, name.trim());
          }}
        >
          + Group
        </Button>
      </header>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        {list.groups.map((g) => {
          const rows = refsByGroup(g.id);
          return (
            <section key={g.id} className="mt-6">
              <GroupHeader listId={list.id} group={g} count={rows.length} />
              {!collapsed[g.id] && (
                <SortableContext
                  items={rows.map((r) => r.cardId)}
                  strategy={verticalListSortingStrategy}
                >
                  <ul className="mt-2 space-y-2">
                    {rows.map((r) => {
                      const card = deck.cards.find((c) => c.id === r.cardId);
                      return (
                        <SortableCard key={r.cardId} id={r.cardId}>
                          <button
                            type="button"
                            className="w-full text-left"
                            onClick={() => setCardDetail({ listId: list.id, cardId: r.cardId })}
                          >
                            {card ? (
                              <CardView card={card} mapping={deck.fieldMapping} />
                            ) : (
                              <div className="rounded border p-2 text-sm italic text-muted-foreground">
                                Missing card
                              </div>
                            )}
                          </button>
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
          <section className="mt-6">
            <h3 className="mb-2 text-sm font-semibold uppercase text-muted-foreground">(Ungrouped)</h3>
            <SortableContext
              items={ungroupedRows.map((r) => r.cardId)}
              strategy={verticalListSortingStrategy}
            >
              <ul className="space-y-2">
                {ungroupedRows.map((r) => {
                  const card = deck.cards.find((c) => c.id === r.cardId);
                  return (
                    <SortableCard key={r.cardId} id={r.cardId}>
                      <button
                        type="button"
                        className="w-full text-left"
                        onClick={() => setCardDetail({ listId: list.id, cardId: r.cardId })}
                      >
                        {card ? (
                          <CardView card={card} mapping={deck.fieldMapping} />
                        ) : (
                          <div className="rounded border p-2 text-sm italic text-muted-foreground">
                            Missing card
                          </div>
                        )}
                      </button>
                    </SortableCard>
                  );
                })}
              </ul>
            </SortableContext>
          </section>
        )}
      </DndContext>

      <CardDetailSheet listId={list.id} />
      <HiddenCardsSheet listId={list.id} />
    </div>
  );
}
