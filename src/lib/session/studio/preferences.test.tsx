import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { type StudioPaper, useStudioPaper } from './preferences';

// The page colour is one choice per account: the «Aa» control that changes
// it and the shell that paints the page must always agree.

function Control({ uid }: { uid: string }) {
  const [, setPaper] = useStudioPaper(uid);
  return (
    <>
      {(['light', 'sepia', 'night'] as StudioPaper[]).map((paper) => (
        <button key={paper} type="button" onClick={() => setPaper(paper)}>
          {paper}
        </button>
      ))}
    </>
  );
}

function Shell({ uid }: { uid: string }) {
  const [paper] = useStudioPaper(uid);
  return <span data-testid="shell">{paper}</span>;
}

describe('Studio page colour', () => {
  beforeEach(() => localStorage.clear());
  afterEach(cleanup);

  it('defaults to light and ignores unknown stored values', () => {
    localStorage.setItem('inkduel-studio-paper:a', 'purple');
    render(<Shell uid="a" />);
    expect(screen.getByTestId('shell').textContent).toBe('light');
  });

  it('a change in the control reaches the shell at once and is remembered per account', () => {
    render(
      <>
        <Control uid="a" />
        <Shell uid="a" />
      </>,
    );
    fireEvent.click(screen.getByText('night'));
    expect(screen.getByTestId('shell').textContent).toBe('night');
    expect(localStorage.getItem('inkduel-studio-paper:a')).toBe('night');
    expect(localStorage.getItem('inkduel-studio-paper:b')).toBeNull();

    fireEvent.click(screen.getByText('light'));
    expect(screen.getByTestId('shell').textContent).toBe('light');
    expect(localStorage.getItem('inkduel-studio-paper:a')).toBeNull();
  });

  it('follows a change made in another tab', () => {
    render(<Shell uid="a" />);
    act(() => {
      localStorage.setItem('inkduel-studio-paper:a', 'sepia');
      window.dispatchEvent(new StorageEvent('storage', { key: 'inkduel-studio-paper:a' }));
    });
    expect(screen.getByTestId('shell').textContent).toBe('sepia');
  });
});
