"use client";

import { useEffect } from "react";
import { signOut, useSession } from "next-auth/react";

// const TIMEOUT_MS = 3 * 60 * 60 * 1000;  3 hours
const TIMEOUT_MS = 10000;

export default function SessionTimeout() {
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status !== "authenticated") return;

    let timeoutId: NodeJS.Timeout;

    const resetTimeout = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        signOut({ callbackUrl: '/signin?error=SessionExpired' });
      }, TIMEOUT_MS);
    };

    // Initialize timeout
    resetTimeout();

    // Events that indicate user activity
    const events = [
      "mousemove",
      "keydown",
      "scroll",
      "click",
      "touchstart",
    ];

    events.forEach((event) => {
      window.addEventListener(event, resetTimeout);
    });

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      events.forEach((event) => {
        window.removeEventListener(event, resetTimeout);
      });
    };
  }, [status]);

  return null;
}
