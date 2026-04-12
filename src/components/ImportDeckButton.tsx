import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from './ui/button';
import { parseDeck, ImportError } from '@/lib/importer';
import { useAppStore } from '@/store';

export function ImportDeckButton() {
  const inputRef = useRef<HTMLInputElement>(null);
  const addDeck = useAppStore((s) => s.addDeck);
  const navigate = useNavigate();

  const onFile = async (file: File) => {
    try {
      const text = await file.text();
      const parsed = parseDeck(text, file.name);
      const id = addDeck({
        name: parsed.name,
        fieldMapping: parsed.fieldMapping,
        cards: parsed.cards,
      });
      if (parsed.warnings.includes('duplicate_ids')) {
        toast.warning('Some duplicate card IDs were removed.');
      }
      if (parsed.skippedMapping) {
        toast.success(`Imported "${parsed.name}" (${parsed.cards.length} cards)`);
        navigate('/decks');
      } else {
        if (parsed.warnings.includes('preconfigured_title_unresolved')) {
          toast.warning('Pre-configured title field was not found; please map it.');
        }
        navigate(`/decks/${id}/configure`);
      }
    } catch (err) {
      if (err instanceof ImportError) {
        toast.error(err.message);
      } else {
        toast.error("Couldn't save deck. Storage may be full.");
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
    </>
  );
}
