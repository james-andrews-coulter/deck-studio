import { Button } from './ui/button';

type Props = {
  count: number;
  onClear: () => void;
  onNewGroup: () => void;
  onMoveTo: () => void;
};

export function SelectionActionBar({ count, onClear, onNewGroup, onMoveTo }: Props) {
  if (count === 0) return null;
  return (
    <div className="fixed inset-x-2 bottom-20 z-40 mx-auto flex max-w-md items-center justify-between gap-2 rounded-full border bg-background p-2 shadow-lg">
      <span className="pl-3 text-sm">Selected</span>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={onClear}>
          Clear
        </Button>
        {count >= 2 && (
          <Button size="sm" variant="outline" onClick={onNewGroup}>
            New group
          </Button>
        )}
        <Button size="sm" onClick={onMoveTo}>
          Move to…
        </Button>
      </div>
    </div>
  );
}
