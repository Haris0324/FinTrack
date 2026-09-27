import type { Session } from "next-auth";
import connectToDatabase from "@/lib/mongoose";
import User from "@/models/User";

/** Re-check the persisted role so demoted accounts cannot rely on a stale JWT. */
export async function isCurrentAdmin(session: Session | null) {
  const userId = session?.user?.id;
  if (!userId || session.user.role !== "admin") return false;

  try {
    await connectToDatabase();
    const user = await User.findById(userId).select("role isActive").lean();
    return user?.role === "admin" && user.isActive !== false;
  } catch (error) {
    console.error("Admin role verification failed:", error);
    return false;
  }
}

/** Reject cross-site state-changing requests to admin endpoints. */
export function hasTrustedAdminOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;

  try {
    const originUrl = new URL(origin);
    const trustedOrigins = new Set<string>();

    if (process.env.NEXTAUTH_URL) {
      trustedOrigins.add(new URL(process.env.NEXTAUTH_URL).origin);
    }
    for (const host of [process.env.VERCEL_URL, process.env.VERCEL_PROJECT_PRODUCTION_URL]) {
      if (host) trustedOrigins.add(`https://${host.replace(/^https?:\/\//, "")}`);
    }
    if (process.env.NODE_ENV === "development") {
      trustedOrigins.add("http://localhost:3000");
      trustedOrigins.add("http://127.0.0.1:3000");
    }

    return trustedOrigins.has(originUrl.origin);
  } catch {
    return false;
  }
}
