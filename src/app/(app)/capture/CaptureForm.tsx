"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Camera, Loader2, X, Info } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button, Input, Textarea, Field } from "@/components/ui";
import type { BuyerProfile } from "@/lib/types";
import { addDays, parseDate, toISODate, formatDate } from "@/lib/dates";

export function CaptureForm({
  teamId,
  profiles,
}: {
  teamId: string;
  profiles: BuyerProfile[];
}) {
  const router = useRouter();
  const supabase = createClient();
  const fileInput = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [merchant, setMerchant] = useState("");
  const [amount, setAmount] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(toISODate(new Date()));
  const [waitDays, setWaitDays] = useState("");
  const [deadline, setDeadline] = useState("");
  const [qrUrl, setQrUrl] = useState("");
  const [buyerId, setBuyerId] = useState(
    profiles.find((p) => p.is_default)?.id ?? profiles[0]?.id ?? "",
  );
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openDate = useMemo(() => {
    const p = parseDate(purchaseDate);
    const w = Number(waitDays);
    if (p && waitDays !== "" && !Number.isNaN(w)) return addDays(p, w);
    return null;
  }, [purchaseDate, waitDays]);

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview((old) => {
      if (old) URL.revokeObjectURL(old);
      return URL.createObjectURL(f);
    });
  }

  function clearPhoto() {
    setFile(null);
    setPreview((old) => {
      if (old) URL.revokeObjectURL(old);
      return null;
    });
    if (fileInput.current) fileInput.current.value = "";
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      let imagePath: string | null = null;
      if (file) {
        const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
        const path = `${teamId}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("receipts")
          .upload(path, file, { contentType: file.type || "image/jpeg" });
        if (upErr) throw upErr;
        imagePath = path;
      }

      const { data, error: insErr } = await supabase
        .from("receipts")
        .insert({
          team_id: teamId,
          merchant_name: merchant.trim() || null,
          amount: amount ? Number(amount) : null,
          image_path: imagePath,
          purchase_date: purchaseDate || null,
          wait_days: waitDays !== "" ? Number(waitDays) : null,
          register_open_date: openDate ? toISODate(openDate) : null,
          register_deadline: deadline || null,
          qr_url: qrUrl.trim() || null,
          buyer_profile_id: buyerId || null,
          notes: notes.trim() || null,
        })
        .select("id")
        .single();
      if (insErr) throw insErr;

      router.replace(`/receipts/${data.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save receipt.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="px-4 pt-6 space-y-5">
      {/* Photo */}
      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={onPick}
        className="hidden"
      />
      {preview ? (
        <div className="relative overflow-hidden rounded-2xl border border-border">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt="Receipt preview"
            className="max-h-72 w-full object-contain bg-surface-2"
          />
          <button
            type="button"
            onClick={clearPhoto}
            aria-label="Remove photo"
            className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full bg-foreground/70 text-background backdrop-blur"
          >
            <X size={18} aria-hidden />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          className="flex w-full flex-col items-center gap-2 rounded-2xl border border-dashed border-border bg-surface py-10 text-muted-foreground transition-colors hover:bg-surface-2"
        >
          <Camera size={30} aria-hidden />
          <span className="text-sm font-semibold">Take a photo of the receipt</span>
          <span className="text-xs">or choose from your library</span>
        </button>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Field label="Merchant" htmlFor="merchant">
          <Input
            id="merchant"
            value={merchant}
            onChange={(e) => setMerchant(e.target.value)}
            placeholder="Shop name"
          />
        </Field>
        <Field label="Amount (RM)" htmlFor="amount">
          <Input
            id="amount"
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
          />
        </Field>
      </div>

      {/* Timing — the core */}
      <div className="rounded-2xl border border-border bg-surface p-4 space-y-4">
        <div className="flex items-start gap-2 text-xs text-muted-foreground">
          <Info size={15} className="mt-0.5 shrink-0 text-primary" aria-hidden />
          <p>
            Most receipts print how long to wait before registering and the
            final deadline. Enter them so we can remind you in the right window.
          </p>
        </div>

        <Field label="Purchase date" htmlFor="purchase" required>
          <Input
            id="purchase"
            type="date"
            required
            value={purchaseDate}
            onChange={(e) => setPurchaseDate(e.target.value)}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field
            label="Wait days"
            htmlFor="wait"
            hint="&ldquo;Register after N days&rdquo;"
          >
            <Input
              id="wait"
              type="number"
              inputMode="numeric"
              min="0"
              value={waitDays}
              onChange={(e) => setWaitDays(e.target.value)}
              placeholder="e.g. 3"
            />
          </Field>
          <Field label="Register before" htmlFor="deadline">
            <Input
              id="deadline"
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
            />
          </Field>
        </div>

        {openDate && (
          <p className="tabular rounded-lg bg-primary-soft px-3 py-2 text-xs font-medium text-primary">
            Window opens {formatDate(toISODate(openDate))}
            {deadline ? ` · closes ${formatDate(deadline)}` : ""}
          </p>
        )}
      </div>

      <Field
        label="QR / registration link"
        htmlFor="qr"
        hint="Paste the link from the receipt QR so you can jump straight to it later."
      >
        <Input
          id="qr"
          type="url"
          inputMode="url"
          value={qrUrl}
          onChange={(e) => setQrUrl(e.target.value)}
          placeholder="https://…"
        />
      </Field>

      <Field label="Buyer profile" htmlFor="buyer">
        {profiles.length === 0 ? (
          <Link
            href="/profiles"
            className="block rounded-xl border border-dashed border-border bg-surface px-3.5 py-3 text-sm text-muted-foreground"
          >
            No profiles yet — add one to autofill forms later →
          </Link>
        ) : (
          <select
            id="buyer"
            value={buyerId}
            onChange={(e) => setBuyerId(e.target.value)}
            className="min-h-11 w-full rounded-xl border border-border bg-surface px-3 text-base text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
                {p.is_default ? " (default)" : ""}
              </option>
            ))}
          </select>
        )}
      </Field>

      <Field label="Notes" htmlFor="notes">
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Anything to remember…"
        />
      </Field>

      {error && (
        <p
          role="alert"
          className="rounded-lg bg-danger-soft px-3 py-2 text-sm font-medium text-danger"
        >
          {error}
        </p>
      )}

      <Button type="submit" block disabled={busy}>
        {busy && <Loader2 size={16} className="animate-spin" aria-hidden />}
        Save receipt
      </Button>
    </form>
  );
}
