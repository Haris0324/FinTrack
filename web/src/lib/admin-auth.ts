import type { Session } from "next-auth";
import connectToDatabase from "@/lib/mongoose";
import User from "@/models/User";

/** Re-check the persisted role so demoted accounts cannot rely on a stale JWT. */
export async function isCurrentAdmin(session: Session | null) {
  const userId = session?.user?.id;
  if (!userId || session.user.role !== "admin") return false;

  try {
    await connectToDatabase();
    const user = await User.findById(userId).select("role").lean();
    return user?.role === "admin";
  } catch (error) {
    console.error("Admin role verification failed:", error);
    return false;
  }
}
