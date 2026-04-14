import { EyeOff } from 'lucide-react';
import { Button } from './ui/button';

type Props = {
  count: number;
  onClear: () => void;
  onSelectAll: () => void;
  onHide: () => void;
  onNewGroup: () => void;
  onMoveTo: () => void;
};

export function SelectionActionBar({
  count,
  onClear,
  onSelectAll,
  onHide,
  onNewGroup,
  onMoveTo,
}: Props) {
  const disabled = count === 0;
  return (
    <div className="fixed inset-x-2 bottom-20 z-40 mx-auto flex max-w-md flex-wrap items-center justify-end gap-2 rounded-2xl border bg-background p-2 shadow-lg">
      <Button size="sm" variant="outline" onClick={onSelectAll}>
        All
      </Button>
      <Button size="sm" variant="outline" onClick={onClear} disabled={disabled}>
        Clear
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={onHide}
        disabled={disabled}
        aria-label="Hide selected"
      >
        <EyeOff className="mr-1 h-4 w-4" aria-hidden />
        Hide
      </Button>
      {count >= 2 && (
        <Button size="sm" variant="outline" onClick={onNewGroup}>
          New folder
        </Button>
      )}
      <Button size="sm" onClick={onMoveTo} disabled={disabled}>
        Move to…
      </Button>
    </div>
  );
}
