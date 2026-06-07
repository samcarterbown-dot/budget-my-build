"use client";

import Image from "next/image";
import { useState } from "react";
import { supabase } from "../../lib/supabase";

type ModalType = "success" | "error" | null;

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [modalType, setModalType] = useState<ModalType>(null);
  const [modalTitle, setModalTitle] = useState("");
  const [modalMessage, setModalMessage] = useState("");

  function showModal(type: ModalType, title: string, message: string) {
    setModalType(type);
    setModalTitle(title);
    setModalMessage(message);
  }

  function closeModal() {
    setModalType(null);
    setModalTitle("");
    setModalMessage("");
  }

  async function signUp() {
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      showModal("error", "Account creation failed", error.message);
    } else {
      showModal(
        "success",
        "Account created",
        "Check your email to confirm your account before logging in.",
      );
    }
  }

  async function login() {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      showModal("error", "Login failed", error.message);
    } else {
      window.location.href = "/dashboard";
    }
  }

  return (
    <main className="min-h-screen bg-[#F2EEE6] px-6 py-10 text-[#0F172A]">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-6xl items-center">
        <div className="grid w-full gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <section>
            <div className="mb-8">
              <Image
                src="/logo.png"
                alt="Budget My Build"
                width={190}
                height={56}
                priority
                className="h-auto w-[170px] md:w-[190px]"
              />
            </div>

            <div className="inline-flex rounded-full border border-[#D9D2C3] bg-white/80 px-4 py-2 text-sm font-semibold text-[#2E7D6B] shadow-sm">
              Build smarter from the start
            </div>

            <h1 className="mt-5 max-w-2xl text-5xl font-bold tracking-tight text-[#0F172A] md:text-6xl">
              Plan your build before you commit.
            </h1>

            <p className="mt-5 max-w-xl text-lg leading-8 text-slate-600">
              Upload plans, organise selections and get intelligent budget
              guidance early — so you can shape a more achievable project with
              less stress.
            </p>

            <div className="mt-8 grid max-w-2xl gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-[#D9D2C3]/80 bg-white/80 p-4 shadow-sm">
                <p className="text-sm font-semibold text-[#2E7D6B]">
                  01
                </p>
                <p className="mt-2 font-bold text-[#0F172A]">
                  Upload plans
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Start with drawings, PDFs or screenshots.
                </p>
              </div>

              <div className="rounded-2xl border border-[#D9D2C3]/80 bg-white/80 p-4 shadow-sm">
                <p className="text-sm font-semibold text-[#2E7D6B]">
                  02
                </p>
                <p className="mt-2 font-bold text-[#0F172A]">
                  Track costs
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Manage products, rooms and budget items.
                </p>
              </div>

              <div className="rounded-2xl border border-[#D9D2C3]/80 bg-white/80 p-4 shadow-sm">
                <p className="text-sm font-semibold text-[#2E7D6B]">
                  03
                </p>
                <p className="mt-2 font-bold text-[#0F172A]">
                  Forecast spend
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Understand likely cost ranges earlier.
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-[2rem] border border-[#D9D2C3]/80 bg-white p-8 shadow-xl">
            <div className="mb-7">
              <p className="text-sm font-semibold text-[#2E7D6B]">
                Account access
              </p>
              <h2 className="mt-1 text-3xl font-bold text-[#0F172A]">
                Login or create account
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                Continue planning your renovation, extension or new build.
              </p>
            </div>

            <div className="space-y-4">
              <input
                className="w-full rounded-xl border border-[#D9D2C3] bg-white p-4 outline-none transition focus:border-[#4F46E5] focus:ring-4 focus:ring-[#4F46E5]/10"
                placeholder="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />

              <input
                className="w-full rounded-xl border border-[#D9D2C3] bg-white p-4 outline-none transition focus:border-[#4F46E5] focus:ring-4 focus:ring-[#4F46E5]/10"
                placeholder="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />

              <button
                onClick={login}
                className="w-full rounded-xl bg-[#4F46E5] px-6 py-4 font-semibold text-white shadow-sm transition hover:bg-[#4338CA]"
              >
                Login
              </button>

              <button
                onClick={signUp}
                className="w-full rounded-xl border border-[#D9D2C3] bg-[#F2EEE6] px-6 py-4 font-semibold text-[#0F172A] transition hover:bg-[#D9D2C3]/40"
              >
                Create Account
              </button>
            </div>

            <div className="mt-6 rounded-2xl border border-[#D9D2C3]/80 bg-[#F2EEE6]/70 p-4">
              <p className="text-sm font-semibold text-[#0F172A]">
                Early-stage budget guidance
              </p>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Budget My Build helps you understand what may be achievable
                before spending heavily on plans, quotes or redesigns.
              </p>
            </div>
          </section>
        </div>
      </div>

      {modalType && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-3xl border border-[#D9D2C3] bg-white p-8 shadow-2xl">
            <div
              className={`mb-4 flex h-12 w-12 items-center justify-center rounded-full text-2xl ${
                modalType === "success"
                  ? "bg-[#2E7D6B]/10 text-[#2E7D6B]"
                  : "bg-red-100 text-red-700"
              }`}
            >
              {modalType === "success" ? "✅" : "⚠️"}
            </div>

            <h2 className="text-2xl font-bold text-[#0F172A]">
              {modalTitle}
            </h2>

            <p className="mt-3 text-slate-600">{modalMessage}</p>

            <button
              onClick={closeModal}
              className="mt-6 w-full rounded-xl bg-[#4F46E5] px-5 py-3 font-semibold text-white shadow-sm transition hover:bg-[#4338CA]"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </main>
  );
}