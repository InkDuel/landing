import type { ElementType } from 'react';

import { cx } from './cx';

// Port of ink_headline.dart: a Bricolage headline with the yellow band on
// its last word (04 - Tipografía). [highlight] bands a trailing phrase
// instead, when the copy bands a whole line.

export type InkHeadlineSize = 'display' | 'display-lg' | 'title-page' | 'title-page-lg' | 'title-section';

const SIZE: Record<InkHeadlineSize, string> = {
  display: 'type-display',
  'display-lg': 'type-display sm:type-display-lg',
  'title-page': 'type-title-page',
  'title-page-lg': 'type-title-page sm:type-title-page-lg',
  'title-section': 'type-title-section',
};

type Props = {
  text: string;
  as?: ElementType;
  size?: InkHeadlineSize;
  highlight?: string;
  /** Band colour; defaults to `highlight` (yellow). */
  band?: 'yellow' | 'pink' | 'blue';
  className?: string;
  id?: string;
};

const BAND: Record<NonNullable<Props['band']>, string | undefined> = {
  yellow: undefined,
  pink: '[--band:var(--ink-tint-pink)]',
  blue: '[--band:var(--ink-tint-blue)]',
};

export function splitHeadline(text: string, highlight?: string): [string, string] {
  const trimmed = text.trimEnd();
  const phrase = highlight?.trim();
  const split =
    phrase && trimmed.endsWith(phrase) ? trimmed.length - phrase.length - 1 : trimmed.search(/[ \n](?=[^ \n]*$)/);
  if (split < 0) return ['', trimmed];
  return [trimmed.slice(0, split + 1), trimmed.slice(split + 1)];
}

export function InkHeadline({ text, as, size = 'title-page', highlight, band = 'yellow', className, id }: Props) {
  const Component: ElementType = as ?? 'h1';
  const [head, last] = splitHeadline(text, highlight);
  return (
    <Component id={id} className={cx(SIZE[size], 'text-primary text-balance', className)}>
      {head}
      <span className={cx('ink-highlight', BAND[band])}>{last}</span>
    </Component>
  );
}
