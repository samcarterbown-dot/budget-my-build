"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import AppNavbar from "../../components/AppNavbar";

const inputClass =
  "w-full rounded-2xl border border-[#D9D2C3]/80 bg-white px-4 py-3.5 text-[#0F172A] outline-none transition placeholder:text-slate-400 focus:border-[#4F46E5] focus:ring-4 focus:ring-[#4F46E5]/10";

const labelClass = "mb-1.5 block text-sm font-semibold text-[#0F172A]";

const cardClass =
  "rounded-2xl border border-[#D9D2C3]/50 bg-white shadow-sm";

const primaryButtonClass =
  "rounded-2xl bg-[#4F46E5] px-5 py-3 font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#4338CA] hover:shadow-md active:translate-y-0";

const secondaryButtonClass =
  "rounded-2xl border border-[#D9D2C3]/80 bg-white px-5 py-3 font-semibold text-slate-700 transition hover:bg-[#F8F6F1]";

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


  function getProjectInitials(name: string) {
    const words = String(name || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    if (words.length === 0) return "B";
    if (words.length === 1) return words[0].slice(0, 2).toUpperCase();

    return `${words[0][0] || ""}${words[1][0] || ""}`.toUpperCase();
  }

  function getStageMeta(stage: string) {
    switch (stage) {
      case "Idea":
        return {
          label: "Idea",
          dotClass: "bg-slate-500",
          textClass: "text-slate-700",
          bgClass: "bg-slate-50",
          borderClass: "border-slate-200",
        };
      case "Feasibility":
        return {
          label: "Feasibility",
          dotClass: "bg-sky-500",
          textClass: "text-sky-700",
          bgClass: "bg-sky-50",
          borderClass: "border-sky-100",
        };
      case "Planning":
        return {
          label: "Planning",
          dotClass: "bg-[#4F46E5]",
          textClass: "text-[#4F46E5]",
          bgClass: "bg-[#F8F7FF]",
          borderClass: "border-[#4F46E5]/10",
        };
      case "Design":
        return {
          label: "Design",
          dotClass: "bg-violet-500",
          textClass: "text-violet-700",
          bgClass: "bg-violet-50",
          borderClass: "border-violet-100",
        };
      case "Approvals":
        return {
          label: "Approvals",
          dotClass: "bg-amber-500",
          textClass: "text-amber-700",
          bgClass: "bg-amber-50",
          borderClass: "border-amber-100",
        };
      case "Quotes":
        return {
          label: "Quotes",
          dotClass: "bg-orange-500",
          textClass: "text-orange-700",
          bgClass: "bg-orange-50",
          borderClass: "border-orange-100",
        };
      case "Construction":
        return {
          label: "Construction",
          dotClass: "bg-[#2E7D6B]",
          textClass: "text-[#2E7D6B]",
          bgClass: "bg-[#2E7D6B]/10",
          borderClass: "border-[#2E7D6B]/10",
        };
      case "Completed":
        return {
          label: "Completed",
          dotClass: "bg-emerald-500",
          textClass: "text-emerald-700",
          bgClass: "bg-emerald-50",
          borderClass: "border-emerald-100",
        };
      default:
        return {
          label: "Idea",
          dotClass: "bg-slate-500",
          textClass: "text-slate-700",
          bgClass: "bg-slate-50",
          borderClass: "border-slate-200",
        };
    }
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

      <main className="min-h-screen bg-white">
        <div className="mx-auto max-w-7xl px-6 py-10 md:px-8 md:py-12">
          <section className="mb-10">
            <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#D9D2C3]/80 bg-white px-4 py-2 text-sm font-semibold text-[#0F172A] shadow-sm">
                  <span className="h-2 w-2 rounded-full bg-[#2E7D6B]" />
                  Build smarter from the start
                </div>

                <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-[#0F172A] md:text-5xl">
                  Plan with clarity before you commit.
                </h1>

                <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-600">
                  Create projects, organise plans and start shaping a realistic
                  budget from one calm planning dashboard.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  resetProjectForm();
                  setIsCreatingProject(true);
                }}
                className={primaryButtonClass}
              >
                Start Planning
              </button>
            </div>

            <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-4">
              <div className={`${cardClass} p-6`}>
                <p className="text-sm font-medium text-slate-500">
                  Total Projects
                </p>
                <p className="mt-2 text-3xl font-bold text-[#0F172A]">
                  {projects.length}
                </p>
              </div>

              <div className={`${cardClass} p-6`}>
                <p className="text-sm font-medium text-slate-500">
                  Active Projects
                </p>
                <p className="mt-2 text-3xl font-bold text-[#0F172A]">
                  {activeProjects}
                </p>
              </div>

              <div className={`${cardClass} p-6`}>
                <p className="text-sm font-medium text-slate-500">
                  Total Budget
                </p>
                <p className="mt-2 text-3xl font-bold text-[#0F172A]">
                  ${formatMoney(totalBudget)}
                </p>
              </div>

              <div className={`${cardClass} p-6`}>
                <p className="text-sm font-medium text-slate-500">Next Start</p>
                <p className="mt-2 text-xl font-bold text-[#0F172A]">
                  {nextStartingProject?.expected_start_date || "Not set"}
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-[#4F46E5]/10 bg-[#F8F7FF] p-5">
              <p className="text-sm font-bold text-[#4F46E5]">Planning insight</p>
              <p className="mt-1 text-sm leading-6 text-slate-700">
                Start by adding your project basics, then upload plans or create
                rooms manually. Budget My Build will help turn early project
                details into clearer cost guidance.
              </p>
            </div>
          </section>

          {isCreatingProject && (
            <section
              id="create-project"
              className={`${cardClass} mb-10 overflow-hidden`}
            >
              <div className="border-b border-[#D9D2C3]/70 bg-white px-8 py-7">
                <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-wide text-[#4F46E5]">
                      Guided project setup
                    </p>
                    <h2 className="mt-1 text-3xl font-bold text-[#0F172A]">
                      Let’s start planning
                    </h2>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                      Answer what you know now. You can refine everything later
                      once plans, rooms, features and costs become clearer.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsCreatingProject(false)}
                    className={secondaryButtonClass}
                  >
                    Close
                  </button>
                </div>

                <div className="mt-6 h-2 rounded-full bg-[#F8F6F1]">
                  <div
                    className="h-2 rounded-full bg-[#4F46E5] transition-all"
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
                            ? "border-[#4F46E5] bg-[#F8F7FF] text-[#0F172A]"
                            : complete
                              ? "border-[#2E7D6B]/30 bg-[#2E7D6B]/10 text-[#0F172A]"
                              : "border-[#D9D2C3]/80 bg-white text-slate-600 hover:bg-[#F8F6F1]"
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
                          className={`rounded-2xl border p-5 text-left transition hover:-translate-y-0.5 hover:shadow-md ${
                            projectType === type
                              ? "border-[#4F46E5] bg-[#F8F7FF] ring-4 ring-[#4F46E5]/10"
                              : "border-[#D9D2C3]/80 bg-white"
                          }`}
                        >
                          <p className="text-lg font-bold text-[#0F172A]">
                            {type}
                          </p>
                          <p className="mt-2 text-sm text-slate-500">
                            Set up a planning workspace for this project type.
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
                          className={`rounded-2xl border p-5 text-left transition hover:-translate-y-0.5 hover:shadow-md ${
                            planningGoal === goal.value
                              ? "border-[#4F46E5] bg-[#F8F7FF] ring-4 ring-[#4F46E5]/10"
                              : "border-[#D9D2C3]/80 bg-white"
                          }`}
                        >
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
                        className={`rounded-2xl border p-6 text-left transition hover:-translate-y-0.5 hover:shadow-md ${
                          hasPlansReady === true
                            ? "border-[#4F46E5] bg-[#F8F7FF] ring-4 ring-[#4F46E5]/10"
                            : "border-[#D9D2C3]/80 bg-white"
                        }`}
                      >
                        <p className="text-xl font-bold text-[#0F172A]">
                          Yes, I have plans
                        </p>
                        <p className="mt-2 text-sm text-slate-500">
                          We’ll guide you to upload your plans and detect rooms,
                          features and cost drivers.
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => setHasPlansReady(false)}
                        className={`rounded-2xl border p-6 text-left transition hover:-translate-y-0.5 hover:shadow-md ${
                          hasPlansReady === false
                            ? "border-[#4F46E5] bg-[#F8F7FF] ring-4 ring-[#4F46E5]/10"
                            : "border-[#D9D2C3]/80 bg-white"
                        }`}
                      >
                        <p className="text-xl font-bold text-[#0F172A]">
                          Not yet
                        </p>
                        <p className="mt-2 text-sm text-slate-500">
                          You can create rooms manually, add features, track
                          selections and still build an early budget.
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

                    <div className="rounded-2xl border border-[#D9D2C3]/80 bg-[#F8F6F1] p-5">
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
                    className={`${secondaryButtonClass} disabled:cursor-not-allowed disabled:opacity-40`}
                  >
                    Back
                  </button>

                  {wizardStep < 6 ? (
                    <button
                      type="button"
                      onClick={() =>
                        setWizardStep((current) => Math.min(current + 1, 6))
                      }
                      className={primaryButtonClass}
                    >
                      Continue →
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={createProject}
                      className={primaryButtonClass}
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
                <p className="text-sm font-semibold text-[#4F46E5]">
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
              <div className={`${cardClass} p-12 text-center`}>
                <h3 className="mb-2 text-2xl font-bold text-[#0F172A]">
                  No projects yet
                </h3>
                <p className="mb-6 text-slate-500">
                  Start with a guided project setup instead of a blank form.
                </p>
                <button
                  type="button"
                  onClick={() => setIsCreatingProject(true)}
                  className={primaryButtonClass}
                >
                  Start Planning
                </button>
              </div>
            ) : (
              <div className="grid gap-5">
                {projects.map((project) => {
                  const currentStage = project.project_stage || "Idea";
                  const stageProgress = getStageProgress(currentStage);
                  const stageMeta = getStageMeta(currentStage);

                  return (
                    <div
                      key={project.id}
                      className={`${cardClass} group overflow-hidden transition hover:-translate-y-1 hover:shadow-md`}
                    >
                      <div className="flex flex-col gap-6 p-6 lg:flex-row lg:items-stretch lg:justify-between">
                        <Link
                          href={`/projects/${project.id}`}
                          className="flex flex-1 gap-5"
                        >
                          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-[#D9D2C3]/40 bg-[#F8F6F1] text-lg font-bold tracking-tight text-[#0F172A]">
                            {getProjectInitials(project.name)}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-start gap-3">
                              <div className="min-w-0 flex-1">
                                <h3 className="truncate text-2xl font-bold text-[#0F172A] group-hover:text-[#4F46E5]">
                                  {project.name}
                                </h3>

                                <p className="mt-2 line-clamp-2 text-slate-500">
                                  {project.description || "No description added."}
                                </p>
                              </div>

                              <div
                                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-semibold ${stageMeta.bgClass} ${stageMeta.borderClass} ${stageMeta.textClass}`}
                              >
                                <span
                                  className={`h-2 w-2 rounded-full ${stageMeta.dotClass}`}
                                />
                                {stageMeta.label}
                              </div>
                            </div>

                            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:max-w-xl">
                              <div>
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                                  Current Stage
                                </p>
                                <p className={`mt-1 font-semibold ${stageMeta.textClass}`}>
                                  {stageMeta.label}
                                </p>
                              </div>

                              <div>
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                                  Project Type
                                </p>
                                <p className="mt-1 font-semibold text-[#0F172A]">
                                  {project.project_type || "Not set"}
                                </p>
                              </div>
                            </div>
                          </div>
                        </Link>

                        <div className="border-t border-[#D9D2C3]/50 pt-5 lg:min-w-[280px] lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
                          <div className="flex items-start justify-between gap-4 lg:block lg:text-right">
                            <div>
                              <p className="text-sm text-slate-500">
                                Budget Target
                              </p>
                              <p className="text-2xl font-bold text-[#0F172A]">
                                ${formatMoney(Number(project.budget_target || 0))}
                              </p>
                            </div>
                          </div>

                          <div className="mt-5">
                            <div className="mb-2 flex justify-between text-xs text-slate-500">
                              <span>Planning journey</span>
                              <span>{stageProgress}%</span>
                            </div>

                            <div className="flex items-center gap-1.5">
                              {projectStages.map((stage) => {
                                const activeIndex = projectStages.indexOf(currentStage);
                                const stageIndex = projectStages.indexOf(stage);
                                const isReached = stageIndex <= activeIndex;
                                const isCurrent = stage === currentStage;

                                return (
                                  <div
                                    key={stage}
                                    title={stage}
                                    className={`h-2 flex-1 rounded-full transition ${
                                      isCurrent
                                        ? stageMeta.dotClass
                                        : isReached
                                          ? "bg-[#2E7D6B]/60"
                                          : "bg-slate-100"
                                    }`}
                                  />
                                );
                              })}
                            </div>
                          </div>

                          <div className="mt-5 flex flex-wrap justify-end gap-2">
                            <Link
                              href={`/projects/${project.id}`}
                              className="rounded-2xl border border-[#D9D2C3]/80 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-[#4F46E5] hover:text-[#4F46E5]"
                            >
                              Open Project →
                            </Link>

                            <button
                              type="button"
                              onClick={() => setProjectToDelete(project)}
                              className="rounded-2xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100"
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
          <div className="w-full max-w-lg rounded-2xl bg-white p-7 shadow-2xl">
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
                className={`${secondaryButtonClass} disabled:opacity-50`}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => deleteProject(projectToDelete)}
                disabled={isDeletingProject}
                className="rounded-2xl bg-red-600 px-5 py-3 font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
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
