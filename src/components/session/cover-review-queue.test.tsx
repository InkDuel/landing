import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { signedCoverUrl } from '@/lib/covers';
import { ApiError } from '@/lib/session/api';
import { parseCoverQueue } from '@/lib/session/covers-ops';

const apiRequest = vi.fn();
vi.mock('@/lib/session/api', async (original) => ({
  ...(await original<typeof import('@/lib/session/api')>()),
  apiRequest: (...args: unknown[]) => apiRequest(...args),
}));
vi.mock('./session-root', () => ({ useSessionLocale: () => ({ locale: 'es' }) }));

import { CoverReviewQueue } from './cover-review-queue';

const item = {
  reviewId: 'r1',
  workId: 'w1',
  workTitle: 'La casa',
  authorName: '@ana',
  imageUrl: 'https://storage.googleapis.com/inkduel-4540e.firebasestorage.app/covers/pending/w1/r1_thumb.jpg?X-Goog-Signature=abc',
  submittedAt: '2026-11-26T12:00:00Z',
  moderation: { racy: 'POSSIBLE', adult: 'VERY_UNLIKELY' },
  moderationNote: 'possible racy',
  replacesCover: false,
};

beforeEach(() => apiRequest.mockReset());
afterEach(cleanup);

describe('cover queue payload', () => {
  it('draws only bucket images and drops items without an id', () => {
    expect(signedCoverUrl('https://evil.example/x.jpg')).toBe('');
    expect(signedCoverUrl('https://storage.googleapis.com.evil.example/x.jpg')).toBe('');
    expect(signedCoverUrl('https://storage.googleapis.com/other-bucket/covers/pending/w1/r1.jpg?X-Goog-Signature=abc')).toBe('');
    const items = parseCoverQueue({ items: [item, { reviewId: '' }, { ...item, reviewId: 'r2', imageUrl: 'javascript:alert(1)' }] });
    expect(items.map((i) => i.reviewId)).toEqual(['r1', 'r2']);
    expect(items[1].imageUrl).toBe('');
  });
});

describe('CoverReviewQueue', () => {
  it('anyone the backend refuses sees a missing page, nothing else', async () => {
    apiRequest.mockRejectedValueOnce(new ApiError(404, 'http'));
    render(<CoverReviewQueue />);
    expect(await screen.findByText('No encontramos esta página')).toBeTruthy();
    expect(screen.queryByText('Portadas en revisión')).toBeNull();
  });

  it('approving takes the cover off the list at once', async () => {
    apiRequest.mockResolvedValueOnce({ items: [item] }).mockResolvedValueOnce(null);
    render(<CoverReviewQueue />);
    fireEvent.click(await screen.findByText('Aprobar'));
    await waitFor(() => expect(screen.queryByText('La casa')).toBeNull());
    expect(apiRequest).toHaveBeenLastCalledWith('POST', '/api/ops/covers/r1/approve', expect.anything());
    expect(screen.getByText('No hay portadas pendientes')).toBeTruthy();
  });

  it('a refused rejection brings the cover back with the error', async () => {
    apiRequest.mockResolvedValueOnce({ items: [item] }).mockRejectedValueOnce(new ApiError(500, 'http'));
    render(<CoverReviewQueue />);
    fireEvent.click(await screen.findByText('Rechazar'));
    fireEvent.click(screen.getByText('Datos personales'));
    fireEvent.click(screen.getByText('Rechazar portada'));
    expect(await screen.findByText('No se guardó. Prueba de nuevo.')).toBeTruthy();
    expect(screen.getByText('La casa')).toBeTruthy();
    expect(apiRequest).toHaveBeenLastCalledWith('POST', '/api/ops/covers/r1/reject', expect.objectContaining({ body: { reasonCode: 'personal_data' } }));
  });
});
