'use client';

import { useEffect } from 'react';

import { startAnalytics } from '@/lib/analytics';

/** Starts GA4 on every page; GA4 itself logs the page views. */
export function AnalyticsStart() {
  useEffect(() => {
    startAnalytics();
  }, []);
  return null;
}
