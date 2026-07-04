import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getContext } from "@/lib/data";
import { SettingsClient } from "./SettingsClient";
import type { Team } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const ctx = await getContext();
  if (!ctx) redirect("/login");

  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("team_members")
    .select("role, teams(*)")
    .eq("user_id", ctx.userId);

  const memberships =
    (rows ?? [])
      .map((r) => ({
        role: r.role as string,
        team: (r as unknown as { teams: Team }).teams,
      }))
      .filter((m) => m.team) ?? [];

  return (
    <div className="px-4 pt-6">
      <header className="mb-5">
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
      </header>
      <SettingsClient
        userId={ctx.userId}
        email={ctx.email}
        displayName={ctx.profile?.display_name ?? ""}
        currentTeam={ctx.team}
        memberships={memberships}
      />
    </div>
  );
}
