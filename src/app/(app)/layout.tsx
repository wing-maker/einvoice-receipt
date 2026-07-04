import { redirect } from "next/navigation";
import { getContext } from "@/lib/data";
import { AppShell } from "@/components/AppShell";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await getContext();
  if (!ctx) redirect("/login");
  return <AppShell>{children}</AppShell>;
}
