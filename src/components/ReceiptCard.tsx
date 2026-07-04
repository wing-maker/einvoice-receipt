import Link from "next/link";
import { ChevronRight, Store } from "lucide-react";
import type { Receipt } from "@/lib/types";
import { computeWindow, stateHint, formatDate } from "@/lib/dates";
import { StatusBadge } from "@/components/StatusBadge";

export function ReceiptCard({ receipt }: { receipt: Receipt }) {
  const info = computeWindow(receipt);
  const amount =
    receipt.amount != null
      ? new Intl.NumberFormat("en-MY", {
          style: "currency",
          currency: "MYR",
        }).format(receipt.amount)
      : null;

  return (
    <Link
      href={`/receipts/${receipt.id}`}
      className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-3.5 shadow-sm transition-colors hover:bg-surface-2 active:scale-[0.99]"
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-muted-foreground">
        <Store size={20} aria-hidden />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate font-semibold">
            {receipt.merchant_name || "Untitled receipt"}
          </p>
          {amount && (
            <span className="tabular shrink-0 text-sm font-semibold text-muted-foreground">
              {amount}
            </span>
          )}
        </div>
        <div className="mt-1.5 flex items-center gap-2">
          <StatusBadge state={info.state} />
          <span className="truncate text-xs text-muted-foreground">
            {stateHint(info)}
          </span>
        </div>
        {info.deadline && info.state !== "registered" && (
          <p className="tabular mt-1 text-xs text-muted-foreground">
            Deadline {formatDate(receipt.register_deadline)}
          </p>
        )}
      </div>

      <ChevronRight
        size={18}
        className="shrink-0 text-muted-foreground"
        aria-hidden
      />
    </Link>
  );
}
