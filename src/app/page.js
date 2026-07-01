"use client";

import Link from "next/link";
import NavBar from "@/components/NavBar";
import { useAuth } from "@/context/AuthContext";

export default function Home() {
  const { user, loading } = useAuth();

  return (
    <>
      <NavBar />
      <main className="flex-1 flex items-center justify-center px-6">
        <div className="max-w-md w-full text-center">
          <p className="font-ledger text-accent text-sm tracking-widest mb-4">
            BALANCE · REQUEST · REVIEW
          </p>
          
          <p className="text-paper-dim mb-10">
            Submit a withdrawal, watch it move through review, and see the
            outcome land in your balance — no guesswork in between.
          </p>

          {!loading && (
            <div className="flex items-center justify-center gap-4">
              {user ? (
                <Link
                  href="/dashboard"
                  className="bg-accent text-ink px-6 py-3 rounded-sm font-medium hover:bg-accent-dim transition-colors"
                >
                  Go to dashboard
                </Link>
              ) : (
                <>
                  <Link
                    href="/register"
                    className="bg-accent text-ink px-6 py-3 rounded-sm font-medium hover:bg-accent-dim transition-colors"
                  >
                    Create account
                  </Link>
                  <Link
                    href="/login"
                    className="text-paper-dim hover:text-paper px-6 py-3 transition-colors"
                  >
                    Log in
                  </Link>
                </>
              )}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
