import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { parseProfileUser } from '@/lib/session/models';

import { ProfileStats } from './profile-parts';

const payload = {
  id: 'u1',
  username: 'Tinta',
  wins: 7,
  losses: 3,
  // The win streak stays in the backend payload for the ranking; the profile never shows it.
  currentStreak: 9,
  bestStreak: 11,
  writerLevel: 4,
};

afterEach(cleanup);

describe('ProfileStats · writing streak', () => {
  it('shows the writing streak and the best one, not the win streak', () => {
    const user = parseProfileUser({ ...payload, writingStreak: 4, bestWritingStreak: 12 })!;
    render(<ProfileStats user={user} locale="es" own />);
    const line = screen.getByText(/Racha de escritura/).closest('p')!;
    expect(line.textContent).toBe('Racha de escritura 4 · Mejor racha 12');
    expect(screen.queryByText('9')).toBeNull();
    expect(screen.queryByText('11')).toBeNull();
  });

  it('treats the fields as 0 when an older backend does not send them', () => {
    const user = parseProfileUser(payload)!;
    expect(user.writingStreak).toBe(0);
    expect(user.bestWritingStreak).toBe(0);
    render(<ProfileStats user={user} locale="en" own={false} />);
    expect(screen.getByText(/Writing streak/).closest('p')!.textContent).toBe('Writer level 4 · Writing streak 0 · Best streak 0');
  });

  it('never trusts a malformed or negative value', () => {
    const user = parseProfileUser({ ...payload, writingStreak: '5', bestWritingStreak: -3 })!;
    expect(user.writingStreak).toBe(0);
    expect(user.bestWritingStreak).toBe(0);
    render(<ProfileStats user={{ ...user, writingStreak: 2, bestWritingStreak: 6 }} locale="pt" own />);
    expect(screen.getByText(/Sequência de escrita/).closest('p')!.textContent).toBe('Sequência de escrita 2 · Melhor sequência 6');
  });
});
