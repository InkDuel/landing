'use client';

import { createContext } from 'react';

import type { StoryMarksApi } from './use-story-marks';

/**
 * What a StoryPassagesProvider hands down: the ONE general conversation of
 * the relato (the text and StoryComments share it), how a located quote jumps
 * to its paragraph (null while the text is drawn without places), and the
 * composer-opened signal for analytics. Absent: StoryComments owns its own.
 */
export type StoryMarksScope = {
  marks: StoryMarksApi;
  onJumpQuote: ((paragraphKey: string, quote: string | null) => void) | null;
  composerFocused: () => void;
};

export const StoryMarksContext = createContext<StoryMarksScope | null>(null);
