"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function NavBar() {
  const { user, setUser, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    router.push("/login");
  }

  const linkClass = (href) =>
    `text-sm transition-colors ${
      pathname === href
        ? "text-accent"
        : "text-paper-dim hover:text-paper"
    }`;

  return (
    <header className="border-b border-line bg-ink-raised">
      <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-baseline gap-2">
          <span className="font-ledger text-lg text-accent tracking-tight">
            01.
          </span>
          <span className="text-sm uppercase tracking-[0.2em] text-paper">
            Ledger
          </span>
        </Link>

        {!loading && (
          <nav className="flex items-center gap-6">
            {user ? (
              <>
                <Link href="/dashboard" className={linkClass("/dashboard")}>
                  Dashboard
                </Link>
                {user.isAdmin && (
                  <Link href="/admin" className={linkClass("/admin")}>
                    Admin
                  </Link>
                )}
                <Link href="/telegram" className={linkClass("/telegram")}>
                  Telegram feed
                </Link>
                <span className="text-paper-dim text-sm hidden sm:inline">
                  {user.name}
                </span>
                <button
                  onClick={handleLogout}
                  className="text-sm text-paper-dim hover:text-danger transition-colors"
                >
                  Log out
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className={linkClass("/login")}>
                  Log in
                </Link>
                <Link
                  href="/register"
                  className="text-sm bg-accent text-ink px-4 py-2 rounded-sm font-medium hover:bg-accent-dim transition-colors"
                >
                  Create account
                </Link>
              </>
            )}
          </nav>
        )}
      </div>
    </header>
  );
}
