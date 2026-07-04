import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getBuyerProfiles, getReceipt } from "@/lib/data";
import { computeWindow, stateHint, formatDate } from "@/lib/dates";
import { StatusBadge } from "@/components/StatusBadge";
import { ReceiptActions } from "./ReceiptActions";
import type { BuyerProfile } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ReceiptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [receipt, profiles] = await Promise.all([
    getReceipt(id),
    getBuyerProfiles(),
  ]);
  if (!receipt) notFound();

  let imageUrl: string | null = null;
  if (receipt.image_path) {
    const supabase = await createClient();
    const { data } = await supabase.storage
      .from("receipts")
      .createSignedUrl(receipt.image_path, 60 * 60);
    imageUrl = data?.signedUrl ?? null;
  }

  const info = computeWindow(receipt);
  const buyer: BuyerProfile | null =
    profiles.find((p) => p.id === receipt.buyer_profile_id) ?? null;

  const amount =
    receipt.amount != null
      ? new Intl.NumberFormat("en-MY", {
          style: "currency",
          currency: "MYR",
        }).format(receipt.amount)
      : null;

  return (
    <div className="pb-6">
      <header className="flex items-center gap-1 px-2 pt-4">
        <Link
          href="/dashboard"
          className="flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground hover:bg-surface-2"
          aria-label="Back"
        >
          <ChevronLeft size={22} aria-hidden />
        </Link>
        <span className="text-sm font-medium text-muted-foreground">
          Receipt
        </span>
      </header>

      <div className="px-4 pt-2 space-y-5">
        <div>
          <div className="flex items-start justify-between gap-3">
            <h1 className="text-2xl font-bold tracking-tight">
              {receipt.merchant_name || "Untitled receipt"}
            </h1>
            {amount && (
              <span className="tabular shrink-0 pt-1 text-lg font-semibold text-muted-foreground">
                {amount}
              </span>
            )}
          </div>
          <div className="mt-2 flex items-center gap-2">
            <StatusBadge state={info.state} />
            <span className="text-sm text-muted-foreground">
              {stateHint(info)}
            </span>
          </div>
        </div>

        {imageUrl && (
          <a
            href={imageUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block overflow-hidden rounded-2xl border border-border"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt="Receipt"
              className="max-h-80 w-full bg-surface-2 object-contain"
            />
          </a>
        )}

        {/* Timeline */}
        <div className="grid grid-cols-3 gap-2 rounded-2xl border border-border bg-surface p-4 text-center shadow-sm">
          <TimelineCell label="Purchased" value={formatDate(receipt.purchase_date)} />
          <TimelineCell
            label="Opens"
            value={info.open ? formatDate(toISO(info.open)) : "—"}
          />
          <TimelineCell
            label="Deadline"
            value={formatDate(receipt.register_deadline)}
          />
        </div>

        <ReceiptActions
          receipt={receipt}
          buyer={buyer}
          profiles={profiles}
        />
      </div>
    </div>
  );
}

function TimelineCell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="tabular mt-0.5 text-sm font-semibold">{value}</p>
    </div>
  );
}

function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
