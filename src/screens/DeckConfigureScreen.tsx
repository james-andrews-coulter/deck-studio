import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { useAppStore } from '@/store';
import { FieldMappingEditor } from '@/components/FieldMappingEditor';
import type { FieldMapping } from '@/lib/types';

export default function DeckConfigureScreen() {
  const { deckId = '' } = useParams();
  const deck = useAppStore((s) => s.decks[deckId]);
  const updateMapping = useAppStore((s) => s.updateDeckMapping);
  const navigate = useNavigate();

  const detectedKeys = useMemo(
    () => (deck ? Array.from(new Set(deck.cards.flatMap((c) => Object.keys(c.fields)))).sort() : []),
    [deck]
  );

  if (!deck) {
    return <div className="p-6">Deck not found. <button className="underline" onClick={() => navigate('/decks')}>Go to Decks</button></div>;
  }

  const onSave = (mapping: FieldMapping) => {
    updateMapping(deckId, mapping);
    toast.success(`Saved mapping for "${deck.name}"`);
    navigate('/decks');
  };

  return (
    <FieldMappingEditor
      cards={deck.cards}
      detectedKeys={detectedKeys}
      initial={deck.fieldMapping}
      onSave={onSave}
    />
  );
}
