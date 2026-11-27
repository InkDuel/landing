'use client';

import { WorkErrorView } from './work-error-view';

// Served (HTTP 500) when the backend cannot answer for a work or chapter.
export default function WorkError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <WorkErrorView onRetry={reset} />;
}
