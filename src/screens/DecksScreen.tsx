import { Link } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';
import { useAppStore } from '@/store';
import { EmptyState } from '@/components/EmptyState';
import { ImportDeckButton } from '@/components/ImportDeckButton';

export default function DecksScreen() {
  const decks = useAppStore(useShallow((s) => Object.values(s.decks)));
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
              <Link
                to={`/decks/${d.id}`}
                className="flex items-center justify-between p-3 hover:bg-muted"
              >
                <span className="font-medium">{d.name}</span>
                <span className="text-xs text-muted-foreground">
                  {d.cards.length} cards · {new Date(d.importedAt).toLocaleDateString()}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
