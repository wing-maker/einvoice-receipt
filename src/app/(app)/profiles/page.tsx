import { redirect } from "next/navigation";
import { getBuyerProfiles, getContext } from "@/lib/data";
import { ProfileManager } from "./ProfileManager";

export const dynamic = "force-dynamic";

export default async function ProfilesPage() {
  const [ctx, profiles] = await Promise.all([
    getContext(),
    getBuyerProfiles(),
  ]);
  if (!ctx?.team) redirect("/login");

  return (
    <div className="px-4 pt-6">
      <header className="mb-5">
        <h1 className="text-2xl font-bold tracking-tight">Buyer profiles</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Reusable templates for e-invoice registration forms.
        </p>
      </header>
      <ProfileManager teamId={ctx.team.id} profiles={profiles} />
    </div>
  );
}
