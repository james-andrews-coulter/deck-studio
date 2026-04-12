import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MoreVertical } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { EmptyState } from '@/components/EmptyState';
import { useAppStore } from '@/store';
import { exportListFile } from '@/lib/exportListFile';

export default function ListsScreen() {
  const lists = useAppStore(
    useShallow((s) =>
      Object.values(s.lists).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    )
  );
  const decks = useAppStore(useShallow((s) => Object.values(s.decks)));
  const createList = useAppStore((s) => s.createList);
  const deleteList = useAppStore((s) => s.deleteList);
  const renameList = useAppStore((s) => s.renameList);
  const duplicateList = useAppStore((s) => s.duplicateList);
  const navigate = useNavigate();

  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardDeckId, setWizardDeckId] = useState<string>('');
  const [wizardName, setWizardName] = useState('');

  const [renameTarget, setRenameTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const visibleCount = useMemo(() => {
    const counts: Record<string, { visible: number; total: number }> = {};
    for (const l of lists) {
      const total = l.cardRefs.length;
      const visible = l.cardRefs.filter((r) => !r.hidden).length;
      counts[l.id] = { visible, total };
    }
    return counts;
  }, [lists]);

  const onCreate = () => {
    if (!wizardDeckId || !wizardName.trim()) return;
    const id = createList(wizardDeckId, wizardName.trim());
    setWizardOpen(false);
    setWizardName('');
    navigate(`/lists/${id}`);
  };

  const commitRename = () => {
    if (!renameTarget) return;
    const trimmed = renameTarget.name.trim();
    if (trimmed) renameList(renameTarget.id, trimmed);
    setRenameTarget(null);
  };

  return (
    <div className="p-4 md:p-6">
      <header className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Lists</h2>
        <Button onClick={() => setWizardOpen(true)} disabled={decks.length === 0}>
          + New list
        </Button>
      </header>

      {lists.length === 0 ? (
        <EmptyState
          title="No lists yet"
          body={decks.length === 0 ? 'Import a deck first.' : 'Create a list from a deck.'}
        />
      ) : (
        <ul className="mt-4 divide-y rounded-md border">
          {lists.map((l) => {
            const deck = useAppStore.getState().decks[l.deckId];
            const c = visibleCount[l.id];
            return (
              <li key={l.id} className="flex items-center">
                <Link className="flex-1 p-3 hover:bg-muted" to={`/lists/${l.id}`}>
                  <div className="font-medium">{l.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {deck?.name ?? 'Unknown deck'} · {c.visible}/{c.total} cards ·{' '}
                    {new Date(l.updatedAt).toLocaleDateString()}
                  </div>
                </Link>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" aria-label="List actions">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => setRenameTarget({ id: l.id, name: l.name })}
                    >
                      Rename
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => duplicateList(l.id)}>
                      Duplicate
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      disabled={!deck}
                      onClick={() => {
                        if (deck) exportListFile(l, deck);
                      }}
                    >
                      Export as markdown
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-red-600"
                      onClick={() => setDeleteTarget({ id: l.id, name: l.name })}
                    >
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </li>
            );
          })}
        </ul>
      )}

      <Dialog open={wizardOpen} onOpenChange={setWizardOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create a new list</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <label className="block text-sm font-medium">
              Deck
              <select
                className="mt-1 w-full rounded-md border bg-background p-2 text-sm"
                value={wizardDeckId}
                onChange={(e) => setWizardDeckId(e.target.value)}
              >
                <option value="">Select a deck…</option>
                {decks.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-medium">
              Name
              <input
                className="mt-1 w-full rounded-md border bg-background p-2 text-sm"
                value={wizardName}
                onChange={(e) => setWizardName(e.target.value)}
                placeholder="My shortlist"
              />
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWizardOpen(false)}>
              Cancel
            </Button>
            <Button onClick={onCreate} disabled={!wizardDeckId || !wizardName.trim()}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!renameTarget} onOpenChange={(o) => !o && setRenameTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename list</DialogTitle>
          </DialogHeader>
          <input
            autoFocus
            className="w-full rounded-md border bg-background p-2 text-sm"
            value={renameTarget?.name ?? ''}
            onChange={(e) =>
              setRenameTarget((t) => (t ? { ...t, name: e.target.value } : t))
            }
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitRename();
              if (e.key === 'Escape') setRenameTarget(null);
            }}
            aria-label="List name"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameTarget(null)}>
              Cancel
            </Button>
            <Button onClick={commitRename} disabled={!renameTarget?.name.trim()}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Delete this list?"
        description={deleteTarget ? `"${deleteTarget.name}" will be removed permanently.` : undefined}
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          if (deleteTarget) deleteList(deleteTarget.id);
        }}
      />
    </div>
  );
}
