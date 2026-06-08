"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import AppNavbar from "../../components/AppNavbar";

const inputClass =
  "w-full rounded-xl border border-[#D9D2C3] bg-white p-4 outline-none transition focus:border-[#4F46E5] focus:ring-4 focus:ring-[#4F46E5]/10";

const labelClass = "mb-1 block text-sm font-semibold text-[#0F172A]";

export default function Dashboard() {
  const router = useRouter();

  const [projects, setProjects] = useState<any[]>([]);
  const [userId, setUserId] = useState("");
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [projectToDelete, setProjectToDelete] = useState<any | null>(null);
  const [isDeletingProject, setIsDeletingProject] = useState(false);

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
  const [postcode, setPostcode] = useState("");
  const [planningGoal, setPlanningGoal] = useState("");
  const [hasPlansReady, setHasPlansReady] = useState<boolean | null>(null);

  const projectTypes = [
    "Renovation",
    "Extension",
    "Renovation & Extension",
    "New Build",
    "Landscaping",
    "Outdoor Project",
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

  const planningGoals = [
    {
      value: "Understand likely build costs",
      title: "Understand likely build costs",
      description: "I want a realistic idea of what this project could cost.",
      icon: "💰",
    },
    {
      value: "Stay within budget",
      title: "Stay within budget",
      description: "I already have a budget and want to keep track of it.",
      icon: "📋",
    },
    {
      value: "Track products & selections",
      title: "Track products & selections",
      description: "I want to compare and organise the things I’m choosing.",
      icon: "🛍️",
    },
    {
      value: "Explore design ideas",
      title: "Explore design ideas",
      description: "I’m still working out what I want to build.",
      icon: "📐",
    },
    {
      value: "Prepare for builder quotes",
      title: "Prepare for builder quotes",
      description:
        "I want to understand my project before talking to builders.",
      icon: "🏗️",
    },
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

  function resetProjectForm() {
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
    setPostcode("");
    setPlanningGoal("");
    setHasPlansReady(null);
    setWizardStep(1);
  }

  const totalBudget = useMemo(() => {
    return projects.reduce(
      (sum, project) => sum + Number(project.budget_target || 0),
      0,
    );
  }, [projects]);

  const activeProjects = useMemo(() => {
    return projects.filter(
      (project) =>
        project.project_stage && project.project_stage !== "Completed",
    ).length;
  }, [projects]);

  const nextStartingProject = useMemo(() => {
    return [...projects]
      .filter((project) => project.expected_start_date)
      .sort(
        (a, b) =>
          new Date(a.expected_start_date).getTime() -
          new Date(b.expected_start_date).getTime(),
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
    if (!data || data.length === 0) {
      setIsCreatingProject(true);
    }
  }

  async function createProject() {
    const suggestedProjectName =
      projectName.trim() ||
      [suburb.trim(), projectType || "Project"].filter(Boolean).join(" ") ||
      "My Build Project";

    const { data: newProject, error: projectError } = await supabase
      .from("projects")
      .insert({
        name: suggestedProjectName,
        description: description.trim(),
        user_id: userId,
        project_type: projectType,
        suburb: suburb.trim(),
        state: stateValue,
        postcode: postcode.trim() || null,
        property_type: propertyType,
        budget_target: Number(budgetTarget) || 0,
        project_stage: projectStage || "Idea",
        expected_start_date: expectedStartDate || null,
        notes: notes.trim(),
        planning_goal: planningGoal || null,
        has_plans_ready: hasPlansReady,
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

    resetProjectForm();
    setIsCreatingProject(false);
    await loadProjects();
    const startTab =
      planningGoal === "Track products & selections" ? "budget" : "plans";
    router.push(`/projects/${newProject.id}?start=${startTab}`);
  }

  async function deleteProject(project: any) {
    if (!project?.id) return;

    try {
      setIsDeletingProject(true);

      const { data: plans } = await supabase
        .from("project_plans")
        .select("id, storage_path")
        .eq("project_id", project.id);

      const planIds = (plans || []).map((plan) => plan.id);
      const storagePaths = (plans || [])
        .map((plan) => plan.storage_path)
        .filter(Boolean);

      if (planIds.length > 0) {
        const { data: pages } = await supabase
          .from("plan_pages")
          .select("id, image_path")
          .in("project_plan_id", planIds);

        const pageIds = (pages || []).map((page) => page.id);
        const pageImagePaths = (pages || [])
          .map((page) => page.image_path)
          .filter(Boolean);

        if (pageIds.length > 0) {
          await supabase
            .from("plan_features")
            .delete()
            .in("plan_page_id", pageIds);
          await supabase
            .from("plan_rooms")
            .delete()
            .in("plan_page_id", pageIds);
          await supabase.from("plan_pages").delete().in("id", pageIds);
        }

        if (storagePaths.length > 0) {
          await supabase.storage.from("project-plans").remove(storagePaths);
        }
        if (pageImagePaths.length > 0) {
          await supabase.storage.from("project-plans").remove(pageImagePaths);
        }
      }

      const { data: files } = await supabase
        .from("project_files")
        .select("file_path")
        .eq("project_id", project.id);

      const filePaths = (files || [])
        .map((file) => file.file_path)
        .filter(Boolean);
      if (filePaths.length > 0) {
        await supabase.storage.from("project-files").remove(filePaths);
      }

      await supabase
        .from("project_files")
        .delete()
        .eq("project_id", project.id);
      await supabase
        .from("project_items")
        .delete()
        .eq("project_id", project.id);
      await supabase
        .from("project_categories")
        .delete()
        .eq("project_id", project.id);
      await supabase
        .from("project_estimates")
        .delete()
        .eq("project_id", project.id);
      await supabase
        .from("project_plans")
        .delete()
        .eq("project_id", project.id);

      const { error } = await supabase
        .from("projects")
        .delete()
        .eq("id", project.id);
      if (error) throw error;

      setProjectToDelete(null);
      await loadProjects();
    } catch (error: any) {
      alert(error.message || "Project deletion failed.");
    } finally {
      setIsDeletingProject(false);
    }
  }

  useEffect(() => {
    loadProjects();
  }, []);

  const wizardProgress = Math.round((wizardStep / 6) * 100);

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
                  Let’s understand what you’re trying to build.
                </h1>

                <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-600">
                  Budget My Build guides you through the early planning steps so
                  your project starts with more clarity, not just another blank
                  form.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  resetProjectForm();
                  setIsCreatingProject(true);
                }}
                className="rounded-2xl bg-[#4F46E5] px-6 py-4 text-center font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#4338CA] hover:shadow-lg active:translate-y-0"
              >
                + Start Planning
              </button>
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
                <p className="text-sm font-medium text-slate-500">Next Start</p>
                <p className="mt-2 text-xl font-bold text-[#0F172A]">
                  {nextStartingProject?.expected_start_date || "Not set"}
                </p>
              </div>
            </div>
          </section>

          {isCreatingProject && (
            <section
              id="create-project"
              className="mb-10 overflow-hidden rounded-3xl border border-[#D9D2C3]/80 bg-white shadow-xl"
            >
              <div className="border-b border-[#D9D2C3]/80 bg-[#0F172A] px-8 py-7 text-white">
                <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-wide text-white/60">
                      Guided project setup
                    </p>
                    <h2 className="mt-1 text-3xl font-bold">
                      Let’s start planning
                    </h2>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-white/70">
                      Answer what you know now. You can refine everything later
                      once plans, rooms, features and costs become clearer.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsCreatingProject(false)}
                    className="rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/20"
                  >
                    Close
                  </button>
                </div>

                <div className="mt-6 h-2 rounded-full bg-white/15">
                  <div
                    className="h-2 rounded-full bg-[#2E7D6B] transition-all"
                    style={{ width: `${wizardProgress}%` }}
                  />
                </div>
              </div>

              <div className="p-8">
                <div className="mb-8 grid gap-3 md:grid-cols-6">
                  {[
                    "Project type",
                    "Goal",
                    "Location",
                    "Stage",
                    "Plans",
                    "Create",
                  ].map((label, index) => {
                    const step = index + 1;
                    const active = wizardStep === step;
                    const complete = wizardStep > step;

                    return (
                      <button
                        key={label}
                        type="button"
                        onClick={() => setWizardStep(step)}
                        className={`rounded-2xl border px-4 py-3 text-left transition ${
                          active
                            ? "border-[#4F46E5] bg-[#4F46E5]/10 text-[#0F172A]"
                            : complete
                              ? "border-[#2E7D6B]/40 bg-[#2E7D6B]/10 text-[#0F172A]"
                              : "border-[#D9D2C3] bg-[#F2EEE6] text-slate-600"
                        }`}
                      >
                        <span className="block text-xs font-semibold uppercase tracking-wide">
                          Step {step}
                        </span>
                        <span className="mt-1 block font-bold">{label}</span>
                      </button>
                    );
                  })}
                </div>

                {wizardStep === 1 && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-2xl font-bold text-[#0F172A]">
                        What are you planning?
                      </h3>
                      <p className="mt-2 text-slate-500">
                        Choose the closest match. This helps shape the guidance
                        inside your project.
                      </p>
                    </div>

                    <div className="grid gap-4 md:grid-cols-3">
                      {projectTypes.map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setProjectType(type)}
                          className={`rounded-3xl border p-5 text-left transition hover:-translate-y-0.5 hover:shadow-lg ${
                            projectType === type
                              ? "border-[#4F46E5] bg-[#4F46E5]/10 ring-4 ring-[#4F46E5]/10"
                              : "border-[#D9D2C3] bg-white"
                          }`}
                        >
                          <div className="mb-4 text-3xl">
                            {type.includes("New")
                              ? "🏡"
                              : type.includes("Extension")
                                ? "➕"
                                : type.includes("Landscaping") ||
                                    type.includes("Outdoor")
                                  ? "🌿"
                                  : "🔨"}
                          </div>
                          <p className="text-lg font-bold text-[#0F172A]">
                            {type}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {wizardStep === 2 && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-2xl font-bold text-[#0F172A]">
                        What’s your main goal?
                      </h3>
                      <p className="mt-2 text-slate-500">
                        This helps us guide the project around what matters most
                        to you.
                      </p>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      {planningGoals.map((goal) => (
                        <button
                          key={goal.value}
                          type="button"
                          onClick={() => setPlanningGoal(goal.value)}
                          className={`rounded-3xl border p-5 text-left transition hover:-translate-y-0.5 hover:shadow-lg ${
                            planningGoal === goal.value
                              ? "border-[#4F46E5] bg-[#4F46E5]/10 ring-4 ring-[#4F46E5]/10"
                              : "border-[#D9D2C3] bg-white"
                          }`}
                        >
                          <div className="mb-3 text-3xl">{goal.icon}</div>
                          <p className="text-lg font-bold text-[#0F172A]">
                            {goal.title}
                          </p>
                          <p className="mt-1 text-sm text-slate-500">
                            {goal.description}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {wizardStep === 3 && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-2xl font-bold text-[#0F172A]">
                        Where is the project?
                      </h3>
                      <p className="mt-2 text-slate-500">
                        Location helps keep the project profile and future cost
                        guidance more relevant.
                      </p>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                      <div>
                        <label className={labelClass}>Property type</label>
                        <select
                          className={inputClass}
                          value={propertyType}
                          onChange={(e) => setPropertyType(e.target.value)}
                        >
                          <option value="">Select property type</option>
                          {propertyTypes.map((type) => (
                            <option key={type} value={type}>
                              {type}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className={labelClass}>Suburb</label>
                        <input
                          className={inputClass}
                          value={suburb}
                          onChange={(e) => setSuburb(e.target.value)}
                          placeholder="e.g. Brisbane"
                        />
                      </div>

                      <div>
                        <label className={labelClass}>State</label>
                        <select
                          className={inputClass}
                          value={stateValue}
                          onChange={(e) => setStateValue(e.target.value)}
                        >
                          <option value="">Select state</option>
                          {states.map((state) => (
                            <option key={state} value={state}>
                              {state}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className={labelClass}>Postcode</label>
                        <input
                          className={inputClass}
                          value={postcode}
                          onChange={(e) => setPostcode(e.target.value)}
                          placeholder="e.g. 4000"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {wizardStep === 4 && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-2xl font-bold text-[#0F172A]">
                        How far along are you?
                      </h3>
                      <p className="mt-2 text-slate-500">
                        This helps Budget My Build show the most useful next
                        step after the project is created.
                      </p>
                    </div>

                    <div className="grid gap-4 md:grid-cols-3">
                      <div>
                        <label className={labelClass}>Project stage</label>
                        <select
                          className={inputClass}
                          value={projectStage}
                          onChange={(e) => setProjectStage(e.target.value)}
                        >
                          <option value="">Select project stage</option>
                          {projectStages.map((stage) => (
                            <option key={stage} value={stage}>
                              {stage}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className={labelClass}>Target budget</label>
                        <input
                          className={inputClass}
                          placeholder="e.g. 450000"
                          type="number"
                          value={budgetTarget}
                          onChange={(e) => setBudgetTarget(e.target.value)}
                        />
                      </div>

                      <div>
                        <label className={labelClass}>
                          Expected start date
                        </label>
                        <input
                          type="date"
                          className={inputClass}
                          value={expectedStartDate}
                          onChange={(e) => setExpectedStartDate(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {wizardStep === 5 && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-2xl font-bold text-[#0F172A]">
                        Do you already have plans?
                      </h3>
                      <p className="mt-2 text-slate-500">
                        This decides whether your project opens at plan upload
                        or manual room setup.
                      </p>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <button
                        type="button"
                        onClick={() => setHasPlansReady(true)}
                        className={`rounded-3xl border p-6 text-left transition hover:-translate-y-0.5 hover:shadow-lg ${
                          hasPlansReady === true
                            ? "border-[#4F46E5] bg-[#4F46E5]/10 ring-4 ring-[#4F46E5]/10"
                            : "border-[#D9D2C3] bg-white"
                        }`}
                      >
                        <div className="mb-4 text-4xl">📄</div>
                        <p className="text-xl font-bold text-[#0F172A]">
                          Yes, I have plans
                        </p>
                        <p className="mt-2 text-sm text-slate-500">
                          After creating the project, we’ll guide you to upload
                          your plans and detect rooms, features and cost
                          drivers.
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => setHasPlansReady(false)}
                        className={`rounded-3xl border p-6 text-left transition hover:-translate-y-0.5 hover:shadow-lg ${
                          hasPlansReady === false
                            ? "border-[#4F46E5] bg-[#4F46E5]/10 ring-4 ring-[#4F46E5]/10"
                            : "border-[#D9D2C3] bg-white"
                        }`}
                      >
                        <div className="mb-4 text-4xl">✍️</div>
                        <p className="text-xl font-bold text-[#0F172A]">
                          Not yet
                        </p>
                        <p className="mt-2 text-sm text-slate-500">
                          No problem. You can create rooms manually, add
                          features, track selections and still build an early
                          budget.
                        </p>
                      </button>
                    </div>
                  </div>
                )}

                {wizardStep === 6 && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-2xl font-bold text-[#0F172A]">
                        Create your project
                      </h3>
                      <p className="mt-2 text-slate-500">
                        We’ve suggested a project name for you. You can change
                        it now or edit it later.
                      </p>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label className={labelClass}>Project name</label>
                        <input
                          className={inputClass}
                          value={
                            projectName ||
                            [suburb.trim(), projectType || "Project"]
                              .filter(Boolean)
                              .join(" ")
                          }
                          onChange={(e) => setProjectName(e.target.value)}
                          placeholder="e.g. Holland Park Extension"
                        />
                      </div>

                      <div>
                        <label className={labelClass}>Short description</label>
                        <input
                          className={inputClass}
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          placeholder="e.g. Rear extension and pool"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className={labelClass}>Planning notes</label>
                        <textarea
                          className={inputClass}
                          rows={4}
                          placeholder="Anything you already know about the project"
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="rounded-3xl border border-[#D9D2C3] bg-[#F2EEE6] p-5">
                      <p className="text-sm font-semibold text-slate-500">
                        Project setup summary
                      </p>
                      <p className="mt-2 text-lg font-bold text-[#0F172A]">
                        {[
                          projectType || "Project",
                          propertyType,
                          suburb,
                          stateValue,
                          postcode,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                      <p className="mt-1 text-sm text-slate-600">
                        Goal: {planningGoal || "Not set"} · Stage:{" "}
                        {projectStage || "Idea"}
                        {budgetTarget
                          ? ` · Budget target: $${formatMoney(Number(budgetTarget))}`
                          : ""}
                      </p>
                      <p className="mt-1 text-sm text-slate-600">
                        Plans:{" "}
                        {hasPlansReady === true
                          ? "Ready to upload"
                          : hasPlansReady === false
                            ? "Manual setup for now"
                            : "Not answered"}
                      </p>
                    </div>
                  </div>
                )}

                <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-between">
                  <button
                    type="button"
                    onClick={() =>
                      setWizardStep((current) => Math.max(current - 1, 1))
                    }
                    disabled={wizardStep === 1}
                    className="rounded-xl border border-[#D9D2C3] bg-white px-6 py-3 font-semibold text-slate-700 transition hover:bg-[#F2EEE6] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Back
                  </button>

                  {wizardStep < 6 ? (
                    <button
                      type="button"
                      onClick={() =>
                        setWizardStep((current) => Math.min(current + 1, 6))
                      }
                      className="rounded-xl bg-[#4F46E5] px-6 py-3 font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#4338CA] hover:shadow-lg active:translate-y-0"
                    >
                      Continue →
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={createProject}
                      className="rounded-xl bg-[#4F46E5] px-6 py-3 font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#4338CA] hover:shadow-lg active:translate-y-0"
                    >
                      Create Project →
                    </button>
                  )}
                </div>
              </div>
            </section>
          )}

          <section>
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
                  Start with a guided project setup instead of a blank form.
                </p>
                <button
                  type="button"
                  onClick={() => setIsCreatingProject(true)}
                  className="inline-flex rounded-2xl bg-[#4F46E5] px-6 py-3 font-semibold text-white shadow-sm transition hover:bg-[#4338CA]"
                >
                  Start Planning
                </button>
              </div>
            ) : (
              <div className="grid gap-5">
                {projects.map((project) => {
                  const stageProgress = getStageProgress(project.project_stage);

                  return (
                    <div
                      key={project.id}
                      className="group rounded-3xl border border-[#D9D2C3]/80 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
                    >
                      <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
                        <Link
                          href={`/projects/${project.id}`}
                          className="flex flex-1 gap-5"
                        >
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
                        </Link>

                        <div className="min-w-[220px] md:text-right">
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

                          <div className="mt-5 flex flex-wrap justify-end gap-2">
                            <Link
                              href={`/projects/${project.id}`}
                              className="rounded-xl border border-[#D9D2C3] px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-[#4F46E5] hover:bg-[#4F46E5] hover:text-white"
                            >
                              Open Project →
                            </Link>

                            <button
                              type="button"
                              onClick={() => setProjectToDelete(project)}
                              className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </main>

      {projectToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F172A]/50 p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white p-7 shadow-2xl">
            <p className="text-sm font-semibold uppercase tracking-wide text-red-600">
              Delete project
            </p>
            <h2 className="mt-2 text-2xl font-bold text-[#0F172A]">
              Delete {projectToDelete.name}?
            </h2>
            <p className="mt-3 text-slate-600">
              This will permanently remove the project details, uploaded plans,
              detected rooms, features, products, files and estimates. This
              action cannot be undone.
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setProjectToDelete(null)}
                disabled={isDeletingProject}
                className="rounded-xl border border-[#D9D2C3] bg-white px-5 py-3 font-semibold text-slate-700 hover:bg-[#F2EEE6] disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => deleteProject(projectToDelete)}
                disabled={isDeletingProject}
                className="rounded-xl bg-red-600 px-5 py-3 font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {isDeletingProject ? "Deleting..." : "Delete Project"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
