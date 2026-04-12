import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { DialogFooter } from '@/components/ui/dialog';

type Props = {
  defaultValue?: string;
  onConfirm: (name: string) => void;
  onCancel: () => void;
  confirmLabel?: string;
};

export function GroupNameInput({
  defaultValue = '',
  onConfirm,
  onCancel,
  confirmLabel = 'Create group',
}: Props) {
  const [name, setName] = useState(defaultValue);
  const trimmed = name.trim();
  const disabled = trimmed.length === 0;

  const commit = () => {
    if (disabled) return;
    onConfirm(trimmed);
  };

  return (
    <>
      <input
        autoFocus
        className="w-full rounded-md border bg-background p-2"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit();
          if (e.key === 'Escape') onCancel();
        }}
        placeholder="Group name"
        aria-label="Group name"
      />
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={commit} disabled={disabled}>
          {confirmLabel}
        </Button>
      </DialogFooter>
    </>
  );
}
