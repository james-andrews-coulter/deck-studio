import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { downloadTextFile } from '@/lib/download';

// jsdom does not implement URL.createObjectURL / revokeObjectURL, so define
// them directly for this test file and tear them down afterwards.

describe('downloadTextFile', () => {
  const createObjectURL = vi.fn((_blob: Blob): string => 'blob:stub');
  const revokeObjectURL = vi.fn((_url: string): void => {});
  const anchorClickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click');
  const createdAnchors: HTMLAnchorElement[] = [];

  beforeEach(() => {
    createdAnchors.length = 0;
    createObjectURL.mockClear();
    createObjectURL.mockReturnValue('blob:stub');
    revokeObjectURL.mockClear();
    (URL as unknown as { createObjectURL: typeof createObjectURL }).createObjectURL =
      createObjectURL;
    (URL as unknown as { revokeObjectURL: typeof revokeObjectURL }).revokeObjectURL =
      revokeObjectURL;
    anchorClickSpy.mockImplementation(function (this: HTMLAnchorElement) {
      createdAnchors.push(this);
    });
  });

  afterEach(() => {
    anchorClickSpy.mockReset();
    delete (URL as unknown as { createObjectURL?: unknown }).createObjectURL;
    delete (URL as unknown as { revokeObjectURL?: unknown }).revokeObjectURL;
  });

  it('creates an object URL, triggers a download, and revokes the URL', () => {
    downloadTextFile('my-list.md', '# Hello');
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    const [blobArg] = createObjectURL.mock.calls[0];
    expect(blobArg).toBeInstanceOf(Blob);
    expect(anchorClickSpy).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:stub');
  });

  it('sets the download attribute to the given filename', () => {
    downloadTextFile('notes-2026-04-13.md', 'content');
    expect(createdAnchors[0].getAttribute('download')).toBe('notes-2026-04-13.md');
  });

  it('uses text/markdown mime by default', () => {
    downloadTextFile('x.md', 'body');
    const blob = createObjectURL.mock.calls[0][0] as Blob;
    expect(blob.type).toBe('text/markdown;charset=utf-8');
  });

  it('accepts a custom mime type', () => {
    downloadTextFile('x.json', '{}', 'application/json');
    const blob = createObjectURL.mock.calls[0][0] as Blob;
    expect(blob.type).toBe('application/json');
  });
});
