'use client';

import { useCallback, useState } from 'react';

// Writing preferences, local to this browser and account (PRD §7.2): they
// change how the page looks while writing, never the text that is published.

export type EditorPrefs = {
  font: 'serif' | 'sans';
  size: 0 | 1 | 2 | 3;
  line: 0 | 1 | 2;
  width: 0 | 1 | 2;
  spellcheck: boolean;
};

export const DEFAULT_PREFS: EditorPrefs = { font: 'serif', size: 1, line: 1, width: 1, spellcheck: true };

export const PREF_FONT_SIZE = [16, 18, 20, 22] as const;
export const PREF_LINE_HEIGHT = [1.5, 1.75, 2] as const;
export const PREF_WIDTH = [620, 690, 760] as const;

const key = (uid: string) => `inkduel-studio-prefs:${uid}`;

function read(uid: string): EditorPrefs {
  try {
    const raw = localStorage.getItem(key(uid));
    if (!raw) return DEFAULT_PREFS;
    const parsed = JSON.parse(raw) as Partial<EditorPrefs>;
    return {
      font: parsed.font === 'sans' ? 'sans' : 'serif',
      size: ([0, 1, 2, 3] as const).find((v) => v === parsed.size) ?? DEFAULT_PREFS.size,
      line: ([0, 1, 2] as const).find((v) => v === parsed.line) ?? DEFAULT_PREFS.line,
      width: ([0, 1, 2] as const).find((v) => v === parsed.width) ?? DEFAULT_PREFS.width,
      spellcheck: parsed.spellcheck !== false,
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

export function useEditorPrefs(uid: string): [EditorPrefs, (patch: Partial<EditorPrefs>) => void] {
  const [prefs, setPrefs] = useState<EditorPrefs>(() => read(uid));
  const update = useCallback(
    (patch: Partial<EditorPrefs>) => {
      setPrefs((prev) => {
        const next = { ...prev, ...patch };
        try {
          localStorage.setItem(key(uid), JSON.stringify(next));
        } catch {
          // Kept for this visit only.
        }
        return next;
      });
    },
    [uid],
  );
  return [prefs, update];
}

/** Pinned references of the editor's side panel (per account and Work). */
export type PinnedRef = { kind: 'characters' | 'places' | 'scenes'; id: string };

export function usePinnedRefs(uid: string, workId: string): [PinnedRef[], (next: PinnedRef[]) => void] {
  const storageKey = `inkduel-studio-pins:${uid}:${workId}`;
  const [pins, setPins] = useState<PinnedRef[]>(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      const parsed = raw ? (JSON.parse(raw) as PinnedRef[]) : [];
      return Array.isArray(parsed)
        ? parsed.filter((p) => p && typeof p.id === 'string' && ['characters', 'places', 'scenes'].includes(p.kind)).slice(0, 8)
        : [];
    } catch {
      return [];
    }
  });
  const update = useCallback(
    (next: PinnedRef[]) => {
      setPins(next);
      try {
        localStorage.setItem(storageKey, JSON.stringify(next.slice(0, 8)));
      } catch {
        // Kept for this visit only.
      }
    },
    [storageKey],
  );
  return [pins, update];
}
