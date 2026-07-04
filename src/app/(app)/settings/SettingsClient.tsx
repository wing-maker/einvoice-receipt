"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Copy,
  Check,
  Loader2,
  Users,
  LogOut,
  UserRound,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button, Input, Field, Card } from "@/components/ui";
import type { Team } from "@/lib/types";

export function SettingsClient({
  userId,
  email,
  displayName,
  currentTeam,
  memberships,
}: {
  userId: string;
  email: string | null;
  displayName: string;
  currentTeam: Team | null;
  memberships: { team: Team; role: string }[];
}) {
  const router = useRouter();
  const supabase = createClient();

  const [name, setName] = useState(displayName);
  const [teamName, setTeamName] = useState(currentTeam?.name ?? "");
  const [joinCode, setJoinCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(
    null,
  );

  function flash(kind: "ok" | "err", text: string) {
    setMsg({ kind, text });
    setTimeout(() => setMsg(null), 2500);
  }

  async function saveName() {
    setBusy("name");
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: name.trim() || null })
      .eq("id", userId);
    setBusy(null);
    if (error) return flash("err", error.message);
    flash("ok", "Name updated");
    router.refresh();
  }

  async function saveTeamName() {
    if (!currentTeam) return;
    setBusy("team");
    const { error } = await supabase
      .from("teams")
      .update({ name: teamName.trim() || currentTeam.name })
      .eq("id", currentTeam.id);
    setBusy(null);
    if (error) return flash("err", error.message);
    flash("ok", "Team renamed");
    router.refresh();
  }

  async function copyCode() {
    if (!currentTeam) return;
    try {
      await navigator.clipboard.writeText(currentTeam.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  }

  async function switchTeam(teamId: string) {
    setBusy("switch");
    await supabase
      .from("profiles")
      .update({ current_team_id: teamId })
      .eq("id", userId);
    setBusy(null);
    router.refresh();
  }

  async function joinTeam(e: React.FormEvent) {
    e.preventDefault();
    const code = joinCode.trim();
    if (!code) return;
    setBusy("join");
    // Adding our own membership row is allowed by RLS.
    const { error } = await supabase
      .from("team_members")
      .insert({ team_id: code, user_id: userId, role: "member" });
    if (error) {
      setBusy(null);
      return flash(
        "err",
        "Could not join — check the code is correct.",
      );
    }
    await supabase
      .from("profiles")
      .update({ current_team_id: code })
      .eq("id", userId);
    setBusy(null);
    setJoinCode("");
    flash("ok", "Joined team");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {msg && (
        <p
          role="status"
          className={`rounded-lg px-3 py-2 text-sm font-medium ${
            msg.kind === "ok"
              ? "bg-success-soft text-success"
              : "bg-danger-soft text-danger"
          }`}
        >
          {msg.text}
        </p>
      )}

      {/* Account */}
      <section className="space-y-3">
        <h2 className="flex items-center gap-2 px-1 text-sm font-semibold text-muted-foreground">
          <UserRound size={15} aria-hidden />
          Account
        </h2>
        <Card className="space-y-4 p-4">
          <p className="text-sm text-muted-foreground">{email}</p>
          <Field label="Display name" htmlFor="s-name">
            <Input
              id="s-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </Field>
          <Button onClick={saveName} disabled={busy === "name"}>
            {busy === "name" && (
              <Loader2 size={16} className="animate-spin" aria-hidden />
            )}
            Save
          </Button>
        </Card>
      </section>

      {/* Team */}
      <section className="space-y-3">
        <h2 className="flex items-center gap-2 px-1 text-sm font-semibold text-muted-foreground">
          <Users size={15} aria-hidden />
          Team
        </h2>
        <Card className="space-y-4 p-4">
          <Field
            label="Team name"
            htmlFor="s-team"
            hint="Receipts and profiles are shared across everyone in this team."
          >
            <Input
              id="s-team"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
            />
          </Field>
          <Button onClick={saveTeamName} disabled={busy === "team"}>
            {busy === "team" && (
              <Loader2 size={16} className="animate-spin" aria-hidden />
            )}
            Rename team
          </Button>

          <div className="border-t border-border pt-4">
            <p className="text-sm font-medium">Invite teammates</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Share this code so a teammate can join and see the same receipts.
            </p>
            <button
              onClick={copyCode}
              className="tabular mt-2 flex w-full items-center justify-between gap-2 rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-left text-xs"
            >
              <span className="truncate font-mono">{currentTeam?.id}</span>
              {copied ? (
                <Check size={15} className="shrink-0 text-success" aria-hidden />
              ) : (
                <Copy
                  size={15}
                  className="shrink-0 text-muted-foreground"
                  aria-hidden
                />
              )}
            </button>
          </div>
        </Card>
      </section>

      {/* Switch / Join */}
      {memberships.length > 1 && (
        <section className="space-y-3">
          <h2 className="px-1 text-sm font-semibold text-muted-foreground">
            Your teams
          </h2>
          <Card className="divide-y divide-border">
            {memberships.map(({ team, role }) => {
              const active = team.id === currentTeam?.id;
              return (
                <button
                  key={team.id}
                  onClick={() => !active && switchTeam(team.id)}
                  disabled={active || busy === "switch"}
                  className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left disabled:opacity-100"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">
                      {team.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {role}
                    </span>
                  </span>
                  {active ? (
                    <span className="rounded-full bg-primary-soft px-2 py-0.5 text-[11px] font-semibold text-primary">
                      Active
                    </span>
                  ) : (
                    <span className="text-xs font-medium text-primary">
                      Switch
                    </span>
                  )}
                </button>
              );
            })}
          </Card>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="px-1 text-sm font-semibold text-muted-foreground">
          Join a team
        </h2>
        <Card className="p-4">
          <form onSubmit={joinTeam} className="space-y-3">
            <Field label="Team code" htmlFor="s-join">
              <Input
                id="s-join"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                placeholder="Paste an invite code"
              />
            </Field>
            <Button
              type="submit"
              variant="secondary"
              block
              disabled={busy === "join"}
            >
              {busy === "join" && (
                <Loader2 size={16} className="animate-spin" aria-hidden />
              )}
              Join team
            </Button>
          </form>
        </Card>
      </section>

      {/* Sign out */}
      <form action="/auth/signout" method="post" className="pt-2">
        <Button type="submit" variant="ghost" block className="text-danger">
          <LogOut size={16} aria-hidden />
          Sign out
        </Button>
      </form>
    </div>
  );
}
