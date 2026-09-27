import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { isCurrentAdmin } from "@/lib/admin-auth";
import { redirect } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);

  if (!(await isCurrentAdmin(session))) {
    redirect("/dashboard");
  }

  return (
    <DashboardLayout>
      {children}
    </DashboardLayout>
  );
}
