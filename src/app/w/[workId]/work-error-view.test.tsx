import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { WorkErrorView } from './work-error-view';

vi.mock('@/components/shell/localized-shell', () => ({
  LocalizedShell: ({ children }: { children: (locale: 'es') => React.ReactNode }) => <>{children('es')}</>,
}));

afterEach(cleanup);

describe('WorkErrorView', () => {
  it('says the load failed (not that the work is missing) and retries', () => {
    const onRetry = vi.fn();
    render(<WorkErrorView onRetry={onRetry} />);
    expect(screen.getByRole('heading').textContent).toBe('No pudimos cargar la obra');
    expect(screen.queryByText(/no existe/)).toBeNull();
    fireEvent.click(screen.getByText('Reintentar'));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
