import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { track } from '@/lib/analytics';
import { setWebSessionHint } from '@/lib/web-session-hint';

import { HeaderWebAction, HeroEntry } from './web-entry';

vi.mock('@/lib/analytics', () => ({ track: vi.fn() }));

// The public pages lead into the signed-in web with full page loads (plain
// <a>, never next/link) so /login gets its per-request CSP, and switch to «Ir
// a InkDuel» once this browser has signed in.
describe('entry to the web app from the public pages', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.mocked(track).mockClear();
  });
  afterEach(cleanup);

  it('signed out: «Inicia sesión» goes to /login and says the account comes from the app', () => {
    render(
      <>
        <HeaderWebAction locale="es" />
        <HeroEntry locale="es" />
      </>,
    );
    expect(screen.getByRole('link', { name: 'Inicia sesión' }).getAttribute('href')).toBe('/login?lang=es');
    expect(screen.getByRole('link', { name: 'Entra en la web' }).getAttribute('href')).toBe('/login?lang=es');
    expect(screen.getByText(/Créala en la app/)).toBeTruthy();
  });

  it('signed in on this browser: «Ir a InkDuel» goes to Historias', () => {
    render(<HeaderWebAction locale="en" />);
    act(() => setWebSessionHint(true));
    expect(screen.getByRole('link', { name: 'Go to InkDuel' }).getAttribute('href')).toBe('/stories?lang=en');
    act(() => setWebSessionHint(false));
    expect(screen.getByRole('link', { name: 'Sign in' }).getAttribute('href')).toBe('/login?lang=en');
  });

  it('logs web_entry_tapped with where the tap came from', () => {
    render(<HeroEntry locale="pt" />);
    // jsdom cannot navigate; the tap is what matters here.
    const stay = (event: Event) => event.preventDefault();
    document.addEventListener('click', stay);
    fireEvent.click(screen.getByRole('link', { name: 'Entrar na web' }));
    document.removeEventListener('click', stay);
    expect(track).toHaveBeenCalledWith('web_entry_tapped', { entry_point: 'hero', signed_in: false });
  });
});
