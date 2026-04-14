import { ChevronDown, Filter, X } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';

type Props = {
  optionsByKey: Record<string, string[]>;
  filters: Record<string, Set<string>>;
  onToggle: (key: string, value: string) => void;
  onClear: (key: string) => void;
  onSelectAll?: (key: string) => void;
};

export function MetaFilterBar({
  optionsByKey,
  filters,
  onToggle,
  onClear,
  onSelectAll,
}: Props) {
  const keys = Object.keys(optionsByKey).filter((k) => optionsByKey[k].length > 0);
  if (keys.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5 border-b bg-background px-3 py-2">
      <Filter className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
      {keys.map((key) => {
        const selected = filters[key] ?? new Set<string>();
        const active = selected.size > 0;
        return (
          <DropdownMenu key={key}>
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                variant={active ? 'default' : 'outline'}
                className={cn('h-7 px-2 text-xs', active && 'gap-1')}
              >
                <span className="lowercase">{key}</span>
                {active ? (
                  <span className="ml-0.5 rounded bg-background/30 px-1 text-[10px] font-semibold">
                    {selected.size}
                  </span>
                ) : (
                  <ChevronDown className="ml-0.5 h-3 w-3" aria-hidden />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="max-h-72 w-52 overflow-y-auto">
              <DropdownMenuLabel className="flex items-center justify-between">
                <span className="lowercase">{key} is</span>
                <div className="flex items-center gap-2 text-xs font-normal text-muted-foreground">
                  {onSelectAll && (
                    <button
                      type="button"
                      onClick={() => onSelectAll(key)}
                      className="hover:text-foreground"
                    >
                      all
                    </button>
                  )}
                  {active && (
                    <button
                      type="button"
                      onClick={() => onClear(key)}
                      className="flex items-center gap-1 hover:text-foreground"
                    >
                      <X className="h-3 w-3" aria-hidden /> none
                    </button>
                  )}
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {optionsByKey[key].map((val) => (
                <DropdownMenuCheckboxItem
                  key={val}
                  checked={selected.has(val)}
                  onCheckedChange={() => onToggle(key, val)}
                  onSelect={(e) => e.preventDefault()}
                >
                  {val}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      })}
    </div>
  );
}
