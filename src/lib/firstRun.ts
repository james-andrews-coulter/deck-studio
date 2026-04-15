export const FIRST_IMPORT_SHOWN_KEY = 'deck-studio:firstImportShown';

/** True once the first-import tip has been shown to this browser profile. */
export function hasShownFirstImport(): boolean {
  try {
    return localStorage.getItem(FIRST_IMPORT_SHOWN_KEY) === '1';
  } catch {
    return false;
  }
}

/** Record that the first-import tip has been shown; safe to call repeatedly. */
export function markFirstImportShown(): void {
  try {
    localStorage.setItem(FIRST_IMPORT_SHOWN_KEY, '1');
  } catch {
    /* noop — private mode / quota errors are not worth surfacing */
  }
}
