export const CURRENT_VERSION = 1;

export function migrate(state: unknown, version: number): unknown {
  // v1: no migrations yet; scaffold for future versions.
  if (version === CURRENT_VERSION) return state;
  return state;
}
