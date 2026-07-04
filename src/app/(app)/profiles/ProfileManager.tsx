"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Star,
  Pencil,
  Trash2,
  Loader2,
  IdCard,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button, Input, Textarea, Field } from "@/components/ui";
import type { BuyerProfile } from "@/lib/types";

type Draft = {
  label: string;
  tin: string;
  reg_no: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  is_default: boolean;
};

const EMPTY: Draft = {
  label: "",
  tin: "",
  reg_no: "",
  name: "",
  email: "",
  phone: "",
  address: "",
  is_default: false,
};

function toDraft(p: BuyerProfile): Draft {
  return {
    label: p.label ?? "",
    tin: p.tin ?? "",
    reg_no: p.reg_no ?? "",
    name: p.name ?? "",
    email: p.email ?? "",
    phone: p.phone ?? "",
    address: p.address ?? "",
    is_default: p.is_default,
  };
}

export function ProfileManager({
  teamId,
  profiles,
}: {
  teamId: string;
  profiles: BuyerProfile[];
}) {
  const router = useRouter();
  const supabase = createClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  return (
    <div className="space-y-4">
      {profiles.length === 0 && !creating && (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-border bg-surface px-6 py-10 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-2 text-muted-foreground">
            <IdCard size={24} aria-hidden />
          </div>
          <p className="font-semibold">No buyer profiles yet</p>
          <p className="mt-1 max-w-xs text-sm text-muted-foreground">
            Save your company or personal details once, then copy them into any
            merchant&apos;s registration form.
          </p>
        </div>
      )}

      <ul className="space-y-3">
        {profiles.map((p) =>
          editingId === p.id ? (
            <li key={p.id}>
              <ProfileForm
                initial={toDraft(p)}
                onCancel={() => setEditingId(null)}
                onSubmit={async (draft) => {
                  await save(supabase, teamId, draft, p.id, profiles);
                  setEditingId(null);
                  router.refresh();
                }}
                onDelete={async () => {
                  if (!confirm(`Delete profile "${p.label}"?`)) return;
                  await supabase.from("buyer_profiles").delete().eq("id", p.id);
                  setEditingId(null);
                  router.refresh();
                }}
              />
            </li>
          ) : (
            <li key={p.id}>
              <ProfileRow profile={p} onEdit={() => setEditingId(p.id)} />
            </li>
          ),
        )}
      </ul>

      {creating ? (
        <ProfileForm
          initial={{ ...EMPTY, is_default: profiles.length === 0 }}
          onCancel={() => setCreating(false)}
          onSubmit={async (draft) => {
            await save(supabase, teamId, draft, null, profiles);
            setCreating(false);
            router.refresh();
          }}
        />
      ) : (
        <Button variant="secondary" block onClick={() => setCreating(true)}>
          <Plus size={17} aria-hidden />
          Add buyer profile
        </Button>
      )}
    </div>
  );
}

async function save(
  supabase: ReturnType<typeof createClient>,
  teamId: string,
  draft: Draft,
  id: string | null,
  existing: BuyerProfile[],
) {
  const payload = {
    team_id: teamId,
    label: draft.label.trim() || "Untitled",
    tin: draft.tin.trim() || null,
    reg_no: draft.reg_no.trim() || null,
    name: draft.name.trim() || null,
    email: draft.email.trim() || null,
    phone: draft.phone.trim() || null,
    address: draft.address.trim() || null,
    is_default: draft.is_default,
  };

  let savedId = id;
  if (id) {
    await supabase.from("buyer_profiles").update(payload).eq("id", id);
  } else {
    const { data } = await supabase
      .from("buyer_profiles")
      .insert(payload)
      .select("id")
      .single();
    savedId = data?.id ?? null;
  }

  // Only one default per team.
  if (draft.is_default && savedId) {
    const others = existing.filter((p) => p.id !== savedId && p.is_default);
    for (const o of others) {
      await supabase
        .from("buyer_profiles")
        .update({ is_default: false })
        .eq("id", o.id);
    }
  }
}

function ProfileRow({
  profile,
  onEdit,
}: {
  profile: BuyerProfile;
  onEdit: () => void;
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="truncate font-semibold">{profile.label}</p>
            {profile.is_default && (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary-soft px-2 py-0.5 text-[11px] font-semibold text-primary">
                <Star size={11} aria-hidden />
                Default
              </span>
            )}
          </div>
          {profile.tin && (
            <p className="tabular mt-1 text-sm text-muted-foreground">
              TIN {profile.tin}
            </p>
          )}
          {profile.name && (
            <p className="truncate text-sm text-muted-foreground">
              {profile.name}
            </p>
          )}
        </div>
        <button
          onClick={onEdit}
          aria-label={`Edit ${profile.label}`}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-surface-2"
        >
          <Pencil size={16} aria-hidden />
        </button>
      </div>
    </div>
  );
}

function ProfileForm({
  initial,
  onSubmit,
  onCancel,
  onDelete,
}: {
  initial: Draft;
  onSubmit: (draft: Draft) => Promise<void>;
  onCancel: () => void;
  onDelete?: () => Promise<void>;
}) {
  const [draft, setDraft] = useState<Draft>(initial);
  const [busy, setBusy] = useState(false);

  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    await onSubmit(draft);
    setBusy(false);
  }

  return (
    <form
      onSubmit={submit}
      className="space-y-4 rounded-2xl border border-border bg-surface p-4 shadow-sm"
    >
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Buyer profile</h3>
        <button
          type="button"
          onClick={onCancel}
          aria-label="Cancel"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-surface-2"
        >
          <X size={17} aria-hidden />
        </button>
      </div>

      <Field label="Label" htmlFor="p-label" required hint="e.g. Main company">
        <Input
          id="p-label"
          required
          value={draft.label}
          onChange={(e) => set("label", e.target.value)}
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="TIN" htmlFor="p-tin">
          <Input
            id="p-tin"
            value={draft.tin}
            onChange={(e) => set("tin", e.target.value)}
          />
        </Field>
        <Field label="Reg. no (SSM)" htmlFor="p-reg">
          <Input
            id="p-reg"
            value={draft.reg_no}
            onChange={(e) => set("reg_no", e.target.value)}
          />
        </Field>
      </div>
      <Field label="Registered name" htmlFor="p-name">
        <Input
          id="p-name"
          value={draft.name}
          onChange={(e) => set("name", e.target.value)}
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Email" htmlFor="p-email">
          <Input
            id="p-email"
            type="email"
            value={draft.email}
            onChange={(e) => set("email", e.target.value)}
          />
        </Field>
        <Field label="Phone" htmlFor="p-phone">
          <Input
            id="p-phone"
            type="tel"
            value={draft.phone}
            onChange={(e) => set("phone", e.target.value)}
          />
        </Field>
      </div>
      <Field label="Address" htmlFor="p-address">
        <Textarea
          id="p-address"
          value={draft.address}
          onChange={(e) => set("address", e.target.value)}
        />
      </Field>

      <label className="flex items-center gap-2.5 text-sm">
        <input
          type="checkbox"
          checked={draft.is_default}
          onChange={(e) => set("is_default", e.target.checked)}
          className="h-5 w-5 rounded border-border accent-[var(--primary)]"
        />
        Use as default for new receipts
      </label>

      <div className="flex items-center gap-3">
        <Button type="submit" block disabled={busy}>
          {busy && <Loader2 size={16} className="animate-spin" aria-hidden />}
          Save profile
        </Button>
        {onDelete && (
          <Button
            type="button"
            variant="ghost"
            onClick={onDelete}
            disabled={busy}
            className="text-danger"
          >
            <Trash2 size={16} aria-hidden />
          </Button>
        )}
      </div>
    </form>
  );
}
