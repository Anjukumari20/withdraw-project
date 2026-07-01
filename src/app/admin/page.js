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
  approved: "text-ok border-ok/40 bg-ok/10",
  rejected: "text-danger border-danger/40 bg-danger/10",
};

export default function AdminPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [requests, setRequests] = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [actioningId, setActioningId] = useState(null);
  const [error, setError] = useState("");

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
    if (!loading) {
      if (!user) {
        router.push("/login");
      } else if (!user.isAdmin) {
        router.push("/dashboard");
      }
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (user?.isAdmin) fetchRequests();
  }, [user, fetchRequests]);

  async function handleAction(id, status) {
    setError("");
    setActioningId(id);
    try {
      const res = await fetch(`/api/withdraw/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Could not update request.");
        return;
      }

      fetchRequests();
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setActioningId(null);
    }
  }

  if (loading || !user || !user.isAdmin) {
    return (
      <>
        <NavBar />
        <main className="flex-1 flex items-center justify-center">
          <p className="text-paper-dim font-ledger">Loading…</p>
        </main>
      </>
    );
  }

  const pending = requests.filter((r) => r.status === "pending");
  const reviewed = requests.filter((r) => r.status !== "pending");

  return (
    <>
      <NavBar />
      <main className="flex-1 max-w-5xl w-full mx-auto px-6 py-10">
        <p className="font-ledger text-accent text-sm tracking-widest mb-2">
          ADMIN REVIEW
        </p>
        <h1 className="text-2xl font-semibold text-paper mb-8">
          Withdrawal requests
        </h1>

        {error && (
          <p className="text-danger text-sm mb-4" role="alert">
            {error}
          </p>
        )}

        {requestsLoading ? (
          <p className="text-paper-dim text-sm font-ledger">Loading…</p>
        ) : (
          <>
            <section className="mb-10">
              <h2 className="text-paper font-medium mb-3">
                Pending
                <span className="text-paper-dim font-normal ml-2 text-sm">
                  {pending.length}
                </span>
              </h2>
              {pending.length === 0 ? (
                <p className="text-paper-dim text-sm">
                  Nothing waiting on review right now.
                </p>
              ) : (
                <div className="border border-line rounded-sm divide-y divide-line">
                  {pending.map((r) => (
                    <div
                      key={r._id}
                      className="flex items-center justify-between px-4 py-3 gap-4"
                    >
                      <div>
                        <p className="font-ledger text-paper">
                          {formatAmount(r.amount)} USDT
                        </p>
                        <p className="text-xs text-paper-dim mt-0.5">
                          {r.user?.name} · {r.user?.email}
                        </p>
                        <p className="text-xs text-paper-dim mt-0.5">
                          {new Date(r.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button
                          onClick={() => handleAction(r._id, "approved")}
                          disabled={actioningId === r._id}
                          className="text-xs px-3 py-1.5 rounded-sm border border-ok/40 text-ok hover:bg-ok/10 transition-colors disabled:opacity-50"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleAction(r._id, "rejected")}
                          disabled={actioningId === r._id}
                          className="text-xs px-3 py-1.5 rounded-sm border border-danger/40 text-danger hover:bg-danger/10 transition-colors disabled:opacity-50"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section>
              <h2 className="text-paper font-medium mb-3">
                Reviewed
                <span className="text-paper-dim font-normal ml-2 text-sm">
                  {reviewed.length}
                </span>
              </h2>
              {reviewed.length === 0 ? (
                <p className="text-paper-dim text-sm">No history yet.</p>
              ) : (
                <div className="border border-line rounded-sm divide-y divide-line">
                  {reviewed.map((r) => (
                    <div
                      key={r._id}
                      className="flex items-center justify-between px-4 py-3"
                    >
                      <div>
                        <p className="font-ledger text-paper">
                          {formatAmount(r.amount)} USDT
                        </p>
                        <p className="text-xs text-paper-dim mt-0.5">
                          {r.user?.name} · {r.user?.email}
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
            </section>
          </>
        )}
      </main>
    </>
  );
}
