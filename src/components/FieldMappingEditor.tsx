import { useMemo, useState } from 'react';
import { Button } from './ui/button';
import { CardView } from './CardView';
import type { Card, FieldMapping } from '@/lib/types';

type Props = {
  cards: Card[];
  detectedKeys: string[];
  initial: FieldMapping;
  onSave: (mapping: FieldMapping) => void;
};

export function FieldMappingEditor({ cards, detectedKeys, initial, onSave }: Props) {
  const [mapping, setMapping] = useState<FieldMapping>(initial);
  const sample = cards[0];
  const meta = mapping.meta ?? [];
  const canSave = Boolean(mapping.title);
  const roles: Array<{ role: keyof Omit<FieldMapping, 'meta'>; label: string; required?: boolean }> = useMemo(
    () => [
      { role: 'title', label: 'Title', required: true },
      { role: 'subtitle', label: 'Subtitle' },
      { role: 'body', label: 'Body' },
      { role: 'image', label: 'Image' },
    ],
    []
  );

  return (
    <div className="grid gap-6 p-4 md:grid-cols-2 md:p-6">
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Map fields</h2>
        {roles.map(({ role, label, required }) => (
          <label key={role} className="flex items-center gap-3">
            <span className="w-20 text-sm font-medium">{label}{required ? ' *' : ''}</span>
            <select
              className="flex-1 rounded-md border bg-background p-2 text-sm"
              value={(mapping[role] as string) ?? ''}
              onChange={(e) =>
                setMapping((m) => ({ ...m, [role]: e.target.value || undefined }))
              }
            >
              <option value="">—</option>
              {detectedKeys.map((k) => (
                <option key={k} value={k}>{k}</option>
              ))}
            </select>
          </label>
        ))}
        <fieldset>
          <legend className="text-sm font-medium">Meta (multiple)</legend>
          <div className="mt-2 grid gap-1 md:grid-cols-2">
            {detectedKeys.map((k) => {
              const checked = meta.includes(k);
              const disabled =
                k === mapping.title || k === mapping.subtitle || k === mapping.body || k === mapping.image;
              return (
                <label key={k} className={`flex items-center gap-2 text-sm ${disabled ? 'opacity-50' : ''}`}>
                  <input
                    type="checkbox"
                    disabled={disabled}
                    checked={checked}
                    onChange={(e) =>
                      setMapping((m) => ({
                        ...m,
                        meta: e.target.checked
                          ? [...(m.meta ?? []), k]
                          : (m.meta ?? []).filter((x) => x !== k),
                      }))
                    }
                  />
                  {k}
                </label>
              );
            })}
          </div>
        </fieldset>
        <div className="flex gap-2">
          <Button disabled={!canSave} onClick={() => onSave(mapping)}>Save</Button>
        </div>
      </section>

      <section>
        <h3 className="mb-2 text-sm font-medium text-muted-foreground">Preview</h3>
        {sample ? <CardView card={sample} mapping={mapping} /> : <p>No sample card available.</p>}
      </section>
    </div>
  );
}
