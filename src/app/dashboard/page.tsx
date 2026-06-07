"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";
import AppNavbar from "../../components/AppNavbar";

export default function Dashboard() {
  const [projects, setProjects] = useState<any[]>([]);
  const [userId, setUserId] = useState("");

  const [projectName, setProjectName] = useState("");
  const [description, setDescription] = useState("");
  const [projectType, setProjectType] = useState("");
  const [suburb, setSuburb] = useState("");
  const [stateValue, setStateValue] = useState("");
  const [propertyType, setPropertyType] = useState("");
  const [budgetTarget, setBudgetTarget] = useState("");
  const [projectStage, setProjectStage] = useState("");
  const [expectedStartDate, setExpectedStartDate] = useState("");
  const [notes, setNotes] = useState("");

  const projectTypes = [
    "Renovation",
    "Extension",
    "Renovation & Extension",
    "New Build",
    "Landscaping",
  ];

  const states = ["QLD", "NSW", "VIC", "SA", "WA", "TAS", "ACT", "NT"];

  const propertyTypes = [
    "House",
    "Townhouse",
    "Apartment",
    "Unit",
    "Duplex",
    "Acreage",
    "Commercial",
    "Other",
  ];

  const projectStages = [
    "Idea",
    "Feasibility",
    "Planning",
    "Design",
    "Approvals",
    "Quotes",
    "Construction",
    "Completed",
  ];

  function formatMoney(value: number) {
    return Number(value || 0).toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  }

  function getStageProgress(stage: string) {
    const index = projectStages.indexOf(stage);
    if (index === -1) return 10;
    return Math.round(((index + 1) / projectStages.length) * 100);
  }

  const totalBudget = useMemo(() => {
    return projects.reduce(
      (sum, project) => sum + Number(project.budget_target || 0),
      0
    );
  }, [projects]);

  const activeProjects = useMemo(() => {
    return projects.filter(
      (project) => project.project_stage && project.project_stage !== "Completed"
    ).length;
  }, [projects]);

  const nextStartingProject = useMemo(() => {
    return [...projects]
      .filter((project) => project.expected_start_date)
      .sort(
        (a, b) =>
          new Date(a.expected_start_date).getTime() -
          new Date(b.expected_start_date).getTime()
      )[0];
  }, [projects]);

  async function loadProjects() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      window.location.href = "/login";
      return;
    }

    setUserId(user.id);

    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      alert(error.message);
      return;
    }

    setProjects(data || []);
  }

  async function createProject() {
    if (!projectName.trim()) {
      alert("Please enter a project name.");
      return;
    }

    const { data: newProject, error: projectError } = await supabase
      .from("projects")
      .insert({
        name: projectName,
        description,
        user_id: userId,
        project_type: projectType,
        suburb,
        state: stateValue,
        property_type: propertyType,
        budget_target: Number(budgetTarget) || 0,
        project_stage: projectStage || "Idea",
        expected_start_date: expectedStartDate || null,
        notes,
      })
      .select()
      .single();

    if (projectError) {
      alert(projectError.message);
      return;
    }

    const defaultCategories = [
      "Kitchen",
      "Bathroom",
      "Flooring",
      "Electrical",
      "Plumbing",
      "Joinery",
      "Appliances",
      "Labour",
      "Other",
    ];

    const categoryRows = defaultCategories.map((name) => ({
      project_id: newProject.id,
      name,
      is_default: true,
      budget_amount: 0,
    }));

    await supabase.from("project_categories").insert(categoryRows);

    setProjectName("");
    setDescription("");
    setProjectType("");
    setSuburb("");
    setStateValue("");
    setPropertyType("");
    setBudgetTarget("");
    setProjectStage("");
    setExpectedStartDate("");
    setNotes("");

    loadProjects();
  }

  useEffect(() => {
    loadProjects();
  }, []);

  return (
    <>
      <AppNavbar />

      <main className="min-h-screen bg-[#F2EEE6]">
        <div className="mx-auto max-w-7xl px-6 py-10 md:px-8 md:py-12">
          <section className="mb-10">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="mb-4 inline-flex rounded-full border border-[#D9D2C3] bg-white/80 px-4 py-2 text-sm font-semibold text-[#2E7D6B] shadow-sm">
                  Build smarter from the start
                </div>

                <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-[#0F172A] md:text-5xl">
                  Your project planning dashboard
                </h1>

                <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-600">
                  Create projects, understand your budget position and keep your
                  build decisions organised before you commit.
                </p>
              </div>

              <a
                href="#create-project"
                className="rounded-2xl bg-[#4F46E5] px-6 py-4 text-center font-semibold text-white shadow-sm transition hover:bg-[#4338CA]"
              >
                + Create New Project
              </a>
            </div>

            <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-4">
              <div className="rounded-3xl border border-[#D9D2C3]/80 bg-white p-6 shadow-sm">
                <p className="text-sm font-medium text-slate-500">
                  Total Projects
                </p>
                <p className="mt-2 text-3xl font-bold text-[#0F172A]">
                  {projects.length}
                </p>
              </div>

              <div className="rounded-3xl border border-[#D9D2C3]/80 bg-white p-6 shadow-sm">
                <p className="text-sm font-medium text-slate-500">
                  Active Projects
                </p>
                <p className="mt-2 text-3xl font-bold text-[#0F172A]">
                  {activeProjects}
                </p>
              </div>

              <div className="rounded-3xl border border-[#D9D2C3]/80 bg-white p-6 shadow-sm">
                <p className="text-sm font-medium text-slate-500">
                  Total Budget
                </p>
                <p className="mt-2 text-3xl font-bold text-[#0F172A]">
                  ${formatMoney(totalBudget)}
                </p>
              </div>

              <div className="rounded-3xl border border-[#D9D2C3]/80 bg-white p-6 shadow-sm">
                <p className="text-sm font-medium text-slate-500">
                  Next Start
                </p>
                <p className="mt-2 text-xl font-bold text-[#0F172A]">
                  {nextStartingProject?.expected_start_date || "Not set"}
                </p>
              </div>
            </div>
          </section>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            <section
              id="create-project"
              className="h-fit rounded-3xl border border-[#D9D2C3]/80 bg-white p-8 shadow-sm"
            >
              <div className="mb-6">
                <p className="text-sm font-semibold text-[#2E7D6B]">
                  New project
                </p>
                <h2 className="mt-1 text-2xl font-bold text-[#0F172A]">
                  Start with the basics
                </h2>
                <p className="mt-2 text-slate-500">
                  Add what you know now. You can refine the details later.
                </p>
              </div>

              <div className="space-y-4">
                <input
                  className="w-full rounded-xl border border-[#D9D2C3] bg-white p-4 outline-none transition focus:border-[#4F46E5] focus:ring-4 focus:ring-[#4F46E5]/10"
                  placeholder="Project name"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                />

                <textarea
                  className="w-full rounded-xl border border-[#D9D2C3] bg-white p-4 outline-none transition focus:border-[#4F46E5] focus:ring-4 focus:ring-[#4F46E5]/10"
                  placeholder="Description"
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />

                <select
                  className="w-full rounded-xl border border-[#D9D2C3] bg-white p-4 outline-none transition focus:border-[#4F46E5] focus:ring-4 focus:ring-[#4F46E5]/10"
                  value={projectType}
                  onChange={(e) => setProjectType(e.target.value)}
                >
                  <option value="">Select project type</option>
                  {projectTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <input
                    className="w-full rounded-xl border border-[#D9D2C3] bg-white p-4 outline-none transition focus:border-[#4F46E5] focus:ring-4 focus:ring-[#4F46E5]/10"
                    placeholder="Suburb"
                    value={suburb}
                    onChange={(e) => setSuburb(e.target.value)}
                  />

                  <select
                    className="w-full rounded-xl border border-[#D9D2C3] bg-white p-4 outline-none transition focus:border-[#4F46E5] focus:ring-4 focus:ring-[#4F46E5]/10"
                    value={stateValue}
                    onChange={(e) => setStateValue(e.target.value)}
                  >
                    <option value="">State</option>
                    {states.map((state) => (
                      <option key={state} value={state}>
                        {state}
                      </option>
                    ))}
                  </select>
                </div>

                <select
                  className="w-full rounded-xl border border-[#D9D2C3] bg-white p-4 outline-none transition focus:border-[#4F46E5] focus:ring-4 focus:ring-[#4F46E5]/10"
                  value={propertyType}
                  onChange={(e) => setPropertyType(e.target.value)}
                >
                  <option value="">Property type</option>
                  {propertyTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>

                <input
                  className="w-full rounded-xl border border-[#D9D2C3] bg-white p-4 outline-none transition focus:border-[#4F46E5] focus:ring-4 focus:ring-[#4F46E5]/10"
                  placeholder="Budget target"
                  type="number"
                  value={budgetTarget}
                  onChange={(e) => setBudgetTarget(e.target.value)}
                />

                <select
                  className="w-full rounded-xl border border-[#D9D2C3] bg-white p-4 outline-none transition focus:border-[#4F46E5] focus:ring-4 focus:ring-[#4F46E5]/10"
                  value={projectStage}
                  onChange={(e) => setProjectStage(e.target.value)}
                >
                  <option value="">Project stage</option>
                  {projectStages.map((stage) => (
                    <option key={stage} value={stage}>
                      {stage}
                    </option>
                  ))}
                </select>

                <input
                  type="date"
                  className="w-full rounded-xl border border-[#D9D2C3] bg-white p-4 outline-none transition focus:border-[#4F46E5] focus:ring-4 focus:ring-[#4F46E5]/10"
                  value={expectedStartDate}
                  onChange={(e) => setExpectedStartDate(e.target.value)}
                />

                <textarea
                  className="w-full rounded-xl border border-[#D9D2C3] bg-white p-4 outline-none transition focus:border-[#4F46E5] focus:ring-4 focus:ring-[#4F46E5]/10"
                  rows={4}
                  placeholder="Additional notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />

                <button
                  onClick={createProject}
                  className="w-full rounded-xl bg-[#4F46E5] px-6 py-4 font-semibold text-white shadow-sm transition hover:bg-[#4338CA]"
                >
                  Create Project
                </button>
              </div>
            </section>

            <section className="lg:col-span-2">
              <div className="mb-6 flex items-end justify-between">
                <div>
                  <p className="text-sm font-semibold text-[#2E7D6B]">
                    Project library
                  </p>
                  <h2 className="mt-1 text-3xl font-bold text-[#0F172A]">
                    Your Projects
                  </h2>
                  <p className="mt-1 text-slate-500">
                    Open a project to manage budgets, plans, rooms and estimates.
                  </p>
                </div>
              </div>

              {projects.length === 0 ? (
                <div className="rounded-3xl border border-[#D9D2C3]/80 bg-white p-12 text-center shadow-sm">
                  <div className="mb-4 text-5xl">🏡</div>
                  <h3 className="mb-2 text-2xl font-bold text-[#0F172A]">
                    No projects yet
                  </h3>
                  <p className="mb-6 text-slate-500">
                    Create your first build or renovation project to start
                    planning with more clarity.
                  </p>
                  <a
                    href="#create-project"
                    className="inline-flex rounded-2xl bg-[#4F46E5] px-6 py-3 font-semibold text-white shadow-sm transition hover:bg-[#4338CA]"
                  >
                    Create Project
                  </a>
                </div>
              ) : (
                <div className="grid gap-5">
                  {projects.map((project) => {
                    const stageProgress = getStageProgress(project.project_stage);

                    return (
                      <Link
                        href={`/projects/${project.id}`}
                        key={project.id}
                        className="group block rounded-3xl border border-[#D9D2C3]/80 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
                      >
                        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
                          <div className="flex gap-5">
                            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[#0F172A] text-2xl font-bold text-white">
                              {project.name?.charAt(0)?.toUpperCase() || "B"}
                            </div>

                            <div>
                              <h3 className="text-2xl font-bold text-[#0F172A] group-hover:text-[#4F46E5]">
                                {project.name}
                              </h3>

                              <p className="mt-2 line-clamp-2 text-slate-500">
                                {project.description || "No description added."}
                              </p>

                              <div className="mt-4 flex flex-wrap gap-2">
                                {project.project_type && (
                                  <span className="rounded-full border border-[#D9D2C3] bg-[#F2EEE6] px-3 py-1 text-sm text-slate-700">
                                    {project.project_type}
                                  </span>
                                )}

                                {project.state && (
                                  <span className="rounded-full border border-[#D9D2C3] bg-[#F2EEE6] px-3 py-1 text-sm text-slate-700">
                                    {project.state}
                                  </span>
                                )}

                                {project.project_stage && (
                                  <span className="rounded-full bg-[#2E7D6B] px-3 py-1 text-sm font-semibold text-white">
                                    {project.project_stage}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="min-w-[180px] md:text-right">
                            <p className="text-sm text-slate-500">
                              Budget Target
                            </p>
                            <p className="text-2xl font-bold text-[#0F172A]">
                              ${formatMoney(Number(project.budget_target || 0))}
                            </p>

                            <div className="mt-4">
                              <div className="mb-1 flex justify-between text-xs text-slate-500">
                                <span>Planning progress</span>
                                <span>{stageProgress}%</span>
                              </div>

                              <div className="h-2 w-full rounded-full bg-[#D9D2C3]">
                                <div
                                  className="h-2 rounded-full bg-[#2E7D6B]"
                                  style={{ width: `${stageProgress}%` }}
                                />
                              </div>
                            </div>

                            <div className="mt-4 inline-flex rounded-xl border border-[#D9D2C3] px-4 py-2 text-sm font-semibold text-slate-600 transition group-hover:border-[#4F46E5] group-hover:bg-[#4F46E5] group-hover:text-white">
                              Open Project →
                            </div>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        </div>
      </main>
    </>
  );
}