"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";

export default function MarketingNavbar() {
  const router = useRouter();

  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    checkUser();
  }, []);

  async function checkUser() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    setIsLoggedIn(!!user);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    setIsLoggedIn(false);
    router.push("/");
  }

  return (
    <header className="sticky top-0 z-50 border-b border-[#D9D2C3]/50 bg-white/95 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3 md:px-8">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center">
            <Image
              src="/Logo.png"
              alt="Budget My Build"
              width={300}
              height={84}
              priority
              className="h-auto w-[220px] md:w-[260px]"
            />
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            <a
              href="#features"
              className="rounded-full px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-[#F8F6F1] hover:text-[#0F172A]"
            >
              Features
            </a>

            <a
              href="#how-it-works"
              className="rounded-full px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-[#F8F6F1] hover:text-[#0F172A]"
            >
              How it works
            </a>

            <a
              href="#pricing"
              className="rounded-full px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-[#F8F6F1] hover:text-[#0F172A]"
            >
              Pricing
            </a>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {isLoggedIn ? (
            <>
              <Link
                href="/dashboard"
                className="rounded-full bg-[#4F46E5] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#4338CA]"
              >
                Dashboard
              </Link>

              <button
                type="button"
                onClick={handleLogout}
                className="rounded-full border border-[#D9D2C3]/70 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-[#F8F6F1] hover:text-[#0F172A]"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-full border border-[#D9D2C3]/70 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-[#F8F6F1] hover:text-[#0F172A]"
              >
                Login
              </Link>

              <Link
                href="/signup"
                className="rounded-full bg-[#4F46E5] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#4338CA]"
              >
                Get started
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}