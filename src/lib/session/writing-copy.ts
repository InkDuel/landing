import type { CalendarCell } from './writing-calendar';

// Copy of the writing calendar view, shared by Studio's «Progreso» (one work)
// and «Tu escritura» on the profile (duels + works). Neutral Spanish with
// tuteo (never voseo) is the editorial source; en and pt-BR are idiomatic
// equivalents.

export type CalendarCopy = {
  gridLabel: string;
  legend: string;
  less: string;
  more: string;
  levels: [string, string, string, string, string];
  /** Spoken label of a day that counts. */
  cell: (label: string, cell: CalendarCell, format: (n: number) => string) => string;
  cellNone: (label: string) => string;
  viewList: string;
  hideList: string;
  listTitle: string;
  listEmpty: string;
  colDate: string;
  colWords: string;
};
