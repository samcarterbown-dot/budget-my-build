"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";

export default function AppNavbar() {
  const pathname = usePathname();
  const router = useRouter();

  const navItems = [
    { key: "dashboard", label: "Dashboard", href: "/dashboard" },
    { key: "account", label: "Account", href: "/account" },
    { key: "pricing", label: "Pricing", href: "/#pricing" },
  ];

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <header className="sticky top-0 z-50 border-b border-[#D9D2C3]/50 bg-white/95 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3 md:px-8">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="flex items-center">
            <Image
              src="/Logo.png"
              alt="Budget My Build"
              width={320}
              height={90}
              priority
              className="h-auto w-[240px] md:w-[280px]"
            />
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {navItems.map((item) => {
              const isActive = item.href.includes("#")
                ? false
                : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.key}
                  href={item.href}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                    isActive
                      ? "bg-[#0F172A] text-white shadow-sm"
                      : "text-slate-600 hover:bg-[#F8F6F1] hover:text-[#0F172A]"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <button
          onClick={handleLogout}
          className="rounded-full border border-[#D9D2C3]/70 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-[#F8F6F1] hover:text-[#0F172A]"
        >
          Logout
        </button>
      </div>
    </header>
  );
}