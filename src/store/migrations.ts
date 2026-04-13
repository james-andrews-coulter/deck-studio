export const CURRENT_VERSION = 2;

export function migrate(state: unknown, version: number): unknown {
  // v1 → v2: Deck.exercises and List.exerciseId are optional additions, so
  // persisted v1 state is valid at v2 without transformation.
  if (version === CURRENT_VERSION) return state;
  return state;
}
