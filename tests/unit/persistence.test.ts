import { describe, it, expect, beforeEach } from 'vitest';
import { idbStorage } from '@/store/persistence';

// idb-keyval uses indexedDB which jsdom does not ship; use fake-indexeddb
import 'fake-indexeddb/auto';

describe('idbStorage', () => {
  beforeEach(async () => {
    await idbStorage.removeItem('deck-studio:state');
  });

  it('stores and retrieves JSON strings', async () => {
    await idbStorage.setItem('deck-studio:state', JSON.stringify({ a: 1 }));
    const read = await idbStorage.getItem('deck-studio:state');
    expect(read).toBe('{"a":1}');
  });

  it('returns null for missing keys', async () => {
    expect(await idbStorage.getItem('missing')).toBeNull();
  });

  it('removes keys', async () => {
    await idbStorage.setItem('x', '1');
    await idbStorage.removeItem('x');
    expect(await idbStorage.getItem('x')).toBeNull();
  });
});
