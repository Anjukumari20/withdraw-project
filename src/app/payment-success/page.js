"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import NavBar from "@/components/NavBar";

function formatAmount(n) {
  const num = Number(n);
  if (Number.isNaN(num)) return n;
  return num.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const paramAmount = searchParams.get("amount");
  const paramUpi = searchParams.get("upi");
  const paramRef = searchParams.get("ref");

  // Fallback state, used only if the page was opened without query params
  // (e.g. someone navigates here directly instead of via the socket
  // redirect). We pull the user's most recent "paid" request so the page
  // still shows real data instead of empty dashes.
  const [fallback, setFallback] = useState(null);
  const [fallbackLoading, setFallbackLoading] = useState(!paramAmount);

  useEffect(() => {
    if (paramAmount) return; // query params present, no need to fetch

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/withdraw");
        const data = await res.json();
        if (res.ok && !cancelled) {
          const latestPaid = (data.requests || [])
            .filter((r) => r.status === "paid")
            .sort((a, b) => new Date(b.paidAt || b.createdAt) - new Date(a.paidAt || a.createdAt))[0];
          setFallback(latestPaid || null);
        }
      } finally {
        if (!cancelled) setFallbackLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [paramAmount]);

  const amount = paramAmount || fallback?.amount;
  const upi = paramUpi || fallback?.upiNumber;
  const ref = paramRef || fallback?.refCode;

  if (fallbackLoading) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <p className="text-paper-dim font-ledger">Loading…</p>
      </main>
    );
  }

  return (
    <main className="flex-1 flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-md border border-line bg-ink-raised rounded-sm px-8 py-10 text-center">
        {/* Success icon */}
        <div className="mx-auto mb-6 w-14 h-14 rounded-full border border-ok/40 bg-ok/10 flex items-center justify-center">
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-ok"
          >
            <path d="M20 6L9 17l-5-5" />
          </svg>
        </div>

        <h1 className="text-paper text-xl font-medium mb-2">
          Payment successful
        </h1>
        <p className="text-paper-dim text-sm mb-8">
          Your withdrawal has been approved and transferred.
        </p>

        {/* Ledger-style amount readout, consistent with the dashboard balance card */}
        <div className="border border-line rounded-sm px-6 py-6 mb-6">
          <div className="flex items-baseline justify-center gap-2">
            <span className="font-ledger text-4xl text-paper tabular-nums">
              {amount ? formatAmount(amount) : "—"}
            </span>
            <span className="font-ledger text-lg text-paper-dim">USDT</span>
          </div>
        </div>

        {/* Details */}
        <div className="text-left space-y-3 mb-8">
          <div className="flex items-center justify-between text-sm">
            <span className="text-paper-dim">Sent to</span>
            <span className="font-ledger text-paper">{upi || "—"}</span>
          </div>
          {ref && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-paper-dim">Reference</span>
              <span className="font-ledger text-paper">{ref}</span>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => router.push("/dashboard")}
            className="flex-1 bg-accent text-ink py-2.5 rounded-sm font-medium hover:bg-accent-dim transition-colors"
          >
            Back to dashboard
          </button>
        </div>
      </div>
    </main>
  );
}

// useSearchParams requires a Suspense boundary in the App Router,
// otherwise Next.js throws a build error on static/prerendered pages.
export default function PaymentSuccessPage() {
  return (
    <>
      <NavBar />
      <Suspense
        fallback={
          <main className="flex-1 flex items-center justify-center">
            <p className="text-paper-dim font-ledger">Loading…</p>
          </main>
        }
      >
        <PaymentSuccessContent />
      </Suspense>
    </>
  );
}