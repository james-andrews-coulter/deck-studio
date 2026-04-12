import { useShallow } from 'zustand/react/shallow';
import { useAppStore } from '@/store';
import { EmptyState } from '@/components/EmptyState';
import { ImportDeckButton } from '@/components/ImportDeckButton';
import { DeckDetailSheet } from '@/components/DeckDetailSheet';

export default function DecksScreen() {
  const decks = useAppStore(useShallow((s) => Object.values(s.decks)));
  const setDeckDetail = useAppStore((s) => s.setDeckDetail);
  return (
    <div className="p-4 md:p-6">
      <header className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Decks</h2>
        <ImportDeckButton />
      </header>

      {decks.length === 0 ? (
        <EmptyState
          title="No decks yet"
          body="Import a deck to get started. Try the sample:"
          action={
            <a className="underline" href="/sample-deck.json" download>
              Download sample deck
            </a>
          }
        />
      ) : (
        <ul className="mt-4 divide-y rounded-md border">
          {decks.map((d) => (
            <li key={d.id}>
              <button
                type="button"
                onClick={() => setDeckDetail(d.id)}
                className="flex w-full items-center justify-between p-3 text-left hover:bg-muted"
              >
                <span className="font-medium">{d.name}</span>
                <span className="text-xs text-muted-foreground">
                  {d.cards.length} {d.cards.length === 1 ? 'card' : 'cards'} ·{' '}
                  {new Date(d.importedAt).toLocaleDateString()}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <DeckDetailSheet />
    </div>
  );
}
