import { describe, it, expect } from 'vitest';
import { parseDeck } from '@/lib/importer';

const wrap = (exercises: unknown) =>
  JSON.stringify({
    name: 'D',
    cards: [{ t: 'a' }],
    exercises,
  });

describe('parseDeck — exercises', () => {
  it('returns empty exercises array when field is absent', () => {
    const out = parseDeck(JSON.stringify({ name: 'D', cards: [{ t: 'a' }] }), 'd.json');
    expect(out.exercises).toEqual([]);
    expect(out.warnings).not.toContain('exercise_id_invalid');
  });

  it('returns empty exercises array when empty', () => {
    const out = parseDeck(wrap([]), 'd.json');
    expect(out.exercises).toEqual([]);
  });

  it('parses a well-formed exercise', () => {
    const out = parseDeck(
      wrap([
        {
          id: 'priority',
          name: 'Priority Planner',
          instructions: 'Sort by time horizon.',
          groups: ['This Week', 'This Month'],
        },
      ]),
      'd.json',
    );
    expect(out.exercises).toEqual([
      {
        id: 'priority',
        name: 'Priority Planner',
        instructions: 'Sort by time horizon.',
        groups: ['This Week', 'This Month'],
      },
    ]);
    expect(out.warnings).toHaveLength(0);
  });

  it('trims exercise name and group labels', () => {
    const out = parseDeck(
      wrap([{ id: 'x', name: '  Hi  ', instructions: '', groups: [' A ', 'B '] }]),
      'd.json',
    );
    expect(out.exercises[0]).toEqual({
      id: 'x',
      name: 'Hi',
      instructions: '',
      groups: ['A', 'B'],
    });
  });

  it('rejects entries that are not plain objects', () => {
    const out = parseDeck(wrap(['oops', null, 42]), 'd.json');
    expect(out.exercises).toEqual([]);
    expect(out.warnings).toContain('exercise_entry_invalid');
  });

  it('rejects entry with missing / empty id', () => {
    const out = parseDeck(wrap([{ id: '', name: 'N', instructions: '', groups: ['g'] }]), 'd.json');
    expect(out.exercises).toEqual([]);
    expect(out.warnings).toContain('exercise_id_invalid');
  });

  it('drops duplicate-id entries, keeping the first', () => {
    const out = parseDeck(
      wrap([
        { id: 'dup', name: 'First', instructions: '', groups: ['g'] },
        { id: 'dup', name: 'Second', instructions: '', groups: ['g'] },
      ]),
      'd.json',
    );
    expect(out.exercises).toHaveLength(1);
    expect(out.exercises[0].name).toBe('First');
    expect(out.warnings).toContain('exercise_id_duplicate');
  });

  it('rejects entry with missing name', () => {
    const out = parseDeck(wrap([{ id: 'a', name: '  ', instructions: '', groups: ['g'] }]), 'd.json');
    expect(out.exercises).toEqual([]);
    expect(out.warnings).toContain('exercise_name_missing');
  });

  it('rejects entry with non-string instructions', () => {
    const out = parseDeck(
      wrap([{ id: 'a', name: 'n', instructions: 123, groups: ['g'] }]),
      'd.json',
    );
    expect(out.exercises).toEqual([]);
    expect(out.warnings).toContain('exercise_instructions_invalid');
  });

  it('rejects entry with empty groups after trimming', () => {
    const out = parseDeck(
      wrap([{ id: 'a', name: 'n', instructions: '', groups: ['', '  '] }]),
      'd.json',
    );
    expect(out.exercises).toEqual([]);
    expect(out.warnings).toContain('exercise_groups_missing');
  });

  it('rejects entry with non-string groups', () => {
    const out = parseDeck(
      wrap([{ id: 'a', name: 'n', instructions: '', groups: ['ok', 7] }]),
      'd.json',
    );
    expect(out.exercises).toEqual([]);
    expect(out.warnings).toContain('exercise_groups_invalid');
  });

  it('preserves valid exercises even when later ones are rejected', () => {
    const out = parseDeck(
      wrap([
        { id: 'ok', name: 'OK', instructions: '', groups: ['g'] },
        { id: '', name: 'bad', instructions: '', groups: ['g'] },
        { id: 'ok2', name: 'OK2', instructions: '', groups: ['g'] },
      ]),
      'd.json',
    );
    expect(out.exercises.map((e) => e.id)).toEqual(['ok', 'ok2']);
    expect(out.warnings).toContain('exercise_id_invalid');
  });
});
