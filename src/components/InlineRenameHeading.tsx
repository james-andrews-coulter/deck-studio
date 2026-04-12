import { useState } from 'react';

type Props = { value: string; onChange: (next: string) => void };

export function InlineRenameHeading({ value, onChange }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  if (editing) {
    return (
      <input
        autoFocus
        className="rounded-md border bg-background px-2 py-1 text-xl font-semibold"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => { if (draft.trim()) onChange(draft.trim()); setEditing(false); }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { if (draft.trim()) onChange(draft.trim()); setEditing(false); }
          if (e.key === 'Escape') { setDraft(value); setEditing(false); }
        }}
      />
    );
  }
  return (
    <button className="text-left text-xl font-semibold hover:underline" onClick={() => { setDraft(value); setEditing(true); }}>
      {value}
    </button>
  );
}
