import { redirect } from "next/navigation";
import { getBuyerProfiles, getContext } from "@/lib/data";
import { CaptureForm } from "./CaptureForm";

export const dynamic = "force-dynamic";

export default async function CapturePage() {
  const [ctx, profiles] = await Promise.all([
    getContext(),
    getBuyerProfiles(),
  ]);
  if (!ctx?.team) redirect("/login");

  return (
    <div>
      <header className="border-b border-border px-4 pt-6 pb-4">
        <h1 className="text-2xl font-bold tracking-tight">New receipt</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Capture now — register when the window opens.
        </p>
      </header>
      <CaptureForm teamId={ctx.team.id} profiles={profiles} />
    </div>
  );
}
