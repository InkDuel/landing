import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import AuthActionHandler from './auth-action-handler';

const browserKey = 'test-configured-browser-key';
const oobCode = 'test-action-code';
const toolkit = 'https://identitytoolkit.googleapis.com/v1';
const state = vi.hoisted(() => ({
  searchParams: new URLSearchParams(),
  firebaseWebConfig: { apiKey: '' },
}));

vi.mock('next/navigation', () => ({
  useSearchParams: () => state.searchParams,
}));
vi.mock('@/lib/session/config', () => ({
  firebaseWebConfig: state.firebaseWebConfig,
}));

const request = vi.fn<typeof fetch>();

function response(body: object, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function openLink(mode: string, urlKey: string | undefined) {
  state.searchParams = new URLSearchParams({ mode, oobCode, lang: 'es' });
  if (urlKey !== undefined) state.searchParams.set('apiKey', urlKey);
  return render(<AuthActionHandler />);
}

async function submitReset() {
  const passwordInput = await screen.findByLabelText('Nueva contraseña');
  fireEvent.change(passwordInput, { target: { value: 'NewPassword42' } });
  fireEvent.change(screen.getByLabelText('Confirmar contraseña'), {
    target: { value: 'NewPassword42' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Guardar contraseña' }));
}

beforeEach(() => {
  state.firebaseWebConfig.apiKey = browserKey;
  state.searchParams = new URLSearchParams();
  request.mockReset();
  // No test can reach Identity Toolkit or consume a real action code.
  vi.stubGlobal('fetch', request);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('configured Browser key', () => {
  for (const [description, urlKey] of [
    ['matching URL key', browserKey],
    ['different URL key', 'test-mobile-key'],
    ['missing URL key', undefined],
  ] as const) {
    it(`verifies email with the configured key: ${description}`, async () => {
      request.mockResolvedValueOnce(response({ email: 'reader@example.test' }));
      openLink('verifyEmail', urlKey);

      await screen.findByText('Correo verificado.');
      expect(request).toHaveBeenCalledExactlyOnceWith(
        `${toolkit}/accounts:update?key=${browserKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ oobCode }),
        },
      );
    });

    it(`checks and resets password with the configured key: ${description}`, async () => {
      request
        .mockResolvedValueOnce(response({ email: 'reader@example.test' }))
        .mockResolvedValueOnce(response({}));
      openLink('resetPassword', urlKey);
      await submitReset();

      await screen.findByText('Contraseña actualizada.');
      expect(request).toHaveBeenCalledTimes(2);
      for (const [url] of request.mock.calls) {
        expect(url).toBe(`${toolkit}/accounts:resetPassword?key=${browserKey}`);
      }
      expect(request).toHaveBeenNthCalledWith(1, expect.any(String), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oobCode }),
      });
      expect(request).toHaveBeenNthCalledWith(2, expect.any(String), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oobCode, newPassword: 'NewPassword42' }),
      });
    });
  }

  it.each(['verifyEmail', 'resetPassword'])(
    '%s makes no request when Browser key is missing, even with a URL key',
    async (mode) => {
      state.firebaseWebConfig.apiKey = '';
      openLink(mode, 'test-mobile-key');

      await screen.findByText('El servicio de autenticación no está configurado. Intenta más tarde.');
      expect(request).not.toHaveBeenCalled();
    },
  );

  it.each(['mode', 'oobCode'])('still requires %s', async (parameter) => {
    state.searchParams = new URLSearchParams({ mode: 'resetPassword', oobCode, lang: 'es' });
    state.searchParams.delete(parameter);
    render(<AuthActionHandler />);

    await screen.findByText('Faltan datos del enlace de recuperación.');
    expect(request).not.toHaveBeenCalled();
  });

  it.each(['recoverEmail', 'verifyAndChangeEmail'])('does not add support for %s', async (mode) => {
    openLink(mode, undefined);

    await screen.findByText('El enlace es inválido o ya fue usado.');
    expect(request).not.toHaveBeenCalled();
  });
});

describe('existing action-code error mapping', () => {
  const errors = [
    ['INVALID_OOB_CODE', 'El enlace es inválido o ya fue usado.'],
    ['EXPIRED_OOB_CODE', 'El enlace venció. Pide uno nuevo desde la app.'],
  ] as const;

  for (const mode of ['verifyEmail', 'resetPassword']) {
    const modeErrors: ReadonlyArray<readonly [string, string]> = mode === 'verifyEmail'
      ? [
          ['INVALID_OOB_CODE', 'El enlace es invalido o ya fue usado.'],
          ['EXPIRED_OOB_CODE', 'El enlace vencio. Solicita uno nuevo desde la app.'],
        ] as const
      : errors;
    it.each(modeErrors)(`${mode}: %s`, async (code, message) => {
      request.mockResolvedValueOnce(response({ error: { message: code } }, 400));
      openLink(mode, 'test-mobile-key');

      await screen.findByText(message);
      expect(request).toHaveBeenCalledTimes(1);
      expect(request.mock.calls[0][0]).toContain(`?key=${browserKey}`);
    });
  }

  it.each(errors)('password reset submission: %s', async (code, message) => {
    request
      .mockResolvedValueOnce(response({ email: 'reader@example.test' }))
      .mockResolvedValueOnce(response({ error: { message: code } }, 400));
    openLink('resetPassword', undefined);
    await submitReset();

    await screen.findByText(message);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Guardar contraseña' }).hasAttribute('disabled')).toBe(false);
    });
    expect(request).toHaveBeenCalledTimes(2);
    expect(request.mock.calls[1][0]).toContain(`?key=${browserKey}`);
  });
});
