import Link from "next/link";
import MarketingNavbar from "../components/MarketingNavbar";

export default function Home() {
  return (
    <>
      <MarketingNavbar />

      <main className="min-h-screen bg-[#F2EEE6] text-[#0F172A]">
        <section className="mx-auto max-w-7xl px-6 py-20 md:px-8 md:py-24">
          <div className="grid items-center gap-16 lg:grid-cols-2">
            <div>
              <div className="mb-6 inline-flex items-center rounded-full border border-[#D9D2C3] bg-white/80 px-4 py-2 text-sm font-semibold text-[#2E7D6B] shadow-sm">
                Renovations • Extensions • New Builds
              </div>

              <h1 className="text-5xl font-bold leading-tight tracking-tight md:text-6xl">
                Build smarter from the start.
              </h1>

              <p className="mt-6 text-xl leading-relaxed text-slate-600">
                Plan your build or renovation with intelligent budget guidance
                before you commit.
              </p>

              <div className="mt-10 flex flex-wrap gap-4">
                <Link
                  href="/login"
                  className="rounded-2xl bg-[#4F46E5] px-8 py-4 text-lg font-semibold text-white shadow-sm transition hover:bg-[#4338CA]"
                >
                  Start Planning Free
                </Link>

                <Link
                  href="/login"
                  className="rounded-2xl border border-[#D9D2C3] bg-white px-8 py-4 text-lg font-semibold text-[#0F172A] transition hover:bg-[#F2EEE6]"
                >
                  Login
                </Link>
              </div>

              <div className="mt-10 flex flex-wrap gap-8 text-sm font-semibold text-slate-600">
                <div>✓ Budget tracking</div>
                <div>✓ SQM estimating</div>
                <div>✓ Supplier links</div>
                <div>✓ Plan uploads</div>
              </div>
            </div>

            <div className="relative">
              <div className="rounded-[2rem] border border-[#D9D2C3]/80 bg-white p-8 shadow-2xl">
                <div className="mb-8 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500">
                      Likely project cost
                    </p>

                    <h2 className="text-4xl font-bold">$482,000</h2>
                  </div>

                  <div className="rounded-2xl bg-[#0F172A] px-5 py-3 font-semibold text-white">
                    Feasibility
                  </div>
                </div>

                <div className="space-y-5">
                  <div className="rounded-2xl border border-[#D9D2C3]/80 p-5">
                    <div className="mb-2 flex justify-between">
                      <p className="font-semibold">Kitchen & joinery</p>
                      <p className="font-bold">$42,000</p>
                    </div>

                    <div className="h-3 w-full rounded-full bg-[#D9D2C3]">
                      <div className="h-3 w-[80%] rounded-full bg-[#2E7D6B]" />
                    </div>
                  </div>

                  <div className="rounded-2xl border border-[#D9D2C3]/80 p-5">
                    <div className="mb-2 flex justify-between">
                      <p className="font-semibold">Bathrooms</p>
                      <p className="font-bold">$31,000</p>
                    </div>

                    <div className="h-3 w-full rounded-full bg-[#D9D2C3]">
                      <div className="h-3 w-[65%] rounded-full bg-[#2E7D6B]" />
                    </div>
                  </div>

                  <div className="rounded-2xl border border-[#D9D2C3]/80 p-5">
                    <div className="mb-2 flex justify-between">
                      <p className="font-semibold">Flooring</p>
                      <p className="font-bold">$18,000</p>
                    </div>

                    <div className="h-3 w-full rounded-full bg-[#D9D2C3]">
                      <div className="h-3 w-[45%] rounded-full bg-[#2E7D6B]" />
                    </div>
                  </div>
                </div>

                <div className="mt-8 grid grid-cols-3 gap-4">
                  <div className="rounded-2xl border border-[#D9D2C3]/80 p-4 text-center">
                    <p className="text-sm text-slate-500">Budget</p>
                    <p className="font-bold">$550k</p>
                  </div>

                  <div className="rounded-2xl border border-[#D9D2C3]/80 p-4 text-center">
                    <p className="text-sm text-slate-500">Remaining</p>
                    <p className="font-bold text-[#2E7D6B]">$68k</p>
                  </div>

                  <div className="rounded-2xl border border-[#D9D2C3]/80 p-4 text-center">
                    <p className="text-sm text-slate-500">Items</p>
                    <p className="font-bold">84</p>
                  </div>
                </div>

                <div className="mt-8 rounded-2xl border border-[#4F46E5]/20 bg-[#4F46E5]/5 p-5">
                  <p className="text-sm font-semibold text-[#4F46E5]">
                    Budget insight
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Your kitchen and wet areas are the biggest cost drivers.
                    Reviewing these early may create the largest savings.
                  </p>
                </div>
              </div>

              <div className="absolute -right-10 -top-10 -z-10 h-96 w-96 rounded-full bg-[#2E7D6B]/20 blur-3xl" />
            </div>
          </div>
        </section>

        <section id="features" className="mx-auto max-w-7xl px-6 py-20 md:px-8 md:py-24">
          <div className="mb-16 text-center">
            <p className="text-sm font-semibold text-[#2E7D6B]">
              Intelligent planning tools
            </p>

            <h2 className="mt-3 text-4xl font-bold tracking-tight md:text-5xl">
              Everything in one calm planning space
            </h2>

            <p className="mx-auto mt-5 max-w-2xl text-xl text-slate-600">
              Built for homeowners planning renovations, extensions and new
              builds.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[
              "Budget Tracking",
              "Supplier Links",
              "Plan Uploads",
              "SQM Estimating",
              "AI Cost Estimates",
              "Project Stages",
            ].map((feature) => (
              <div
                key={feature}
                className="rounded-3xl border border-[#D9D2C3]/80 bg-white p-8 shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F2EEE6] text-xl font-bold text-[#2E7D6B]">
                  ✓
                </div>

                <h3 className="mb-3 text-2xl font-bold">{feature}</h3>

                <p className="leading-relaxed text-slate-600">
                  Manage and track your project with practical budgeting,
                  planning and cost guidance tools.
                </p>
              </div>
            ))}
          </div>
        </section>

        <section id="how-it-works" className="border-y border-[#D9D2C3] bg-white">
          <div className="mx-auto max-w-7xl px-6 py-20 md:px-8 md:py-24">
            <div className="mb-16 text-center">
              <h2 className="text-4xl font-bold tracking-tight md:text-5xl">
                How it works
              </h2>
            </div>

            <div className="grid gap-8 md:grid-cols-3">
              {[
                {
                  step: "1",
                  title: "Create your project",
                  text: "Set your project type, budget and build stage.",
                },
                {
                  step: "2",
                  title: "Add selections and costs",
                  text: "Track supplier products, pricing and estimates.",
                },
                {
                  step: "3",
                  title: "Understand your budget",
                  text: "Stay on top of costs before construction begins.",
                },
              ].map((item) => (
                <div
                  key={item.step}
                  className="rounded-3xl border border-[#D9D2C3]/80 bg-[#F2EEE6]/70 p-8"
                >
                  <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0F172A] text-xl font-bold text-white">
                    {item.step}
                  </div>

                  <h3 className="mb-4 text-2xl font-bold">{item.title}</h3>

                  <p className="leading-relaxed text-slate-600">{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="pricing" className="mx-auto max-w-7xl px-6 py-20 md:px-8 md:py-24">
          <div className="mb-16 text-center">
            <h2 className="text-4xl font-bold tracking-tight md:text-5xl">
              Simple pricing
            </h2>

            <p className="mt-5 text-xl text-slate-600">
              Start free, then unlock deeper planning guidance when you are
              ready.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            <div className="rounded-3xl border border-[#D9D2C3]/80 bg-white p-8 shadow-sm">
              <h3 className="mb-4 text-2xl font-bold">Free</h3>

              <p className="mb-6 text-5xl font-bold">$0</p>

              <div className="space-y-3 text-slate-600">
                <p>✓ 1 Project</p>
                <p>✓ Budget Tracking</p>
                <p>✓ Supplier Links</p>
              </div>
            </div>

            <div className="scale-100 rounded-3xl bg-[#0F172A] p-8 text-white shadow-2xl md:scale-105">
              <div className="mb-5 inline-flex rounded-full bg-white/10 px-4 py-1 text-sm">
                Most Popular
              </div>

              <h3 className="mb-4 text-2xl font-bold">Planner</h3>

              <p className="mb-6 text-5xl font-bold">
                $7
                <span className="text-lg opacity-70">/mo</span>
              </p>

              <div className="space-y-3 text-white/80">
                <p>✓ 10 credits per month</p>
                <p>✓ File Uploads</p>
                <p>✓ SQM Estimating</p>
                <p>✓ Cost Guidance</p>
              </div>
            </div>

            <div className="rounded-3xl border border-[#D9D2C3]/80 bg-white p-8 shadow-sm">
              <h3 className="mb-4 text-2xl font-bold">Extra Credits</h3>

              <p className="mb-6 text-5xl font-bold">$10</p>

              <div className="space-y-3 text-slate-600">
                <p>✓ 10 Credits</p>
                <p>✓ Cost Estimation</p>
                <p>✓ Plan Analysis</p>
              </div>
            </div>
          </div>
        </section>

        <footer className="border-t border-[#D9D2C3] bg-white">
          <div className="mx-auto flex max-w-7xl flex-col justify-between gap-6 px-6 py-10 md:flex-row md:px-8">
            <div>
              <h3 className="text-xl font-bold">Budget My Build</h3>

              <p className="mt-2 text-slate-500">
                Build smarter from the start.
              </p>
            </div>

            <div className="flex gap-6 text-sm text-slate-500">
              <a href="#">Privacy</a>
              <a href="#">Terms</a>
              <a href="#pricing">Pricing</a>
              <a href="#">Contact</a>
            </div>
          </div>
        </footer>
      </main>
    </>
  );
}