import { get, set, del } from 'idb-keyval';
import type { StateStorage } from 'zustand/middleware';

export const idbStorage: StateStorage = {
  async getItem(name) {
    const v = await get(name);
    return typeof v === 'string' ? v : null;
  },
  async setItem(name, value) {
    await set(name, value);
  },
  async removeItem(name) {
    await del(name);
  },
};
