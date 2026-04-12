import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from './ui/dialog';
import { Button } from './ui/button';
import type { Group } from '@/lib/types';

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  groups: Group[];
  onPick: (groupId: string | null) => void;
};

export function MoveToGroupDialog({ open, onOpenChange, groups, onPick }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Move to group</DialogTitle>
        </DialogHeader>
        <ul className="max-h-80 space-y-1 overflow-y-auto">
          <li>
            <button
              type="button"
              className="w-full rounded-md px-3 py-2 text-left text-sm hover:bg-muted"
              onClick={() => {
                onPick(null);
                onOpenChange(false);
              }}
            >
              (Ungrouped)
            </button>
          </li>
          {groups.map((g) => (
            <li key={g.id}>
              <button
                type="button"
                className="w-full rounded-md px-3 py-2 text-left text-sm hover:bg-muted"
                onClick={() => {
                  onPick(g.id);
                  onOpenChange(false);
                }}
              >
                {g.name}
              </button>
            </li>
          ))}
        </ul>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
