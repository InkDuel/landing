import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { ReceivedMark } from '@/lib/session/marks';

import { ReceivedMarkRow } from './received-marks';

vi.mock('./session-root', () => ({ useSessionLocale: () => ({ locale: 'es' }) }));
vi.mock('next/link', () => ({
  default: ({ children, href, ...rest }: React.PropsWithChildren<{ href: string }>) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

afterEach(cleanup);

const author = { userId: 'u1', displayName: 'ana' };
const base = { author, content: 'Qué final', createdAt: '2026-11-01T10:00:00Z', duelId: 'd1', storyId: 's1', prompt: 'Una puerta' };

const rows: Record<string, ReceivedMark> = {
  quoted: { source: 'duelStory', id: 'c1', ...base, passage: { located: true, quote: 'una frase suelta' } },
  plain: { source: 'duelStory', id: 'c2', ...base },
  unlocated: { source: 'duelStory', id: 'c3', ...base, passage: { located: false, quote: null } },
  reply: { source: 'duelStoryReply', id: 'p1', ...base, rootCommentId: 'c1', isStoryAuthor: false, passage: { located: true, quote: 'tu frase citada' } },
};

describe('inbox rows of relatos', () => {
  it('shows the quote of a received Marca on a relato', () => {
    render(<ReceivedMarkRow row={{ mark: rows.quoted, unread: false }} locale="es" />);
    expect(screen.getByText(/una frase suelta/)).toBeTruthy();
    expect(screen.getByText('Qué final')).toBeTruthy();
  });

  it('shows the quote of the root a reply answers', () => {
    render(<ReceivedMarkRow row={{ mark: rows.reply, unread: true }} locale="es" />);
    expect(screen.getByText(/tu frase citada/)).toBeTruthy();
  });

  it.each(['plain', 'unlocated'])('draws no quote line for a %s row', (name) => {
    render(<ReceivedMarkRow row={{ mark: { ...rows[name], prompt: '' } as ReceivedMark, unread: false }} locale="es" />);
    expect(screen.queryByText(/«/)).toBeNull();
    expect(screen.getByText('Qué final')).toBeTruthy();
  });
});
