export type FieldMapping = {
  title: string;
  subtitle?: string;
  body?: string;
  image?: string;
  meta?: string[];
};

export type Exercise = {
  id: string;
  name: string;
  instructions: string;
  groups: string[];
};

export type Card = {
  id: string;
  fields: Record<string, unknown>;
};

export type Deck = {
  id: string;
  name: string;
  importedAt: string;
  fieldMapping: FieldMapping;
  cards: Card[];
  exercises?: Exercise[];
};

export type Group = {
  id: string;
  name: string;
};

export type CardRef = {
  cardId: string;
  hidden: boolean;
  groupId: string | null;
  /**
   * Swipe-session disposition. Cleared when a card moves to a different
   * group (treating each group as its own swipe context). Skip is a
   * session-local queue ordering hint and is not persisted here.
   */
  processed?: 'keep' | 'discard';
};

export type List = {
  id: string;
  name: string;
  deckId: string;
  createdAt: string;
  updatedAt: string;
  groups: Group[];
  cardRefs: CardRef[];
  exerciseId?: string;
};

export type ResolvedCard = {
  id: string;
  title: string;
  subtitle?: string;
  body?: string;
  image?: string;
  meta: Array<{ key: string; value: string }>;
};
