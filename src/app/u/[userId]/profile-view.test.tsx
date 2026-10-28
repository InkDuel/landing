import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { type ProfileViewData, ProfileView } from './profile-view';

vi.mock('@/components/shell/localized-shell', () => ({
  LocalizedShell: ({ children }: { children: (locale: 'es') => React.ReactNode }) => <>{children('es')}</>,
}));

const user: ProfileViewData = {
  username: 'Tinta',
  description: '',
  rankTier: 'escriba',
  rankDivision: 2,
  wins: 7,
  losses: 3,
  bestWritingStreak: 12,
  writerLevel: 4,
};

const view = (data: ProfileViewData) => render(<ProfileView user={data} userId="u1" initialLocale="es" resolveOnClient={false} />);

afterEach(cleanup);

describe('Public profile · best writing streak', () => {
  it('shows it, real zeros included, with the writing label', () => {
    view(user);
    expect(screen.getByText('Mejor racha de escritura').nextSibling?.textContent).toBe('12');
    cleanup();
    view({ ...user, bestWritingStreak: 0 });
    expect(screen.getByText('Mejor racha de escritura').nextSibling?.textContent).toBe('0');
  });

  it('hides the stat when the backend did not send it', () => {
    view({ ...user, bestWritingStreak: null });
    expect(screen.queryByText('Mejor racha de escritura')).toBeNull();
    expect(screen.queryByText('Mejor racha')).toBeNull();
    expect(screen.getByText('Victorias')).toBeTruthy();
  });
});
