import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { BuyerProfile, Profile, Receipt, Team } from "@/lib/types";

export interface AppContext {
  userId: string;
  email: string | null;
  profile: Profile | null;
  team: Team | null;
}

/** Current user + profile + active team. Cached per request. */
export const getContext = cache(async (): Promise<AppContext | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  let team: Team | null = null;
  if (profile?.current_team_id) {
    const { data } = await supabase
      .from("teams")
      .select("*")
      .eq("id", profile.current_team_id)
      .maybeSingle();
    team = data ?? null;
  }

  return {
    userId: user.id,
    email: user.email ?? null,
    profile: (profile as Profile) ?? null,
    team,
  };
});

export async function getReceipts(): Promise<Receipt[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("receipts")
    .select("*")
    .order("created_at", { ascending: false });
  return (data as Receipt[]) ?? [];
}

export async function getReceipt(id: string): Promise<Receipt | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("receipts")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return (data as Receipt) ?? null;
}

export async function getBuyerProfiles(): Promise<BuyerProfile[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("buyer_profiles")
    .select("*")
    .order("is_default", { ascending: false })
    .order("label", { ascending: true });
  return (data as BuyerProfile[]) ?? [];
}
