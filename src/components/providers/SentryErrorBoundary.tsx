"use client";

import * as Sentry from "@sentry/nextjs";

type SentryErrorBoundaryProps = {
  children: React.ReactNode;
  boundaryName: string;
};

export function SentryErrorBoundary({ children, boundaryName }: SentryErrorBoundaryProps) {
  return (
    <Sentry.ErrorBoundary
      fallback={<div className="p-4 text-sm text-muted-foreground">Something went wrong.</div>}
      beforeCapture={(scope) => {
        scope.setTag("boundary", boundaryName);
      }}
      showDialog={false}
    >
      {children}
    </Sentry.ErrorBoundary>
  );
}
