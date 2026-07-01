"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import NavBar from "@/components/NavBar";
import { useAuth } from "@/context/AuthContext";

function formatAmount(n) {
  return Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const statusStyles = {
  pending: "text-accent border-accent/40 bg-accent/10",
  matched: "text-accent border-accent/40 bg-accent/10",
  paid: "text-ok border-ok/40 bg-ok/10",
  approved: "text-ok border-ok/40 bg-ok/10",
  rejected: "text-danger border-danger/40 bg-danger/10",
};

export default function DashboardPage() {
  const { user, loading, refreshUser } = useAuth();
  const router = useRouter();

  const [amount, setAmount] = useState("");
  const [upiNumber, setUpiNumber] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [requests, setRequests] = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(true);

  const fetchRequests = useCallback(async () => {
    try {
      const res = await fetch("/api/withdraw");
      const data = await res.json();
      if (res.ok) {
        setRequests(data.requests || []);
      }
    } finally {
      setRequestsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (user) fetchRequests();
  }, [user, fetchRequests]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setMessage("");
    setSubmitting(true);

    try {
      const res = await fetch("/api/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: Number(amount), upiNumber }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Could not submit request.");
        return;
      }

      setMessage("Withdraw request submitted for review.");
      setAmount("");
      setUpiNumber("");
      fetchRequests();
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || !user) {
    return (
      <>
        <NavBar />
        <main className="flex-1 flex items-center justify-center">
          <p className="text-paper-dim font-ledger">Loading…</p>
        </main>
      </>
    );
  }

  return (
    <>
      <NavBar />
      <main className="flex-1 max-w-5xl w-full mx-auto px-6 py-10">
        <p className="font-ledger text-accent text-sm tracking-widest mb-2">
          ACCOUNT BALANCE
        </p>

        {/* Signature element: ledger-style balance readout */}
        <div className="border border-line bg-ink-raised rounded-sm px-8 py-10 mb-10">
          <div className="flex items-baseline gap-3">
            <span className="font-ledger text-5xl sm:text-6xl text-paper tabular-nums">
              {formatAmount(user.balance)}
            </span>
            <span className="font-ledger text-xl text-paper-dim">USDT</span>
          </div>
          <p className="text-paper-dim text-sm mt-3">
            Available for withdrawal · updates once a request is approved
          </p>
        </div>

        <div className="grid sm:grid-cols-[320px_1fr] gap-10">
          {/* Withdraw form */}
          <div>
            <h2 className="text-paper font-medium mb-4">Request a withdrawal</h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-sm text-paper-dim mb-1">
                  Amount (USDT)
                </label>
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-ink-raised border border-line rounded-sm px-3 py-2 text-paper font-ledger focus:outline-none focus:border-accent transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm text-paper-dim mb-1">
                  UPI ID
                </label>
                <input
                  type="text"
                  required
                  value={upiNumber}
                  onChange={(e) => setUpiNumber(e.target.value)}
                  placeholder="yourname@bank"
                  className="w-full bg-ink-raised border border-line rounded-sm px-3 py-2 text-paper font-ledger focus:outline-none focus:border-accent transition-colors"
                />
              </div>

              {error && (
                <p className="text-danger text-sm" role="alert">
                  {error}
                </p>
              )}
              {message && <p className="text-ok text-sm">{message}</p>}

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-accent text-ink py-2.5 rounded-sm font-medium hover:bg-accent-dim transition-colors disabled:opacity-60"
              >
                {submitting ? "Submitting…" : "Submit request"}
              </button>
            </form>
          </div>

          {/* Request history */}
          <div>
            <h2 className="text-paper font-medium mb-4">Your requests</h2>
            {requestsLoading ? (
              <p className="text-paper-dim text-sm font-ledger">Loading…</p>
            ) : requests.length === 0 ? (
              <p className="text-paper-dim text-sm">
                No withdrawal requests yet. Submit one to see it appear here.
              </p>
            ) : (
              <div className="border border-line rounded-sm divide-y divide-line">
                {requests.map((r) => (
                  <div
                    key={r._id}
                    className="flex items-center justify-between px-4 py-3"
                  >
                    <div>
                      <p className="font-ledger text-paper">
                        {formatAmount(r.amount)} USDT
                      </p>
                      <p className="text-xs text-paper-dim mt-0.5">
                        {r.upiNumber}
                      </p>
                      <p className="text-xs text-paper-dim mt-0.5">
                        {new Date(r.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <span
                      className={`text-xs px-2.5 py-1 rounded-full border capitalize ${statusStyles[r.status]}`}
                    >
                      {r.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
}