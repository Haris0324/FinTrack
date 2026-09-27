import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { isCurrentAdmin } from "@/lib/admin-auth";

export default async function PostLoginRedirect() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/signin");
  redirect((await isCurrentAdmin(session)) ? "/admin" : "/dashboard");
}
