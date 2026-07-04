"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ExternalLink,
  Check,
  Copy,
  CircleCheck,
  Undo2,
  MinusCircle,
  Pencil,
  Trash2,
  Loader2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button, Input, Field } from "@/components/ui";
import type { BuyerProfile, Receipt } from "@/lib/types";
import { computeWindow, addDays, parseDate, toISODate } from "@/lib/dates";

export function ReceiptActions({
  receipt,
  buyer,
  profiles,
}: {
  receipt: Receipt;
  buyer: BuyerProfile | null;
  profiles: BuyerProfile[];
}) {
  const router = useRouter();
  const supabase = createClient();
  const info = computeWindow(receipt);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function patch(fields: Partial<Receipt>) {
    setBusy(true);
    setError(null);
    const { error } = await supabase
      .from("receipts")
      .update(fields)
      .eq("id", receipt.id);
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.refresh();
  }

  async function markRegistered() {
    await patch({ status: "registered", registered_at: new Date().toISOString() });
  }
  async function undoRegistered() {
    await patch({ status: "pending", registered_at: null });
  }
  async function skip() {
    await patch({ status: "skipped" });
  }
  async function unskip() {
    await patch({ status: "pending" });
  }

  async function remove() {
    if (!confirm("Delete this receipt? This cannot be undone.")) return;
    setBusy(true);
    if (receipt.image_path) {
      await supabase.storage.from("receipts").remove([receipt.image_path]);
    }
    const { error } = await supabase
      .from("receipts")
      .delete()
      .eq("id", receipt.id);
    if (error) {
      setError(error.message);
      setBusy(false);
      return;
    }
    router.replace("/dashboard");
    router.refresh();
  }

  const canRegister =
    info.state === "open" ||
    info.state === "due_soon" ||
    info.state === "overdue";

  return (
    <div className="space-y-5">
      {/* Primary action */}
      {receipt.status === "pending" && (
        <div className="space-y-2.5">
          {receipt.qr_url && (
            <a
              href={receipt.qr_url}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold shadow-sm transition-transform active:scale-[0.98] ${
                canRegister
                  ? "bg-primary text-primary-foreground"
                  : "border border-border bg-surface text-foreground"
              }`}
            >
              <ExternalLink size={17} aria-hidden />
              Open registration page
            </a>
          )}
          {info.state === "waiting" && (
            <p className="rounded-lg bg-surface-2 px-3 py-2 text-center text-xs text-muted-foreground">
              Too early to register — we&apos;ll surface this when the window
              opens.
            </p>
          )}
          <Button variant="success" block onClick={markRegistered} disabled={busy}>
            {busy ? (
              <Loader2 size={16} className="animate-spin" aria-hidden />
            ) : (
              <CircleCheck size={17} aria-hidden />
            )}
            Mark as registered
          </Button>
        </div>
      )}

      {receipt.status === "registered" && (
        <div className="flex items-center justify-between rounded-xl bg-success-soft px-4 py-3">
          <span className="flex items-center gap-2 text-sm font-semibold text-success">
            <CircleCheck size={18} aria-hidden />
            Registered
          </span>
          <button
            onClick={undoRegistered}
            disabled={busy}
            className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <Undo2 size={15} aria-hidden />
            Undo
          </button>
        </div>
      )}

      {receipt.status === "skipped" && (
        <div className="flex items-center justify-between rounded-xl bg-surface-2 px-4 py-3">
          <span className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <MinusCircle size={18} aria-hidden />
            Skipped
          </span>
          <button
            onClick={unskip}
            disabled={busy}
            className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <Undo2 size={15} aria-hidden />
            Restore
          </button>
        </div>
      )}

      {/* Buyer profile copy assist */}
      {buyer ? (
        <BuyerCopyCard buyer={buyer} />
      ) : (
        <p className="rounded-xl border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
          No buyer profile assigned.
        </p>
      )}

      {receipt.notes && (
        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="text-xs font-medium text-muted-foreground">Notes</p>
          <p className="mt-1 text-sm whitespace-pre-wrap">{receipt.notes}</p>
        </div>
      )}

      {error && (
        <p
          role="alert"
          className="rounded-lg bg-danger-soft px-3 py-2 text-sm font-medium text-danger"
        >
          {error}
        </p>
      )}

      {/* Secondary actions */}
      <div className="flex items-center justify-between gap-3 pt-1">
        <button
          onClick={() => setEditing((v) => !v)}
          className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <Pencil size={15} aria-hidden />
          {editing ? "Close" : "Edit details"}
        </button>
        <div className="flex items-center gap-3">
          {receipt.status === "pending" && (
            <button
              onClick={skip}
              disabled={busy}
              className="text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              Skip
            </button>
          )}
          <button
            onClick={remove}
            disabled={busy}
            className="flex items-center gap-1.5 text-sm font-medium text-danger hover:opacity-80"
          >
            <Trash2 size={15} aria-hidden />
            Delete
          </button>
        </div>
      </div>

      {editing && (
        <EditForm
          receipt={receipt}
          profiles={profiles}
          busy={busy}
          onSave={async (fields) => {
            await patch(fields);
            setEditing(false);
          }}
        />
      )}
    </div>
  );
}

function BuyerCopyCard({ buyer }: { buyer: BuyerProfile }) {
  const rows: { label: string; value: string | null }[] = [
    { label: "TIN", value: buyer.tin },
    { label: "Reg. no", value: buyer.reg_no },
    { label: "Name", value: buyer.name },
    { label: "Email", value: buyer.email },
    { label: "Phone", value: buyer.phone },
    { label: "Address", value: buyer.address },
  ].filter((r) => r.value);

  const [copied, setCopied] = useState<string | null>(null);

  async function copy(key: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(key);
      setTimeout(() => setCopied((c) => (c === key ? null : c)), 1500);
    } catch {
      /* clipboard unavailable */
    }
  }

  const allText = rows.map((r) => `${r.label}: ${r.value}`).join("\n");

  return (
    <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold">{buyer.label}</p>
          <p className="text-xs text-muted-foreground">
            Tap a field to copy into the form
          </p>
        </div>
        <button
          onClick={() => copy("__all", allText)}
          className="flex items-center gap-1.5 rounded-lg bg-surface-2 px-2.5 py-1.5 text-xs font-semibold text-foreground hover:bg-border"
        >
          {copied === "__all" ? (
            <Check size={13} aria-hidden />
          ) : (
            <Copy size={13} aria-hidden />
          )}
          Copy all
        </button>
      </div>
      <ul className="divide-y divide-border">
        {rows.map((r) => (
          <li key={r.label}>
            <button
              onClick={() => copy(r.label, r.value!)}
              className="flex w-full items-center gap-3 py-2.5 text-left"
            >
              <span className="w-16 shrink-0 text-xs font-medium text-muted-foreground">
                {r.label}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm">{r.value}</span>
              {copied === r.label ? (
                <Check size={15} className="shrink-0 text-success" aria-hidden />
              ) : (
                <Copy
                  size={15}
                  className="shrink-0 text-muted-foreground"
                  aria-hidden
                />
              )}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function EditForm({
  receipt,
  profiles,
  busy,
  onSave,
}: {
  receipt: Receipt;
  profiles: BuyerProfile[];
  busy: boolean;
  onSave: (fields: Partial<Receipt>) => Promise<void>;
}) {
  const [merchant, setMerchant] = useState(receipt.merchant_name ?? "");
  const [amount, setAmount] = useState(
    receipt.amount != null ? String(receipt.amount) : "",
  );
  const [purchaseDate, setPurchaseDate] = useState(receipt.purchase_date ?? "");
  const [waitDays, setWaitDays] = useState(
    receipt.wait_days != null ? String(receipt.wait_days) : "",
  );
  const [deadline, setDeadline] = useState(receipt.register_deadline ?? "");
  const [qrUrl, setQrUrl] = useState(receipt.qr_url ?? "");
  const [buyerId, setBuyerId] = useState(receipt.buyer_profile_id ?? "");

  function save() {
    const p = parseDate(purchaseDate);
    const w = waitDays !== "" ? Number(waitDays) : null;
    const open = p && w != null ? toISODate(addDays(p, w)) : null;
    onSave({
      merchant_name: merchant.trim() || null,
      amount: amount ? Number(amount) : null,
      purchase_date: purchaseDate || null,
      wait_days: w,
      register_open_date: open,
      register_deadline: deadline || null,
      qr_url: qrUrl.trim() || null,
      buyer_profile_id: buyerId || null,
    });
  }

  return (
    <div className="space-y-4 rounded-2xl border border-border bg-surface p-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Merchant" htmlFor="e-merchant">
          <Input
            id="e-merchant"
            value={merchant}
            onChange={(e) => setMerchant(e.target.value)}
          />
        </Field>
        <Field label="Amount (RM)" htmlFor="e-amount">
          <Input
            id="e-amount"
            type="number"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </Field>
      </div>
      <Field label="Purchase date" htmlFor="e-purchase">
        <Input
          id="e-purchase"
          type="date"
          value={purchaseDate}
          onChange={(e) => setPurchaseDate(e.target.value)}
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Wait days" htmlFor="e-wait">
          <Input
            id="e-wait"
            type="number"
            value={waitDays}
            onChange={(e) => setWaitDays(e.target.value)}
          />
        </Field>
        <Field label="Register before" htmlFor="e-deadline">
          <Input
            id="e-deadline"
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
          />
        </Field>
      </div>
      <Field label="QR / registration link" htmlFor="e-qr">
        <Input
          id="e-qr"
          type="url"
          value={qrUrl}
          onChange={(e) => setQrUrl(e.target.value)}
        />
      </Field>
      {profiles.length > 0 && (
        <Field label="Buyer profile" htmlFor="e-buyer">
          <select
            id="e-buyer"
            value={buyerId}
            onChange={(e) => setBuyerId(e.target.value)}
            className="min-h-11 w-full rounded-xl border border-border bg-surface px-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">None</option>
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </Field>
      )}
      <Button block onClick={save} disabled={busy}>
        {busy && <Loader2 size={16} className="animate-spin" aria-hidden />}
        Save changes
      </Button>
    </div>
  );
}
