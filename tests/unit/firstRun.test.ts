import { describe, it, expect, beforeEach } from 'vitest';
import { hasShownFirstImport, markFirstImportShown } from '@/lib/firstRun';

describe('firstRun helpers', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('hasShownFirstImport returns false before anything is set', () => {
    expect(hasShownFirstImport()).toBe(false);
  });

  it('markFirstImportShown flips the flag to true', () => {
    markFirstImportShown();
    expect(hasShownFirstImport()).toBe(true);
  });

  it('subsequent calls to markFirstImportShown are idempotent', () => {
    markFirstImportShown();
    markFirstImportShown();
    markFirstImportShown();
    expect(hasShownFirstImport()).toBe(true);
  });

  it('survives a storage read failure without throwing', () => {
    const original = Storage.prototype.getItem;
    Storage.prototype.getItem = () => {
      throw new Error('Access denied');
    };
    try {
      expect(hasShownFirstImport()).toBe(false);
    } finally {
      Storage.prototype.getItem = original;
    }
  });

  it('silently no-ops when writes are blocked', () => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = () => {
      throw new Error('QuotaExceededError');
    };
    try {
      expect(() => markFirstImportShown()).not.toThrow();
    } finally {
      Storage.prototype.setItem = original;
    }
  });
});
