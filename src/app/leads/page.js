"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import NavBar from "@/components/NavBar";
import { useAuth } from "@/context/AuthContext";

export default function LeadsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [leads, setLeads] = useState([]);
  const [leadsLoading, setLeadsLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchLeads = useCallback(async () => {
    try {
      const res = await fetch("/api/leads");
      const data = await res.json();
      if (res.ok) {
        setLeads(data.leads || []);
      } else {
        setError(data.error || "Could not load leads.");
      }
    } finally {
      setLeadsLoading(false);
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
    if (user?.isAdmin) fetchLeads();
  }, [user, fetchLeads]);

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

  return (
    <>
      <NavBar />
      <main className="flex-1 max-w-5xl w-full mx-auto px-6 py-10">
        <p className="font-ledger text-accent text-sm tracking-widest mb-2">
          LEAD COLLECTION
        </p>
        <h1 className="text-2xl font-semibold text-paper mb-1">
          Leads from Telegram
        </h1>
        <p className="text-paper-dim text-sm mb-8">
          Collected automatically when someone completes the /start flow with
          the lead bot on Telegram.
        </p>

        {error && (
          <p className="text-danger text-sm mb-4" role="alert">
            {error}
          </p>
        )}

        {leadsLoading ? (
          <p className="text-paper-dim text-sm font-ledger">Loading…</p>
        ) : leads.length === 0 ? (
          <p className="text-paper-dim text-sm">
            No leads yet. Once someone messages the bot on Telegram and
            completes /start, they&apos;ll show up here.
          </p>
        ) : (
          <div className="border border-line rounded-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-paper-dim">
                  <th className="px-4 py-3 font-normal">Name</th>
                  <th className="px-4 py-3 font-normal">Email</th>
                  <th className="px-4 py-3 font-normal">Mobile</th>
                  <th className="px-4 py-3 font-normal">Telegram ID</th>
                  <th className="px-4 py-3 font-normal">Received</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {leads.map((lead) => (
                  <tr key={lead._id}>
                    <td className="px-4 py-3 text-paper">{lead.name}</td>
                    <td className="px-4 py-3 text-paper-dim font-ledger">
                      {lead.email}
                    </td>
                    <td className="px-4 py-3 text-paper-dim font-ledger">
                      {lead.mobile}
                    </td>
                    <td className="px-4 py-3 text-paper-dim font-ledger">
                      {lead.telegramId}
                    </td>
                    <td className="px-4 py-3 text-paper-dim">
                      {new Date(lead.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </>
  );
}
