"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import NavBar from "@/components/NavBar";
import { useAuth } from "@/context/AuthContext";

export default function LoginPage() {
  const router = useRouter();
  const { setUser } = useAuth();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Could not log in.");
        return;
      }

      setUser(data.user);
      router.push("/dashboard");
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <NavBar />
      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="max-w-sm w-full">
          <p className="font-ledger text-accent text-sm tracking-widest mb-2">
            01.
          </p>
          <h1 className="text-2xl font-semibold text-paper mb-1">
            Welcome back
          </h1>
          <p className="text-paper-dim text-sm mb-8">
            Log in to view your balance and requests.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-paper-dim mb-1">
                Email
              </label>
              <input
                type="email"
                name="email"
                required
                value={form.email}
                onChange={handleChange}
                className="w-full bg-ink-raised border border-line rounded-sm px-3 py-2 text-paper focus:outline-none focus:border-accent transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm text-paper-dim mb-1">
                Password
              </label>
              <input
                type="password"
                name="password"
                required
                value={form.password}
                onChange={handleChange}
                className="w-full bg-ink-raised border border-line rounded-sm px-3 py-2 text-paper focus:outline-none focus:border-accent transition-colors"
              />
            </div>

            {error && (
              <p className="text-danger text-sm" role="alert">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-accent text-ink py-2.5 rounded-sm font-medium hover:bg-accent-dim transition-colors disabled:opacity-60"
            >
              {submitting ? "Logging in…" : "Log in"}
            </button>
          </form>

          <p className="text-paper-dim text-sm mt-6 text-center">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="text-accent hover:underline">
              Create one
            </Link>
          </p>
        </div>
      </main>
    </>
  );
}
