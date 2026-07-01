"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import NavBar from "@/components/NavBar";
import { useAuth } from "@/context/AuthContext";

export default function RegisterPage() {
  const router = useRouter();
  const { setUser } = useAuth();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
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
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Could not create account.");
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
            02.
          </p>
          <h1 className="text-2xl font-semibold text-paper mb-1">
            Create your account
          </h1>
          <p className="text-paper-dim text-sm mb-8">
            A mock balance is seeded automatically — no card or wallet
            required.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-paper-dim mb-1">
                Name
              </label>
              <input
                type="text"
                name="name"
                required
                value={form.name}
                onChange={handleChange}
                className="w-full bg-ink-raised border border-line rounded-sm px-3 py-2 text-paper focus:outline-none focus:border-accent transition-colors"
              />
            </div>
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
                minLength={6}
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
              {submitting ? "Creating account…" : "Create account"}
            </button>
          </form>

          <p className="text-paper-dim text-sm mt-6 text-center">
            Already have an account?{" "}
            <Link href="/login" className="text-accent hover:underline">
              Log in
            </Link>
          </p>
        </div>
      </main>
    </>
  );
}
