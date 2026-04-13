import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from './ui/dialog';
import { parseDeck, ImportError } from '@/lib/importer';
import { useAppStore } from '@/store';
import { hasShownFirstImport, markFirstImportShown } from '@/lib/firstRun';

export function ImportDeckButton() {
  const inputRef = useRef<HTMLInputElement>(null);
  const addDeck = useAppStore((s) => s.addDeck);
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  const onFile = async (file: File) => {
    try {
      const text = await file.text();
      const parsed = parseDeck(text, file.name);
      const id = addDeck({
        name: parsed.name,
        fieldMapping: parsed.fieldMapping,
        cards: parsed.cards,
        ...(parsed.exercises.length > 0 ? { exercises: parsed.exercises } : {}),
      });
      if (parsed.warnings.includes('duplicate_ids')) {
        toast.warning('Some duplicate card IDs were removed.');
      }
      if (parsed.warnings.some((w) => w.startsWith('exercise_'))) {
        toast.warning('Some exercises were skipped — check the deck JSON.');
      }
      const isFirstImport = !hasShownFirstImport();
      if (isFirstImport) markFirstImportShown();
      if (parsed.skippedMapping) {
        toast.success(`Imported "${parsed.name}" (${parsed.cards.length} cards)`);
        if (isFirstImport) {
          toast.message('Now create a list from your deck to start curating.', { duration: 6000 });
        }
        navigate('/decks');
      } else {
        if (parsed.warnings.includes('preconfigured_title_unresolved')) {
          toast.warning('Pre-configured title field was not found; please map it.');
        }
        navigate(`/decks/${id}/configure`);
      }
    } catch (err) {
      if (err instanceof ImportError) {
        setError(err.message);
      } else {
        setError("Couldn't save deck. Storage may be full.");
      }
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = '';
        }}
      />
      <Button onClick={() => inputRef.current?.click()}>+ Import deck</Button>

      <Dialog open={!!error} onOpenChange={(o) => !o && setError(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Couldn't import deck</DialogTitle>
            <DialogDescription>{error}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setError(null)}>Dismiss</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
