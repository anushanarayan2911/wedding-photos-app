"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import NavBar from "@/components/NavBar";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not create account");
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <NavBar />
      <main className="max-w-md mx-auto px-8 py-20">
        <h1 className="text-3xl font-bold font-mono mb-2 tracking-tight">Create your account</h1>
        <p className="text-sm text-gray-500 mb-10">
          Set up your board, then connect your wedding website.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-600 font-mono mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full border border-gray-300 rounded px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-gray-400"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 font-mono mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="w-full border border-gray-300 rounded px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-gray-400"
            />
            <p className="text-xs text-gray-400 mt-1">At least 8 characters.</p>
          </div>
          <div>
            <label className="block text-sm text-gray-600 font-mono mb-1">Confirm password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              className="w-full border border-gray-300 rounded px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-gray-400"
            />
          </div>

          {error && <p className="text-red-600 text-sm font-mono">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black text-white font-mono py-3 rounded hover:bg-gray-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? "Creating account…" : "Create account"}
          </button>
        </form>

        <p className="text-sm text-gray-500 mt-6">
          Already have an account?{" "}
          <a href="/login" className="text-gray-900 font-bold hover:underline">Log in</a>
        </p>
      </main>
    </div>
  );
}
