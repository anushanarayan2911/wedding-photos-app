"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function NavBar() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((res) => res.json())
      .then((data) => setEmail(data.user?.email ?? null))
      .catch(() => {});
  }, []);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setEmail(null);
    router.push("/");
  }

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between">
      {/* Logo */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 border-2 border-gray-900 rounded-sm" />
        <span className="font-mono font-bold text-lg tracking-widest uppercase">
          Memoboard
        </span>
      </div>

      {/* Nav links */}
      <div className="hidden md:flex items-center gap-8 text-sm font-mono text-gray-600">
        <a href="#" className="hover:text-gray-900 transition-colors">How it Works</a>
        <a href="#" className="hover:text-gray-900 transition-colors">Pricing</a>
        <a href="#" className="hover:text-gray-900 transition-colors">Examples</a>
        <a href="#" className="hover:text-gray-900 transition-colors">Blog</a>
      </div>

      {/* Auth */}
      <div className="flex items-center gap-4 text-sm font-mono">
        {email ? (
          <>
            <a href="/dashboard" className="text-gray-700 hover:text-gray-900">Dashboard</a>
            <button onClick={handleLogout} className="text-gray-700 hover:text-gray-900">
              Log out
            </button>
            <div className="w-8 h-8 rounded-full bg-gray-300" />
          </>
        ) : (
          <>
            <a href="/login" className="text-gray-700 hover:text-gray-900">Log in</a>
            <a
              href="/signup"
              className="bg-black text-white px-4 py-2 rounded hover:bg-gray-800 transition-colors"
            >
              Sign up
            </a>
          </>
        )}
      </div>
    </nav>
  );
}
