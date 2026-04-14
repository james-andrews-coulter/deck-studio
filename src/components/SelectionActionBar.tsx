import { Button } from './ui/button';

type Props = {
  count: number;
  onClear: () => void;
  onSelectAll: () => void;
  onNewGroup: () => void;
  onMoveTo: () => void;
};

export function SelectionActionBar({
  count,
  onClear,
  onSelectAll,
  onNewGroup,
  onMoveTo,
}: Props) {
  return (
    <div className="fixed inset-x-2 bottom-20 z-40 mx-auto flex max-w-md flex-wrap items-center justify-end gap-2 rounded-full border bg-background p-2 shadow-lg">
      <Button size="sm" variant="outline" onClick={onSelectAll}>
        All
      </Button>
      <Button size="sm" variant="outline" onClick={onClear} disabled={count === 0}>
        Clear
      </Button>
      {count >= 2 && (
        <Button size="sm" variant="outline" onClick={onNewGroup}>
          New group
        </Button>
      )}
      <Button size="sm" onClick={onMoveTo} disabled={count === 0}>
        Move to…
      </Button>
    </div>
  );
}
