import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useListSelection } from '@/hooks/useListSelection';

describe('useListSelection', () => {
  it('starts out of select mode with no selection', () => {
    const { result } = renderHook(() => useListSelection());
    expect(result.current.selectMode).toBe(false);
    expect(result.current.selected.size).toBe(0);
  });

  it('toggleSelect adds and removes ids', () => {
    const { result } = renderHook(() => useListSelection());
    act(() => result.current.toggleSelect('c1'));
    expect(result.current.selected.has('c1')).toBe(true);
    act(() => result.current.toggleSelect('c2'));
    expect(result.current.selected.size).toBe(2);
    act(() => result.current.toggleSelect('c1'));
    expect(result.current.selected.has('c1')).toBe(false);
    expect(result.current.selected.size).toBe(1);
  });

  it('clearSelection empties the set without leaving select mode', () => {
    const { result } = renderHook(() => useListSelection());
    act(() => {
      result.current.toggleSelectMode();
      result.current.toggleSelect('c1');
      result.current.toggleSelect('c2');
      result.current.clearSelection();
    });
    expect(result.current.selectMode).toBe(true);
    expect(result.current.selected.size).toBe(0);
  });

  it('toggleSelectMode flips the flag and clears selection on exit', () => {
    const { result } = renderHook(() => useListSelection());
    act(() => {
      result.current.toggleSelectMode();
      result.current.toggleSelect('c1');
    });
    expect(result.current.selectMode).toBe(true);
    expect(result.current.selected.has('c1')).toBe(true);

    act(() => result.current.toggleSelectMode());
    expect(result.current.selectMode).toBe(false);
    expect(result.current.selected.size).toBe(0);
  });

  it('returns stable callbacks across renders', () => {
    const { result, rerender } = renderHook(() => useListSelection());
    const initial = {
      toggleSelect: result.current.toggleSelect,
      clearSelection: result.current.clearSelection,
      toggleSelectMode: result.current.toggleSelectMode,
    };
    rerender();
    expect(result.current.toggleSelect).toBe(initial.toggleSelect);
    expect(result.current.clearSelection).toBe(initial.clearSelection);
    expect(result.current.toggleSelectMode).toBe(initial.toggleSelectMode);
  });
});
