import Link from "next/link";
import MarketingNavbar from "../components/MarketingNavbar";

export default function Home() {
  return (
    <>
      <MarketingNavbar />

      <main className="min-h-screen bg-white text-[#0F172A]">
        <section className="mx-auto max-w-7xl px-6 py-20 md:px-8 md:py-24">
          <div className="grid items-center gap-16 lg:grid-cols-2">
            <div>
              <div className="mb-6 inline-flex items-center rounded-full border border-[#D9D2C3]/70 bg-[#F8F6F1] px-4 py-2 text-sm font-semibold text-[#2E7D6B]">
                Renovations • Extensions • New builds
              </div>

              <h1 className="max-w-2xl text-5xl font-bold leading-tight tracking-tight md:text-6xl">
                Build smarter from the start.
              </h1>

              <p className="mt-6 max-w-xl text-xl leading-relaxed text-slate-600">
                Plan your build or renovation with intelligent budget guidance
                before you commit.
              </p>

              <div className="mt-10 flex flex-wrap gap-4">
                <Link
                  href="/signup"
                  className="rounded-2xl bg-[#4F46E5] px-8 py-4 text-lg font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#4338CA] hover:shadow-md"
                >
                  Start planning free
                </Link>

                <Link
                  href="/login"
                  className="rounded-2xl border border-[#D9D2C3]/70 bg-white px-8 py-4 text-lg font-semibold text-[#0F172A] transition hover:bg-[#F8F6F1]"
                >
                  Login
                </Link>
              </div>

              <div className="mt-10 grid gap-3 text-sm font-semibold text-slate-600 sm:grid-cols-2">
                <div>✓ Budget tracking</div>
                <div>✓ SQM estimating</div>
                <div>✓ Supplier links</div>
                <div>✓ Plan uploads</div>
              </div>
            </div>

            <div className="relative">
              <div className="rounded-3xl border border-[#D9D2C3]/60 bg-white p-7 shadow-xl">
                <div className="mb-8 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-500">
                      Likely project cost
                    </p>
                    <h2 className="mt-1 text-4xl font-bold">$482,000</h2>
                  </div>

                  <div className="rounded-2xl border border-[#4F46E5]/10 bg-[#F8F7FF] px-5 py-3 text-sm font-semibold text-[#4F46E5]">
                    Feasibility
                  </div>
                </div>

                <div className="space-y-4">
                  {[
                    ["Kitchen & joinery", "$42,000", "80%"],
                    ["Bathrooms", "$31,000", "65%"],
                    ["Flooring", "$18,000", "45%"],
                  ].map(([label, amount, width]) => (
                    <div
                      key={label}
                      className="rounded-2xl border border-[#D9D2C3]/60 bg-white p-5"
                    >
                      <div className="mb-3 flex justify-between gap-4">
                        <p className="font-semibold text-[#0F172A]">{label}</p>
                        <p className="font-bold text-[#0F172A]">{amount}</p>
                      </div>

                      <div className="h-2 w-full rounded-full bg-slate-100">
                        <div
                          className="h-2 rounded-full bg-[#2E7D6B]"
                          style={{ width }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 grid grid-cols-3 gap-3">
                  <div className="rounded-2xl border border-[#D9D2C3]/60 bg-[#F8F6F1] p-4 text-center">
                    <p className="text-sm text-slate-500">Budget</p>
                    <p className="font-bold">$550k</p>
                  </div>

                  <div className="rounded-2xl border border-[#D9D2C3]/60 bg-[#F8F6F1] p-4 text-center">
                    <p className="text-sm text-slate-500">Remaining</p>
                    <p className="font-bold text-[#2E7D6B]">$68k</p>
                  </div>

                  <div className="rounded-2xl border border-[#D9D2C3]/60 bg-[#F8F6F1] p-4 text-center">
                    <p className="text-sm text-slate-500">Items</p>
                    <p className="font-bold">84</p>
                  </div>
                </div>

                <div className="mt-6 rounded-2xl border border-[#4F46E5]/10 bg-[#F8F7FF] p-5">
                  <p className="text-sm font-semibold text-[#4F46E5]">
                    Budget insight
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Your kitchen and wet areas are the biggest cost drivers.
                    Reviewing these early may create the largest savings.
                  </p>
                </div>
              </div>

              <div className="absolute -right-8 -top-8 -z-10 h-72 w-72 rounded-full bg-[#2E7D6B]/10 blur-3xl" />
            </div>
          </div>
        </section>

        <section
          id="features"
          className="mx-auto max-w-7xl px-6 py-20 md:px-8 md:py-24"
        >
          <div className="mb-14 text-center">
            <p className="text-sm font-semibold text-[#4F46E5]">
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

          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {[
              "Budget tracking",
              "Supplier links",
              "Plan uploads",
              "SQM estimating",
              "AI cost estimates",
              "Project stages",
            ].map((feature) => (
              <div
                key={feature}
                className="rounded-2xl border border-[#D9D2C3]/60 bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
              >
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-[#F8F6F1] text-lg font-bold text-[#2E7D6B]">
                  ✓
                </div>

                <h3 className="mb-3 text-xl font-bold">{feature}</h3>

                <p className="leading-relaxed text-slate-600">
                  Manage and track your project with practical budgeting,
                  planning and cost guidance tools.
                </p>
              </div>
            ))}
          </div>
        </section>

        <section id="how-it-works" className="border-y border-[#D9D2C3]/50 bg-[#FAFAF8]">
          <div className="mx-auto max-w-7xl px-6 py-20 md:px-8 md:py-24">
            <div className="mb-14 text-center">
              <h2 className="text-4xl font-bold tracking-tight md:text-5xl">
                How it works
              </h2>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              {[
                {
                  step: "1",
                  title: "Create your project",
                  text: "Set your project type, budget and build stage.",
                },
                {
                  step: "2",
                  title: "Add plans and selections",
                  text: "Track supplier products, pricing, rooms and estimates.",
                },
                {
                  step: "3",
                  title: "Understand your budget",
                  text: "Stay on top of costs before construction begins.",
                },
              ].map((item) => (
                <div
                  key={item.step}
                  className="rounded-2xl border border-[#D9D2C3]/60 bg-white p-7 shadow-sm"
                >
                  <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0F172A] text-lg font-bold text-white">
                    {item.step}
                  </div>

                  <h3 className="mb-4 text-xl font-bold">{item.title}</h3>

                  <p className="leading-relaxed text-slate-600">{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section
          id="pricing"
          className="mx-auto max-w-7xl px-6 py-20 md:px-8 md:py-24"
        >
          <div className="mb-14 text-center">
            <h2 className="text-4xl font-bold tracking-tight md:text-5xl">
              Simple pricing
            </h2>

            <p className="mt-5 text-xl text-slate-600">
              Start free, then unlock deeper planning guidance when you are
              ready.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <div className="rounded-2xl border border-[#D9D2C3]/60 bg-white p-7 shadow-sm">
              <h3 className="mb-4 text-2xl font-bold">Free</h3>
              <p className="mb-6 text-5xl font-bold">$0</p>

              <div className="space-y-3 text-slate-600">
                <p>✓ 1 project</p>
                <p>✓ Budget tracking</p>
                <p>✓ Supplier links</p>
              </div>
            </div>

            <div className="rounded-2xl border border-[#0F172A] bg-[#0F172A] p-7 text-white shadow-xl md:-translate-y-3">
              <div className="mb-5 inline-flex rounded-full bg-white/10 px-4 py-1 text-sm">
                Most popular
              </div>

              <h3 className="mb-4 text-2xl font-bold">Planner</h3>

              <p className="mb-6 text-5xl font-bold">
                $7
                <span className="text-lg opacity-70">/mo</span>
              </p>

              <div className="space-y-3 text-white/80">
                <p>✓ 10 credits per month</p>
                <p>✓ File uploads</p>
                <p>✓ SQM estimating</p>
                <p>✓ Cost guidance</p>
              </div>
            </div>

            <div className="rounded-2xl border border-[#D9D2C3]/60 bg-white p-7 shadow-sm">
              <h3 className="mb-4 text-2xl font-bold">Extra credits</h3>
              <p className="mb-6 text-5xl font-bold">$10</p>

              <div className="space-y-3 text-slate-600">
                <p>✓ 10 credits</p>
                <p>✓ Cost estimation</p>
                <p>✓ Plan analysis</p>
              </div>
            </div>
          </div>
        </section>

        <footer className="border-t border-[#D9D2C3]/50 bg-white">
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