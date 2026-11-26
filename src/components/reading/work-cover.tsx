import { cx } from '@/components/ink/cx';

// InkDuel's default cover for an obra, the web twin of the app's WorkCover:
// the paper of its Historias spine (same hash as the app, so the cover and the
// spine always match), the title in Literata and the author. An object, like a
// printed book: same colours in light and dark themes.

const PAPERS = ['#e9b4c4', '#b4c1ee', '#ead592', '#7c88b8', '#ede4cf'];
export const COVER_INK = '#131a3a';
export const COVER_RULE = '#ffd447';

/** Stable paper colour per work id (same hash as the app). */
export function workPaperColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash * 31 + id.charCodeAt(i)) & 0x7fffffff;
  }
  return PAPERS[hash % PAPERS.length];
}

export function WorkCover({
  workId,
  title,
  author,
  width,
  className,
}: {
  workId: string;
  title: string;
  author: string;
  width: number;
  className?: string;
}) {
  return (
    <div
      role="img"
      aria-label={author ? `${title}, ${author}` : title}
      className={cx('relative shrink-0 overflow-hidden rounded-[6px] border-2', className)}
      style={{
        width,
        height: width * 1.5,
        background: workPaperColor(workId),
        borderColor: COVER_INK,
        boxShadow: `4px 4px 0 ${COVER_INK}`,
        color: COVER_INK,
      }}
    >
      <span aria-hidden="true" className="absolute inset-y-0 left-0" style={{ width: width * 0.07, background: 'rgba(19,26,58,.14)' }} />
      <div className="absolute inset-0 flex flex-col" style={{ padding: `${width * 0.09}px ${width * 0.09}px ${width * 0.08}px ${width * 0.13}px` }}>
        <span className="font-ui font-extrabold uppercase opacity-70" style={{ fontSize: width * 0.06, letterSpacing: '0.1em' }}>
          InkDuel
        </span>
        <span className="flex-1" />
        <span className="font-literary font-bold" style={{ fontSize: width * 0.13, lineHeight: 1.08 }}>
          {title}
        </span>
        <span aria-hidden="true" className="block" style={{ width: width * 0.28, height: width * 0.025, background: COVER_RULE, margin: `${width * 0.06}px 0 ${width * 0.05}px` }} />
        <span className="truncate font-ui font-bold opacity-85" style={{ fontSize: width * 0.07 }}>
          {author}
        </span>
      </div>
    </div>
  );
}
