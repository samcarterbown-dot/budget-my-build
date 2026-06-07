"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import AppNavbar from "../../components/AppNavbar";

type ModalType = "success" | "error" | null;

export default function AccountPage() {
  const [userEmail, setUserEmail] = useState("");
  const [userId, setUserId] = useState("");
  const [createdAt, setCreatedAt] = useState("");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  const [modalType, setModalType] = useState<ModalType>(null);
  const [modalTitle, setModalTitle] = useState("");
  const [modalMessage, setModalMessage] = useState("");

  useEffect(() => {
    loadUser();
  }, []);

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

  async function loadUser() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    setUserEmail(user.email || "");
    setUserId(user.id || "");
    setCreatedAt(user.created_at || "");
  }

  async function updatePassword() {
    if (!newPassword || !confirmPassword) {
      showModal(
        "error",
        "Missing password",
        "Please enter and confirm your new password.",
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      showModal("error", "Passwords do not match", "Please try again.");
      return;
    }

    if (newPassword.length < 8) {
      showModal(
        "error",
        "Password too short",
        "Your password must be at least 8 characters.",
      );
      return;
    }

    setSavingPassword(true);

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    setSavingPassword(false);

    if (error) {
      showModal("error", "Password update failed", error.message);
      return;
    }

    setNewPassword("");
    setConfirmPassword("");

    showModal(
      "success",
      "Password updated",
      "Your password has been updated successfully.",
    );
  }

  return (
    <>
      <AppNavbar />

      <main className="min-h-screen bg-[#F2EEE6]">
        <div className="mx-auto max-w-6xl px-6 py-10 md:px-8 md:py-12">
          <section className="mb-10">
            <div className="inline-flex rounded-full border border-[#D9D2C3] bg-white/80 px-4 py-2 text-sm font-semibold text-[#2E7D6B] shadow-sm">
              Account settings
            </div>

            <h1 className="mt-4 text-4xl font-bold tracking-tight text-[#0F172A] md:text-5xl">
              Manage your account
            </h1>

            <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-600">
              Keep your profile, password, credits and subscription details in
              one place.
            </p>
          </section>

          <div className="grid gap-8 lg:grid-cols-2">
            <section className="rounded-3xl border border-[#D9D2C3]/80 bg-white p-8 shadow-sm">
              <div className="mb-6">
                <p className="text-sm font-semibold text-[#2E7D6B]">
                  Profile
                </p>
                <h2 className="mt-1 text-2xl font-bold text-[#0F172A]">
                  Account details
                </h2>
                <p className="mt-2 text-sm text-slate-500">
                  Your basic Budget My Build account information.
                </p>
              </div>

              <div className="space-y-4">
                <div className="rounded-2xl border border-[#D9D2C3]/80 bg-[#F2EEE6]/70 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Email
                  </p>
                  <p className="mt-1 font-semibold text-[#0F172A]">
                    {userEmail || "Not set"}
                  </p>
                </div>

                <div className="rounded-2xl border border-[#D9D2C3]/80 bg-[#F2EEE6]/70 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Account ID
                  </p>
                  <p className="mt-1 break-all text-sm text-slate-700">
                    {userId || "Not available"}
                  </p>
                </div>

                <div className="rounded-2xl border border-[#D9D2C3]/80 bg-[#F2EEE6]/70 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Account Created
                  </p>
                  <p className="mt-1 font-semibold text-[#0F172A]">
                    {createdAt
                      ? new Date(createdAt).toLocaleDateString()
                      : "Not available"}
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-[#D9D2C3]/80 bg-white p-8 shadow-sm">
              <div className="mb-6">
                <p className="text-sm font-semibold text-[#2E7D6B]">
                  Security
                </p>
                <h2 className="mt-1 text-2xl font-bold text-[#0F172A]">
                  Update password
                </h2>
                <p className="mt-2 text-sm text-slate-500">
                  Choose a secure password with at least 8 characters.
                </p>
              </div>

              <div className="space-y-4">
                <input
                  type="password"
                  placeholder="New password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full rounded-xl border border-[#D9D2C3] bg-white p-4 outline-none transition focus:border-[#4F46E5] focus:ring-4 focus:ring-[#4F46E5]/10"
                />

                <input
                  type="password"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full rounded-xl border border-[#D9D2C3] bg-white p-4 outline-none transition focus:border-[#4F46E5] focus:ring-4 focus:ring-[#4F46E5]/10"
                />

                <button
                  onClick={updatePassword}
                  disabled={savingPassword}
                  className="w-full rounded-xl bg-[#4F46E5] px-5 py-3 font-semibold text-white shadow-sm transition hover:bg-[#4338CA] disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {savingPassword ? "Updating..." : "Update Password"}
                </button>
              </div>
            </section>

            <section className="rounded-3xl border border-[#D9D2C3]/80 bg-white p-8 shadow-sm">
              <div className="mb-6">
                <p className="text-sm font-semibold text-[#2E7D6B]">
                  Credits
                </p>
                <h2 className="mt-1 text-2xl font-bold text-[#0F172A]">
                  Usage balance
                </h2>
                <p className="mt-2 text-sm text-slate-500">
                  Your plan detection and estimate generation credits will
                  appear here.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-[#D9D2C3]/80 bg-[#F2EEE6]/70 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Current Credits
                  </p>
                  <p className="mt-2 text-3xl font-bold text-[#0F172A]">0</p>
                </div>

                <div className="rounded-2xl border border-[#D9D2C3]/80 bg-[#F2EEE6]/70 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Monthly Credits
                  </p>
                  <p className="mt-2 text-3xl font-bold text-[#0F172A]">0</p>
                </div>

                <div className="rounded-2xl border border-[#D9D2C3]/80 bg-[#F2EEE6]/70 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Used This Month
                  </p>
                  <p className="mt-2 text-3xl font-bold text-[#0F172A]">0</p>
                </div>
              </div>

              <button
                type="button"
                disabled
                className="mt-6 rounded-xl border border-[#D9D2C3] bg-[#F2EEE6] px-5 py-3 text-sm font-semibold text-slate-400"
              >
                Buy Credits Coming Soon
              </button>
            </section>

            <section className="rounded-3xl border border-[#D9D2C3]/80 bg-white p-8 shadow-sm">
              <div className="mb-6">
                <p className="text-sm font-semibold text-[#2E7D6B]">
                  Subscription
                </p>
                <h2 className="mt-1 text-2xl font-bold text-[#0F172A]">
                  Plan & billing
                </h2>
                <p className="mt-2 text-sm text-slate-500">
                  Your subscription plan and billing management will appear
                  here.
                </p>
              </div>

              <div className="rounded-2xl border border-[#D9D2C3]/80 bg-[#F2EEE6]/70 p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Current Plan
                </p>
                <p className="mt-2 text-2xl font-bold text-[#0F172A]">
                  Free / Trial
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  Paid plans and credit packs will be connected later.
                </p>
              </div>

              <button
                type="button"
                disabled
                className="mt-6 rounded-xl border border-[#D9D2C3] bg-[#F2EEE6] px-5 py-3 text-sm font-semibold text-slate-400"
              >
                Manage Subscription Coming Soon
              </button>
            </section>
          </div>
        </div>
      </main>

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
    </>
  );
}