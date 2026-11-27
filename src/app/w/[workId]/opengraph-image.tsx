import { ImageResponse } from 'next/og';

import { COVER_INK, COVER_RULE, workPaperColor } from '@/components/reading/work-cover';
import { fetchPublicWork } from '@/lib/public-api';

// The link preview of an obra (WhatsApp, Instagram, X): its InkDuel cover on
// the brand navy, title and author beside it. Only approved artwork ever
// appears here: the approved uploaded cover, or InkDuel's default cover.

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'InkDuel';

// Hidden or deleted works leave the preview within an hour; a backend error throws (500, not cached, stale kept).
export const revalidate = 3600;

/**
 * A brand font for the image, subset to the characters drawn. Google Fonts
 * serves TTF to non-browser clients; any failure falls back to the default.
 */
async function loadFont(family: string, weight: number, text: string): Promise<ArrayBuffer | null> {
  try {
    const css = await (
      await fetch(`https://fonts.googleapis.com/css2?family=${family}:wght@${weight}&text=${encodeURIComponent(text)}`, {
        next: { revalidate: 86400 },
      })
    ).text();
    const url = css.match(/src: url\((.+?)\) format\('(?:opentype|truetype)'\)/)?.[1];
    if (!url) return null;
    const res = await fetch(url, { next: { revalidate: 86400 } });
    return res.ok ? await res.arrayBuffer() : null;
  } catch {
    return null;
  }
}

export default async function Image({ params }: { params: Promise<{ workId: string }> }) {
  const { workId } = await params;
  const work = await fetchPublicWork(workId);
  const title = work?.title || 'InkDuel';
  const author = work?.authorDisplayName || '';
  const paper = workPaperColor(workId);
  const coverUrl = work?.coverUrl ?? '';
  const glyphs = `${title}${author}INKDUELInkDuel…`;
  const [literata, bricolage] = await Promise.all([
    loadFont('Literata', 700, glyphs),
    loadFont('Bricolage+Grotesque', 800, glyphs),
  ]);
  const fonts = [
    ...(literata ? [{ name: 'Literata', data: literata, weight: 700 as const, style: 'normal' as const }] : []),
    ...(bricolage ? [{ name: 'Bricolage', data: bricolage, weight: 800 as const, style: 'normal' as const }] : []),
  ];

  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', background: '#131a3a', padding: '0 80px', gap: 64 }}>
        {coverUrl ? (
          <img src={coverUrl} alt="" width={300} height={450} style={{ objectFit: 'cover', border: `4px solid ${COVER_INK}`, borderRadius: 12, boxShadow: '10px 10px 0 #05070f' }} />
        ) : (
        <div
          style={{
            width: 300,
            height: 450,
            display: 'flex',
            flexDirection: 'column',
            background: paper,
            border: `4px solid ${COVER_INK}`,
            borderRadius: 12,
            boxShadow: `10px 10px 0 #05070f`,
            padding: '28px 26px 24px 40px',
            color: COVER_INK,
            position: 'relative',
          }}
        >
          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 22, background: 'rgba(19,26,58,.14)' }} />
          <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: 3, opacity: 0.7 }}>INKDUEL</div>
          <div style={{ flex: 1 }} />
          <div style={{ fontSize: 40, fontWeight: 700, lineHeight: 1.05, fontFamily: 'Literata' }}>{title.length > 60 ? title.slice(0, 58) + '…' : title}</div>
          <div style={{ width: 84, height: 8, background: COVER_RULE, margin: '18px 0 14px' }} />
          <div style={{ fontSize: 22, fontWeight: 700, opacity: 0.85 }}>{author}</div>
        </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, color: '#f6f7fb' }}>
          <div style={{ fontSize: 64, fontWeight: 700, lineHeight: 1.05, fontFamily: 'Literata' }}>{title.length > 70 ? title.slice(0, 68) + '…' : title}</div>
          <div style={{ fontSize: 32, marginTop: 24, color: '#c6c9d6' }}>{author}</div>
          <div style={{ display: 'flex', marginTop: 48, fontSize: 30, fontWeight: 800, fontFamily: 'Bricolage' }}>
            Ink<span style={{ background: '#ffd447', color: '#131a3a', padding: '0 6px', borderRadius: 4 }}>Duel</span>
          </div>
        </div>
      </div>
    ),
    { ...size, fonts },
  );
}
