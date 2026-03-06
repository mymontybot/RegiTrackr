import { AlertTriangle } from "lucide-react";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { MainNav } from "@/components/dashboard/MainNav";
import { UserProfileButton } from "@/components/dashboard/UserProfileButton";
import { getTenantContext } from "@/lib/services/auth.service";

function formatLastUpdated(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export default async function AiDisclaimerPage() {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  const tenant = await getTenantContext(userId);
  const lastUpdated = formatLastUpdated(new Date());

  return (
    <div className="flex min-h-screen bg-[#060B18]">
      <MainNav role={tenant.role} current="dashboard" />

      <main className="ml-64 min-w-0 flex-1 p-6">
        <div className="mb-6 -mt-6 -mr-6 flex h-14 items-center justify-between border-b border-[#1A2640] bg-[#0D1526] px-6">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-100">AI Disclaimer</h1>
          <UserProfileButton />
        </div>

        <div className="mx-auto w-full max-w-3xl pb-8">
          <p className="text-sm text-slate-400 mt-1">
            How the AI Nexus Exposure Narrative works and what it does not do
          </p>
          <p className="mt-1 text-xs text-slate-600">Last updated: {lastUpdated}</p>
          <div className="mt-6 mb-8 border-b border-[#1E2D4A]" />

          <section
            className="mb-8 rounded-xl border border-[#1E2D4A] bg-[#0D1526] p-6"
            style={{ borderLeft: "4px solid #F87171" }}
          >
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-[#F87171] shrink-0 mt-0.5" />
              <div>
                <h2 className="font-semibold text-slate-100">This is not tax advice.</h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">
                  The AI Nexus Exposure Narrative is an automated summary of data you have entered into RegiTrackr.
                  It is provided for informational and workflow purposes only. It does not constitute tax advice, legal
                  advice, or a compliance opinion. Always verify threshold data, deadlines, and registration
                  requirements directly with official state revenue department sources before taking action.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h3 className="mb-3 mt-8 text-base font-semibold text-slate-100">What the AI Narrative Does</h3>
            <p className="text-sm leading-relaxed text-slate-400">
              The AI Nexus Exposure Narrative reads the structured data stored in a client's RegiTrackr dashboard and
              produces a plain-English paragraph summarizing their current compliance position.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-slate-400">The narrative synthesizes:</p>
            <ul className="mt-2 list-disc space-y-1 pl-6 text-sm leading-relaxed text-slate-400">
              <li>Current nexus threshold percentages across all tracked states</li>
              <li>Filing deadline status and upcoming due dates</li>
              <li>Registration status gaps where exposure exists but no registration is recorded</li>
              <li>Recent alert history and any triggered thresholds</li>
              <li>Revenue velocity and projected time to threshold crossing</li>
            </ul>
            <p className="mt-3 text-sm leading-relaxed text-slate-400">
              The goal is to give CPA firm staff a fast, readable briefing on a client's position without requiring
              them to manually review every data point in the dashboard.
            </p>
          </section>

          <section>
            <h3 className="mb-3 mt-8 text-base font-semibold text-slate-100">What the AI Narrative Does Not Do</h3>
            <p className="text-sm leading-relaxed text-slate-400">
              The AI Narrative does not provide tax advice and is not a substitute for professional judgment.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-slate-400">Specifically, the narrative does not:</p>
            <ul className="mt-2 list-disc space-y-1 pl-6 text-sm leading-relaxed text-slate-400">
              <li>Confirm that a client is or is not required to register in any specific state</li>
              <li>Provide a legal determination of nexus status</li>
              <li>Guarantee the accuracy of threshold calculations or deadline dates</li>
              <li>Replace the review of official state revenue department guidance</li>
              <li>
                Account for product-specific exemptions, industry-specific rules, or multi-factor nexus tests that are
                not captured in the data entered into RegiTrackr
              </li>
              <li>Constitute a compliance opinion, legal opinion, or tax advice of any kind</li>
            </ul>
            <p className="mt-3 text-sm leading-relaxed text-slate-400">
              The CPA firm and its licensed professionals remain solely responsible for all compliance determinations
              and filings made on behalf of their clients.
            </p>
          </section>

          <section>
            <h3 className="mb-3 mt-8 text-base font-semibold text-slate-100">How It Is Generated</h3>
            <p className="text-sm leading-relaxed text-slate-400">
              Each narrative is generated using a large language model (LLM) provided by Anthropic. The model is given
              a structured prompt containing the client's current data from RegiTrackr and instructed to produce a
              factual summary of that data.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-slate-400">The model does not have access to:</p>
            <ul className="mt-2 list-disc space-y-1 pl-6 text-sm leading-relaxed text-slate-400">
              <li>State tax law databases or live regulatory feeds</li>
              <li>
                Official nexus threshold tables (these are maintained in RegiTrackr's AI-monitored threshold database
                and human-verified before publication)
              </li>
              <li>Client data from other firms or other clients</li>
              <li>Any information beyond what is present in the current client's RegiTrackr record</li>
            </ul>
            <p className="mt-3 text-sm leading-relaxed text-slate-400">
              Client data is never used to train AI models. See our Privacy Policy for details on how data is handled.
            </p>
          </section>

          <section>
            <h3 className="mb-3 mt-8 text-base font-semibold text-slate-100">Data Accuracy</h3>
            <p className="text-sm leading-relaxed text-slate-400">
              The accuracy of the AI Narrative depends entirely on the accuracy of the data entered into RegiTrackr.
              If revenue figures, registration statuses, or filing records are incomplete or incorrect, the narrative
              will reflect that.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-slate-400">
              RegiTrackr maintains an AI-monitored threshold database by state. Our system checks all 50 state revenue
              department pages weekly and flags potential changes automatically. Every threshold is human-verified
              before going live. However, states may change thresholds, effective dates, or rules at any time. Always
              verify current thresholds directly with the relevant state revenue department before advising a client.
            </p>
          </section>

          <section>
            <h3 className="mb-3 mt-8 text-base font-semibold text-slate-100">Limitations and Known Constraints</h3>
            <p className="text-sm leading-relaxed text-slate-400">
              The AI narrative generation system has the following known limitations:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-6 text-sm leading-relaxed text-slate-400">
              <li>
                Narratives are generated based on a point-in-time snapshot. Data that changes after the narrative is
                generated will not be reflected until the narrative is regenerated.
              </li>
              <li>
                The model may occasionally produce phrasing that implies more certainty than the underlying data
                warrants. CPA professionals should apply their own judgment when interpreting any narrative.
              </li>
              <li>
                Narratives are not reviewed by a licensed tax professional before delivery. They are automated outputs.
              </li>
              <li>
                Enterprise-specific rules, treaty overrides, or unusually complex multi-state structures may not be
                fully captured in a brief narrative format.
              </li>
            </ul>
          </section>

          <section>
            <h3 className="mb-3 mt-8 text-base font-semibold text-slate-100">Questions</h3>
            <p className="text-sm leading-relaxed text-slate-400">
              If you have questions about how the AI narrative is generated, what data it uses, or how to interpret a
              specific output, contact support at support@regitrackr.com
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
