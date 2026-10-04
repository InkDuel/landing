'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import type { Page } from './models';

type State<T> = {
  items: T[];
  nextCursor: string | null;
  status: 'loading' | 'ready' | 'error';
  loadingMore: boolean;
  loadMoreFailed: boolean;
};

/**
 * Cursor pagination as the app's cubits do it: first page, then more while
 * there is a cursor. [fetchPage] must be stable (useCallback) and change
 * only when the list itself changes (e.g. the language).
 */
export function usePagedList<T>(fetchPage: (cursor: string | null, signal: AbortSignal) => Promise<Page<T>>) {
  const [state, setState] = useState<State<T>>({
    items: [],
    nextCursor: null,
    status: 'loading',
    loadingMore: false,
    loadMoreFailed: false,
  });
  const [attempt, setAttempt] = useState(0);
  const busy = useRef(false);
  const controller = useRef<AbortController | null>(null);

  useEffect(() => {
    const current = new AbortController();
    controller.current = current;
    busy.current = true;
    setState({ items: [], nextCursor: null, status: 'loading', loadingMore: false, loadMoreFailed: false });
    fetchPage(null, current.signal)
      .then((page) => {
        if (current.signal.aborted) return;
        setState({ items: page.items, nextCursor: page.nextCursor, status: 'ready', loadingMore: false, loadMoreFailed: false });
      })
      .catch(() => {
        if (!current.signal.aborted) setState((prev) => ({ ...prev, status: 'error' }));
      })
      .finally(() => {
        if (!current.signal.aborted) busy.current = false;
      });
    return () => current.abort();
  }, [fetchPage, attempt]);

  const loadMore = useCallback(() => {
    if (busy.current || state.status !== 'ready' || !state.nextCursor) return;
    const signal = controller.current?.signal;
    if (!signal) return;
    busy.current = true;
    setState((prev) => ({ ...prev, loadingMore: true, loadMoreFailed: false }));
    fetchPage(state.nextCursor, signal)
      .then((page) => {
        if (signal.aborted) return;
        setState((prev) => {
          const seen = new Set(prev.items.map((item) => JSON.stringify(item)));
          const fresh = page.items.filter((item) => !seen.has(JSON.stringify(item)));
          return { ...prev, items: [...prev.items, ...fresh], nextCursor: page.nextCursor, loadingMore: false };
        });
      })
      .catch(() => {
        if (!signal.aborted) setState((prev) => ({ ...prev, loadingMore: false, loadMoreFailed: true }));
      })
      .finally(() => {
        if (!signal.aborted) busy.current = false;
      });
  }, [fetchPage, state.nextCursor, state.status]);

  const retry = useCallback(() => setAttempt((value) => value + 1), []);

  return { ...state, hasMore: state.nextCursor !== null, loadMore, retry };
}

/** Calls [onVisible] when the returned element scrolls near the viewport. */
export function useInfiniteSentinel(onVisible: () => void, enabled: boolean) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = ref.current;
    if (!node || !enabled) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) onVisible();
    }, { rootMargin: '420px 0px' });
    observer.observe(node);
    return () => observer.disconnect();
  }, [onVisible, enabled]);
  return ref;
}
