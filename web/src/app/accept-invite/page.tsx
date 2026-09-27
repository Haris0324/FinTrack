import type { Metadata } from "next";
import AcceptInviteForm from "./form";

export const metadata: Metadata = {
  title: "Accept FinTrack invitation",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function AcceptInvitePage({ searchParams }: { searchParams: Promise<{ token?: string | string[] }> }) {
  const params = await searchParams;
  const token = typeof params.token === "string" ? params.token : "";

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <AcceptInviteForm token={token} />
    </main>
  );
}
