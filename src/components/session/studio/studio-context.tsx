'use client';

import { createContext, type ReactNode, useContext, useLayoutEffect, useRef } from 'react';

import type { Locale } from '@/lib/i18n';
import type { DraftSummary, ManuscriptEntry, StudioLimits, StudioOverview } from '@/lib/session/studio/models';
import type { StudioStore } from '@/lib/session/studio/studio-store';

// What every Studio area needs: the open Work, its manuscript, the entity
// store, navigation between areas/documents and the editor's flush (so no
// area change ever drops unsaved text).

export type StudioArea = 'write' | 'plan' | 'universe' | 'progress' | 'publish';
export const STUDIO_AREAS: readonly StudioArea[] = ['write', 'plan', 'universe', 'progress', 'publish'];

export function isStudioArea(value: string | null): value is StudioArea {
  return value !== null && (STUDIO_AREAS as readonly string[]).includes(value);
}

/** The open editor, registered so navigation can save first. */
export type EditorHandle = {
  draftId: string;
  /** Resolves whether everything is saved (false keeps the author here). */
  flush: () => Promise<boolean>;
  hasUnsaved: () => boolean;
  /** Text as typed (may be ahead of the server). */
  localText: () => { title: string; body: string; revision: number };
  /** Adopts a version the server just confirmed (import, restore). */
  adopt: (snapshot: { revision: number; title: string; content: string }) => void;
  /** Another tab owns this draft: nothing may write it from here. */
  readOnly: () => boolean;
};

export type StudioContextValue = {
  workId: string;
  uid: string;
  locale: Locale;
  overview: StudioOverview;
  limits: StudioLimits;
  store: StudioStore;
  area: StudioArea;
  docId: string | null;
  /** Saves the editor first; false when the author must stay. tab/item address Universe and Plan. */
  goTo: (area: StudioArea, docId?: string | null, extra?: { tab?: string; item?: string }) => Promise<boolean>;
  refresh: () => Promise<void>;
  /** Folds a fresh draft summary into the manuscript (after a save). */
  applyDraft: (draft: DraftSummary) => void;
  registerEditor: (handle: EditorHandle | null) => void;
  editor: () => EditorHandle | null;
  /** Opens (creating if needed) the draft of a manuscript entry. */
  openEntry: (entry: ManuscriptEntry) => Promise<boolean>;
  /** Creates a new private chapter draft and (unless open=false) opens it. */
  createChapter: (input?: { title?: string; body?: string; source?: 'edit' | 'import' | 'split'; open?: boolean; id?: string }) => Promise<string | null>;
  toast: (message: string) => void;
};

const StudioContext = createContext<StudioContextValue | null>(null);

export function StudioProvider({ value, children }: { value: StudioContextValue; children: ReactNode }) {
  return <StudioContext.Provider value={value}>{children}</StudioContext.Provider>;
}

export function useStudio(): StudioContextValue {
  const value = useContext(StudioContext);
  if (!value) throw new Error('useStudio outside StudioProvider');
  return value;
}

/** Display label of a manuscript entry: «Capítulo N» or «Capítulo nuevo». */
export function entryTitle(entry: ManuscriptEntry, labels: { chapter: (n: number) => string; untitled: string }): string {
  const title = entry.draft?.title ?? entry.chapterTitle;
  if (title.trim()) return title;
  return entry.chapterId ? labels.chapter(entry.orderIndex) : labels.untitled;
}

export function entryWords(entry: ManuscriptEntry): number {
  return entry.draft ? entry.draft.wordCount : entry.chapterWordCount;
}

export function entryChars(entry: ManuscriptEntry): number {
  return entry.draft ? entry.draft.charCount : entry.chapterCharCount;
}

/** A ref that always holds the latest value (updated after each commit). */
export function useLatestRef<T>(value: T) {
  const ref = useRef(value);
  useLayoutEffect(() => {
    ref.current = value;
  });
  return ref;
}
