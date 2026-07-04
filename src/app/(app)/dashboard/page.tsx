import Link from "next/link";
import { Camera, Inbox, ArrowRight } from "lucide-react";
import { getContext, getReceipts } from "@/lib/data";
import { computeWindow, windowSortKey, type WindowState } from "@/lib/dates";
import { ReceiptCard } from "@/components/ReceiptCard";
import type { Receipt } from "@/lib/types";

export const dynamic = "force-dynamic";

const ACTION_STATES: WindowState[] = ["overdue", "due_soon", "open", "unknown"];
const WAITING_STATES: WindowState[] = ["waiting"];
const DONE_STATES: WindowState[] = ["registered", "skipped"];

function sortReceipts(receipts: Receipt[]): Receipt[] {
  return [...receipts].sort(
    (a, b) => windowSortKey(computeWindow(a)) - windowSortKey(computeWindow(b)),
  );
}

function Section({
  title,
  accent,
  receipts,
}: {
  title: string;
  accent?: string;
  receipts: Receipt[];
}) {
  if (receipts.length === 0) return null;
  return (
    <section className="space-y-2.5">
      <h2 className="flex items-center gap-2 px-1 text-sm font-semibold text-muted-foreground">
        {accent && (
          <span className={`h-2 w-2 rounded-full ${accent}`} aria-hidden />
        )}
        {title}
        <span className="text-muted-foreground/70">{receipts.length}</span>
      </h2>
      <div className="space-y-2.5">
        {receipts.map((r) => (
          <ReceiptCard key={r.id} receipt={r} />
        ))}
      </div>
    </section>
  );
}

export default async function DashboardPage() {
  const [ctx, receipts] = await Promise.all([getContext(), getReceipts()]);

  const withState = receipts.map((r) => ({
    receipt: r,
    state: computeWindow(r).state,
  }));

  const action = sortReceipts(
    withState.filter((x) => ACTION_STATES.includes(x.state)).map((x) => x.receipt),
  );
  const waiting = sortReceipts(
    withState.filter((x) => WAITING_STATES.includes(x.state)).map((x) => x.receipt),
  );
  const done = sortReceipts(
    withState.filter((x) => DONE_STATES.includes(x.state)).map((x) => x.receipt),
  );

  const firstName = (ctx?.profile?.display_name || "there").split(" ")[0];

  return (
    <div className="px-4 pt-6">
      <header className="mb-5 flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Hi {firstName},</p>
          <h1 className="text-2xl font-bold tracking-tight">Reminders</h1>
        </div>
        <Link
          href="/capture"
          className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-primary px-3.5 text-sm font-semibold text-primary-foreground shadow-sm transition-transform active:scale-95"
        >
          <Camera size={17} strokeWidth={2.4} aria-hidden />
          Capture
        </Link>
      </header>

      {/* Summary strip */}
      <div className="mb-6 grid grid-cols-3 gap-2.5">
        <Stat label="Need action" value={action.length} tone="text-primary" />
        <Stat label="Waiting" value={waiting.length} tone="text-foreground" />
        <Stat label="Done" value={done.length} tone="text-success" />
      </div>

      {receipts.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-6">
          <Section
            title="Need action"
            accent="bg-primary"
            receipts={action}
          />
          <Section
            title="Waiting to open"
            accent="bg-muted-foreground"
            receipts={waiting}
          />
          <Section title="Done" accent="bg-success" receipts={done} />
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-3 text-center shadow-sm">
      <p className={`tabular text-2xl font-bold ${tone}`}>{value}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="mt-10 flex flex-col items-center rounded-2xl border border-dashed border-border bg-surface px-6 py-12 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-2 text-muted-foreground">
        <Inbox size={26} aria-hidden />
      </div>
      <h2 className="text-lg font-semibold">No receipts yet</h2>
      <p className="mt-1.5 max-w-xs text-sm text-muted-foreground">
        Snap a paper receipt and we&apos;ll remind you exactly when its
        e-invoice registration window opens.
      </p>
      <Link
        href="/capture"
        className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm transition-transform active:scale-95"
      >
        Capture your first receipt
        <ArrowRight size={16} aria-hidden />
      </Link>
    </div>
  );
}
