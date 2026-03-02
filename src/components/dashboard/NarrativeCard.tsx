"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RefreshCcw } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { NarrativeOutput } from "@/lib/validators/narrative.schemas";

type NarrativeCardProps = {
  entityId: string;
};

export function NarrativeCard({ entityId }: NarrativeCardProps) {
  const [loading, setLoading] = useState(true);
  const [narrative, setNarrative] = useState<NarrativeOutput | null>(null);
  const [hidden, setHidden] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const mountedRef = useRef(true);

  const generatedAgoText = useMemo(() => {
    if (!narrative) return "";
    const generatedAt = new Date(narrative.generatedAt);
    const diffMs = Date.now() - generatedAt.getTime();
    const mins = Math.max(1, Math.floor(diffMs / (1000 * 60)));
    if (mins < 60) return `Generated ${mins} minute${mins === 1 ? "" : "s"} ago`;
    const hours = Math.floor(mins / 60);
    return `Generated ${hours} hour${hours === 1 ? "" : "s"} ago`;
  }, [narrative]);

  const fetchNarrative = useCallback(async (forceRefresh: boolean) => {
    try {
      if (forceRefresh) {
        setRegenerating(true);
      } else {
        setLoading(true);
      }
      setHidden(false);
      setNarrative(null);

      try {
        const response = await fetch(`/api/narratives/${entityId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(forceRefresh ? { forceRefresh: true } : {}),
        });

        if (!response.ok) {
          if (mountedRef.current) {
            setHidden(true);
          }
          return;
        }

        const payload = (await response.json()) as NarrativeOutput | { success: false };

        if (mountedRef.current && payload) {
          if ("success" in payload && payload.success === false) {
            setHidden(true);
            return;
          }
          setNarrative(payload as NarrativeOutput);
        }
      } catch {
        if (mountedRef.current) {
          setHidden(true);
        }
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
        setRegenerating(false);
      }
    }
  }, [entityId]);

  useEffect(() => {
    mountedRef.current = true;
    void fetchNarrative(false);
    return () => {
      mountedRef.current = false;
    };
  }, [fetchNarrative]);

  if (hidden) {
    return null;
  }

  if (loading || regenerating) {
    return (
      <section className="rounded-lg border border-purple-300 bg-card p-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-11/12" />
          <Skeleton className="h-4 w-10/12" />
          <Skeleton className="h-4 w-9/12" />
        </div>
      </section>
    );
  }

  if (!narrative) {
    return null;
  }

  return (
    <section className="rounded-lg border border-purple-300 bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-800">
            AI
          </span>
          <h2 className="text-sm font-medium">Nexus Exposure Summary</h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{generatedAgoText}</span>
          <button
            type="button"
            onClick={() => void fetchNarrative(true)}
            className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium"
          >
            <RefreshCcw className="h-3.5 w-3.5" />
            Regenerate
          </button>
        </div>
      </div>

      <p className="mt-3 text-sm text-muted-foreground">{narrative.summaryText}</p>
      <ul className="mt-3 space-y-1">
        {narrative.highlights.map((highlight) => (
          <li key={highlight} className="text-sm">
            - {highlight}
          </li>
        ))}
      </ul>
      {narrative.dataQualityFlags.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {narrative.dataQualityFlags.map((flag) => (
            <span
              key={flag}
              className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800"
            >
              {flag}
            </span>
          ))}
        </div>
      ) : null}
      <p className="mt-3 text-xs text-muted-foreground">{narrative.disclaimer}</p>
    </section>
  );
}
