"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RefreshCcw, Sparkles } from "lucide-react";
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
      <section
        className="rounded-xl border border-l-[3px] p-6"
        style={{
          background: "linear-gradient(135deg, #0D1526 0%, #130D2E 100%)",
          borderColor: "rgba(124, 58, 237, 0.3)",
          borderLeftColor: "#7C3AED",
          boxShadow: "0 0 32px rgba(124, 58, 237, 0.08)",
        }}
      >
        <div className="space-y-2">
          <Skeleton className="h-3 w-full bg-violet-900/30" />
          <Skeleton className="h-3 w-5/6 bg-violet-900/30" />
          <Skeleton className="h-3 w-4/6 bg-violet-900/30" />
          <Skeleton className="h-3 w-3/6 bg-violet-900/30" />
        </div>
      </section>
    );
  }

  if (!narrative) {
    return null;
  }

  return (
    <section
      className="rounded-xl border border-l-[3px] p-6"
      style={{
        background: "linear-gradient(135deg, #0D1526 0%, #130D2E 100%)",
        borderColor: "rgba(124, 58, 237, 0.3)",
        borderLeftColor: "#7C3AED",
        boxShadow: "0 0 32px rgba(124, 58, 237, 0.08)",
      }}
    >
      <div className="mb-4 flex items-center gap-2">
        <div className="flex flex-1 items-center gap-2">
          <Sparkles className="h-3.5 w-3.5 text-violet-400" />
          <span className="rounded-full border border-violet-700/50 bg-violet-900/50 px-2.5 py-0.5 text-xs font-medium text-violet-300">
            AI
          </span>
          <h2 className="text-base font-semibold text-slate-100">Nexus Exposure Summary</h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="ml-auto text-xs text-slate-500">{generatedAgoText}</span>
          <button
            type="button"
            onClick={() => void fetchNarrative(true)}
            className="inline-flex items-center gap-1 rounded-lg px-4 py-2 text-sm font-medium text-slate-500 transition-colors hover:bg-[#111D35] hover:text-slate-300"
          >
            <RefreshCcw className="h-3.5 w-3.5" />
            Regenerate
          </button>
        </div>
      </div>

      <p className="text-sm leading-relaxed text-slate-300">{narrative.summaryText}</p>
      <ul className="mt-3 space-y-1">
        {narrative.highlights.map((highlight) => (
          <li key={highlight} className="text-sm text-slate-300">
            - {highlight}
          </li>
        ))}
      </ul>
      {narrative.dataQualityFlags.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {narrative.dataQualityFlags.map((flag) => (
            <span
              key={flag}
              className="rounded-full border border-[#854D0E] bg-[#1A1400] px-2.5 py-0.5 text-xs font-medium text-[#FDE047]"
            >
              {flag}
            </span>
          ))}
        </div>
      ) : null}
      <p className="mt-3 text-xs text-slate-500">{narrative.disclaimer}</p>
    </section>
  );
}
