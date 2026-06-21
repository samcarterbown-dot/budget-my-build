"use client";

import { useEffect, useMemo, useState } from "react";
import type { MouseEvent } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import AppNavbar from "../../../components/AppNavbar";

function getTextValue(value: any) {
  return String(value || "").trim();
}

function getRoomTypeText(room: any) {
  return `${getTextValue(room.room_type)} ${getTextValue(room.room_name)}`.toLowerCase();
}

function getFeatureText(feature: any) {
  return `${getTextValue(feature.feature_type)} ${getTextValue(feature.feature_name)}`.toLowerCase();
}

function getDisplaySqm(room: any) {
  return Number(room.estimated_sqm || room.estimate?.assumed_sqm || 0);
}


function getStageMeta(stage: string) {
  const stageValue = String(stage || "").trim();

  const stageMap: Record<
    string,
    { label: string; bar: string; softBg: string; text: string; border: string }
  > = {
    Idea: {
      label: "Idea",
      bar: "bg-slate-400",
      softBg: "bg-slate-50",
      text: "text-slate-700",
      border: "border-slate-200",
    },
    Feasibility: {
      label: "Feasibility",
      bar: "bg-sky-500",
      softBg: "bg-sky-50",
      text: "text-sky-700",
      border: "border-sky-200",
    },
    Planning: {
      label: "Planning",
      bar: "bg-[#4F46E5]",
      softBg: "bg-[#F8F7FF]",
      text: "text-[#4F46E5]",
      border: "border-[#4F46E5]/20",
    },
    Design: {
      label: "Design",
      bar: "bg-violet-500",
      softBg: "bg-violet-50",
      text: "text-violet-700",
      border: "border-violet-200",
    },
    Approvals: {
      label: "Approvals",
      bar: "bg-amber-500",
      softBg: "bg-amber-50",
      text: "text-amber-800",
      border: "border-amber-200",
    },
    Quotes: {
      label: "Quotes",
      bar: "bg-orange-500",
      softBg: "bg-orange-50",
      text: "text-orange-700",
      border: "border-orange-200",
    },
    Construction: {
      label: "Construction",
      bar: "bg-[#2E7D6B]",
      softBg: "bg-emerald-50",
      text: "text-[#2E7D6B]",
      border: "border-emerald-200",
    },
    Completed: {
      label: "Completed",
      bar: "bg-green-500",
      softBg: "bg-green-50",
      text: "text-green-700",
      border: "border-green-200",
    },
  };

  return (
    stageMap[stageValue] || {
      label: stageValue || "Not set",
      bar: "bg-slate-300",
      softBg: "bg-slate-50",
      text: "text-slate-700",
      border: "border-slate-200",
    }
  );
}

function getStageProgressPercent(stage: string, stages: string[]) {
  const index = stages.indexOf(stage);
  if (index === -1) return 0;
  return Math.round(((index + 1) / stages.length) * 100);
}

function countMatchingRooms(rooms: any[], matcher: (value: string) => boolean) {
  return rooms.filter((room) => matcher(getRoomTypeText(room))).length;
}

function buildProjectSummary(project: any, rooms: any[], features: any[]) {
  const bedroomCount = countMatchingRooms(
    rooms,
    (value) => value.includes("bed") && !value.includes("bath"),
  );

  const bathroomCount = countMatchingRooms(
    rooms,
    (value) =>
      value.includes("bath") ||
      value.includes("ensuite") ||
      value.includes("ens ") ||
      value.endsWith("ens"),
  );

  const kitchenCount = countMatchingRooms(rooms, (value) =>
    value.includes("kitchen"),
  );

  const livingCount = countMatchingRooms(
    rooms,
    (value) => value.includes("living") || value.includes("tv room"),
  );

  const diningCount = countMatchingRooms(rooms, (value) =>
    value.includes("dining"),
  );

  const laundryCount = countMatchingRooms(rooms, (value) =>
    value.includes("laundry"),
  );

  const totalSqm = rooms.reduce(
    (sum: number, room: any) => sum + getDisplaySqm(room),
    0,
  );

  const featureText = features.map(getFeatureText).join(" ");
  const featureHighlights: string[] = [];

  if (featureText.includes("pool")) featureHighlights.push("pool");
  if (
    featureText.includes("deck") ||
    featureText.includes("alfresco") ||
    featureText.includes("balcony")
  ) {
    featureHighlights.push("outdoor living area");
  }
  if (featureText.includes("solar")) featureHighlights.push("solar");
  if (featureText.includes("stair")) featureHighlights.push("stairs");
  if (featureText.includes("garage") || featureText.includes("carport")) {
    featureHighlights.push("garage/carport");
  }
  if (featureText.includes("robe")) featureHighlights.push("robes/joinery");

  const roomHighlights: string[] = [];
  if (kitchenCount > 0) roomHighlights.push("kitchen");
  if (livingCount > 0) roomHighlights.push("living area");
  if (diningCount > 0) roomHighlights.push("dining area");
  if (laundryCount > 0) roomHighlights.push("laundry");

  const projectType = getTextValue(project?.project_type) || "build";
  const location = [project?.suburb, project?.state].filter(Boolean).join(", ");

  const headlineParts = [];

  if (bedroomCount > 0 || bathroomCount > 0) {
    headlineParts.push(`${bedroomCount || 0} bed / ${bathroomCount || 0} bath`);
  }

  headlineParts.push(projectType.toLowerCase());

  if (featureHighlights.length > 0) {
    headlineParts.push(`with ${featureHighlights.slice(0, 3).join(", ")}`);
  }

  const headline = headlineParts.join(" ");

  return {
    headline: headline.charAt(0).toUpperCase() + headline.slice(1),
    location,
    bedroomCount,
    bathroomCount,
    kitchenCount,
    livingCount,
    diningCount,
    laundryCount,
    roomCount: rooms.length,
    featureCount: features.length,
    totalSqm,
    roomHighlights,
    featureHighlights,
  };
}

const roomCostGroupOrder = [
  "Bedrooms",
  "Bathrooms & Ensuites",
  "Kitchen",
  "Living & Dining",
  "Laundry",
  "Storage & Robes",
  "Circulation",
  "Other Rooms",
];

function getRoomCostGroupName(room: any) {
  const value = getRoomTypeText(room);

  if (value.includes("bed") && !value.includes("bath")) return "Bedrooms";
  if (
    value.includes("bath") ||
    value.includes("ensuite") ||
    value.includes("ens ") ||
    value.endsWith("ens")
  ) {
    return "Bathrooms & Ensuites";
  }
  if (value.includes("kitchen")) return "Kitchen";
  if (
    value.includes("living") ||
    value.includes("dining") ||
    value.includes("tv room") ||
    value.includes("lounge")
  ) {
    return "Living & Dining";
  }
  if (value.includes("laundry")) return "Laundry";
  if (
    value.includes("wir") ||
    value.includes("robe") ||
    value.includes("pantry") ||
    value.includes("storage")
  ) {
    return "Storage & Robes";
  }
  if (value.includes("hall") || value.includes("corridor")) {
    return "Circulation";
  }

  return "Other Rooms";
}

function groupRoomsForCostBreakdown(rooms: any[]) {
  const groups: Record<string, any[]> = {};

  rooms.forEach((room) => {
    const groupName = getRoomCostGroupName(room);
    if (!groups[groupName]) groups[groupName] = [];
    groups[groupName].push(room);
  });

  return Object.entries(groups)
    .map(([name, groupRooms]) => ({
      name,
      rooms: groupRooms.sort((a, b) =>
        getTextValue(a.room_name).localeCompare(getTextValue(b.room_name)),
      ),
      low: groupRooms.reduce(
        (sum, room) => sum + Number(room.estimate?.low || room.low || 0),
        0,
      ),
      high: groupRooms.reduce(
        (sum, room) => sum + Number(room.estimate?.high || room.high || 0),
        0,
      ),
      sqm: groupRooms.reduce((sum, room) => sum + getDisplaySqm(room), 0),
    }))
    .sort(
      (a, b) =>
        roomCostGroupOrder.indexOf(a.name) - roomCostGroupOrder.indexOf(b.name),
    );
}

export default function ProjectPage() {
  const params = useParams();
  const searchParams = useSearchParams();

  const [project, setProject] = useState<any>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [files, setFiles] = useState<any[]>([]);
  const [categoryAttachments, setCategoryAttachments] = useState<any[]>([]);
  const [activeAttachmentCategoryId, setActiveAttachmentCategoryId] = useState<string | null>(null);
  const [uploadingCategoryAttachmentId, setUploadingCategoryAttachmentId] = useState<string | null>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [planPages, setPlanPages] = useState<any[]>([]);
  const [planRooms, setPlanRooms] = useState<any[]>([]);
  const [planFeatures, setPlanFeatures] = useState<any[]>([]);
  const [newFeatureType, setNewFeatureType] = useState("Door");
  const [newFeatureName, setNewFeatureName] = useState("");
  const [newFeatureQuantity, setNewFeatureQuantity] = useState("1");
  const [newFeatureLengthM, setNewFeatureLengthM] = useState("");
  const [newFeatureWidthM, setNewFeatureWidthM] = useState("");
  const [newFeatureAreaSqm, setNewFeatureAreaSqm] = useState("");
  const [newFeatureNotes, setNewFeatureNotes] = useState("");
  const [customFeatureOptions, setCustomFeatureOptions] = useState<string[]>(
    [],
  );
  const [editingFeatureGroupId, setEditingFeatureGroupId] = useState<
    string | null
  >(null);
  const [editFeatureType, setEditFeatureType] = useState("");
  const [editFeatureName, setEditFeatureName] = useState("");
  const [editFeatureQuantity, setEditFeatureQuantity] = useState("1");
  const [editFeatureLengthM, setEditFeatureLengthM] = useState("");
  const [editFeatureWidthM, setEditFeatureWidthM] = useState("");
  const [editFeatureAreaSqm, setEditFeatureAreaSqm] = useState("");
  const [editFeatureNotes, setEditFeatureNotes] = useState("");
  const [activeRoomPage, setActiveRoomPage] = useState<any | null>(null);
  const [newRoomName, setNewRoomName] = useState("");
  const [newRoomType, setNewRoomType] = useState("");
  const [newRoomLengthM, setNewRoomLengthM] = useState("");
  const [newRoomWidthM, setNewRoomWidthM] = useState("");
  const [newRoomCeilingHeight, setNewRoomCeilingHeight] = useState("");
  const [newRoomRenovationType, setNewRoomRenovationType] =
    useState("renovation");
  const [newRoomFloorLevel, setNewRoomFloorLevel] = useState("");
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [editRoomName, setEditRoomName] = useState("");
  const [editRoomType, setEditRoomType] = useState("");
  const [editRoomLengthM, setEditRoomLengthM] = useState("");
  const [editRoomWidthM, setEditRoomWidthM] = useState("");
  const [editRoomCeilingHeight, setEditRoomCeilingHeight] = useState("");
  const [editRoomRenovationType, setEditRoomRenovationType] =
    useState("renovation");
  const [activeRoomPageUrl, setActiveRoomPageUrl] = useState("");
  const [isDrawingRoom, setIsDrawingRoom] = useState(false);
  const [roomDrawStart, setRoomDrawStart] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [draftRoomBox, setDraftRoomBox] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const [scaleMode, setScaleMode] = useState(false);
  const [scaleDrawStart, setScaleDrawStart] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [draftScaleLine, setDraftScaleLine] = useState<{
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  } | null>(null);
  const [scaleRealMm, setScaleRealMm] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [productCategoryFilter, setProductCategoryFilter] = useState("all");
  const [expandedBudgetCategoryId, setExpandedBudgetCategoryId] = useState<string | null>(null);
  const [budgetSearch, setBudgetSearch] = useState("");
  const [showItemModal, setShowItemModal] = useState(false);
  const productStatuses = ["Planned", "Quoted", "Purchased"];

  const [isEditingProject, setIsEditingProject] = useState(false);

  const [editProjectType, setEditProjectType] = useState("");
  const [editSuburb, setEditSuburb] = useState("");
  const [editStateValue, setEditStateValue] = useState("");
  const [editPropertyType, setEditPropertyType] = useState("");
  const [editBudgetTarget, setEditBudgetTarget] = useState("");
  const [editPostcode, setEditPostcode] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editBuildBudget, setEditBuildBudget] = useState("");
  const [editProductBudget, setEditProductBudget] = useState("");
  const [estimateStatus, setEstimateStatus] = useState<
    "not_started" | "current" | "outdated"
  >("not_started");
  const [editProjectStage, setEditProjectStage] = useState("");
  const [editExpectedStartDate, setEditExpectedStartDate] = useState("");
  const [editNotes, setEditNotes] = useState("");

  const [editQualityLevel, setEditQualityLevel] = useState("mid");
  const [editSiteComplexity, setEditSiteComplexity] = useState("standard");
  const [editAccessDifficulty, setEditAccessDifficulty] = useState("normal");
  const [editSlopeLevel, setEditSlopeLevel] = useState("flat");
  const [editGlazingLevel, setEditGlazingLevel] = useState("standard");
  const [editCeilingHeightLevel, setEditCeilingHeightLevel] =
    useState("standard");
  const [editWetAreaLevel, setEditWetAreaLevel] = useState("standard");
  const [editContingencyLevel, setEditContingencyLevel] = useState("standard");

  const [latestEstimate, setLatestEstimate] = useState<any | null>(null);
  const [isGeneratingEstimate, setIsGeneratingEstimate] = useState(false);

  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryBudget, setNewCategoryBudget] = useState("");
  const [showQuickCategoryModal, setShowQuickCategoryModal] = useState(false);
  const [quickCategoryName, setQuickCategoryName] = useState("");
  const [quickCategoryBudget, setQuickCategoryBudget] = useState("");

  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(
    null,
  );
  const [editCategoryBudget, setEditCategoryBudget] = useState("");

  const [itemName, setItemName] = useState("");
  const [estimatedCost, setEstimatedCost] = useState("");
  const [supplierUrl, setSupplierUrl] = useState("");
  const [productNumber, setProductNumber] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [productImageUrl, setProductImageUrl] = useState("");
  const [scrapedDescription, setScrapedDescription] = useState("");
  const [purchaseType, setPurchaseType] = useState("Owner purchase");
  const [tradeDiscountPercent, setTradeDiscountPercent] = useState("");
  const [depositPaid, setDepositPaid] = useState("");
  const [itemNotes, setItemNotes] = useState("");
  const [productStatus, setProductStatus] = useState("Planned");
  const [isScrapingProduct, setIsScrapingProduct] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedFeatureId, setSelectedFeatureId] = useState("");
  const [selectedFeatureName, setSelectedFeatureName] = useState("");
  const [customBudgetFeatureName, setCustomBudgetFeatureName] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [priceUnit, setPriceUnit] = useState("item");
  const [boxCoverageSqm, setBoxCoverageSqm] = useState("");
  const [pricePerSqm, setPricePerSqm] = useState("");
  const [pricePerBox, setPricePerBox] = useState("");
  const [planUploadFile, setPlanUploadFile] = useState<File | null>(null);
  const [uploadingPlan, setUploadingPlan] = useState(false);
  const [processingPlanId, setProcessingPlanId] = useState<string | null>(null);
  const [suggestingRoomsPageId, setSuggestingRoomsPageId] = useState<
    string | null
  >(null);
  const [planPagesToProcess, setPlanPagesToProcess] = useState<
    Record<string, string>
  >({});

  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [itemFormPulse, setItemFormPulse] = useState(false);
  const [useSqmPricing, setUseSqmPricing] = useState(false);
  const [sqm, setSqm] = useState("");
  const [costPerSqm, setCostPerSqm] = useState("");
  const [includeWastage, setIncludeWastage] = useState(true);
  const [quantityMethod, setQuantityMethod] = useState<"manual" | "rooms">(
    "manual",
  );
  const [selectedFlooringRoomIds, setSelectedFlooringRoomIds] = useState<
    string[]
  >([]);
  const [flooringWastagePercent, setFlooringWastagePercent] = useState("10");

  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [noticeModal, setNoticeModal] = useState<{
    title: string;
    message: string;
    tone?: "info" | "success" | "warning" | "error";
  } | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    title: string;
    message: string;
    tone?: "warning" | "error";
    onConfirm: () => void;
    onCancel: () => void;
  } | null>(null);

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

  const defaultBuildBudgetPercentage = 0.8;
  const defaultProductBudgetPercentage = 0.2;

  const costProfileOptions = {
    quality_level: [
      { value: "budget", label: "Budget" },
      { value: "mid", label: "Mid-range" },
      { value: "high", label: "High-end" },
      { value: "luxury", label: "Luxury" },
    ],
    site_complexity: [
      { value: "simple", label: "Simple" },
      { value: "standard", label: "Standard" },
      { value: "complex", label: "Complex" },
    ],
    access_difficulty: [
      { value: "easy", label: "Easy" },
      { value: "normal", label: "Normal" },
      { value: "difficult", label: "Difficult" },
    ],
    slope_level: [
      { value: "flat", label: "Flat" },
      { value: "slight", label: "Slight" },
      { value: "moderate", label: "Moderate" },
      { value: "steep", label: "Steep" },
    ],
    glazing_level: [
      { value: "standard", label: "Standard" },
      { value: "high", label: "High" },
      { value: "very_high", label: "Very high" },
    ],
    ceiling_height_level: [
      { value: "standard", label: "Standard" },
      { value: "high", label: "High" },
      { value: "raked", label: "Raked" },
      { value: "mixed", label: "Mixed" },
    ],
    wet_area_level: [
      { value: "standard", label: "Standard" },
      { value: "multiple", label: "Multiple wet areas" },
      { value: "high_end", label: "High-end wet areas" },
    ],
    contingency_level: [
      { value: "low", label: "Low" },
      { value: "standard", label: "Standard" },
      { value: "high", label: "High" },
    ],
  };

  const roomTypes = [
    "Kitchen",
    "Living",
    "Dining",
    "Bedroom",
    "Bathroom",
    "Ensuite",
    "Laundry",
    "WIR",
    "Pantry",
    "Mudroom",
    "Hallway",
    "Study",
    "Other",
  ];

  const defaultFeatureTypes = [
    "Door",
    "Window",
    "Sliding Door",
    "Large Sliding Door",
    "Cavity Sliding Door",
    "Entry Door",
    "Internal Door",
    "External Door",
    "Skylight",
    "Staircase",
    "Void",
    "Deck",
    "Balcony",
    "Alfresco",
    "Pool",
    "Pool Fencing",
    "Garage",
    "Carport",
    "Solar",
    "Pergola",
    "Fireplace",
    "Retaining Wall",
    "Large Glazing",
    "Robe",
    "Other",
  ];

  const featureTypes = [
    ...new Set([...defaultFeatureTypes, ...customFeatureOptions]),
  ].sort((a, b) => {
    if (a === "Other") return 1;
    if (b === "Other") return -1;
    return a.localeCompare(b);
  });

  const handlePlanUpload = async () => {
    if (!planUploadFile || !project) return;

    const maxPdfSize = 10 * 1024 * 1024; // 10MB

    if (
      planUploadFile.type === "application/pdf" &&
      planUploadFile.size > maxPdfSize
    ) {
      showNotice(
        "This PDF is larger than 10MB. Please compress the PDF before uploading.",
      );
      return;
    }

    try {
      setUploadingPlan(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        showNotice("You must be logged in to upload plans.");
        return;
      }

      const fileExt = planUploadFile.name.split(".").pop();
      const filePath = `${project.id}/${Date.now()}-${planUploadFile.name}`;

      const { error: uploadError } = await supabase.storage
        .from("project-plans")
        .upload(filePath, planUploadFile);

      if (uploadError) throw uploadError;

      const { error: insertError } = await supabase
        .from("project_plans")
        .insert({
          project_id: project.id,
          user_id: user.id,
          original_filename: planUploadFile.name,
          display_name: planUploadFile.name.replace(/\.[^/.]+$/, ""),
          storage_path: filePath,
          file_type: fileExt,
          status: "uploaded",
        });

      if (insertError) throw insertError;

      setPlanUploadFile(null);
      await loadPlans();
      showNotice("Plan uploaded successfully!");
    } catch (error) {
      console.error("Plan upload failed:", error);
      showNotice("Plan upload failed.");
    } finally {
      setUploadingPlan(false);
    }
  };

  function formatMoney(value: number) {
    return Number(value || 0).toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  }

  function parseMoney(value: any) {
    return Number(String(value ?? "").replace(/[^0-9.-]/g, "")) || 0;
  }

  function formatMoneyInput(value: string) {
    const numericValue = parseMoney(value);
    if (!numericValue) return "";
    return formatMoney(numericValue);
  }

  function getDiscountedItemTotal(item: any) {
    const grossTotal = calculateItemTotal(item);
    const discountPercent = Number(item.trade_discount_percent || 0);
    if (!discountPercent || discountPercent <= 0) return grossTotal;

    const cappedDiscount = Math.min(Math.max(discountPercent, 0), 100);
    return grossTotal * (1 - cappedDiscount / 100);
  }

  function getItemBalanceRemaining(item: any) {
    return Math.max(getDiscountedItemTotal(item) - Number(item.deposit_paid || 0), 0);
  }

  function showNotice(
    message: string,
    title = "Before You Continue",
    tone: "info" | "success" | "warning" | "error" = "info",
  ) {
    setNoticeModal({ title, message, tone });
  }

  function askConfirm(
    message: string,
    title = "Please confirm",
    tone: "warning" | "error" = "warning",
  ) {
    return new Promise<boolean>((resolve) => {
      setConfirmModal({
        title,
        message,
        tone,
        onConfirm: () => {
          setConfirmModal(null);
          resolve(true);
        },
        onCancel: () => {
          setConfirmModal(null);
          resolve(false);
        },
      });
    });
  }

  function isValidOptionalUrl(value: string) {
    const trimmed = value.trim();
    if (!trimmed) return true;

    try {
      const parsed = new URL(trimmed);
      return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
      return false;
    }
  }

  function calculateSqmTotal() {
    const base = Number(sqm || 0) * parseMoney(costPerSqm || 0);
    return includeWastage ? base * 1.1 : base;
  }

  function getFlooringSelectedAreaSqm() {
    return planRooms
      .filter((room) => selectedFlooringRoomIds.includes(room.id))
      .reduce((sum, room) => sum + getDisplaySqm(room), 0);
  }

  function getFlooringRecommendedSqm() {
    const selectedArea = getFlooringSelectedAreaSqm();
    const wastage = Number(flooringWastagePercent || 0);
    const recommended = selectedArea * (1 + wastage / 100);

    return Math.ceil(recommended * 10) / 10;
  }

  function getFlooringRecommendedBoxes() {
    const coverage = Number(boxCoverageSqm || 0);
    const recommendedSqm = getFlooringRecommendedSqm();

    if (!coverage || coverage <= 0 || !recommendedSqm) return 0;

    return Math.ceil(recommendedSqm / coverage);
  }

  function toggleFlooringRoom(roomId: string) {
    setSelectedFlooringRoomIds((current) =>
      current.includes(roomId)
        ? current.filter((id) => id !== roomId)
        : [...current, roomId],
    );
  }

  function useFlooringRecommendation() {
    const recommendedSqm = getFlooringRecommendedSqm();

    if (!recommendedSqm || recommendedSqm <= 0) {
      showNotice(
        "Select at least one room with an area before using the recommendation.",
      );
      return;
    }

    setUseSqmPricing(true);
    setSqm(String(recommendedSqm));
    setIncludeWastage(false);
    setQuantity("1");

    const boxes = getFlooringRecommendedBoxes();
    if (boxes > 0 && priceUnit === "item") {
      setPriceUnit("box");
    }
  }

  async function saveFlooringRoomLinks(itemId: string) {
    if (!itemId) return;

    try {
      await supabase
        .from("project_item_rooms")
        .delete()
        .eq("project_item_id", itemId);

      if (quantityMethod !== "rooms" || selectedFlooringRoomIds.length === 0) {
        return;
      }

      const rows = selectedFlooringRoomIds.map((roomId) => ({
        project_item_id: itemId,
        room_id: roomId,
      }));

      await supabase.from("project_item_rooms").insert(rows);
    } catch (error) {
      console.warn("Could not save flooring room links:", error);
    }
  }

  async function loadFlooringRoomLinks(itemId: string) {
    try {
      const { data, error } = await supabase
        .from("project_item_rooms")
        .select("room_id")
        .eq("project_item_id", itemId);

      if (error) throw error;

      const roomIds = (data || [])
        .map((row: any) => row.room_id)
        .filter(Boolean);

      setSelectedFlooringRoomIds(roomIds);
      setQuantityMethod(roomIds.length > 0 ? "rooms" : "manual");
    } catch (error) {
      console.warn("Could not load flooring room links:", error);
      setSelectedFlooringRoomIds([]);
      setQuantityMethod("manual");
    }
  }

  function calculateItemTotal(item: any) {
    const quantity = Number(item.quantity || 1);

    if (item.use_sqm_pricing) {
      const base = Number(item.sqm || 0) * Number(item.cost_per_sqm || 0);
      const total = item.include_wastage ? base * 1.1 : base;

      return total * quantity;
    }

    return Number(item.estimated_cost || 0) * quantity;
  }

  function resetItemForm() {
    setEditingItemId(null);
    setItemName("");
    setEstimatedCost("");
    setSupplierUrl("");
    setProductNumber("");
    setSupplierName("");
    setProductImageUrl("");
    setScrapedDescription("");
    setPurchaseType("Owner purchase");
    setTradeDiscountPercent("");
    setDepositPaid("");
    setItemNotes("");
    setProductStatus("Planned");
    setSelectedCategory("");
    setSelectedFeatureId("");
    setSelectedFeatureName("");
    setCustomBudgetFeatureName("");
    setUseSqmPricing(false);
    setSqm("");
    setCostPerSqm("");
    setIncludeWastage(true);
    setQuantityMethod("manual");
    setSelectedFlooringRoomIds([]);
    setFlooringWastagePercent("10");
    setQuantity("1");
    setPriceUnit("item");
    setBoxCoverageSqm("");
    setPricePerSqm("");
    setPricePerBox("");
  }

  async function loadProject() {
    const { data } = await supabase
      .from("projects")
      .select("*")
      .eq("id", params.id)
      .single();

    if (data) {
      setProject(data);
      setEditProjectType(data.project_type || "");
      setEditSuburb(data.suburb || "");
      setEditStateValue(data.state || "");
      setEditPropertyType(data.property_type || "");
      const totalBudget = Number(data.budget_target || 0);
      const savedBuildBudget = Number(data.build_budget || 0);
      const savedProductBudget = Number(data.product_budget || 0);
      const hasSavedBuildBudget = savedBuildBudget > 0;
      const hasSavedProductBudget = savedProductBudget > 0;
      const defaultBuildBudget = Math.round(
        totalBudget * defaultBuildBudgetPercentage,
      );
      const defaultProductBudget = Math.max(
        totalBudget - defaultBuildBudget,
        0,
      );

      setEditBudgetTarget(totalBudget ? String(totalBudget) : "");
      setEditPostcode(data.postcode || "");
      setEditAddress(data.address || "");
      setEditBuildBudget(
        hasSavedBuildBudget
          ? String(savedBuildBudget)
          : totalBudget > 0 && !hasSavedProductBudget
            ? String(defaultBuildBudget)
            : totalBudget > 0 && hasSavedProductBudget
              ? String(Math.max(totalBudget - savedProductBudget, 0))
              : "",
      );
      setEditProductBudget(
        hasSavedProductBudget
          ? String(savedProductBudget)
          : totalBudget > 0 && !hasSavedBuildBudget
            ? String(defaultProductBudget)
            : totalBudget > 0 && hasSavedBuildBudget
              ? String(Math.max(totalBudget - savedBuildBudget, 0))
              : "",
      );
      setEstimateStatus(data.estimate_status || "not_started");
      setEditProjectStage(data.project_stage || "");
      setEditExpectedStartDate(data.expected_start_date || "");
      setEditNotes(data.notes || "");
      setEditQualityLevel(data.quality_level || "mid");
      setEditSiteComplexity(data.site_complexity || "standard");
      setEditAccessDifficulty(data.access_difficulty || "normal");
      setEditSlopeLevel(data.slope_level || "flat");
      setEditGlazingLevel(data.glazing_level || "standard");
      setEditCeilingHeightLevel(data.ceiling_height_level || "standard");
      setEditWetAreaLevel(data.wet_area_level || "standard");
      setEditContingencyLevel(data.contingency_level || "standard");
    }
  }

  function hasBudgetValue(value: string) {
    return value.trim() !== "" && parseMoney(value) > 0;
  }

  function getDefaultBudgetSplit(total: number) {
    const build = Math.round(total * defaultBuildBudgetPercentage);
    return {
      build,
      products: Math.max(total - build, 0),
    };
  }

  function handleTotalBudgetChange(value: string) {
    setEditBudgetTarget(value);

    const total = parseMoney(value);
    const hasBuild = hasBudgetValue(editBuildBudget);
    const hasProducts = hasBudgetValue(editProductBudget);

    if (total <= 0) {
      if (!hasBuild) setEditBuildBudget("");
      if (!hasProducts) setEditProductBudget("");
      return;
    }

    if (!hasBuild && !hasProducts) {
      const split = getDefaultBudgetSplit(total);
      setEditBuildBudget(String(split.build));
      setEditProductBudget(String(split.products));
      return;
    }

    if (hasBuild) {
      const build = parseMoney(editBuildBudget);
      setEditProductBudget(String(Math.max(total - build, 0)));
      return;
    }

    const products = parseMoney(editProductBudget);
    setEditBuildBudget(String(Math.max(total - products, 0)));
  }

  function handleBuildBudgetChange(value: string) {
    setEditBuildBudget(value);

    const build = parseMoney(value);
    const products = parseMoney(editProductBudget);

    setEditBudgetTarget(String(build + products));
  }

  function handleProductBudgetChange(value: string) {
    setEditProductBudget(value);

    const build = parseMoney(editBuildBudget);
    const products = parseMoney(value);

    setEditBudgetTarget(String(build + products));
  }

  async function saveProjectDetails() {
    const enteredTotalBudgetValue = parseMoney(editBudgetTarget);
    let buildBudgetValue = parseMoney(editBuildBudget);
    let productBudgetValue = parseMoney(editProductBudget);

    if (
      enteredTotalBudgetValue > 0 &&
      !buildBudgetValue &&
      !productBudgetValue
    ) {
      const split = getDefaultBudgetSplit(enteredTotalBudgetValue);
      buildBudgetValue = split.build;
      productBudgetValue = split.products;
    } else if (
      enteredTotalBudgetValue > 0 &&
      buildBudgetValue &&
      !productBudgetValue
    ) {
      productBudgetValue = Math.max(
        enteredTotalBudgetValue - buildBudgetValue,
        0,
      );
    } else if (
      enteredTotalBudgetValue > 0 &&
      !buildBudgetValue &&
      productBudgetValue
    ) {
      buildBudgetValue = Math.max(
        enteredTotalBudgetValue - productBudgetValue,
        0,
      );
    }

    const totalBudgetValue = buildBudgetValue + productBudgetValue;

    const { error } = await supabase
      .from("projects")
      .update({
        project_type: editProjectType,
        suburb: editSuburb,
        state: editStateValue,
        property_type: editPropertyType,
        budget_target: totalBudgetValue,
        postcode: editPostcode.trim() || null,
        address: editAddress.trim() || null,
        build_budget: buildBudgetValue,
        product_budget: productBudgetValue,
        estimate_status: latestEstimate ? "outdated" : "not_started",
        project_stage: editProjectStage,
        expected_start_date: editExpectedStartDate || null,
        notes: editNotes,
      })
      .eq("id", params.id);

    if (error) {
      showNotice(error.message);
      return;
    }

    setEditBudgetTarget(String(totalBudgetValue));
    setEditBuildBudget(String(buildBudgetValue));
    setEditProductBudget(String(productBudgetValue));
    setEstimateStatus(latestEstimate ? "outdated" : "not_started");
    setIsEditingProject(false);
    loadProject();
  }

  async function saveCostProfile() {
    const { error } = await supabase
      .from("projects")
      .update({
        quality_level: editQualityLevel,
        site_complexity: editSiteComplexity,
        access_difficulty: editAccessDifficulty,
        slope_level: editSlopeLevel,
        glazing_level: editGlazingLevel,
        ceiling_height_level: editCeilingHeightLevel,
        wet_area_level: editWetAreaLevel,
        contingency_level: editContingencyLevel,
      })
      .eq("id", params.id);

    if (error) {
      showNotice(error.message);
      return;
    }

    await loadProject();
    showNotice("Cost profile saved.");
  }

  async function markEstimateOutdated() {
    if (!latestEstimate) {
      setEstimateStatus("not_started");
      return;
    }

    setEstimateStatus("outdated");

    await supabase
      .from("projects")
      .update({ estimate_status: "outdated" })
      .eq("id", params.id);
  }

  async function markEstimateCurrent() {
    setEstimateStatus("current");

    await supabase
      .from("projects")
      .update({ estimate_status: "current" })
      .eq("id", params.id);
  }

  async function loadLatestEstimate() {
    const { data, error } = await supabase
      .from("project_estimates")
      .select("*")
      .eq("project_id", params.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("Error loading latest estimate:", error);
      return;
    }

    setLatestEstimate(data || null);
  }

  async function generateEstimate() {
    try {
      setIsGeneratingEstimate(true);

      const response = await fetch("/api/generate-estimate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          projectId: params.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate estimate");
      }

      setLatestEstimate(data.estimate);
      await markEstimateCurrent();
      await loadLatestEstimate();
    } catch (error: any) {
      showNotice(error.message || "Failed to generate estimate.");
    } finally {
      setIsGeneratingEstimate(false);
    }
  }

  async function loadCategories() {
    const { data } = await supabase
      .from("project_categories")
      .select("*")
      .eq("project_id", params.id)
      .order("name");

    const sortedCategories = [...(data || [])].sort((a: any, b: any) => {
      if (a.name === "Other") return 1;
      if (b.name === "Other") return -1;
      return String(a.name || "").localeCompare(String(b.name || ""));
    });

    setCategories(sortedCategories);
  }

  async function loadItems() {
    const { data } = await supabase
      .from("project_items")
      .select("*")
      .eq("project_id", params.id);

    setItems(data || []);
  }

  async function loadCategoryAttachments() {
    const { data, error } = await supabase
      .from("project_category_attachments")
      .select("*")
      .eq("project_id", params.id)
      .order("uploaded_at", { ascending: false });

    if (error) {
      console.error("Failed to load category attachments:", error);
      return;
    }

    setCategoryAttachments(data || []);
  }

  function getCategoryAttachments(categoryId: string) {
    return categoryAttachments.filter((attachment) => attachment.category_id === categoryId);
  }

  async function uploadCategoryAttachment(category: any, file: File | null) {
    if (!file || !project) return;

    const maxFileSize = 25 * 1024 * 1024;
    if (file.size > maxFileSize) {
      showNotice("Attachments must be 25MB or smaller.", "Attachment too large", "warning");
      return;
    }

    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/webp",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
    ];

    if (file.type && !allowedTypes.includes(file.type)) {
      showNotice("Please upload a PDF, image, Word document or Excel spreadsheet.", "Unsupported attachment", "warning");
      return;
    }

    const { data: userData, error: userError } = await supabase.auth.getUser();
    const user = userData?.user;

    if (userError || !user) {
      showNotice("You must be logged in to upload attachments.", "Login required", "warning");
      return;
    }

    try {
      setUploadingCategoryAttachmentId(category.id);

      const originalFileName = file.name;

      const safeFileName = originalFileName
        .replace(/[^a-zA-Z0-9._-]/g, "_")
        .replace(/_+/g, "_")
        .replace(/^_+|_+$/g, "");

      const storedFileName = `${Date.now()}-${safeFileName || "attachment"}`;

      // This path is important for hardened Supabase Storage RLS:
      // storage.foldername(name)[1] must equal auth.uid().
      const filePath = `${user.id}/${params.id}/${category.id}/${storedFileName}`;

      console.log("Attachment upload debug", {
        bucket: "project-category-attachments",
        filePath,
        firstFolderShouldMatchAuthUid: user.id,
        projectId: params.id,
        categoryId: category.id,
        fileType: file.type,
        fileSize: file.size,
      });

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("project-category-attachments")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type || "application/octet-stream",
        });

      if (uploadError) {
        console.error("Supabase storage upload error details", {
          message: uploadError.message,
          name: uploadError.name,
          statusCode: (uploadError as any)?.statusCode,
          error: uploadError,
        });
        throw uploadError;
      }

      const { error: insertError } = await supabase
        .from("project_category_attachments")
        .insert({
          project_id: params.id,
          category_id: category.id,
          file_name: originalFileName,
          file_url: uploadData?.path || filePath,
          file_path: uploadData?.path || filePath,
        });

      if (insertError) {
        await supabase.storage.from("project-category-attachments").remove([filePath]);
        throw insertError;
      }

      await loadCategoryAttachments();
      showNotice("Attachment uploaded successfully.", "Attachment uploaded", "success");
    } catch (error: any) {
      console.error("Category attachment upload failed:", {
        message: error?.message,
        name: error?.name,
        statusCode: error?.statusCode,
        error,
      });

      showNotice(error?.message || "Attachment upload failed.", "Upload failed", "error");
    } finally {
      setUploadingCategoryAttachmentId(null);
    }
  }

  async function openCategoryAttachment(attachment: any) {
    const { data, error } = await supabase.storage
      .from("project-category-attachments")
      .createSignedUrl(attachment.file_path, 60);

    if (error) {
      showNotice(error.message, "Could not open attachment", "error");
      return;
    }

    window.open(data?.signedUrl, "_blank");
  }

  async function deleteCategoryAttachment(attachment: any) {
    const confirmed = await askConfirm(
      `Delete ${attachment.file_name}?\n\nThis cannot be undone.`,
      "Delete attachment",
      "error",
    );

    if (!confirmed) return;

    const { error: storageError } = await supabase.storage
      .from("project-category-attachments")
      .remove([attachment.file_path]);

    if (storageError) {
      showNotice(storageError.message, "Could not delete attachment", "error");
      return;
    }

    const { error } = await supabase
      .from("project_category_attachments")
      .delete()
      .eq("id", attachment.id);

    if (error) {
      showNotice(error.message, "Could not delete attachment", "error");
      return;
    }

    await loadCategoryAttachments();
  }

  async function loadFiles() {
    const { data } = await supabase
      .from("project_files")
      .select("*")
      .eq("project_id", params.id)
      .order("created_at", { ascending: false });

    const filesWithUrls = await Promise.all(
      (data || []).map(async (file) => {
        const { data: signedUrlData } = await supabase.storage
          .from("project-files")
          .createSignedUrl(file.file_path, 3600);

        return { ...file, signedUrl: signedUrlData?.signedUrl };
      }),
    );

    setFiles(filesWithUrls);
  }

  async function loadPlans() {
    const { data, error } = await supabase
      .from("project_plans")
      .select("*")
      .eq("project_id", params.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading plans:", error);
      showNotice(error.message);
      return;
    }

    setPlans((data || []).filter((plan: any) => plan.file_type !== "manual"));
  }

  async function openPlan(storagePath: string) {
    const { data, error } = await supabase.storage
      .from("project-plans")
      .createSignedUrl(storagePath, 60);

    if (error) {
      console.error("Error opening plan:", error);
      showNotice(error.message);
      return;
    }

    window.open(data?.signedUrl, "_blank");
  }

  async function loadPlanPages() {
    const { data, error } = await supabase
      .from("plan_pages")
      .select(
        "*, project_plans!inner(project_id, display_name, original_filename)",
      )
      .eq("project_plans.project_id", params.id)
      .order("page_number", { ascending: true });

    if (error) {
      console.error("Error loading plan pages:", error);
      showNotice(error.message);
      return;
    }

    const pagesWithUrls = await Promise.all(
      (data || []).map(async (page) => {
        if (!page.image_path || String(page.image_path).startsWith("manual:")) {
          return { ...page, signedUrl: null };
        }

        const { data: signedUrlData } = await supabase.storage
          .from("project-plans")
          .createSignedUrl(page.image_path, 3600);

        return { ...page, signedUrl: signedUrlData?.signedUrl };
      }),
    );

    setPlanPages(pagesWithUrls);

    if (!activeRoomPage && pagesWithUrls.length > 0) {
      const preferredPage =
        pagesWithUrls.find((page) => page.is_selected && !page.preview_only) ||
        pagesWithUrls.find((page) => !page.preview_only) ||
        pagesWithUrls[0];

      setActiveRoomPage(preferredPage);
      setActiveRoomPageUrl(preferredPage.signedUrl || "");
    }
  }

  async function updatePlanPage(pageId: string, updates: any) {
    const { error } = await supabase
      .from("plan_pages")
      .update(updates)
      .eq("id", pageId);

    if (error) {
      showNotice(error.message);
      return;
    }

    loadPlanPages();
  }

  async function deletePlanPage(pageId: string) {
    const confirmed = await askConfirm("Delete this plan page?");
    if (!confirmed) return;

    const { error } = await supabase
      .from("plan_pages")
      .delete()
      .eq("id", pageId);

    if (error) {
      showNotice(error.message);
      return;
    }

    if (activeRoomPage?.id === pageId) {
      setActiveRoomPage(null);
    }

    loadPlanPages();
    loadPlanRooms();
    loadPlanFeatures();
  }

  async function loadPlanRooms() {
    const { data, error } = await supabase
      .from("plan_rooms")
      .select(
        "*, plan_pages!inner(id, project_plan_id, floor_level, project_plans!inner(project_id, display_name, original_filename))",
      )
      .eq("plan_pages.project_plans.project_id", params.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading plan rooms:", error);
      showNotice(error.message);
      return;
    }

    setPlanRooms(data || []);
  }

  async function loadPlanFeatures() {
    const { data, error } = await supabase
      .from("plan_features")
      .select(
        "*, plan_pages!inner(id, page_number, floor_level, project_plans!inner(project_id, display_name, original_filename))",
      )
      .eq("project_id", params.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading plan features:", error);
      showNotice(error.message);
      return;
    }

    setPlanFeatures(data || []);

    const featureNames = (data || [])
      .map((feature: any) => feature.feature_name || feature.feature_type)
      .filter(Boolean);

    setCustomFeatureOptions((prev) => [...new Set([...prev, ...featureNames])]);
  }

  async function addPlanFeature() {
    if (!activeRoomPage) {
      showNotice("Select a plan page first.");
      return;
    }

    const featureDisplayName =
      newFeatureType === "Other" ? newFeatureName.trim() : newFeatureType;

    if (!featureDisplayName) {
      showNotice("Enter a feature name.");
      return;
    }

    const { error } = await supabase.from("plan_features").insert({
      plan_page_id: activeRoomPage.id,
      project_id: params.id,
      feature_type: newFeatureType || "Other",
      feature_name: featureDisplayName,
      quantity: Number(newFeatureQuantity) || 1,
      estimated_length_m: Number(newFeatureLengthM) || null,
      estimated_width_m: Number(newFeatureWidthM) || null,
      estimated_area_sqm: Number(newFeatureAreaSqm) || null,
      confidence: null,
      notes: newFeatureNotes || null,
    });

    if (error) {
      showNotice(error.message);
      return;
    }

    if (
      featureDisplayName &&
      !customFeatureOptions.includes(featureDisplayName)
    ) {
      setCustomFeatureOptions((prev) => [...prev, featureDisplayName]);
    }

    setNewFeatureType("Door");
    setNewFeatureName("");
    setNewFeatureQuantity("1");
    setNewFeatureLengthM("");
    setNewFeatureWidthM("");
    setNewFeatureAreaSqm("");
    setNewFeatureNotes("");
    await markEstimateOutdated();
    loadPlanFeatures();
  }

  function startEditFeatureGroup(featureGroup: any) {
    setEditingFeatureGroupId(featureGroup.id);
    setEditFeatureType(featureGroup.feature_type || "Other");
    setEditFeatureName(featureGroup.feature_name || "Feature");
    setEditFeatureQuantity(String(featureGroup.quantity || 1));
    setEditFeatureLengthM(
      featureGroup.estimated_length_m
        ? String(featureGroup.estimated_length_m)
        : "",
    );
    setEditFeatureWidthM(
      featureGroup.estimated_width_m
        ? String(featureGroup.estimated_width_m)
        : "",
    );
    setEditFeatureAreaSqm(
      featureGroup.estimated_area_sqm
        ? String(featureGroup.estimated_area_sqm)
        : "",
    );
    setEditFeatureNotes(featureGroup.notes || "");
  }

  function cancelEditFeatureGroup() {
    setEditingFeatureGroupId(null);
    setEditFeatureType("");
    setEditFeatureName("");
    setEditFeatureQuantity("1");
    setEditFeatureLengthM("");
    setEditFeatureWidthM("");
    setEditFeatureAreaSqm("");
    setEditFeatureNotes("");
  }

  async function saveFeatureGroup(featureGroup: any) {
    const featureDisplayName =
      editFeatureType === "Other" ? editFeatureName.trim() : editFeatureType;

    if (!featureDisplayName) {
      showNotice("Enter a feature name.");
      return;
    }

    const firstFeature = featureGroup.features?.[0];

    if (!firstFeature) {
      showNotice("No feature record found to update.");
      return;
    }

    const otherFeatureIds = (featureGroup.features || [])
      .slice(1)
      .map((feature: any) => feature.id);

    const { error: updateError } = await supabase
      .from("plan_features")
      .update({
        feature_type: editFeatureType || "Other",
        feature_name: featureDisplayName,
        quantity: Number(editFeatureQuantity) || 1,
        estimated_length_m: Number(editFeatureLengthM) || null,
        estimated_width_m: Number(editFeatureWidthM) || null,
        estimated_area_sqm: Number(editFeatureAreaSqm) || null,
        notes: editFeatureNotes || null,
      })
      .eq("id", firstFeature.id);

    if (updateError) {
      showNotice(updateError.message);
      return;
    }

    if (otherFeatureIds.length > 0) {
      const { error: deleteError } = await supabase
        .from("plan_features")
        .delete()
        .in("id", otherFeatureIds);

      if (deleteError) {
        showNotice(deleteError.message);
        return;
      }
    }

    if (
      featureDisplayName &&
      !customFeatureOptions.includes(featureDisplayName)
    ) {
      setCustomFeatureOptions((prev) => [...prev, featureDisplayName]);
    }

    cancelEditFeatureGroup();
    await markEstimateOutdated();
    loadPlanFeatures();
  }

  async function deletePlanFeature(featureId: string) {
    const confirmed = await askConfirm("Delete this detected feature?");
    if (!confirmed) return;

    const { error } = await supabase
      .from("plan_features")
      .delete()
      .eq("id", featureId);

    if (error) {
      showNotice(error.message);
      return;
    }

    await markEstimateOutdated();
    loadPlanFeatures();
  }

  async function getOrCreateRoomCategory(roomName: string) {
    const cleanName = roomName.trim();

    const { data: existingCategory, error: findError } = await supabase
      .from("project_categories")
      .select("*")
      .eq("project_id", params.id)
      .ilike("name", cleanName)
      .maybeSingle();

    if (findError) {
      showNotice(findError.message);
      return null;
    }

    if (existingCategory) {
      return existingCategory.id;
    }

    const { data: newCategory, error: createError } = await supabase
      .from("project_categories")
      .insert({
        project_id: params.id,
        name: cleanName,
        budget_amount: 0,
        is_default: false,
      })
      .select("id")
      .single();

    if (createError) {
      showNotice(createError.message);
      return null;
    }

    await loadCategories();
    return newCategory.id;
  }

  async function getOrCreateManualPlanPage() {
    const manualPlanName = "Manual room setup";

    const { data: existingPage, error: existingError } = await supabase
      .from("plan_pages")
      .select(
        "*, project_plans!inner(project_id, display_name, original_filename)",
      )
      .eq("project_plans.project_id", params.id)
      .eq("detected_type", "manual_entry")
      .maybeSingle();

    if (existingError) {
      showNotice(existingError.message);
      return null;
    }

    if (existingPage) return existingPage;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      showNotice("You must be logged in to add rooms.");
      return null;
    }

    const { data: manualPlan, error: planError } = await supabase
      .from("project_plans")
      .insert({
        project_id: params.id,
        user_id: user.id,
        original_filename: manualPlanName,
        display_name: manualPlanName,
        storage_path: `manual:${params.id}`,
        file_type: "manual",
        status: "manual",
      })
      .select("id, display_name, original_filename, project_id")
      .single();

    if (planError) {
      showNotice(planError.message);
      return null;
    }

    const { data: manualPage, error: pageError } = await supabase
      .from("plan_pages")
      .insert({
        project_plan_id: manualPlan.id,
        page_number: 1,
        image_path: `manual:${params.id}`,
        detected_type: "manual_entry",
        is_selected: true,
        preview_only: false,
        floor_level: "Manual Entry",
      })
      .select(
        "*, project_plans!inner(project_id, display_name, original_filename)",
      )
      .single();

    if (pageError) {
      showNotice(pageError.message);
      return null;
    }

    await loadPlans();
    await loadPlanPages();
    return manualPage;
  }

  async function startManualRoomSetup() {
    const manualPage = await getOrCreateManualPlanPage();
    if (!manualPage) return;

    setActiveRoomPage(manualPage);
    setActiveRoomPageUrl("");
    setDraftRoomBox(null);
  }

  async function addPlanRoom() {
    let roomPage = activeRoomPage;

    if (!roomPage) {
      roomPage = await getOrCreateManualPlanPage();
      if (!roomPage) return;
      setActiveRoomPage(roomPage);
      setActiveRoomPageUrl("");
    }

    if (!newRoomName.trim()) {
      showNotice("Enter a room name.");
      return;
    }

    const categoryId = await getOrCreateRoomCategory(newRoomName);

    if (!categoryId) return;

    const { error } = await supabase.from("plan_rooms").insert({
      plan_page_id: roomPage.id,
      category_id: categoryId,
      room_name: newRoomName,
      room_type: newRoomType || "Other",
      floor_level: roomPage.floor_level || newRoomFloorLevel || null,
      renovation_type: newRoomRenovationType,
      length_m: Number(newRoomLengthM) || null,
      width_m: Number(newRoomWidthM) || null,
      estimated_sqm:
        Number(newRoomLengthM) && Number(newRoomWidthM)
          ? Number(newRoomLengthM) * Number(newRoomWidthM)
          : null,
      ceiling_height: Number(newRoomCeilingHeight) || null,
      x: null,
      y: null,
      width: null,
      height: null,
    });

    if (error) {
      showNotice(error.message);
      return;
    }

    setNewRoomName("");
    setNewRoomType("");
    setNewRoomLengthM("");
    setNewRoomWidthM("");
    setNewRoomCeilingHeight("");
    setNewRoomRenovationType("renovation");
    setNewRoomFloorLevel("");
    setDraftRoomBox(null);
    await markEstimateOutdated();
    loadPlanRooms();
    loadCategories();
  }

  function startEditPlanRoom(room: any) {
    setEditingRoomId(room.id);
    setEditRoomName(room.room_name || "");
    setEditRoomType(room.room_type || "Other");
    setEditRoomLengthM(String(room.length_m || ""));
    setEditRoomWidthM(String(room.width_m || ""));
    setEditRoomCeilingHeight(String(room.ceiling_height || ""));
    setEditRoomRenovationType(room.renovation_type || "renovation");
  }

  function cancelEditPlanRoom() {
    setEditingRoomId(null);
    setEditRoomName("");
    setEditRoomType("");
    setEditRoomLengthM("");
    setEditRoomWidthM("");
    setEditRoomCeilingHeight("");
    setEditRoomRenovationType("renovation");
  }

  async function savePlanRoom(roomId: string) {
    if (!editRoomName.trim()) {
      showNotice("Enter a room name.");
      return;
    }

    const currentRoom = planRooms.find((room) => room.id === roomId);
    const newRoomName = editRoomName.trim();
    let categoryId = currentRoom?.category_id || null;

    // Older/manual rooms may not have category_id populated yet.
    // First try to find a category that matches the room's current name.
    if (!categoryId && currentRoom?.room_name) {
      const { data: oldMatchingCategory, error: oldCategoryError } =
        await supabase
          .from("project_categories")
          .select("id, name")
          .eq("project_id", params.id)
          .ilike("name", currentRoom.room_name)
          .maybeSingle();

      if (oldCategoryError) {
        showNotice(oldCategoryError.message);
        return;
      }

      if (oldMatchingCategory) {
        categoryId = oldMatchingCategory.id;
      }
    }

    // If there is still no category, create/link one using the new room name.
    if (!categoryId) {
      categoryId = await getOrCreateRoomCategory(newRoomName);
      if (!categoryId) return;
    }

    // Always keep the linked budget category aligned with the room name.
    const { error: categoryUpdateError } = await supabase
      .from("project_categories")
      .update({ name: newRoomName })
      .eq("id", categoryId);

    if (categoryUpdateError) {
      showNotice(categoryUpdateError.message);
      return;
    }

    const { error } = await supabase
      .from("plan_rooms")
      .update({
        category_id: categoryId,
        room_name: newRoomName,
        room_type: editRoomType || "Other",
        renovation_type: editRoomRenovationType,
        length_m: Number(editRoomLengthM) || null,
        width_m: Number(editRoomWidthM) || null,
        estimated_sqm:
          Number(editRoomLengthM) && Number(editRoomWidthM)
            ? Number(editRoomLengthM) * Number(editRoomWidthM)
            : null,
        ceiling_height: Number(editRoomCeilingHeight) || null,
      })
      .eq("id", roomId);

    if (error) {
      showNotice(error.message);
      return;
    }

    cancelEditPlanRoom();
    await markEstimateOutdated();
    await loadPlanRooms();
    await loadCategories();
  }

  async function attachDraftBoxToRoom(roomId: string) {
    if (!draftRoomBox) {
      showNotice("Draw a room box first.");
      return;
    }

    const { error } = await supabase
      .from("plan_rooms")
      .update({
        x: draftRoomBox.x,
        y: draftRoomBox.y,
        width: draftRoomBox.width,
        height: draftRoomBox.height,
      })
      .eq("id", roomId);

    if (error) {
      showNotice(error.message);
      return;
    }

    setDraftRoomBox(null);
    await markEstimateOutdated();
    loadPlanRooms();
  }

  async function deletePlanRoom(roomId: string) {
    const confirmed = await askConfirm(
      "Delete this identified room? Any linked budget category and cost items will remain.",
    );
    if (!confirmed) return;

    const { error } = await supabase
      .from("plan_rooms")
      .delete()
      .eq("id", roomId);

    if (error) {
      showNotice(error.message);
      return;
    }

    if (editingRoomId === roomId) {
      cancelEditPlanRoom();
    }

    loadPlanRooms();
  }

  async function openPlanPage(imagePath: string) {
    const { data, error } = await supabase.storage
      .from("project-plans")
      .createSignedUrl(imagePath, 60);

    if (error) {
      console.error("Error opening plan page:", error);
      showNotice(error.message);
      return;
    }

    window.open(data?.signedUrl, "_blank");
  }

  async function setRoomMappingPage(page: any) {
    setActiveRoomPage(page);
    setDraftRoomBox(null);
    setRoomDrawStart(null);
    setIsDrawingRoom(false);
    setScaleMode(false);
    setScaleDrawStart(null);
    setDraftScaleLine(
      page.scale_line_x1 !== null &&
        page.scale_line_y1 !== null &&
        page.scale_line_x2 !== null &&
        page.scale_line_y2 !== null
        ? {
            x1: Number(page.scale_line_x1),
            y1: Number(page.scale_line_y1),
            x2: Number(page.scale_line_x2),
            y2: Number(page.scale_line_y2),
          }
        : null,
    );
    setScaleRealMm(page.scale_real_mm ? String(page.scale_real_mm) : "");

    const { data, error } = await supabase.storage
      .from("project-plans")
      .createSignedUrl(page.image_path, 3600);

    if (error) {
      console.error("Error loading room mapping image:", error);
      showNotice(error.message);
      return;
    }

    setActiveRoomPageUrl(data?.signedUrl || "");
  }

  function getRelativePointerPosition(event: MouseEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * 100,
      y: ((event.clientY - rect.top) / rect.height) * 100,
    };
  }

  function handleRoomMapMouseDown(event: MouseEvent<HTMLDivElement>) {
    if (!activeRoomPageUrl) return;

    const point = getRelativePointerPosition(event);

    if (scaleMode) {
      setScaleDrawStart(point);
      setDraftScaleLine({ x1: point.x, y1: point.y, x2: point.x, y2: point.y });
      return;
    }

    const start = point;
    setRoomDrawStart(start);
    setDraftRoomBox({ x: start.x, y: start.y, width: 0, height: 0 });
    setIsDrawingRoom(true);
  }

  function handleRoomMapMouseMove(event: MouseEvent<HTMLDivElement>) {
    const point = getRelativePointerPosition(event);

    if (scaleMode && scaleDrawStart) {
      setDraftScaleLine({
        x1: scaleDrawStart.x,
        y1: scaleDrawStart.y,
        x2: point.x,
        y2: point.y,
      });
      return;
    }

    if (!isDrawingRoom || !roomDrawStart) return;

    setDraftRoomBox({
      x: Math.min(roomDrawStart.x, point.x),
      y: Math.min(roomDrawStart.y, point.y),
      width: Math.abs(point.x - roomDrawStart.x),
      height: Math.abs(point.y - roomDrawStart.y),
    });
  }

  function handleRoomMapMouseUp() {
    setIsDrawingRoom(false);
    setRoomDrawStart(null);
    setScaleDrawStart(null);
  }

  function calculatePercentDistance(line: {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  }) {
    const dx = line.x2 - line.x1;
    const dy = line.y2 - line.y1;
    return Math.sqrt(dx * dx + dy * dy);
  }

  async function savePlanPageScale() {
    if (!activeRoomPage || !draftScaleLine) {
      showNotice("Draw a scale line first.");
      return;
    }

    const realMm = Number(scaleRealMm);

    if (!realMm || realMm <= 0) {
      showNotice("Enter the real-world measurement in mm.");
      return;
    }

    const percentDistance = calculatePercentDistance(draftScaleLine);

    if (!percentDistance || percentDistance <= 0) {
      showNotice("Draw a longer scale line.");
      return;
    }

    const mmPerPercent = realMm / percentDistance;

    const { error } = await supabase
      .from("plan_pages")
      .update({
        scale_line_x1: draftScaleLine.x1,
        scale_line_y1: draftScaleLine.y1,
        scale_line_x2: draftScaleLine.x2,
        scale_line_y2: draftScaleLine.y2,
        scale_real_mm: realMm,
        scale_mm_per_percent: mmPerPercent,
      })
      .eq("id", activeRoomPage.id);

    if (error) {
      showNotice(error.message);
      return;
    }

    setScaleMode(false);
    await loadPlanPages();
    setActiveRoomPage({
      ...activeRoomPage,
      scale_line_x1: draftScaleLine.x1,
      scale_line_y1: draftScaleLine.y1,
      scale_line_x2: draftScaleLine.x2,
      scale_line_y2: draftScaleLine.y2,
      scale_real_mm: realMm,
      scale_mm_per_percent: mmPerPercent,
    });
  }

  async function deletePlan(planId: string, storagePath: string) {
    const confirmed = await askConfirm(
      "Delete this plan? This will also remove any plan pages and rooms linked to it.",
    );
    if (!confirmed) return;

    await supabase.storage.from("project-plans").remove([storagePath]);

    const { error } = await supabase
      .from("project_plans")
      .delete()
      .eq("id", planId);

    if (error) {
      showNotice(error.message);
      return;
    }

    loadPlans();
  }

  async function processPlan(planId: string) {
    try {
      setProcessingPlanId(planId);

      const selectedPagesText = planPagesToProcess[planId] || "";
      const selectedPages = selectedPagesText
        .split(",")
        .map((page) => Number(page.trim()))
        .filter((page) => Number.isInteger(page) && page > 0);

      const response = await fetch("/api/process-plan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          planId,
          pages: selectedPages.length > 0 ? selectedPages : undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to process plan");
      }

      await loadPlans();
      await loadPlanPages();
      await loadPlanRooms();
      showNotice(data.message || "Plan processed successfully.");
    } catch (error: any) {
      console.error("Plan processing failed:", error);
      showNotice(error.message || "Plan processing failed.");
    } finally {
      setProcessingPlanId(null);
    }
  }

  async function suggestRoomsForPage(pageId: string) {
    try {
      setSuggestingRoomsPageId(pageId);

      const response = await fetch("/api/suggest-rooms", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ planPageId: pageId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to suggest rooms");
      }

      await loadPlanRooms();
      await loadPlanFeatures();
      await loadCategories();
      await markEstimateOutdated();
      showNotice(
        `Suggested ${data.insertedRoomCount || data.insertedCount || 0} room(s) and ${data.insertedFeatureCount || 0} feature(s).`,
      );
    } catch (error: any) {
      console.error("Suggest rooms failed:", error);
      showNotice(error.message || "Suggest rooms failed.");
    } finally {
      setSuggestingRoomsPageId(null);
    }
  }

  async function createCategory() {
    if (!newCategoryName.trim()) return;

    const { error } = await supabase.from("project_categories").insert({
      project_id: params.id,
      name: newCategoryName,
      budget_amount: parseMoney(newCategoryBudget),
      is_default: false,
    });

    if (error) {
      showNotice(error.message);
      return;
    }

    setNewCategoryName("");
    setNewCategoryBudget("");
    loadCategories();
  }

  async function createQuickCategory() {
    if (!quickCategoryName.trim()) {
      showNotice("Enter a category name.");
      return;
    }

    const { data, error } = await supabase
      .from("project_categories")
      .insert({
        project_id: params.id,
        name: quickCategoryName.trim(),
        budget_amount: parseMoney(quickCategoryBudget),
        is_default: false,
      })
      .select("id")
      .single();

    if (error) {
      showNotice(error.message);
      return;
    }

    setSelectedCategory(data.id);
    setQuickCategoryName("");
    setQuickCategoryBudget("");
    setShowQuickCategoryModal(false);
    await loadCategories();
  }

  function startEditCategoryBudget(category: any) {
    setEditingCategoryId(category.id);
    setEditCategoryBudget(String(category.budget_amount || ""));
  }

  async function saveCategoryBudget(categoryId: string) {
    const newBudget = parseMoney(editCategoryBudget);

    const { error } = await supabase
      .from("project_categories")
      .update({
        budget_amount: newBudget,
      })
      .eq("id", categoryId);

    if (error) {
      showNotice(error.message);
      return;
    }

    setCategories((current) =>
      current.map((category) =>
        category.id === categoryId
          ? { ...category, budget_amount: newBudget }
          : category,
      ),
    );

    setEditingCategoryId(null);
    setEditCategoryBudget("");
  }

  async function deleteCategory(category: any) {
    const categoryItems = items.filter((item) => item.category_id === category.id);

    const confirmed = await askConfirm(
      categoryItems.length > 0
        ? `Delete "${category.name}" and ${categoryItems.length} cost item${categoryItems.length === 1 ? "" : "s"} inside it? This cannot be undone.`
        : `Delete "${category.name}"? This cannot be undone.`,
      "Delete budget category",
      "error",
    );

    if (!confirmed) return;

    const attachmentsToDelete = getCategoryAttachments(category.id);
    if (attachmentsToDelete.length > 0) {
      await supabase.storage
        .from("project-category-attachments")
        .remove(attachmentsToDelete.map((attachment) => attachment.file_path));
    }

    await supabase
      .from("detected_rooms")
      .update({ category_id: null })
      .eq("project_id", params.id)
      .eq("category_id", category.id);

    await supabase
      .from("detected_features")
      .update({ category_id: null })
      .eq("project_id", params.id)
      .eq("category_id", category.id);

    if (categoryItems.length > 0) {
      const { error: itemError } = await supabase
        .from("project_items")
        .delete()
        .eq("category_id", category.id);

      if (itemError) {
        showNotice(itemError.message);
        return;
      }
    }

    const { error } = await supabase
      .from("project_categories")
      .delete()
      .eq("project_id", params.id)
      .eq("id", category.id);

    if (error) {
      showNotice(error.message);
      return;
    }

    if (expandedBudgetCategoryId === category.id) setExpandedBudgetCategoryId(null);

    await markEstimateOutdated();
    await loadItems();
    await loadCategories();
    await loadCategoryAttachments();
  }

  async function createItem() {
    if (!itemName.trim()) return;

    if (!isValidOptionalUrl(supplierUrl)) {
      showNotice(
        "Please enter a valid supplier URL starting with http:// or https://, or leave the URL blank.",
      );
      return;
    }

    if (!selectedCategory) {
      showNotice(
        "Please select a budget category before saving this cost item.",
      );
      return;
    }

    const calculatedTotal = useSqmPricing
      ? calculateSqmTotal()
      : parseMoney(estimatedCost);

    const budgetFeatureName =
      selectedFeatureName === "Other"
        ? customBudgetFeatureName.trim()
        : selectedFeatureName;

    const payload = {
      project_id: params.id,
      category_id: selectedCategory || null,
      feature_id: selectedFeatureId || null,
      feature_name: budgetFeatureName || null,
      item_name: itemName,
      estimated_cost: calculatedTotal,
      supplier_url: supplierUrl.trim() || null,
      product_number: productNumber,
      supplier_name: supplierName,
      product_image_url: productImageUrl,
      scraped_description: scrapedDescription,
      product_status: productStatus,
      purchase_type: purchaseType,
      trade_discount_percent: Number(tradeDiscountPercent) || 0,
      deposit_paid: parseMoney(depositPaid),
      notes: itemNotes,
      use_sqm_pricing: useSqmPricing,
      sqm: useSqmPricing ? Number(sqm) || 0 : null,
      cost_per_sqm: useSqmPricing ? parseMoney(costPerSqm) : null,
      include_wastage: useSqmPricing ? includeWastage : false,
      quantity: Number(quantity) || 1,
      price_unit: priceUnit,
      box_coverage_sqm: Number(boxCoverageSqm) || null,
      price_per_sqm: parseMoney(pricePerSqm) || null,
      price_per_box: parseMoney(pricePerBox) || null,
    };

    let savedItemId = editingItemId;

    if (editingItemId) {
      const { error } = await supabase
        .from("project_items")
        .update(payload)
        .eq("id", editingItemId);

      if (error) {
        showNotice(error.message);
        return;
      }
    } else {
      const { data, error } = await supabase
        .from("project_items")
        .insert(payload)
        .select("id")
        .single();

      if (error) {
        showNotice(error.message);
        return;
      }

      savedItemId = data?.id || null;
    }

    if (savedItemId) {
      await saveFlooringRoomLinks(savedItemId);
    }

    if (
      budgetFeatureName &&
      !customFeatureOptions.includes(budgetFeatureName)
    ) {
      setCustomFeatureOptions((prev) => [...prev, budgetFeatureName]);
    }

    resetItemForm();
    setShowItemModal(false);
    await markEstimateOutdated();
    await loadItems();
  }

  async function scrapeProductInfo() {
    if (!supplierUrl.trim()) {
      showNotice("Please enter a supplier URL first.");
      return;
    }

    if (!isValidOptionalUrl(supplierUrl)) {
      showNotice(
        "Please enter a valid supplier URL starting with http:// or https://.",
      );
      return;
    }

    try {
      setIsScrapingProduct(true);

      const response = await fetch("/api/scrape-product", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: supplierUrl,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to scrape product");
      }

      setItemName(data.productName || "");
      setEstimatedCost(String(data.price || ""));
      setProductNumber(data.productNumber || "");
      setSupplierName(data.supplierName || "");
      setProductImageUrl(data.imageUrl || "");
      setScrapedDescription(data.description || "");
      setPriceUnit(data.priceUnit || "item");
      setPricePerSqm(String(data.pricePerSqm || ""));
      setPricePerBox(String(data.pricePerBox || ""));
      setBoxCoverageSqm(String(data.boxCoverageSqm || ""));
      maybeAutoSelectCategory(
        `${data.productName || ""} ${data.supplierName || ""} ${data.description || ""} ${data.productNumber || ""}`,
      );

      if (data.priceUnit === "sqm" && data.pricePerSqm) {
        setUseSqmPricing(true);
        setCostPerSqm(String(data.pricePerSqm));
        setEstimatedCost("");
      }

      if (data.priceUnit === "box" && data.pricePerBox && data.boxCoverageSqm) {
        const calculatedSqmPrice =
          Number(data.pricePerBox) / Number(data.boxCoverageSqm);

        setUseSqmPricing(true);
        setCostPerSqm(String(calculatedSqmPrice.toFixed(2)));
        setEstimatedCost("");
      }
    } catch (error: any) {
      showNotice(error.message);
    } finally {
      setIsScrapingProduct(false);
    }
  }

  async function startEditItem(item: any) {
    setShowItemModal(true);
    setEditingItemId(item.id);
    setItemName(item.item_name || "");
    setEstimatedCost(String(item.estimated_cost || ""));
    setSupplierUrl(item.supplier_url || "");
    setProductNumber(item.product_number || "");
    setSupplierName(item.supplier_name || "");
    setProductImageUrl(item.product_image_url || "");
    setScrapedDescription(item.scraped_description || "");
    setPurchaseType(item.purchase_type || "Owner purchase");
    setTradeDiscountPercent(String(item.trade_discount_percent || ""));
    setDepositPaid(item.deposit_paid ? formatMoney(Number(item.deposit_paid || 0)) : "");
    setItemNotes(item.notes || "");
    setProductStatus(item.product_status || "Planned");
    setSelectedCategory(item.category_id || "");
    setSelectedFeatureId(item.feature_id || "");
    setSelectedFeatureName(item.feature_name || "");
    setCustomBudgetFeatureName("");
    setQuantity(String(item.quantity || 1));
    setPriceUnit(item.price_unit || "item");
    setBoxCoverageSqm(String(item.box_coverage_sqm || ""));
    setPricePerSqm(String(item.price_per_sqm || ""));
    setPricePerBox(String(item.price_per_box || ""));

    setUseSqmPricing(Boolean(item.use_sqm_pricing));
    setSqm(String(item.sqm || ""));
    setCostPerSqm(String(item.cost_per_sqm || ""));
    setIncludeWastage(
      item.include_wastage === null || item.include_wastage === undefined
        ? true
        : Boolean(item.include_wastage),
    );
    setQuantityMethod("manual");
    setSelectedFlooringRoomIds([]);
    setFlooringWastagePercent("10");
    await loadFlooringRoomLinks(item.id);

    setItemFormPulse(true);
    setTimeout(() => setItemFormPulse(false), 900);
  }

  async function deleteItem(itemId: string) {
    const confirmed = await askConfirm("Delete this cost item?");
    if (!confirmed) return;

    const { error } = await supabase
      .from("project_items")
      .delete()
      .eq("id", itemId);

    if (error) {
      showNotice(error.message);
      return;
    }

    if (editingItemId === itemId) resetItemForm();

    await markEstimateOutdated();
    loadItems();
  }

  async function uploadFile() {
    if (!selectedFile) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const filePath = `${user.id}/${params.id}/${Date.now()}-${selectedFile.name}`;

    const { error } = await supabase.storage
      .from("project-files")
      .upload(filePath, selectedFile);

    if (error) {
      showNotice(error.message);
      return;
    }

    await supabase.from("project_files").insert({
      project_id: params.id,
      file_name: selectedFile.name,
      file_path: filePath,
      file_type: selectedFile.type,
    });

    setSelectedFile(null);
    loadFiles();
  }

  async function openFile(filePath: string) {
    const { data } = await supabase.storage
      .from("project-files")
      .createSignedUrl(filePath, 60);

    window.open(data?.signedUrl, "_blank");
  }

  async function deleteFile(fileId: string, filePath: string) {
    const confirmed = await askConfirm("Delete this file?");
    if (!confirmed) return;

    await supabase.storage.from("project-files").remove([filePath]);
    await supabase.from("project_files").delete().eq("id", fileId);

    loadFiles();
  }

  useEffect(() => {
    const length = Number(newFeatureLengthM || 0);
    const width = Number(newFeatureWidthM || 0);

    if (length > 0 && width > 0) {
      setNewFeatureAreaSqm((length * width).toFixed(2));
    } else if (!newFeatureLengthM && !newFeatureWidthM) {
      setNewFeatureAreaSqm("");
    }
  }, [newFeatureLengthM, newFeatureWidthM]);

  useEffect(() => {
    const length = Number(editFeatureLengthM || 0);
    const width = Number(editFeatureWidthM || 0);

    if (length > 0 && width > 0) {
      setEditFeatureAreaSqm((length * width).toFixed(2));
    } else if (!editFeatureLengthM && !editFeatureWidthM) {
      setEditFeatureAreaSqm("");
    }
  }, [editFeatureLengthM, editFeatureWidthM]);

  useEffect(() => {
    if (params.id) {
      loadProject();
      loadCategories();
      loadItems();
      loadCategoryAttachments();
      loadFiles();
      loadPlans();
      loadPlanPages();
      loadPlanRooms();
      loadPlanFeatures();
      loadLatestEstimate();
    }
  }, [params.id]);

  useEffect(() => {
    const startTab = searchParams.get("start");
    if (
      [
        "overview",
        "plans",
        "budget",
        "estimate",
        "products",
        "timeline",
      ].includes(startTab || "")
    ) {
      setActiveTab(startTab || "overview");
    }
  }, [searchParams]);

  const projectTotal = useMemo(() => {
    return items.reduce((sum, item) => sum + getDiscountedItemTotal(item), 0);
  }, [items]);

  const supplierSummaries = useMemo(() => {
    const filteredItems =
      productCategoryFilter === "all"
        ? items
        : items.filter((item) => item.category_id === productCategoryFilter);

    const groups: Record<string, any> = {};

    filteredItems.forEach((item) => {
      let supplier = item.supplier_name?.trim();

      if (!supplier && item.supplier_url) {
        try {
          supplier = new URL(item.supplier_url).hostname.replace("www.", "");
        } catch {
          supplier = "Unknown supplier";
        }
      }

      if (!supplier) supplier = "No supplier listed";

      if (!groups[supplier]) {
        groups[supplier] = {
          supplier,
          items: [],
          total: 0,
        };
      }

      groups[supplier].items.push(item);
      groups[supplier].total += calculateItemTotal(item);
    });

    return Object.values(groups).sort((a: any, b: any) => b.total - a.total);
  }, [items, productCategoryFilter]);

  const purchasedTotal = items
    .filter((item) => item.product_status === "Purchased")
    .reduce((sum, item) => sum + getDiscountedItemTotal(item), 0);

  const supplierGrandTotal = supplierSummaries.reduce(
    (sum: number, group: any) => sum + group.total,
    0,
  );

  const supplierItemCount = supplierSummaries.reduce(
    (sum: number, group: any) => sum + group.items.length,
    0,
  );

  function getDefaultFeatureCategoryName(
    featureType: string,
    featureName?: string,
  ) {
    const value = `${featureType || ""} ${featureName || ""}`.toLowerCase();

    if (
      ["deck", "alfresco", "patio", "pergola", "balcony"].some((x) =>
        value.includes(x),
      )
    ) {
      return "Outdoor Living";
    }

    if (["pool", "spa"].some((x) => value.includes(x))) {
      return "Pool";
    }

    if (["garage", "carport"].some((x) => value.includes(x))) {
      return "Garage & Carport";
    }

    if (
      ["window", "door", "glazing", "skylight", "stacker", "bifold"].some((x) =>
        value.includes(x),
      )
    ) {
      return "Windows & Doors";
    }

    if (
      ["handle", "hinge", "lock", "latch", "knob", "pull", "hardware"].some((x) =>
        value.includes(x),
      )
    ) {
      return "Hardware";
    }

    if (["robe", "linen", "joinery"].some((x) => value.includes(x))) {
      return "Joinery";
    }

    if (["stair", "void", "ceiling"].some((x) => value.includes(x))) {
      return "Structure & Complexity";
    }

    if (["retaining"].some((x) => value.includes(x))) {
      return "Siteworks";
    }

    if (["solar", "fireplace"].some((x) => value.includes(x))) {
      return "Services & Special Items";
    }

    return "Other Features";
  }

  async function prepareCostItemFromFeature(featureGroup: any) {
    const firstFeature = featureGroup.features?.[0] || featureGroup;

    if (!firstFeature?.id) {
      showNotice("No feature record found.");
      return;
    }

    const categoryName = getDefaultFeatureCategoryName(
      featureGroup.feature_type || firstFeature.feature_type,
      featureGroup.feature_name || firstFeature.feature_name,
    );

    const categoryId = await getOrCreateRoomCategory(categoryName);

    if (!categoryId) return;

    const featureIds = (featureGroup.features || [firstFeature])
      .map((feature: any) => feature.id)
      .filter(Boolean);

    if (featureIds.length > 0) {
      const { error } = await supabase
        .from("plan_features")
        .update({ category_id: categoryId })
        .in("id", featureIds);

      if (error) {
        showNotice(error.message);
        return;
      }
    }

    resetItemForm();
    setSelectedCategory(categoryId);
    setSelectedFeatureId(firstFeature.id);
    setItemName(
      featureGroup.feature_name ||
        firstFeature.feature_name ||
        featureGroup.feature_type ||
        "Feature item",
    );
    setQuantity(String(featureGroup.quantity || firstFeature.quantity || 1));

    if (
      Number(
        featureGroup.estimated_area_sqm || firstFeature.estimated_area_sqm || 0,
      ) > 0
    ) {
      setUseSqmPricing(true);
      setSqm(
        String(
          featureGroup.estimated_area_sqm || firstFeature.estimated_area_sqm,
        ),
      );
    }

    setActiveTab("budget");
    setShowItemModal(true);

    await loadPlanFeatures();
    await loadCategories();
  }

  function normaliseFeatureGroup(feature: any) {
    const type = String(feature.feature_type || "Other").toLowerCase();
    const name = String(
      feature.feature_name || feature.feature_type || "Feature",
    ).toLowerCase();

    const isWindow = type.includes("window") || name.includes("window");
    const isDoor = type.includes("door") || name.includes("door");

    // Keep windows separate from doors, even if the window is a sliding window.
    if (isWindow) {
      if (name.includes("sliding")) return "Sliding Window";
      if (name.includes("double hung") || name.includes("double-hung"))
        return "Double Hung Window";
      if (name.includes("tilt") || name.includes("turn"))
        return "Tilt Turn Window";
      if (name.includes("awning")) return "Awning Window";
      if (name.includes("casement")) return "Casement Window";
      return "Window";
    }

    // Door grouping comes after windows so sliding windows do not get grouped as sliding doors.
    if (
      isDoor ||
      name.includes("sliding") ||
      name.includes("cavity") ||
      name.includes("patio") ||
      name.includes("stacker")
    ) {
      if (
        name.includes("large") ||
        name.includes("patio") ||
        name.includes("stacker")
      ) {
        return "Large Sliding Door";
      }

      if (name.includes("cavity")) {
        return "Cavity Sliding Door";
      }

      if (name.includes("sliding")) {
        return "Sliding Door";
      }

      if (name.includes("external") || name.includes("entry")) {
        return "External Door";
      }

      return "Internal Door";
    }

    if (type.includes("stair") || name.includes("stair")) {
      if (name.includes("small")) return "Small Staircase";
      if (name.includes("external")) return "External Staircase";
      if (name.includes("internal")) return "Internal Staircase";
      return feature.feature_name || "Staircase";
    }

    return feature.feature_type || feature.feature_name || "Feature";
  }

  const groupedPlanFeatures = useMemo(() => {
    const groups: Record<string, any> = {};

    planFeatures.forEach((feature) => {
      const groupName = normaliseFeatureGroup(feature);

      if (!groups[groupName]) {
        groups[groupName] = {
          id: groupName,
          feature_name: groupName,
          feature_type: groupName,
          quantity: 0,
          estimated_length_m: 0,
          estimated_width_m: 0,
          estimated_area_sqm: 0,
          confidenceValues: [],
          notes: [],
          features: [],
          floorLevels: new Set<string>(),
        };
      }

      groups[groupName].features.push(feature);
      groups[groupName].quantity += Number(feature.quantity || 1);
      groups[groupName].estimated_length_m += Number(
        feature.estimated_length_m || 0,
      );
      groups[groupName].estimated_width_m += Number(
        feature.estimated_width_m || 0,
      );
      groups[groupName].estimated_area_sqm += Number(
        feature.estimated_area_sqm || 0,
      );

      if (feature.confidence)
        groups[groupName].confidenceValues.push(Number(feature.confidence));
      if (feature.notes) groups[groupName].notes.push(feature.notes);
      if (feature.plan_pages?.floor_level)
        groups[groupName].floorLevels.add(feature.plan_pages.floor_level);
    });

    return Object.values(groups).map((group: any) => ({
      ...group,
      confidence:
        group.confidenceValues.length > 0
          ? group.confidenceValues.reduce(
              (sum: number, value: number) => sum + value,
              0,
            ) / group.confidenceValues.length
          : null,
      notes: Array.from(new Set(group.notes)).join(" "),
      floorLevels: Array.from(group.floorLevels),
    }));
  }, [planFeatures]);

  const sortedPlanPages = useMemo(() => {
    const floorOrder: Record<string, number> = {
      Basement: 0,
      "Ground Floor": 1,
      "First Floor": 2,
      "Second Floor": 3,
      "Site Plan": 4,
      Other: 5,
    };

    return planPages.slice().sort((a, b) => {
      const aFloor = a.floor_level || "";
      const bFloor = b.floor_level || "";
      const aOrder = floorOrder[aFloor] ?? 99;
      const bOrder = floorOrder[bFloor] ?? 99;

      if (aOrder !== bOrder) return aOrder - bOrder;
      return Number(a.page_number || 0) - Number(b.page_number || 0);
    });
  }, [planPages]);

  async function selectPlanPageForRooms(page: any) {
    await updatePlanPage(page.id, { is_selected: true });
    await setRoomMappingPage(page);
    setTimeout(() => {
      document.getElementById("rooms-identified-section")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 80);
  }

  if (!project) return <p className="p-10">Loading...</p>;

  const budgetTarget = Number(project.budget_target || 0);
  const remainingBudget = budgetTarget - projectTotal;
  const itemCount = items.length;

  const budgetSearchTerm = budgetSearch.trim().toLowerCase();

  const visibleCategories = categories
    .filter((category) => {
      if (!budgetSearchTerm) return true;

      const categoryName = String(category.name || "").toLowerCase();
      const matchingItems = items.filter((item) => item.category_id === category.id);
      return (
        categoryName.includes(budgetSearchTerm) ||
        matchingItems.some((item) =>
          [
            item.item_name,
            item.supplier_name,
            item.product_number,
            item.feature_name,
            item.notes,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(budgetSearchTerm),
        )
      );
    })
    .slice()
    .sort((a, b) => {
    const aItemCount = items.filter((item) => item.category_id === a.id).length;
    const bItemCount = items.filter((item) => item.category_id === b.id).length;

    const aHasItems = aItemCount > 0;
    const bHasItems = bItemCount > 0;

    if (aHasItems && !bHasItems) return -1;
    if (!aHasItems && bHasItems) return 1;

    const aName = String(a.name || "");
    const bName = String(b.name || "");
    const aIsOther = aName.toLowerCase() === "other";
    const bIsOther = bName.toLowerCase() === "other";

    if (aIsOther && !bIsOther) return 1;
    if (!aIsOther && bIsOther) return -1;

    return aName.localeCompare(bName);
  });

  const activeAttachmentCategory = activeAttachmentCategoryId
    ? categories.find((category) => category.id === activeAttachmentCategoryId)
    : null;
  const activeCategoryAttachments = activeAttachmentCategoryId
    ? getCategoryAttachments(activeAttachmentCategoryId)
    : [];

  const latestEstimateBreakdown = latestEstimate?.breakdown || {};
  const latestEstimateInputs = latestEstimate?.inputs || {};
  const latestEstimateDisplay =
    latestEstimateInputs.estimate_display || latestEstimateBreakdown || {};
  const likelyEstimateTotal = Number(
    latestEstimate?.likely_total ||
      latestEstimateDisplay.likely_total ||
      (Number(latestEstimate?.total_low || 0) +
        Number(latestEstimate?.total_high || 0)) /
        2,
  );
  const expectedEstimateLow = Number(
    latestEstimate?.expected_low ||
      latestEstimateDisplay.expected_low ||
      likelyEstimateTotal * 0.9,
  );
  const expectedEstimateHigh = Number(
    latestEstimate?.expected_high ||
      latestEstimateDisplay.expected_high ||
      likelyEstimateTotal * 1.1,
  );
  const cautionEstimateLow = Number(
    latestEstimate?.caution_low ||
      latestEstimateDisplay.caution_low ||
      latestEstimate?.total_low ||
      0,
  );
  const cautionEstimateHigh = Number(
    latestEstimate?.caution_high ||
      latestEstimateDisplay.caution_high ||
      latestEstimate?.total_high ||
      0,
  );
  const latestEstimateConfidence =
    latestEstimateBreakdown.confidence ||
    latestEstimateInputs.confidence ||
    null;
  const latestEstimateCommentary: string[] =
    latestEstimateBreakdown.commentary || latestEstimateInputs.commentary || [];
  const missingRoomAssumptions =
    latestEstimateBreakdown.missing_room_assumptions || [];
  const missingFeatureAssumptions =
    latestEstimateBreakdown.missing_feature_assumptions || [];
  const missingFeatureMeasurements =
    latestEstimateBreakdown.missing_feature_measurements || [];
  const projectCostAdditions =
    latestEstimateBreakdown.project_cost_additions ||
    latestEstimateInputs.project_cost_additions ||
    {};
  const adjustedWorksLow = Number(
    latestEstimateBreakdown.adjusted_works_low ||
      latestEstimateInputs.adjusted_works_low ||
      0,
  );
  const adjustedWorksHigh = Number(
    latestEstimateBreakdown.adjusted_works_high ||
      latestEstimateInputs.adjusted_works_high ||
      0,
  );

  const buildSummary = buildProjectSummary(
    project,
    latestEstimateBreakdown.rooms || planRooms,
    latestEstimateBreakdown.features || groupedPlanFeatures,
  );

  const groupedEstimateRooms = groupRoomsForCostBreakdown(
    latestEstimateBreakdown.rooms || [],
  );

  const overviewComplete = Boolean(
    project?.project_type &&
    project?.property_type &&
    (project?.postcode || project?.suburb) &&
    Number(project?.budget_target || 0) > 0,
  );

  const plansUploaded = plans.length > 0 || planPages.length > 0;
  const plansStepDone = plansUploaded || project?.has_plans_ready === false;
  const roomsAdded = planRooms.length > 0;
  const featuresReviewed = planFeatures.length > 0;
  const productsEntered = items.length > 0;
  const budgetSet =
    Number(project?.budget_target || 0) > 0 ||
    categories.some((category) => Number(category.budget_amount || 0) > 0);
  const estimateProduced = Boolean(latestEstimate);

  const readinessSteps = [
    {
      label: "Project setup",
      tab: "overview",
      done: overviewComplete,
      status: overviewComplete ? "done" : "missing",
    },
    {
      label:
        project?.has_plans_ready === false ? "Plans skipped" : "Plans uploaded",
      tab: "plans",
      done: plansStepDone,
      status: plansStepDone ? "done" : "missing",
    },
    {
      label: "Rooms added",
      tab: "plans",
      done: roomsAdded,
      status: roomsAdded ? "done" : "missing",
    },
    {
      label: "Features reviewed",
      tab: "plans",
      done: featuresReviewed,
      status: featuresReviewed ? "done" : "missing",
    },
    {
      label: "Budget & selections",
      tab: "budget",
      done: productsEntered || budgetSet,
      status: productsEntered || budgetSet ? "done" : "missing",
    },
    {
      label: "Cost forecast",
      tab: "estimate",
      done: estimateProduced && estimateStatus === "current",
      status:
        estimateStatus === "outdated"
          ? "warning"
          : estimateProduced
            ? "done"
            : "missing",
    },
  ];

  const projectReadinessPercent = Math.round(
    (readinessSteps.filter((step) => step.status === "done").length /
      readinessSteps.length) *
      100,
  );

  const stageMeta = getStageMeta(project?.project_stage || "");
  const projectStageProgressPercent = getStageProgressPercent(
    project?.project_stage || "",
    projectStages,
  );
  const projectLocation = [project?.suburb, project?.postcode]
    .filter(Boolean)
    .join(" ");

  function getNextSetupTab() {
    const nextStep = readinessSteps.find((step) => step.status !== "done");
    return nextStep?.tab || "estimate";
  }

  function handleContinueSetup() {
    const nextTab = getNextSetupTab();
    setActiveTab(nextTab);
    setTimeout(() => {
      document.getElementById("project-main-content")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 50);
  }

  const plansInsightSteps = [
    { label: "Plans uploaded", done: plansUploaded },
    { label: "Rooms identified", done: roomsAdded },
    { label: "Features identified", done: featuresReviewed },
    { label: "Selections added", done: productsEntered },
    { label: "Cost forecast generated", done: estimateProduced },
  ];

  const plansInsightPercent = Math.round(
    (plansInsightSteps.filter((step) => step.done).length /
      plansInsightSteps.length) *
      100,
  );

  const identifiedFloorArea = planRooms.reduce(
    (sum, room) => sum + getDisplaySqm(room),
    0,
  );

  const windowCount = groupedPlanFeatures
    .filter((feature: any) => getFeatureText(feature).includes("window"))
    .reduce(
      (sum: number, feature: any) => sum + Number(feature.quantity || 1),
      0,
    );

  const externalDoorCount = groupedPlanFeatures
    .filter((feature: any) => {
      const value = getFeatureText(feature);
      return (
        value.includes("external door") ||
        value.includes("entry door") ||
        value.includes("sliding door") ||
        value.includes("large sliding door")
      );
    })
    .reduce(
      (sum: number, feature: any) => sum + Number(feature.quantity || 1),
      0,
    );

  const wetAreaCount = planRooms.filter((room) => {
    const value = getRoomTypeText(room);
    return (
      value.includes("bath") ||
      value.includes("ensuite") ||
      value.includes("laundry") ||
      value.includes("powder")
    );
  }).length;

  const projectInsightItems = [
    buildSummary.featureHighlights.includes("outdoor living area")
      ? "Outdoor living area identified. This can be a meaningful cost driver depending on size, structure and finishes."
      : "",
    buildSummary.featureHighlights.includes("pool")
      ? "Pool or pool-related works identified. Remember to allow for fencing, paving, services and surrounding landscaping."
      : "",
    windowCount >= 10
      ? "A higher number of windows/openings has been identified. Glazing choices can have a noticeable impact on the budget."
      : "",
    wetAreaCount >= 3
      ? "Multiple wet areas identified. Bathrooms, ensuites and laundries usually carry higher costs per square metre than general rooms."
      : "",
    identifiedFloorArea > 0
      ? `Approximate identified floor area is ${identifiedFloorArea.toFixed(0)}m². Confirming room sizes will help improve future flooring and cost planning.`
      : "",
  ].filter(Boolean);

  function getPlansRecommendedNextStep() {
    if (!plansUploaded && project?.has_plans_ready !== false) {
      return {
        label: "Upload Plans",
        description:
          "Upload your plans when you have them, or continue manually if you are still early in the process.",
        tab: "plans",
        targetId: "plans-upload-section",
      };
    }

    if (!roomsAdded) {
      return {
        label: "Add or Review Rooms",
        description:
          "Confirm the rooms in your project so your budget and cost forecast have a stronger foundation.",
        tab: "plans",
        targetId: "rooms-identified-section",
      };
    }

    if (!featuresReviewed) {
      return {
        label: "Review Features",
        description:
          "Check windows, doors, outdoor areas and other cost-impacting features before estimating.",
        tab: "plans",
        targetId: "features-identified-section",
      };
    }

    if (!productsEntered) {
      return {
        label: "Add Budget & Selections",
        description:
          "Start adding products, allowances and selections you are considering.",
        tab: "budget",
        targetId: "cost-item-form",
      };
    }

    return {
      label: "Generate Cost Forecast",
      description:
        "Use your project details, rooms, features and selections to generate a feasibility estimate.",
      tab: "estimate",
      targetId: "project-main-content",
    };
  }

  const plansRecommendedNextStep = getPlansRecommendedNextStep();

  function handlePlansRecommendedNextStep() {
    setActiveTab(plansRecommendedNextStep.tab);
    setTimeout(() => {
      document
        .getElementById(plansRecommendedNextStep.targetId)
        ?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
    }, 50);
  }

  const displayTotalBudget = Number(project?.budget_target || 0);
  const displayBuildBudget =
    Number(project?.build_budget || 0) ||
    (displayTotalBudget > 0
      ? Math.round(displayTotalBudget * defaultBuildBudgetPercentage)
      : 0);
  const displayProductBudget =
    Number(project?.product_budget || 0) ||
    (displayTotalBudget > 0
      ? Math.max(displayTotalBudget - displayBuildBudget, 0)
      : 0);
  const displayBuildBudgetPercent = displayTotalBudget
    ? Math.round((displayBuildBudget / displayTotalBudget) * 100)
    : 0;
  const displayProductBudgetPercent = displayTotalBudget
    ? Math.max(100 - displayBuildBudgetPercent, 0)
    : 0;
  const editBudgetTotalValue = parseMoney(editBudgetTarget);
  const editBuildBudgetValue = parseMoney(editBuildBudget);
  const editProductBudgetValue = parseMoney(editProductBudget);
  const editBudgetDifference =
    editBudgetTotalValue - (editBuildBudgetValue + editProductBudgetValue);

  const selectedCategoryName =
    categories.find((category) => category.id === selectedCategory)?.name || "";

  const flooringDetectionText =
    `${itemName} ${selectedCategoryName} ${selectedFeatureName} ${customBudgetFeatureName}`.toLowerCase();

  function normaliseSearchText(value: string) {
    return String(value || "")
      .toLowerCase()
      .replace(/&/g, "and")
      .replace(/[^a-z0-9 ]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function findSuggestedCategoryId(rawText?: string) {
    const text = normaliseSearchText(
      [
        rawText,
        itemName,
        supplierName,
        scrapedDescription,
        selectedFeatureName,
        customBudgetFeatureName,
      ]
        .filter(Boolean)
        .join(" "),
    );

    if (!text || categories.length === 0) return "";

    const sortedCategories = categories
      .slice()
      .filter((category) => normaliseSearchText(category.name) !== "other")
      .sort(
        (a, b) =>
          normaliseSearchText(b.name).length -
          normaliseSearchText(a.name).length,
      );

    const directMatch = sortedCategories.find((category) => {
      const categoryName = normaliseSearchText(category.name);
      return categoryName && text.includes(categoryName);
    });

    if (directMatch) return directMatch.id;

    const categoryHints = [
      {
        category: "Windows & Doors",
        keywords: [
          "window",
          "windows",
          "door",
          "doors",
          "glazing",
          "skylight",
          "sliding",
          "stacker",
          "bifold",
          "entry door",
        ],
      },
      {
        category: "Flooring",
        keywords: [
          "floor",
          "flooring",
          "tile",
          "tiles",
          "carpet",
          "hybrid",
          "timber",
          "vinyl",
          "laminate",
          "underlay",
        ],
      },
      {
        category: "Kitchen",
        keywords: [
          "kitchen",
          "cooktop",
          "oven",
          "rangehood",
          "dishwasher",
          "sink",
          "benchtop",
          "cabinetry",
          "pantry",
        ],
      },
      {
        category: "Bathrooms & Ensuites",
        keywords: [
          "bathroom",
          "ensuite",
          "toilet",
          "vanity",
          "shower",
          "bath",
          "tapware",
          "basin",
          "mirror",
        ],
      },
      {
        category: "Laundry",
        keywords: ["laundry", "washer", "dryer", "trough"],
      },
      {
        category: "Lighting & Electrical",
        keywords: [
          "light",
          "lighting",
          "pendant",
          "downlight",
          "switch",
          "powerpoint",
          "electrical",
          "fan",
        ],
      },
      {
        category: "Outdoor Living",
        keywords: [
          "deck",
          "decking",
          "alfresco",
          "patio",
          "pergola",
          "balcony",
          "outdoor",
        ],
      },
      {
        category: "Pool",
        keywords: ["pool", "spa", "pool fence", "pool fencing", "fencing"],
      },
      {
        category: "Joinery",
        keywords: [
          "robe",
          "wardrobe",
          "wir",
          "joinery",
          "cabinet",
          "linen",
          "storage",
          "shelving",
        ],
      },
      {
        category: "Appliances",
        keywords: [
          "appliance",
          "fridge",
          "oven",
          "cooktop",
          "dishwasher",
          "rangehood",
          "microwave",
        ],
      },
      {
        category: "Siteworks",
        keywords: [
          "retaining",
          "excavation",
          "drainage",
          "concrete",
          "driveway",
          "earthworks",
        ],
      },
    ];

    const matchedHint = categoryHints.find((hint) =>
      hint.keywords.some((keyword) =>
        text.includes(normaliseSearchText(keyword)),
      ),
    );

    if (!matchedHint) return "";

    const target = normaliseSearchText(matchedHint.category);
    const targetWords = target.split(" ").filter((word) => word.length > 2);

    const matchedCategory = sortedCategories.find((category) => {
      const categoryName = normaliseSearchText(category.name);
      return (
        categoryName.includes(target) ||
        target.includes(categoryName) ||
        targetWords.some((word) => categoryName.includes(word))
      );
    });

    return matchedCategory?.id || "";
  }

  function maybeAutoSelectCategory(rawText?: string) {
    if (selectedCategory) return;

    const suggestedCategoryId = findSuggestedCategoryId(rawText);
    if (suggestedCategoryId) {
      setSelectedCategory(suggestedCategoryId);
    }
  }

  const isFlooringItem =
    flooringDetectionText.includes("floor") ||
    flooringDetectionText.includes("flooring") ||
    flooringDetectionText.includes("tile") ||
    flooringDetectionText.includes("tiles") ||
    flooringDetectionText.includes("carpet") ||
    flooringDetectionText.includes("hybrid") ||
    flooringDetectionText.includes("timber") ||
    flooringDetectionText.includes("vinyl") ||
    flooringDetectionText.includes("laminate");

  function getProfileLabel(
    group: keyof typeof costProfileOptions,
    value: string,
  ) {
    return (
      costProfileOptions[group].find((option) => option.value === value)
        ?.label ||
      value ||
      "Not set"
    );
  }

  function csvCell(value: any) {
    const text = String(value ?? "").replace(/[\r\n]+/g, " ");
    if (/[",]/.test(text)) {
      return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
  }

  function downloadCsv(filename: string, rows: any[][]) {
    const csv = rows.map((row) => row.map(csvCell).join(",")).join("\n");
    const blob = new Blob(["\ufeff" + csv], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function exportBudgetItemsCsv() {
    if (items.length === 0) {
      showNotice("Add at least one budget item before exporting.");
      return;
    }

    const categoryById = new Map(
      categories.map((category) => [category.id, category.name || ""]),
    );

    const rows = [
      [
        "Project",
        "Category",
        "Item",
        "Quantity",
        "Unit",
        "Estimated Cost",
        "Total",
        "Status",
        "Supplier",
        "Product Number",
        "Supplier URL",
        "Feature",
        "Sqm",
        "Cost per Sqm",
        "Wastage Included",
      ],
      ...items.map((item) => [
        project?.name || "Project",
        categoryById.get(item.category_id) || "Uncategorised",
        item.item_name || "",
        Number(item.quantity || 1),
        item.price_unit || "item",
        Number(item.estimated_cost || 0),
        calculateItemTotal(item),
        item.product_status || "Planned",
        item.supplier_name || "",
        item.product_number || "",
        item.supplier_url || "",
        item.feature_name || "",
        item.sqm || "",
        item.cost_per_sqm || "",
        item.include_wastage ? "Yes" : "No",
      ]),
    ];

    downloadCsv(`${project?.name || "project"}-budget-items.csv`, rows);
  }

  function exportCostForecastCsv() {
    if (!latestEstimate) {
      showNotice("Generate a cost forecast before exporting.");
      return;
    }

    const rows: any[][] = [
      ["Project", project?.name || "Project"],
      ["Generated", latestEstimate.created_at ? new Date(latestEstimate.created_at).toLocaleString() : new Date().toLocaleString()],
      [],
      ["Cost Forecast Summary"],
      ["Likely Project Cost", likelyEstimateTotal],
      ["Expected Planning Range Low", expectedEstimateLow],
      ["Expected Planning Range High", expectedEstimateHigh],
      ["Building Works Low", adjustedWorksLow],
      ["Building Works High", adjustedWorksHigh],
      ["Site & Project Costs Low", projectCostAdditions?.total_low || 0],
      ["Site & Project Costs High", projectCostAdditions?.total_high || 0],
      ["Known Selections", latestEstimate.known_items_total || 0],
      ["Contingency Low", latestEstimate.contingency_low || 0],
      ["Contingency High", latestEstimate.contingency_high || 0],
      [],
      ["Project Summary"],
      ["Bedrooms", buildSummary.bedroomCount],
      ["Bathrooms", buildSummary.bathroomCount],
      ["Rooms", buildSummary.roomCount],
      ["Features", buildSummary.featureCount],
      ["Approx Area m2", buildSummary.totalSqm.toFixed(2)],
    ];

    const rooms = latestEstimateBreakdown.rooms || [];
    if (rooms.length > 0) {
      rows.push([], ["Room Cost Breakdown"], ["Room", "Type", "Sqm", "Low", "High"]);
      rooms.forEach((room: any) => {
        rows.push([
          room.room_name || "",
          room.room_type || "",
          getDisplaySqm(room).toFixed(2),
          room.estimate?.low || room.low || 0,
          room.estimate?.high || room.high || 0,
        ]);
      });
    }

    const features = latestEstimateBreakdown.features || [];
    if (features.length > 0) {
      rows.push([], ["Feature Cost Breakdown"], ["Feature", "Type", "Quantity", "Area Sqm", "Length m", "Low", "High"]);
      features.forEach((feature: any) => {
        rows.push([
          feature.feature_name || feature.feature_type || "",
          feature.feature_type || "",
          feature.quantity || 1,
          feature.estimated_area_sqm || "",
          feature.estimated_length_m || "",
          feature.estimate?.low || feature.low || 0,
          feature.estimate?.high || feature.high || 0,
        ]);
      });
    }

    downloadCsv(`${project?.name || "project"}-cost-forecast.csv`, rows);
  }

  function printCostForecast() {
    if (!latestEstimate) {
      showNotice("Generate a cost forecast before printing the report.");
      return;
    }

    window.print();
  }

  return (
    <>
      <AppNavbar />

      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 14mm;
          }

          body {
            background: #ffffff !important;
            color: #0F172A !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          nav,
          header,
          .no-print {
            display: none !important;
          }

          main {
            background: #ffffff !important;
          }

          #project-main-content {
            max-width: none !important;
            padding: 0 !important;
          }

          .print-report {
            box-shadow: none !important;
            border: 0 !important;
          }

          .print-card {
            break-inside: avoid;
            page-break-inside: avoid;
          }

          a {
            color: #0F172A !important;
            text-decoration: none !important;
          }
        }
      `}</style>

      <main className="min-h-screen bg-white">
        <header className="border-b border-[#D9D2C3]/50 bg-white/95 backdrop-blur-xl">
          <div className="mx-auto max-w-7xl px-6 py-8 md:px-8 md:py-10">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-3xl">
                <div className="mb-4 inline-flex rounded-full border border-[#D9D2C3] bg-[#F8F6F1] px-4 py-2 text-sm font-semibold text-[#2E7D6B]">
                  Build smarter from the start
                </div>

                <h1 className="text-4xl font-bold tracking-tight text-[#0F172A] md:text-5xl">
                  {project.name}
                </h1>

                <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600 md:text-lg">
                  {project.description ||
                    "Understand your likely costs, organise your plans, track selections and make informed decisions before construction begins."}
                </p>

                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  <div className={`rounded-2xl border px-4 py-3 ${stageMeta.softBg} ${stageMeta.border}`}>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Current Stage
                    </p>
                    <p className={`mt-1 text-sm font-bold ${stageMeta.text}`}>
                      {stageMeta.label}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-[#D9D2C3]/60 bg-white px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Project Type
                    </p>
                    <p className="mt-1 text-sm font-bold text-[#0F172A]">
                      {project.project_type || "Not set"}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-[#D9D2C3]/60 bg-white px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Location
                    </p>
                    <p className="mt-1 text-sm font-bold text-[#0F172A]">
                      {projectLocation || "Not set"}
                    </p>
                  </div>
                </div>

                <div className="mt-4 max-w-xl">
                  <div className="mb-1 flex items-center justify-between text-xs font-semibold text-slate-500">
                    <span>Build journey</span>
                    <span>{projectStageProgressPercent}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100">
                    <div
                      className={`h-2 rounded-full ${stageMeta.bar}`}
                      style={{ width: `${projectStageProgressPercent}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="grid w-full gap-4 sm:grid-cols-2 lg:w-auto lg:min-w-[460px]">
                <div className="rounded-2xl border border-[#D9D2C3]/60 bg-white p-6 shadow-sm">
                  <p className="text-sm text-slate-600">Tracked Budget Items</p>
                  <p className="mt-2 text-3xl font-bold">
                    ${formatMoney(projectTotal)}
                  </p>
                  <p className="mt-2 text-xs text-slate-500">
                    Current total from saved selections and cost items.
                  </p>
                </div>

                <div className="rounded-2xl border border-[#D9D2C3]/60 bg-white p-6 shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-slate-500">
                        Project Readiness
                      </p>
                      <p className="mt-2 text-3xl font-bold text-[#0F172A]">
                        {projectReadinessPercent}%
                      </p>
                    </div>
                    <span className="rounded-full bg-[#4F46E5]/10 px-3 py-1 text-sm font-semibold text-[#4F46E5]">
                      Guided
                    </span>
                  </div>
                  <div className="mt-4 h-2 rounded-full bg-slate-100">
                    <div
                      className="h-2 rounded-full bg-[#2E7D6B]"
                      style={{ width: `${projectReadinessPercent}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 rounded-2xl border border-[#D9D2C3]/60 bg-[#F8F6F1] p-5">
              <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-lg font-bold text-[#0F172A]">
                    Planning Readiness Checklist
                  </h2>
                  <p className="text-sm text-slate-600">
                    Complete each step to improve your cost forecast and make
                    the project easier to compare before you commit.
                  </p>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <div
                    className={`rounded-full px-4 py-2 text-sm font-semibold ${
                      estimateStatus === "current"
                        ? "bg-[#2E7D6B]/10 text-[#2E7D6B]"
                        : estimateStatus === "outdated"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-white text-slate-700"
                    }`}
                  >
                    {estimateStatus === "current"
                      ? "Cost Forecast Current"
                      : estimateStatus === "outdated"
                        ? "Cost Forecast Needs Updating"
                        : "Cost Forecast Not Started"}
                  </div>

                  <button
                    type="button"
                    onClick={handleContinueSetup}
                    className="rounded-full bg-[#4F46E5] px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#4338CA] hover:shadow-md"
                  >
                    Continue Setup →
                  </button>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-6">
                {readinessSteps.map((stage) => (
                  <div
                    key={stage.label}
                    className={`rounded-2xl border px-4 py-3 ${
                      stage.status === "done"
                        ? "border-[#2E7D6B]/30 bg-white"
                        : stage.status === "warning"
                          ? "border-amber-200 bg-amber-50"
                          : "border-[#D9D2C3] bg-white"
                    }`}
                  >
                    <div className="text-2xl">
                      {stage.status === "done"
                        ? "✓"
                        : stage.status === "warning"
                          ? "!"
                          : "○"}
                    </div>
                    <p className="mt-2 text-sm font-semibold text-[#0F172A]">
                      {stage.label}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-8 flex gap-2 overflow-x-auto rounded-full border border-[#D9D2C3]/60 bg-white p-2 shadow-sm">
              {[
                { id: "overview", label: "Project Summary" },
                { id: "plans", label: "Plans & Insights" },
                { id: "budget", label: "Budget & Selections" },
                { id: "estimate", label: "Cost Forecast" },
                { id: "products", label: "Products & Inspiration" },
                { id: "timeline", label: "Build Journey" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`whitespace-nowrap rounded-full px-5 py-3 text-sm font-semibold transition ${
                    activeTab === tab.id
                      ? "bg-[#0F172A] text-white shadow-sm"
                      : "text-slate-600 hover:bg-[#F8F6F1] hover:text-[#0F172A]"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-5">
              <div className="rounded-2xl border border-[#D9D2C3]/60 bg-white p-5 shadow-sm">
                <p className="text-sm text-slate-500">Budget Target</p>
                <p className="text-2xl font-bold text-[#0F172A]">
                  ${formatMoney(budgetTarget)}
                </p>
              </div>

              <div className="rounded-2xl border border-[#D9D2C3]/60 bg-white p-5 shadow-sm">
                <p className="text-sm text-slate-500">Tracked Total</p>
                <p className="text-2xl font-bold text-[#0F172A]">
                  ${formatMoney(projectTotal)}
                </p>
              </div>

              <div className="rounded-2xl border border-[#D9D2C3]/60 bg-white p-5 shadow-sm">
                <p className="text-sm text-slate-500">Remaining Budget</p>
                <p
                  className={`text-2xl font-bold ${
                    remainingBudget < 0 ? "text-red-600" : "text-[#2E7D6B]"
                  }`}
                >
                  ${formatMoney(remainingBudget)}
                </p>
              </div>

              <div className="rounded-2xl border border-[#D9D2C3]/60 bg-white p-5 shadow-sm">
                <p className="text-sm text-slate-500">Purchased Total</p>
                <p className="text-2xl font-bold text-[#2E7D6B]">
                  ${formatMoney(purchasedTotal)}
                </p>
              </div>

              <div className="rounded-2xl border border-[#D9D2C3]/60 bg-white p-5 shadow-sm">
                <p className="text-sm text-slate-500">Budget Items</p>
                <p className="text-2xl font-bold text-[#0F172A]">{itemCount}</p>
              </div>
            </div>
          </div>
        </header>

        <div id="project-main-content" className="max-w-7xl mx-auto px-8 py-10">
          {activeTab === "plans" && (
            <div className="space-y-6">
              <section className="overflow-hidden rounded-2xl border border-[#D9D2C3]/60 bg-white shadow-sm">
                <div className="bg-white border-b border-[#D9D2C3]/60 px-8 py-7 text-[#0F172A]">
                  <p className="text-sm font-semibold uppercase tracking-wide text-[#4F46E5]">
                    Plans & Insights
                  </p>
                  <div className="mt-3 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                      <h2 className="text-3xl font-bold md:text-4xl">
                        Understand what is inside your plans
                      </h2>
                      <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
                        Upload your plans to help identify rooms, features,
                        measurements and likely cost drivers. No plans yet? You
                        can still add rooms and features manually.
                      </p>
                    </div>

                    <div className="min-w-[260px] rounded-2xl bg-[#F8F7FF] border border-[#4F46E5]/10 p-4">
                      <div className="mb-2 flex justify-between text-sm font-semibold text-slate-600">
                        <span>Plans progress</span>
                        <span>{plansInsightPercent}%</span>
                      </div>
                      <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-[#2E7D6B]"
                          style={{ width: `${plansInsightPercent}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 border-b border-[#D9D2C3]/60 bg-[#F8F6F1] p-5 md:grid-cols-5">
                  {plansInsightSteps.map((step) => (
                    <div
                      key={step.label}
                      className={`rounded-2xl border px-4 py-3 ${
                        step.done
                          ? "border-[#2E7D6B]/30 bg-white"
                          : "border-[#D9D2C3] bg-white"
                      }`}
                    >
                      <div className="text-2xl">{step.done ? "✓" : "○"}</div>
                      <p className="mt-2 text-sm font-semibold text-[#0F172A]">
                        {step.label}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="grid gap-4 p-6 md:grid-cols-4">
                  <div className="rounded-2xl border border-[#D9D2C3]/60 bg-white p-5">
                    <p className="text-sm text-slate-500">Rooms Identified</p>
                    <p className="mt-1 text-3xl font-bold text-[#0F172A]">
                      {planRooms.length}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-[#D9D2C3]/60 bg-white p-5">
                    <p className="text-sm text-slate-500">
                      Features Identified
                    </p>
                    <p className="mt-1 text-3xl font-bold text-[#0F172A]">
                      {groupedPlanFeatures.length}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-[#D9D2C3]/60 bg-white p-5">
                    <p className="text-sm text-slate-500">Plans Uploaded</p>
                    <p className="mt-1 text-3xl font-bold text-[#0F172A]">
                      {plans.length}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-[#D9D2C3]/60 bg-white p-5">
                    <p className="text-sm text-slate-500">Approx. Floor Area</p>
                    <p className="mt-1 text-3xl font-bold text-[#0F172A]">
                      {identifiedFloorArea > 0
                        ? `${identifiedFloorArea.toFixed(0)}m²`
                        : "—"}
                    </p>
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-[#D9D2C3]/60 bg-white p-8 shadow-sm">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-[#2E7D6B]">
                      Project Summary
                    </p>
                    <h3 className="mt-2 text-2xl font-bold text-[#0F172A]">
                      {buildSummary.headline ||
                        "Project details will appear here"}
                    </h3>
                    <p className="mt-2 text-sm text-slate-500">
                      {plansUploaded || roomsAdded || featuresReviewed
                        ? "This summary updates as you upload plans, add rooms, review features and generate forecasts."
                        : "Upload plans or add rooms manually to start building your project summary."}
                    </p>
                  </div>

                  <div className="grid w-full gap-3 sm:grid-cols-3 lg:w-auto lg:min-w-[420px]">
                    <div className="rounded-2xl bg-[#F8F6F1] p-4 text-center">
                      <p className="text-xs text-slate-500">Windows</p>
                      <p className="mt-1 text-2xl font-bold text-[#0F172A]">
                        {windowCount}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-[#F8F6F1] p-4 text-center">
                      <p className="text-xs text-slate-500">External Doors</p>
                      <p className="mt-1 text-2xl font-bold text-[#0F172A]">
                        {externalDoorCount}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-[#F8F6F1] p-4 text-center">
                      <p className="text-xs text-slate-500">Wet Areas</p>
                      <p className="mt-1 text-2xl font-bold text-[#0F172A]">
                        {wetAreaCount}
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              <section className="grid gap-6 lg:grid-cols-2">
                <div className="rounded-2xl border border-[#D9D2C3]/60 bg-white p-8 shadow-sm">
                  <p className="text-sm font-semibold text-[#2E7D6B]">
                    Measurements Identified
                  </p>
                  <h3 className="mt-2 text-2xl font-bold text-[#0F172A]">
                    Key measurements for planning
                  </h3>
                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl bg-[#F8F6F1] p-4">
                      <p className="text-xs text-slate-500">
                        Approx. Floor Area
                      </p>
                      <p className="mt-1 text-2xl font-bold text-[#0F172A]">
                        {identifiedFloorArea > 0
                          ? `${identifiedFloorArea.toFixed(0)}m²`
                          : "Not available yet"}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-[#F8F6F1] p-4">
                      <p className="text-xs text-slate-500">Rooms with Area</p>
                      <p className="mt-1 text-2xl font-bold text-[#0F172A]">
                        {
                          planRooms.filter((room) => getDisplaySqm(room) > 0)
                            .length
                        }
                      </p>
                    </div>
                  </div>
                  <p className="mt-4 text-sm text-slate-500">
                    Confirming room measurements helps improve flooring,
                    selections and future cost planning.
                  </p>
                </div>

                <div className="rounded-2xl border border-[#D9D2C3]/60 bg-white p-8 shadow-sm">
                  <p className="text-sm font-semibold text-[#2E7D6B]">
                    Project Insights
                  </p>
                  <h3 className="mt-2 text-2xl font-bold text-[#0F172A]">
                    Things worth reviewing
                  </h3>
                  {projectInsightItems.length === 0 ? (
                    <p className="mt-5 rounded-2xl border border-dashed p-5 text-sm text-slate-500">
                      Insights will appear here as rooms, features and
                      selections are added to the project.
                    </p>
                  ) : (
                    <div className="mt-5 space-y-3">
                      {projectInsightItems.map((item) => (
                        <div
                          key={item}
                          className="rounded-2xl border border-[#D9D2C3]/60 bg-[#F8F6F1] p-4 text-sm text-slate-700"
                        >
                          {item}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>

              <section
                id="plans-upload-section"
                className="rounded-2xl border border-[#D9D2C3]/60 bg-white p-6 shadow-sm"
              >
                <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-[#2E7D6B]">
                      Plans & Insights
                    </p>
                    <h2 className="mt-1 text-2xl font-bold text-[#0F172A]">
                      Upload and manage your plans
                    </h2>
                    <p className="mt-2 max-w-2xl text-sm text-slate-500">
                      Upload plans when you have them, or keep building the
                      project manually. Uploaded plans can be processed to
                      identify useful pages, rooms, features and measurements.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={loadPlans}
                    className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition-all hover:bg-[#F8F6F1] hover:shadow-md"
                  >
                    ↻ Refresh
                  </button>
                </div>

                <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
                  <div className="rounded-2xl border border-dashed border-[#D9D2C3] bg-[#F8F6F1] p-5">
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-2xl shadow-sm">
                      📐
                    </div>
                    <h3 className="text-lg font-bold text-[#0F172A]">
                      Add plans
                    </h3>
                    <p className="mt-2 text-sm text-slate-500">
                      PDF, JPG, PNG or WEBP. PDFs must be under 10MB.
                    </p>

                    <input
                      id="plan-upload-input"
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg,.webp"
                      onChange={(e) => {
                        const file = e.target.files?.[0] ?? null;

                        if (!file) {
                          setPlanUploadFile(null);
                          return;
                        }

                        const maxPdfSize = 10 * 1024 * 1024;

                        if (
                          file.type === "application/pdf" &&
                          file.size > maxPdfSize
                        ) {
                          showNotice(
                            "This PDF is larger than 10MB. Please compress the PDF before uploading.",
                          );
                          e.target.value = "";
                          setPlanUploadFile(null);
                          return;
                        }

                        setPlanUploadFile(file);
                      }}
                      className="hidden"
                    />

                    <label
                      htmlFor="plan-upload-input"
                      className="mt-4 flex cursor-pointer items-center justify-center rounded-2xl border border-[#D9D2C3] bg-white px-4 py-3 text-sm font-semibold text-[#0F172A] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                    >
                      Choose file
                    </label>

                    {planUploadFile && (
                      <div className="mt-4 rounded-2xl border border-[#D9D2C3]/60 bg-white p-3">
                        <p className="text-xs font-semibold text-slate-500">
                          Selected file
                        </p>
                        <p className="mt-1 break-words text-sm font-semibold text-[#0F172A]">
                          {planUploadFile.name}
                        </p>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={handlePlanUpload}
                      disabled={!planUploadFile || uploadingPlan}
                      className="mt-4 w-full rounded-2xl bg-[#4F46E5] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#4338CA] hover:shadow-md disabled:cursor-not-allowed disabled:bg-gray-300 disabled:hover:translate-y-0 disabled:hover:shadow-sm"
                    >
                      {uploadingPlan ? "Uploading..." : "Upload Plan"}
                    </button>
                  </div>

                  <div className="rounded-2xl border border-[#D9D2C3]/60 bg-white p-5">
                    <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h3 className="text-xl font-bold text-[#0F172A]">
                          Uploaded Plans
                        </h3>
                        <p className="text-sm text-slate-500">
                          Open, process or delete plans attached to this
                          project.
                        </p>
                      </div>
                      <span className="rounded-full bg-[#F8F6F1] px-3 py-1 text-xs font-semibold text-slate-600">
                        {plans.length} uploaded
                      </span>
                    </div>

                    {plans.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-[#D9D2C3] bg-[#F8F6F1] p-6 text-center">
                        <div className="mb-3 text-4xl">📄</div>
                        <h4 className="text-lg font-bold text-[#0F172A]">
                          No plans uploaded yet
                        </h4>
                        <p className="mx-auto mt-2 max-w-lg text-sm text-slate-500">
                          You can still create rooms manually, add features,
                          track products and generate budgets. Uploading plans
                          helps provide a more complete project summary.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {plans.map((plan) => (
                          <div
                            key={plan.id}
                            className="rounded-2xl border border-[#D9D2C3]/60 bg-white p-4 shadow-sm"
                          >
                            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                              <div className="min-w-0 flex-1">
                                <h4 className="truncate text-lg font-bold text-[#0F172A]">
                                  {plan.display_name || plan.original_filename}
                                </h4>
                                <p className="mt-1 truncate text-sm text-slate-500">
                                  {plan.original_filename}
                                </p>

                                <div className="mt-3 flex flex-wrap gap-2">
                                  <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
                                    {plan.file_type?.toUpperCase() || "FILE"}
                                  </span>
                                  <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
                                    {plan.status || "uploaded"}
                                  </span>
                                </div>

                                {String(plan.file_type || "").toLowerCase() ===
                                  "pdf" && (
                                  <div className="mt-4">
                                    <label className="mb-1 block text-xs font-semibold text-gray-500">
                                      Pages to process
                                    </label>
                                    <input
                                      value={planPagesToProcess[plan.id] || ""}
                                      onChange={(e) =>
                                        setPlanPagesToProcess((current) => ({
                                          ...current,
                                          [plan.id]: e.target.value,
                                        }))
                                      }
                                      placeholder="e.g. 2, 5, 8"
                                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
                                    />
                                    <p className="mt-1 text-xs text-gray-400">
                                      Leave blank to process page 1 only.
                                    </p>
                                  </div>
                                )}
                              </div>

                              <div className="flex shrink-0 flex-wrap gap-2 xl:justify-end">
                                <button
                                  onClick={() => processPlan(plan.id)}
                                  disabled={processingPlanId === plan.id}
                                  className="rounded-full bg-[#4F46E5] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#4338CA] disabled:opacity-50 disabled:hover:translate-y-0"
                                >
                                  {processingPlanId === plan.id
                                    ? "Processing..."
                                    : "Process"}
                                </button>

                                <button
                                  onClick={() => openPlan(plan.storage_path)}
                                  className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-[#F8F6F1]"
                                >
                                  Open
                                </button>

                                <button
                                  onClick={() =>
                                    deletePlan(plan.id, plan.storage_path)
                                  }
                                  className="rounded-full bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-100"
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </section>

              <section className="bg-white border border-[#D9D2C3]/60 rounded-2xl p-8">
                <h3 className="text-2xl font-bold mb-3">Detected Plan Pages</h3>
                <p className="text-gray-500 mb-6">
                  Review the pages created from your uploaded plans, label the
                  useful ones, and delete anything you do not need.
                </p>

                {planPages.length === 0 ? (
                  <p className="text-gray-500">
                    No plan pages detected yet. Process an uploaded image plan
                    to create your first page.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {sortedPlanPages.map((page) => (
                      <div
                        key={page.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => selectPlanPageForRooms(page)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            selectPlanPageForRooms(page);
                          }
                        }}
                        className={`cursor-pointer rounded-2xl border p-5 bg-white flex flex-col md:flex-row md:items-center justify-between gap-5 transition-all hover:-translate-y-0.5 hover:shadow-md ${
                          activeRoomPage?.id === page.id || page.is_selected
                            ? "border-[#4F46E5] ring-2 ring-[#4F46E5]/20 shadow-md"
                            : "border-[#D9D2C3]/60"
                        }`}
                      >
                        {page.signedUrl && (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              openPlanPage(page.image_path);
                            }}
                            className="w-full md:w-40 shrink-0 overflow-hidden rounded-2xl border bg-gray-100 hover:shadow-md transition-all"
                          >
                            <img
                              src={page.signedUrl}
                              alt={`Page ${page.page_number}`}
                              className="h-32 w-full object-cover"
                            />
                          </button>
                        )}
                        <div>
                          <h4 className="text-lg font-bold">
                            {page.project_plans?.display_name ||
                              page.project_plans?.original_filename ||
                              "Plan"}{" "}
                            — Page {page.page_number}
                          </h4>

                          <p className="text-sm text-gray-500 mt-1">
                            Type: {page.detected_type || "pending"}
                          </p>

                          {page.preview_only && (
                            <p className="text-xs text-amber-700 font-medium mt-1">
                              Preview only — select this page and click Process
                              Selected to use it.
                            </p>
                          )}

                          <div className="mt-3 flex gap-2 flex-wrap">
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-medium ${
                                page.is_selected
                                  ? "bg-[#2E7D6B]/10 text-[#2E7D6B]"
                                  : "bg-gray-100 text-gray-600"
                              }`}
                            >
                              {activeRoomPage?.id === page.id ||
                              page.is_selected
                                ? "Active floor"
                                : "Click to review"}
                            </span>

                            <span
                              className={`rounded-full px-3 py-1 text-xs font-medium ${
                                page.preview_only
                                  ? "bg-amber-100 text-amber-700"
                                  : "bg-purple-100 text-purple-700"
                              }`}
                            >
                              {page.preview_only ? "Preview" : "Ready"}
                            </span>

                            {page.floor_level && (
                              <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700">
                                {page.floor_level}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-3 md:justify-end">
                          <select
                            value={page.floor_level || ""}
                            onClick={(event) => event.stopPropagation()}
                            onChange={(e) =>
                              updatePlanPage(page.id, {
                                floor_level: e.target.value || null,
                                is_selected: Boolean(e.target.value),
                              })
                            }
                            className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm"
                          >
                            <option value="">Set floor level</option>
                            <option value="Basement">Basement</option>
                            <option value="Ground Floor">Ground Floor</option>
                            <option value="First Floor">First Floor</option>
                            <option value="Second Floor">Second Floor</option>
                            <option value="Site Plan">Site Plan</option>
                            <option value="Other">Other</option>
                          </select>

                          <button
                            onClick={(event) => {
                              event.stopPropagation();
                              selectPlanPageForRooms(page);
                            }}
                            className="rounded-full bg-[#4F46E5] px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:-translate-y-0.5 hover:bg-[#4338CA] hover:shadow-md"
                          >
                            Review this floor
                          </button>

                          <button
                            onClick={(event) => {
                              event.stopPropagation();
                              suggestRoomsForPage(page.id);
                            }}
                            disabled={suggestingRoomsPageId === page.id}
                            className="rounded-full bg-[#2E7D6B] px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:-translate-y-0.5 hover:bg-[#256B5C] hover:shadow-md disabled:opacity-50"
                          >
                            {suggestingRoomsPageId === page.id
                              ? "Preparing..."
                              : "Suggest rooms & features"}
                          </button>

                          <button
                            onClick={(event) => {
                              event.stopPropagation();
                              openPlanPage(page.image_path);
                            }}
                            className="rounded-full border border-[#D9D2C3] bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-[#F8F6F1] hover:shadow-md"
                          >
                            Open
                          </button>

                          <button
                            onClick={(event) => {
                              event.stopPropagation();
                              deletePlanPage(page.id);
                            }}
                            className="rounded-full bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-100"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section
                id="rooms-identified-section"
                className="bg-white border border-[#D9D2C3]/60 rounded-2xl p-8"
              >
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
                  <div>
                    <h3 className="text-2xl font-bold mb-3">
                      Rooms Identified
                    </h3>
                    <p className="text-gray-500">
                      Select a plan page, add rooms manually, or generate room
                      and feature suggestions for review.
                    </p>
                    {activeRoomPage && (
                      <p className="text-sm text-gray-500 mt-2">
                        Current page:{" "}
                        {activeRoomPage.project_plans?.display_name ||
                          activeRoomPage.project_plans?.original_filename ||
                          "Plan"}{" "}
                        — Page {activeRoomPage.page_number}
                      </p>
                    )}
                  </div>

                  {activeRoomPage && (
                    <button
                      onClick={() => suggestRoomsForPage(activeRoomPage.id)}
                      disabled={suggestingRoomsPageId === activeRoomPage.id}
                      className="rounded-full bg-[#4F46E5] px-5 py-3 text-sm font-semibold text-white shadow-md hover:scale-105 hover:shadow-md transition-all disabled:opacity-50 disabled:hover:scale-100"
                    >
                      {suggestingRoomsPageId === activeRoomPage.id
                        ? "Preparing Suggestions..."
                        : "Suggest Rooms & Features"}
                    </button>
                  )}
                </div>

                {!activeRoomPage ? (
                  <div className="space-y-5">
                    <div className="rounded-2xl border border-dashed p-6 text-gray-600 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <p>
                        You can add rooms manually even if you do not have plans
                        yet. If you upload plans later, project suggestions can
                        still help refine this list.
                      </p>

                      <div className="flex flex-wrap gap-3">
                        <button
                          type="button"
                          onClick={startManualRoomSetup}
                          className="rounded-full bg-[#4F46E5] px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#4338CA]"
                        >
                          Add rooms manually
                        </button>

                        <button
                          type="button"
                          onClick={loadPlanRooms}
                          className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-[#F8F6F1] hover:shadow-md transition-all"
                        >
                          ↻ Refresh Rooms
                        </button>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-[#D9D2C3]/60 bg-[#F8F6F1] p-5">
                      <h4 className="mb-4 text-xl font-bold text-[#0F172A]">
                        Add Room Manually
                      </h4>
                      <div className="grid gap-3 md:grid-cols-3">
                        <div>
                          <label className="mb-1 block text-sm font-semibold text-gray-700">
                            Room name
                          </label>
                          <input
                            className="border rounded-xl p-3 w-full bg-white"
                            placeholder="e.g. Kitchen"
                            value={newRoomName}
                            onChange={(e) => setNewRoomName(e.target.value)}
                          />
                        </div>

                        <div>
                          <label className="mb-1 block text-sm font-semibold text-gray-700">
                            Room type
                          </label>
                          <select
                            className="border rounded-xl p-3 w-full bg-white"
                            value={newRoomType}
                            onChange={(e) => setNewRoomType(e.target.value)}
                          >
                            <option value="">Room type</option>
                            {roomTypes.map((type) => (
                              <option key={type} value={type}>
                                {type}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="mb-1 block text-sm font-semibold text-gray-700">
                            Floor level optional
                          </label>
                          <input
                            className="border rounded-xl p-3 w-full bg-white"
                            placeholder="e.g. Ground Floor"
                            value={newRoomFloorLevel}
                            onChange={(e) =>
                              setNewRoomFloorLevel(e.target.value)
                            }
                          />
                        </div>

                        <div>
                          <label className="mb-1 block text-sm font-semibold text-gray-700">
                            Length (m)
                          </label>
                          <input
                            className="border rounded-xl p-3 w-full bg-white"
                            type="number"
                            value={newRoomLengthM}
                            onChange={(e) => setNewRoomLengthM(e.target.value)}
                          />
                        </div>

                        <div>
                          <label className="mb-1 block text-sm font-semibold text-gray-700">
                            Width (m)
                          </label>
                          <input
                            className="border rounded-xl p-3 w-full bg-white"
                            type="number"
                            value={newRoomWidthM}
                            onChange={(e) => setNewRoomWidthM(e.target.value)}
                          />
                        </div>

                        <div>
                          <label className="mb-1 block text-sm font-semibold text-gray-700">
                            Ceiling height (m)
                          </label>
                          <input
                            className="border rounded-xl p-3 w-full bg-white"
                            type="number"
                            value={newRoomCeilingHeight}
                            onChange={(e) =>
                              setNewRoomCeilingHeight(e.target.value)
                            }
                          />
                        </div>
                      </div>

                      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-gray-700">
                          Calculated area:{" "}
                          {Number(newRoomLengthM) && Number(newRoomWidthM)
                            ? `${(Number(newRoomLengthM) * Number(newRoomWidthM)).toFixed(2)} sqm`
                            : "Enter length and width"}
                        </div>
                        <button
                          type="button"
                          onClick={addPlanRoom}
                          className="rounded-xl bg-[#4F46E5] px-5 py-3 text-sm font-semibold text-white shadow-md transition-all hover:-translate-y-0.5 hover:bg-[#4338CA] hover:shadow-md active:translate-y-0"
                        >
                          Add Room
                        </button>
                      </div>
                    </div>

                    {planRooms.length > 0 && (
                      <div>
                        <h4 className="text-xl font-bold mb-4">Saved Rooms</h4>
                        <div className="grid md:grid-cols-2 gap-4">
                          {planRooms.map((room) => (
                            <div
                              key={room.id}
                              className="border border-[#D9D2C3]/60 rounded-2xl p-5 bg-white shadow-sm"
                            >
                              <div className="flex justify-between gap-4 items-start">
                                <div>
                                  <h4 className="text-xl font-bold">
                                    {room.room_name}
                                  </h4>
                                  <p className="text-sm text-gray-500 mt-1">
                                    {room.room_type || "Other"}
                                  </p>
                                </div>

                                <button
                                  onClick={() => deletePlanRoom(room.id)}
                                  className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-100"
                                >
                                  Delete
                                </button>
                              </div>

                              <div className="mt-4 flex flex-wrap gap-2 text-xs font-medium">
                                {room.floor_level && (
                                  <span className="rounded-full bg-[#4F46E5]/10 px-3 py-1 text-[#4F46E5]">
                                    {room.floor_level}
                                  </span>
                                )}

                                {room.renovation_type && (
                                  <span className="rounded-full bg-purple-100 px-3 py-1 text-purple-700">
                                    {room.renovation_type}
                                  </span>
                                )}

                                {room.length_m && room.width_m && (
                                  <span className="rounded-full bg-[#2E7D6B]/10 px-3 py-1 text-[#2E7D6B]">
                                    {room.length_m}m × {room.width_m}m
                                  </span>
                                )}

                                {room.estimated_sqm && (
                                  <span className="rounded-full bg-green-100 px-3 py-1 text-green-700">
                                    {Number(room.estimated_sqm).toFixed(2)} sqm
                                  </span>
                                )}

                                {room.ceiling_height ? (
                                  <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-800">
                                    Ceiling: {room.ceiling_height}m
                                  </span>
                                ) : (
                                  <span className="rounded-full bg-red-100 px-3 py-1 text-red-700">
                                    ⚠ Ceiling height missing
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="grid lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-1 border border-[#D9D2C3]/60 rounded-2xl p-5 bg-[#F8F6F1]">
                      <p className="text-sm text-gray-500 mb-1">
                        Adding rooms for
                      </p>
                      <h4 className="text-xl font-bold mb-1">
                        {activeRoomPage.project_plans?.display_name ||
                          activeRoomPage.project_plans?.original_filename ||
                          "Plan"}{" "}
                        — Page {activeRoomPage.page_number}
                      </h4>
                      <p className="text-sm text-gray-500 mb-5">
                        {activeRoomPage.floor_level || "No floor level set"}
                      </p>

                      <div className="space-y-4">
                        <label className="mb-1 block text-sm font-semibold text-gray-700">
                          Room name
                        </label>
                        <input
                          className="border rounded-xl p-4 w-full bg-white"
                          placeholder="Room name, e.g. Kitchen"
                          value={newRoomName}
                          onChange={(e) => setNewRoomName(e.target.value)}
                        />

                        <label className="mb-1 block text-sm font-semibold text-gray-700">
                          Room type
                        </label>
                        <select
                          className="border rounded-xl p-4 w-full bg-white"
                          value={newRoomType}
                          onChange={(e) => setNewRoomType(e.target.value)}
                        >
                          <option value="">Room type</option>
                          {roomTypes.map((type) => (
                            <option key={type} value={type}>
                              {type}
                            </option>
                          ))}
                        </select>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="mb-1 block text-sm font-semibold text-gray-700">
                              Length (m)
                            </label>
                            <input
                              className="border rounded-xl p-4 w-full bg-white"
                              placeholder="e.g. 4.2"
                              type="number"
                              value={newRoomLengthM}
                              onChange={(e) =>
                                setNewRoomLengthM(e.target.value)
                              }
                            />
                          </div>

                          <div>
                            <label className="mb-1 block text-sm font-semibold text-gray-700">
                              Width (m)
                            </label>
                            <input
                              className="border rounded-xl p-4 w-full bg-white"
                              placeholder="e.g. 3.6"
                              type="number"
                              value={newRoomWidthM}
                              onChange={(e) => setNewRoomWidthM(e.target.value)}
                            />
                          </div>
                        </div>

                        <div className="rounded-2xl bg-gray-100 px-4 py-3 text-sm font-semibold text-gray-700">
                          Calculated area:{" "}
                          {Number(newRoomLengthM) && Number(newRoomWidthM)
                            ? `${(Number(newRoomLengthM) * Number(newRoomWidthM)).toFixed(2)} sqm`
                            : "Enter length and width"}
                        </div>

                        <div>
                          <label className="mb-1 block text-sm font-semibold text-gray-700">
                            Ceiling height (m)
                          </label>
                          <input
                            className="border rounded-xl p-4 w-full bg-white"
                            placeholder="e.g. 2.7"
                            type="number"
                            value={newRoomCeilingHeight}
                            onChange={(e) =>
                              setNewRoomCeilingHeight(e.target.value)
                            }
                          />
                        </div>

                        <div>
                          <label className="mb-1 block text-sm font-semibold text-gray-700">
                            Room work type
                          </label>
                          <select
                            className="border rounded-xl p-4 w-full bg-white"
                            value={newRoomRenovationType}
                            onChange={(e) =>
                              setNewRoomRenovationType(e.target.value)
                            }
                          >
                            <option value="renovation">Renovation</option>
                            <option value="extension">Extension</option>
                            <option value="existing">
                              Existing / retained
                            </option>
                          </select>
                        </div>

                        <button
                          onClick={addPlanRoom}
                          className="w-full rounded-xl bg-[#4F46E5] px-5 py-3 text-sm font-semibold text-white shadow-md transition-all hover:-translate-y-0.5 hover:bg-[#4338CA] hover:shadow-md active:translate-y-0"
                        >
                          Add Room
                        </button>
                      </div>
                    </div>

                    <div className="lg:col-span-2 space-y-6">
                      <div className="overflow-hidden rounded-2xl border border-[#D9D2C3]/60 bg-white shadow-sm">
                        <div className="flex flex-col gap-3 border-b border-[#D9D2C3]/60 bg-[#F8F6F1] px-5 py-4 md:flex-row md:items-center md:justify-between">
                          <div>
                            <p className="text-sm font-semibold text-[#2E7D6B]">
                              Selected floor plan
                            </p>
                            <h4 className="mt-1 text-xl font-bold text-[#0F172A]">
                              {activeRoomPage.project_plans?.display_name ||
                                activeRoomPage.project_plans
                                  ?.original_filename ||
                                "Plan"}{" "}
                              — Page {activeRoomPage.page_number}
                            </h4>
                            <p className="mt-1 text-sm text-slate-500">
                              Use this plan as a visual reference while you
                              review or add rooms.
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              suggestRoomsForPage(activeRoomPage.id)
                            }
                            disabled={
                              suggestingRoomsPageId === activeRoomPage.id
                            }
                            className="rounded-full bg-[#4F46E5] px-5 py-3 text-sm font-semibold text-white shadow-md transition hover:-translate-y-0.5 hover:bg-[#4338CA] hover:shadow-md disabled:opacity-50"
                          >
                            {suggestingRoomsPageId === activeRoomPage.id
                              ? "Preparing Suggestions..."
                              : "Suggest Rooms & Features"}
                          </button>
                        </div>

                        {activeRoomPageUrl ? (
                          <button
                            type="button"
                            onClick={() =>
                              openPlanPage(activeRoomPage.image_path)
                            }
                            className="block w-full bg-white p-4 text-left"
                          >
                            <img
                              src={activeRoomPageUrl}
                              alt="Selected floor plan"
                              className="max-h-[520px] w-full rounded-2xl border border-[#D9D2C3]/60 object-contain bg-white"
                            />
                          </button>
                        ) : (
                          <div className="p-6 text-sm text-slate-500">
                            This room list was created manually. Upload and
                            process plans to show a floor plan preview here.
                          </div>
                        )}
                      </div>

                      {planRooms.filter(
                        (room) => room.plan_page_id === activeRoomPage.id,
                      ).length === 0 ? (
                        <div className="border border-[#D9D2C3]/60 rounded-2xl p-6 text-gray-500 bg-white">
                          No rooms added for this page yet.
                        </div>
                      ) : (
                        <div className="grid md:grid-cols-2 gap-4">
                          {planRooms
                            .filter(
                              (room) => room.plan_page_id === activeRoomPage.id,
                            )
                            .map((room) => (
                              <div
                                key={room.id}
                                className={
                                  editingRoomId === room.id
                                    ? "fixed inset-0 z-50 flex items-center justify-center bg-[#0F172A]/40 p-4"
                                    : "border border-[#D9D2C3]/60 rounded-2xl p-5 bg-white shadow-sm"
                                }
                              >
                                <div
                                  className={
                                    editingRoomId === room.id
                                      ? "max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border bg-white p-6 shadow-xl"
                                      : ""
                                  }
                                >
                                  {editingRoomId === room.id ? (
                                    <div className="space-y-4">
                                      <div>
                                        <label className="mb-1 block text-sm font-semibold text-gray-700">
                                          Room name
                                        </label>
                                        <input
                                          className="border rounded-xl p-3 w-full bg-white"
                                          placeholder="e.g. Kitchen"
                                          value={editRoomName}
                                          onChange={(e) =>
                                            setEditRoomName(e.target.value)
                                          }
                                        />
                                      </div>

                                      <div>
                                        <label className="mb-1 block text-sm font-semibold text-gray-700">
                                          Room type
                                        </label>
                                        <select
                                          className="border rounded-xl p-3 w-full bg-white"
                                          value={editRoomType}
                                          onChange={(e) =>
                                            setEditRoomType(e.target.value)
                                          }
                                        >
                                          {roomTypes.map((type) => (
                                            <option key={type} value={type}>
                                              {type}
                                            </option>
                                          ))}
                                        </select>
                                      </div>

                                      <div className="grid grid-cols-2 gap-3">
                                        <div>
                                          <label className="mb-1 block text-sm font-semibold text-gray-700">
                                            Length (m)
                                          </label>
                                          <input
                                            className="border rounded-xl p-3 w-full bg-white"
                                            placeholder="e.g. 4.2"
                                            type="number"
                                            value={editRoomLengthM}
                                            onChange={(e) =>
                                              setEditRoomLengthM(e.target.value)
                                            }
                                          />
                                        </div>

                                        <div>
                                          <label className="mb-1 block text-sm font-semibold text-gray-700">
                                            Width (m)
                                          </label>
                                          <input
                                            className="border rounded-xl p-3 w-full bg-white"
                                            placeholder="e.g. 3.6"
                                            type="number"
                                            value={editRoomWidthM}
                                            onChange={(e) =>
                                              setEditRoomWidthM(e.target.value)
                                            }
                                          />
                                        </div>
                                      </div>

                                      <div className="rounded-2xl bg-gray-100 px-4 py-3 text-sm font-semibold text-gray-700">
                                        Calculated area:{" "}
                                        {Number(editRoomLengthM) &&
                                        Number(editRoomWidthM)
                                          ? `${(Number(editRoomLengthM) * Number(editRoomWidthM)).toFixed(2)} sqm`
                                          : "Enter length and width"}
                                      </div>

                                      <div>
                                        <label className="mb-1 block text-sm font-semibold text-gray-700">
                                          Ceiling height (m)
                                        </label>
                                        <input
                                          className="border rounded-xl p-3 w-full bg-white"
                                          placeholder="e.g. 2.7"
                                          type="number"
                                          value={editRoomCeilingHeight}
                                          onChange={(e) =>
                                            setEditRoomCeilingHeight(
                                              e.target.value,
                                            )
                                          }
                                        />
                                      </div>

                                      <div>
                                        <label className="mb-1 block text-sm font-semibold text-gray-700">
                                          Room work type
                                        </label>
                                        <select
                                          className="border rounded-xl p-3 w-full bg-white"
                                          value={editRoomRenovationType}
                                          onChange={(e) =>
                                            setEditRoomRenovationType(
                                              e.target.value,
                                            )
                                          }
                                        >
                                          <option value="renovation">
                                            Renovation
                                          </option>
                                          <option value="extension">
                                            Extension
                                          </option>
                                          <option value="existing">
                                            Existing / retained
                                          </option>
                                        </select>
                                      </div>

                                      <div className="flex gap-3">
                                        <button
                                          onClick={() => savePlanRoom(room.id)}
                                          className="rounded-full bg-[#0F172A] px-4 py-2 text-sm font-semibold text-white shadow-md hover:shadow-md transition-all"
                                        >
                                          Save
                                        </button>

                                        <button
                                          onClick={cancelEditPlanRoom}
                                          className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-[#F8F6F1] transition-all"
                                        >
                                          Cancel
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <>
                                      <div className="flex justify-between gap-4 items-start">
                                        <div>
                                          <h4 className="text-xl font-bold">
                                            {room.room_name}
                                          </h4>
                                          <p className="text-sm text-gray-500 mt-1">
                                            {room.room_type || "Other"}
                                          </p>
                                        </div>

                                        <div className="flex gap-2">
                                          <button
                                            onClick={() =>
                                              startEditPlanRoom(room)
                                            }
                                            className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-100"
                                          >
                                            Edit
                                          </button>

                                          <button
                                            onClick={() =>
                                              deletePlanRoom(room.id)
                                            }
                                            className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-100"
                                          >
                                            Delete
                                          </button>
                                        </div>
                                      </div>

                                      <div className="mt-4 flex flex-wrap gap-2 text-xs font-medium">
                                        {room.floor_level && (
                                          <span className="rounded-full bg-[#4F46E5]/10 px-3 py-1 text-[#4F46E5]">
                                            {room.floor_level}
                                          </span>
                                        )}

                                        {room.renovation_type && (
                                          <span className="rounded-full bg-purple-100 px-3 py-1 text-purple-700">
                                            {room.renovation_type}
                                          </span>
                                        )}

                                        {room.length_m && room.width_m && (
                                          <span className="rounded-full bg-[#2E7D6B]/10 px-3 py-1 text-[#2E7D6B]">
                                            {room.length_m}m × {room.width_m}m
                                          </span>
                                        )}

                                        {room.estimated_sqm && (
                                          <span className="rounded-full bg-green-100 px-3 py-1 text-green-700">
                                            {Number(room.estimated_sqm).toFixed(
                                              2,
                                            )}{" "}
                                            sqm
                                          </span>
                                        )}

                                        {room.ceiling_height ? (
                                          <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-800">
                                            Ceiling: {room.ceiling_height}m
                                          </span>
                                        ) : (
                                          <span className="rounded-full bg-red-100 px-3 py-1 text-red-700">
                                            ⚠ Ceiling height missing
                                          </span>
                                        )}
                                      </div>
                                    </>
                                  )}
                                </div>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </section>

              <section
                id="features-identified-section"
                className="bg-white border border-[#D9D2C3]/60 rounded-2xl p-8"
              >
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
                  <div>
                    <h3 className="text-2xl font-bold mb-3">
                      Features Identified
                    </h3>
                    <p className="text-gray-500">
                      High-level cost-impacting items detected from the plan,
                      such as windows, sliding doors, decks, voids, stairs and
                      pools.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={loadPlanFeatures}
                    className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-[#F8F6F1] hover:shadow-md transition-all"
                  >
                    ↻ Refresh Features
                  </button>
                </div>

                <div className="mb-6 rounded-2xl border bg-[#F8F6F1] p-5">
                  <h4 className="text-lg font-bold mb-4">
                    Add Feature Manually
                  </h4>
                  <div className="grid md:grid-cols-3 gap-3">
                    <div>
                      <label className="mb-1 block text-sm font-semibold text-gray-700">
                        Feature Type
                      </label>
                      <select
                        value={newFeatureType}
                        onChange={(e) => setNewFeatureType(e.target.value)}
                        className="rounded-xl border bg-white p-3 w-full"
                      >
                        {featureTypes.map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                    </div>

                    {newFeatureType === "Other" && (
                      <div className="md:col-span-2">
                        <label className="mb-1 block text-sm font-semibold text-gray-700">
                          Feature Name
                        </label>
                        <input
                          value={newFeatureName}
                          onChange={(e) => setNewFeatureName(e.target.value)}
                          placeholder="Custom feature name"
                          className="rounded-xl border bg-white p-3 w-full"
                        />
                      </div>
                    )}

                    <div>
                      <label className="mb-1 block text-sm font-semibold text-gray-700">
                        Quantity
                      </label>
                      <input
                        value={newFeatureQuantity}
                        onChange={(e) => setNewFeatureQuantity(e.target.value)}
                        type="number"
                        className="rounded-xl border bg-white p-3 w-full"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-semibold text-gray-700">
                        Length (m)
                      </label>
                      <input
                        value={newFeatureLengthM}
                        onChange={(e) => setNewFeatureLengthM(e.target.value)}
                        type="number"
                        className="rounded-xl border bg-white p-3 w-full"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-semibold text-gray-700">
                        Width (m)
                      </label>
                      <input
                        value={newFeatureWidthM}
                        onChange={(e) => setNewFeatureWidthM(e.target.value)}
                        type="number"
                        className="rounded-xl border bg-white p-3 w-full"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-semibold text-gray-700">
                        Area (sqm)
                      </label>
                      <input
                        value={newFeatureAreaSqm}
                        readOnly
                        type="number"
                        className="rounded-xl border bg-gray-100 p-3 w-full text-gray-700"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="mb-1 block text-sm font-semibold text-gray-700">
                        Notes
                      </label>
                      <input
                        value={newFeatureNotes}
                        onChange={(e) => setNewFeatureNotes(e.target.value)}
                        className="rounded-xl border bg-white p-3 w-full"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={addPlanFeature}
                    className="mt-4 rounded-xl bg-[#4F46E5] px-5 py-3 text-sm font-semibold text-white shadow-md transition-all hover:-translate-y-0.5 hover:bg-[#4338CA] hover:shadow-md active:translate-y-0"
                  >
                    Add Feature
                  </button>
                </div>

                {groupedPlanFeatures.length === 0 ? (
                  <div className="rounded-2xl border border-dashed p-6 text-gray-500">
                    No features identified yet. Select a plan page, then use
                    Suggest Rooms & Features to prepare items for review.
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {groupedPlanFeatures.map((feature) => (
                      <div
                        key={feature.id}
                        className={
                          editingFeatureGroupId === feature.id
                            ? "fixed inset-0 z-50 flex items-center justify-center bg-[#0F172A]/40 p-4"
                            : "border border-[#D9D2C3]/60 rounded-2xl p-5 bg-white shadow-sm"
                        }
                      >
                        <div
                          className={
                            editingFeatureGroupId === feature.id
                              ? "max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border bg-white p-6 shadow-xl"
                              : ""
                          }
                        >
                          {editingFeatureGroupId === feature.id ? (
                            <div className="space-y-4">
                              <select
                                value={editFeatureType}
                                onChange={(e) =>
                                  setEditFeatureType(e.target.value)
                                }
                                className="rounded-xl border bg-white p-3 w-full"
                              >
                                {featureTypes.map((type) => (
                                  <option key={type} value={type}>
                                    {type}
                                  </option>
                                ))}
                              </select>

                              <input
                                value={editFeatureName}
                                onChange={(e) =>
                                  setEditFeatureName(e.target.value)
                                }
                                placeholder="Feature name"
                                className="rounded-xl border bg-white p-3 w-full"
                              />

                              <div className="grid grid-cols-2 gap-3">
                                <input
                                  value={editFeatureQuantity}
                                  onChange={(e) =>
                                    setEditFeatureQuantity(e.target.value)
                                  }
                                  type="number"
                                  placeholder="Quantity"
                                  className="rounded-xl border bg-white p-3 w-full"
                                />

                                <input
                                  value={editFeatureAreaSqm}
                                  onChange={(e) =>
                                    setEditFeatureAreaSqm(e.target.value)
                                  }
                                  type="number"
                                  placeholder="Area (sqm)"
                                  className="rounded-xl border bg-white p-3 w-full"
                                />
                              </div>

                              <div className="grid grid-cols-2 gap-3">
                                <input
                                  value={editFeatureLengthM}
                                  onChange={(e) =>
                                    setEditFeatureLengthM(e.target.value)
                                  }
                                  type="number"
                                  placeholder="Length (m)"
                                  className="rounded-xl border bg-white p-3 w-full"
                                />

                                <input
                                  value={editFeatureWidthM}
                                  onChange={(e) =>
                                    setEditFeatureWidthM(e.target.value)
                                  }
                                  type="number"
                                  placeholder="Width (m)"
                                  className="rounded-xl border bg-white p-3 w-full"
                                />
                              </div>

                              <textarea
                                value={editFeatureNotes}
                                onChange={(e) =>
                                  setEditFeatureNotes(e.target.value)
                                }
                                placeholder="Notes"
                                rows={3}
                                className="rounded-xl border bg-white p-3 w-full"
                              />

                              <div className="flex gap-3">
                                <button
                                  onClick={() => saveFeatureGroup(feature)}
                                  className="rounded-full bg-[#0F172A] px-4 py-2 text-sm font-semibold text-white shadow-md hover:shadow-md transition-all"
                                >
                                  Save
                                </button>

                                <button
                                  onClick={cancelEditFeatureGroup}
                                  className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-[#F8F6F1] transition-all"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="flex justify-between gap-4 items-start">
                                <div>
                                  <h4 className="text-xl font-bold">
                                    {feature.feature_name ||
                                      feature.feature_type ||
                                      "Feature"}
                                  </h4>
                                  <p className="text-sm text-gray-500 mt-1">
                                    {feature.feature_type || "Other"}
                                  </p>
                                </div>

                                <div className="flex gap-2 flex-wrap justify-end">
                                  <button
                                    onClick={() =>
                                      prepareCostItemFromFeature(feature)
                                    }
                                    className="rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700 hover:bg-green-100"
                                  >
                                    Add cost item
                                  </button>

                                  <button
                                    onClick={() =>
                                      startEditFeatureGroup(feature)
                                    }
                                    className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-100"
                                  >
                                    Edit
                                  </button>

                                  <button
                                    onClick={async () => {
                                      const confirmed = await askConfirm(
                                        "Delete all features identified in this group?",
                                      );
                                      if (!confirmed) return;

                                      for (const item of feature.features) {
                                        await deletePlanFeature(item.id);
                                      }
                                    }}
                                    className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-100"
                                  >
                                    Delete
                                  </button>
                                </div>
                              </div>

                              <div className="mt-4 flex flex-wrap gap-2 text-xs font-medium">
                                {feature.quantity && (
                                  <span className="rounded-full bg-[#4F46E5]/10 px-3 py-1 text-[#4F46E5]">
                                    Qty: {feature.quantity}
                                  </span>
                                )}

                                {feature.estimated_length_m > 0 && (
                                  <span className="rounded-full bg-[#2E7D6B]/10 px-3 py-1 text-[#2E7D6B]">
                                    Length:{" "}
                                    {Number(feature.estimated_length_m).toFixed(
                                      2,
                                    )}
                                    m
                                  </span>
                                )}

                                {feature.estimated_width_m > 0 && (
                                  <span className="rounded-full bg-[#2E7D6B]/10 px-3 py-1 text-[#2E7D6B]">
                                    Width:{" "}
                                    {Number(feature.estimated_width_m).toFixed(
                                      2,
                                    )}
                                    m
                                  </span>
                                )}

                                {feature.estimated_area_sqm > 0 && (
                                  <span className="rounded-full bg-green-100 px-3 py-1 text-green-700">
                                    {Number(feature.estimated_area_sqm).toFixed(
                                      2,
                                    )}{" "}
                                    sqm
                                  </span>
                                )}

                                {feature.floorLevels?.length > 0 && (
                                  <span className="rounded-full bg-gray-100 px-3 py-1 text-gray-700">
                                    {feature.floorLevels.join(", ")}
                                  </span>
                                )}

                                {feature.features?.length > 1 && (
                                  <span className="rounded-full bg-[#4F46E5]/10 px-3 py-1 text-[#4F46E5]">
                                    Combined from {feature.features.length}{" "}
                                    detections
                                  </span>
                                )}
                              </div>

                              {feature.notes && (
                                <p className="mt-4 text-sm text-gray-600">
                                  {feature.notes}
                                </p>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}

          {activeTab === "budget" && (
            <div className="space-y-8">
              <section className="overflow-hidden rounded-2xl border border-[#D9D2C3]/60 bg-white shadow-sm">
                <div className="border-b border-[#D9D2C3]/60 bg-white px-7 py-6">
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-[#4F46E5]">
                        Budget categories
                      </p>
                      <h2 className="mt-2 text-3xl font-bold text-[#0F172A]">
                        Budget & selections
                      </h2>
                      <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                        Review category budgets first, then expand a category to manage the items inside it.
                      </p>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row">
                      <button
                        type="button"
                        onClick={() => {
                          setQuickCategoryName("");
                          setQuickCategoryBudget("");
                          setShowQuickCategoryModal(true);
                        }}
                        className="rounded-2xl border border-[#D9D2C3]/70 bg-white px-5 py-3 text-sm font-semibold text-[#0F172A] shadow-sm transition hover:border-[#4F46E5]/30 hover:bg-[#F8F7FF] hover:text-[#4F46E5]"
                      >
                        + Add Category
                      </button>

                      <button
                        type="button"
                        onClick={exportBudgetItemsCsv}
                        className="rounded-2xl bg-[#4F46E5] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#4338CA] hover:shadow-md"
                      >
                        Export CSV
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 p-6 md:grid-cols-4">
                  <div className="rounded-2xl border border-[#D9D2C3]/60 bg-white p-5">
                    <p className="text-sm font-semibold text-slate-500">Target Budget</p>
                    <p className="mt-1 text-2xl font-bold text-[#0F172A]">
                      ${formatMoney(budgetTarget)}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-[#D9D2C3]/60 bg-white p-5">
                    <p className="text-sm font-semibold text-slate-500">Tracked Selections</p>
                    <p className="mt-1 text-2xl font-bold text-[#0F172A]">
                      ${formatMoney(projectTotal)}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-[#D9D2C3]/60 bg-white p-5">
                    <p className="text-sm font-semibold text-slate-500">Budget Remaining</p>
                    <p className={`mt-1 text-2xl font-bold ${remainingBudget < 0 ? "text-red-600" : "text-[#2E7D6B]"}`}>
                      ${formatMoney(remainingBudget)}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-[#D9D2C3]/60 bg-white p-5">
                    <p className="text-sm font-semibold text-slate-500">Items Added</p>
                    <p className="mt-1 text-2xl font-bold text-[#0F172A]">{itemCount}</p>
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-[#D9D2C3]/60 bg-white p-6 shadow-sm">
                <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-[#4F46E5]">Budget categories</p>
                    <h3 className="mt-1 text-2xl font-bold text-[#0F172A]">
                      Category list
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      Categories with saved items appear first. Empty categories stay lower in the list until you add items.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setQuickCategoryName("");
                      setQuickCategoryBudget("");
                      setShowQuickCategoryModal(true);
                    }}
                    className="rounded-2xl border border-[#D9D2C3]/70 bg-white px-5 py-3 text-sm font-semibold text-[#0F172A] shadow-sm transition hover:border-[#4F46E5]/30 hover:bg-[#F8F7FF] hover:text-[#4F46E5]"
                  >
                    + Add Category
                  </button>
                </div>

                <div className="mb-5">
                  <label className="mb-1 block text-sm font-semibold text-[#0F172A]">
                    Search categories or items
                  </label>
                  <input
                    value={budgetSearch}
                    onChange={(e) => setBudgetSearch(e.target.value)}
                    placeholder="Search by category, item, supplier, product number or notes"
                    className="w-full rounded-2xl border border-[#D9D2C3]/80 bg-white px-4 py-3 text-[#0F172A] outline-none transition focus:border-[#4F46E5] focus:ring-4 focus:ring-[#4F46E5]/10"
                  />
                </div>

                {visibleCategories.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-[#D9D2C3]/80 bg-[#F8F6F1] p-8 text-center">
                    <h4 className="text-xl font-bold text-[#0F172A]">No categories yet</h4>
                    <p className="mt-2 text-sm text-slate-500">
                      Add your first category to start organising products, allowances and selections.
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowQuickCategoryModal(true)}
                      className="mt-5 rounded-2xl bg-[#4F46E5] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#4338CA]"
                    >
                      Add Category
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {visibleCategories.map((category) => {
                      const categoryItems = items
                        .filter((item) => item.category_id === category.id)
                        .sort((a, b) => String(a.item_name || "").localeCompare(String(b.item_name || "")));
                      const attachments = getCategoryAttachments(category.id);
                      const attachmentCount = attachments.length;

                      const categoryTotal = categoryItems.reduce(
                        (sum, item) => sum + getDiscountedItemTotal(item),
                        0,
                      );

                      const categoryBudget = Number(category.budget_amount || 0);
                      const categoryRemaining = categoryBudget - categoryTotal;
                      const categorySpendPercent = categoryBudget > 0
                        ? Math.min(Math.round((categoryTotal / categoryBudget) * 100), 100)
                        : 0;
                      const isExpanded = expandedBudgetCategoryId === category.id;
                      const isOverBudget = categoryBudget > 0 && categoryTotal > categoryBudget;

                      return (
                        <div
                          key={category.id}
                          className="rounded-2xl border border-[#D9D2C3]/60 bg-white shadow-sm transition hover:shadow-md"
                        >
                          <div className="p-5">
                            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                              <button
                                type="button"
                                onClick={() =>
                                  setExpandedBudgetCategoryId(isExpanded ? null : category.id)
                                }
                                className="flex min-w-0 flex-1 items-start gap-4 text-left"
                              >
                                <span className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#D9D2C3]/70 bg-[#F8F6F1] text-lg font-semibold text-[#0F172A]">
                                  {isExpanded ? "−" : "+"}
                                </span>

                                <span className="min-w-0">
                                  <span className="block text-xl font-bold text-[#0F172A]">
                                    {category.name}
                                  </span>
                                  <span className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
                                    <span>Budget <strong className="text-[#0F172A]">${formatMoney(categoryBudget)}</strong></span>
                                    <span>Spent <strong className="text-[#0F172A]">${formatMoney(categoryTotal)}</strong></span>
                                    <span>{categoryItems.length} item{categoryItems.length === 1 ? "" : "s"}</span>
                                    <span>📎 {attachmentCount} attachment{attachmentCount === 1 ? "" : "s"}</span>
                                  </span>
                                </span>
                              </button>

                              <div className="flex flex-col gap-3 sm:flex-row sm:items-center lg:justify-end">
                                <div className="text-left sm:text-right">
                                  <p className={`text-sm font-semibold ${isOverBudget ? "text-red-600" : "text-slate-600"}`}>
                                    ${formatMoney(Math.abs(categoryRemaining))} {categoryRemaining < 0 ? "over" : "remaining"}
                                  </p>
                                  {categoryBudget > 0 && (
                                    <p className="mt-1 text-xs text-slate-400">
                                      {categorySpendPercent}% spent
                                    </p>
                                  )}
                                </div>

                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setActiveAttachmentCategoryId(category.id)}
                                    className="rounded-full border border-[#D9D2C3]/70 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-[#F8F6F1]"
                                  >
                                    📎 Attachments{attachmentCount > 0 ? ` · ${attachmentCount}` : ""}
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      resetItemForm();
                                      setSelectedCategory(category.id);
                                      setExpandedBudgetCategoryId(category.id);
                                      setShowItemModal(true);
                                    }}
                                    className="rounded-full bg-[#4F46E5] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#4338CA]"
                                  >
                                    + Add Item
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      setExpandedBudgetCategoryId(isExpanded ? null : category.id)
                                    }
                                    className="rounded-full border border-[#D9D2C3]/70 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-[#F8F6F1]"
                                  >
                                    {isExpanded ? "Hide Items" : "View Items"}
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => deleteCategory(category)}
                                    className="rounded-full border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-600 shadow-sm transition hover:bg-red-50"
                                  >
                                    Delete Category
                                  </button>
                                </div>
                              </div>
                            </div>

                            <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100">
                              <div
                                className={`h-full rounded-full ${isOverBudget ? "bg-red-500" : "bg-[#2E7D6B]"}`}
                                style={{ width: `${categoryBudget > 0 ? categorySpendPercent : 0}%` }}
                              />
                            </div>
                          </div>

                          {isExpanded && (
                            <div className="border-t border-[#D9D2C3]/60 bg-[#FCFBF8] p-5">
                              <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                                <div className="flex flex-wrap gap-3">
                                  <div className="rounded-2xl border border-[#D9D2C3]/60 bg-white px-4 py-3">
                                    <label
                                      className="text-xs font-semibold text-slate-500"
                                      htmlFor={`category-budget-${category.id}`}
                                    >
                                      Category budget
                                    </label>
                                    <div className="mt-1 flex items-center gap-2">
                                      <span className="font-bold text-[#0F172A]">$</span>
                                      <input
                                        id={`category-budget-${category.id}`}
                                        className="w-32 rounded-xl border border-[#D9D2C3] bg-white px-3 py-2 font-bold text-[#0F172A] shadow-sm focus:border-[#4F46E5] focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/20"
                                        type="text"
                                        inputMode="decimal"
                                        value={
                                          editingCategoryId === category.id
                                            ? editCategoryBudget
                                            : formatMoney(categoryBudget)
                                        }
                                        onFocus={() => startEditCategoryBudget(category)}
                                        onChange={(e) => {
                                          if (editingCategoryId !== category.id) {
                                            setEditingCategoryId(category.id);
                                          }
                                          setEditCategoryBudget(e.target.value);
                                        }}
                                        onBlur={() => {
                                          if (editingCategoryId === category.id) {
                                            saveCategoryBudget(category.id);
                                          }
                                        }}
                                        onKeyDown={(e) => {
                                          if (e.key === "Enter") e.currentTarget.blur();
                                          if (e.key === "Escape") {
                                            setEditingCategoryId(null);
                                            setEditCategoryBudget("");
                                            e.currentTarget.blur();
                                          }
                                        }}
                                      />
                                    </div>
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => {
                                    resetItemForm();
                                    setSelectedCategory(category.id);
                                    setShowItemModal(true);
                                  }}
                                  className="rounded-2xl bg-[#4F46E5] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#4338CA]"
                                >
                                  + Add Item to {category.name}
                                </button>
                              </div>

                              {categoryItems.length === 0 ? (
                                <div className="rounded-2xl border border-dashed border-[#D9D2C3]/80 bg-white p-6 text-center">
                                  <p className="font-semibold text-[#0F172A]">No items in this category yet</p>
                                  <p className="mt-1 text-sm text-slate-500">
                                    Add an item when you have a product, allowance or selection to track.
                                  </p>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      resetItemForm();
                                      setSelectedCategory(category.id);
                                      setShowItemModal(true);
                                    }}
                                    className="mt-4 rounded-2xl border border-[#4F46E5]/20 bg-white px-5 py-3 text-sm font-semibold text-[#4F46E5] shadow-sm transition hover:bg-[#F8F7FF]"
                                  >
                                    + Add Item
                                  </button>
                                </div>
                              ) : (
                                <div className="overflow-hidden rounded-2xl border border-[#D9D2C3]/60 bg-white">
                                  <div className="hidden grid-cols-[1fr_120px_130px_120px] gap-4 border-b border-[#D9D2C3]/60 bg-[#F8F6F1] px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 md:grid">
                                    <span>Item</span>
                                    <span>Status</span>
                                    <span className="text-right">Total</span>
                                    <span className="text-right">Actions</span>
                                  </div>

                                  <div className="divide-y divide-[#D9D2C3]/50">
                                    {categoryItems.map((item) => (
                                      <div
                                        key={item.id}
                                        className="grid gap-3 px-4 py-4 md:grid-cols-[1fr_120px_130px_120px] md:items-center md:gap-4"
                                      >
                                        <div className="min-w-0">
                                          <p className="font-semibold text-[#0F172A]">
                                            {item.item_name}
                                          </p>
                                          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
                                            <span>Qty {Number(item.quantity || 1)}</span>
                                            {item.supplier_name && <span>{item.supplier_name}</span>}
                                            {item.product_number && <span>#{item.product_number}</span>}
                                            {item.use_sqm_pricing && item.sqm && (
                                              <span>{item.sqm} sqm</span>
                                            )}
                                            {item.purchase_type && <span>{item.purchase_type}</span>}
                                            {Number(item.trade_discount_percent || 0) > 0 && (
                                              <span>{Number(item.trade_discount_percent)}% trade discount</span>
                                            )}
                                            {Number(item.deposit_paid || 0) > 0 && (
                                              <span>${formatMoney(Number(item.deposit_paid || 0))} deposit paid</span>
                                            )}
                                            {item.notes && <span>{item.notes}</span>}
                                            {item.supplier_url && (
                                              <a
                                                href={item.supplier_url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="font-semibold text-[#4F46E5] hover:underline"
                                              >
                                                View supplier →
                                              </a>
                                            )}
                                          </div>
                                        </div>

                                        <div>
                                          <select
                                            value={item.product_status || "Planned"}
                                            onChange={async (e) => {
                                              const { error } = await supabase
                                                .from("project_items")
                                                .update({ product_status: e.target.value })
                                                .eq("id", item.id);

                                              if (error) {
                                                showNotice(error.message);
                                                return;
                                              }

                                              loadItems();
                                            }}
                                            className="w-full rounded-full border border-[#D9D2C3]/70 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
                                          >
                                            {productStatuses.map((status) => (
                                              <option key={status} value={status}>
                                                {status}
                                              </option>
                                            ))}
                                          </select>
                                        </div>

                                        <p className="text-left text-lg font-bold text-[#0F172A] md:text-right">
                                          ${formatMoney(getDiscountedItemTotal(item))}
                                        </p>

                                        <div className="flex gap-2 md:justify-end">
                                          <button
                                            type="button"
                                            onClick={() => startEditItem(item)}
                                            className="rounded-full border border-[#D9D2C3]/80 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-[#4F46E5]/30 hover:bg-[#F8F7FF] hover:text-[#4F46E5]"
                                          >
                                            Edit
                                          </button>

                                          <button
                                            type="button"
                                            onClick={() => deleteItem(item.id)}
                                            className="rounded-full border border-red-200 bg-white px-3.5 py-2 text-sm font-semibold text-red-600 shadow-sm transition hover:bg-red-50"
                                          >
                                            Delete
                                          </button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            </div>
          )}

          {activeTab === "estimate" && (
            <div className="space-y-8">
              <section className="print-report overflow-hidden rounded-2xl border border-[#D9D2C3]/60 bg-white shadow-sm">
                <div className="print-card bg-white border-b border-[#D9D2C3]/60 px-8 py-8 text-[#0F172A]">
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                    <div className="max-w-3xl">
                      <p className="text-sm font-semibold uppercase tracking-wide text-[#4F46E5]">
                        Cost Forecast
                      </p>
                      <h2 className="mt-2 text-4xl font-bold tracking-tight">
                        Understand where your project is heading
                      </h2>
                      <p className="mt-3 text-base leading-7 text-slate-600">
                        Generate a clear planning forecast using your project
                        details, rooms, features and saved selections. Use it to
                        check whether the project is sitting where you expected
                        before you commit.
                      </p>
                    </div>

                    <div className="no-print flex flex-col gap-3 sm:flex-row lg:flex-col">
                      <button
                        onClick={generateEstimate}
                        disabled={isGeneratingEstimate}
                        className="rounded-2xl bg-[#4F46E5] px-6 py-4 text-sm font-semibold text-white shadow-md transition-all hover:-translate-y-0.5 hover:bg-[#4338CA] hover:shadow-md disabled:opacity-50 disabled:hover:translate-y-0"
                      >
                        {isGeneratingEstimate
                          ? "Preparing Forecast..."
                          : latestEstimate
                            ? "Refresh Cost Forecast"
                            : "Generate Cost Forecast"}
                      </button>

                      {latestEstimate && (
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                          <button
                            type="button"
                            onClick={printCostForecast}
                            className="rounded-2xl border border-[#D9D2C3]/60 bg-white px-5 py-3 text-sm font-semibold text-[#0F172A] shadow-sm transition hover:-translate-y-0.5 hover:bg-[#F8F6F1]"
                          >
                            Print Report
                          </button>

                          <button
                            type="button"
                            onClick={exportCostForecastCsv}
                            className="rounded-2xl border border-[#D9D2C3]/60 bg-white px-5 py-3 text-sm font-semibold text-[#0F172A] shadow-sm transition hover:-translate-y-0.5 hover:bg-[#F8F6F1]"
                          >
                            Export CSV
                          </button>
                        </div>
                      )}

                      <div
                        className={`rounded-2xl px-5 py-4 text-sm font-semibold ${
                          estimateStatus === "current"
                            ? "bg-[#E8F5F1] text-[#2E7D6B]"
                            : estimateStatus === "outdated"
                              ? "bg-[#FFF7E8] text-[#B7791F]"
                              : "bg-[#F8F6F1] text-slate-600"
                        }`}
                      >
                        {estimateStatus === "current"
                          ? "Forecast current"
                          : estimateStatus === "outdated"
                            ? "Forecast needs refresh"
                            : "Forecast not started"}
                      </div>
                    </div>
                  </div>
                </div>

                {!latestEstimate ? (
                  <div className="p-8">
                    <div className="rounded-2xl border border-dashed border-[#D9D2C3] bg-[#F8F6F1] p-10 text-center">
                      <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-3xl shadow-sm">
                        📊
                      </div>
                      <h3 className="text-2xl font-bold text-[#0F172A]">
                        Your first cost forecast is ready to create
                      </h3>
                      <p className="mx-auto mt-3 max-w-2xl text-slate-600">
                        Review your project summary, rooms, features and
                        selections, then generate a planning forecast. You can
                        refresh it whenever your project details change.
                      </p>
                      <button
                        onClick={generateEstimate}
                        disabled={isGeneratingEstimate}
                        className="mt-6 rounded-2xl bg-[#4F46E5] px-6 py-4 text-sm font-semibold text-white shadow-md transition-all hover:-translate-y-0.5 hover:bg-[#4338CA] hover:shadow-md disabled:opacity-50 disabled:hover:translate-y-0"
                      >
                        {isGeneratingEstimate
                          ? "Preparing Forecast..."
                          : "Generate Cost Forecast"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-8 p-8">
                    <div className="print-card hidden border-b border-[#D9D2C3] pb-6 print:block">
                      <p className="text-sm font-semibold text-[#4F46E5]">
                        Budget My Build
                      </p>
                      <h1 className="mt-2 text-3xl font-bold text-[#0F172A]">
                        Cost Forecast Report
                      </h1>
                      <p className="mt-2 text-sm text-slate-600">
                        {project?.name || "Project"} · Generated {latestEstimate?.created_at ? new Date(latestEstimate.created_at).toLocaleDateString() : new Date().toLocaleDateString()}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        Build smarter from the start.
                      </p>
                    </div>

                    <div className="print-card grid gap-5 lg:grid-cols-3">
                      <div className="rounded-2xl border border-[#D9D2C3]/60 bg-white p-7 shadow-sm lg:col-span-2">
                        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                          <div>
                            <p className="text-sm font-semibold text-[#4F46E5]">
                              Likely Project Cost
                            </p>
                            <p className="mt-2 text-5xl font-bold tracking-tight">
                              ${formatMoney(likelyEstimateTotal)}
                            </p>
                            <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-600">
                              Based on your current rooms, features and saved
                              selections, this is the practical midpoint for
                              planning conversations.
                            </p>
                          </div>

                          <div className="rounded-2xl border border-[#D9D2C3]/60 bg-[#F8F6F1] px-4 py-3 text-sm text-slate-600">
                            Last generated
                            <span className="mt-1 block font-semibold text-[#0F172A]">
                              {latestEstimate.created_at
                                ? new Date(
                                    latestEstimate.created_at,
                                  ).toLocaleDateString()
                                : "Unknown"}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-[#D9D2C3]/60 bg-white p-7 shadow-sm">
                        <p className="text-sm font-semibold text-[#2E7D6B]">
                          Expected Planning Range
                        </p>
                        <p className="mt-2 text-3xl font-bold text-[#0F172A]">
                          ${formatMoney(expectedEstimateLow)} - $
                          {formatMoney(expectedEstimateHigh)}
                        </p>
                        <p className="mt-3 text-sm leading-6 text-slate-600">
                          A sensible range for early feasibility decisions,
                          including the recommended contingency allowance.
                        </p>
                      </div>
                    </div>

                    <section className="print-card rounded-2xl border border-[#D9D2C3]/60 bg-white p-6 shadow-sm">
                      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr] lg:items-center">
                        <div>
                          <p className="text-sm font-semibold text-[#2E7D6B]">
                            Forecast Summary
                          </p>
                          <h3 className="mt-2 text-2xl font-bold text-[#0F172A]">
                            {buildSummary.headline}
                          </h3>
                          <p className="mt-3 text-sm leading-6 text-slate-600">
                            This forecast is built from {buildSummary.roomCount}{" "}
                            rooms, {buildSummary.featureCount} features and{" "}
                            {itemCount} saved budget item
                            {itemCount === 1 ? "" : "s"}. Refresh the forecast
                            whenever you update the project details.
                          </p>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="rounded-2xl border border-[#D9D2C3]/60 bg-white p-4 text-center">
                            <p className="text-sm font-medium text-slate-500">
                              Bedrooms
                            </p>
                            <p className="mt-1 text-2xl font-bold text-[#0F172A]">
                              {buildSummary.bedroomCount}
                            </p>
                          </div>
                          <div className="rounded-2xl border border-[#D9D2C3]/60 bg-white p-4 text-center">
                            <p className="text-sm font-medium text-slate-500">
                              Bathrooms
                            </p>
                            <p className="mt-1 text-2xl font-bold text-[#0F172A]">
                              {buildSummary.bathroomCount}
                            </p>
                          </div>
                          <div className="rounded-2xl border border-[#D9D2C3]/60 bg-white p-4 text-center">
                            <p className="text-sm font-medium text-slate-500">
                              Rooms
                            </p>
                            <p className="mt-1 text-2xl font-bold text-[#0F172A]">
                              {buildSummary.roomCount}
                            </p>
                          </div>
                          <div className="rounded-2xl border border-[#D9D2C3]/60 bg-white p-4 text-center">
                            <p className="text-sm font-medium text-slate-500">
                              Area
                            </p>
                            <p className="mt-1 text-2xl font-bold text-[#0F172A]">
                              {buildSummary.totalSqm.toFixed(0)}m²
                            </p>
                          </div>
                        </div>
                      </div>
                    </section>

                    <section className="print-card grid gap-4 md:grid-cols-4">
                      <div className="rounded-2xl border border-[#D9D2C3]/60 bg-white p-6 shadow-sm">
                        <p className="text-sm font-semibold text-slate-500">
                          Building Works
                        </p>
                        <p className="mt-2 text-2xl font-bold text-[#0F172A]">
                          ${formatMoney(adjustedWorksLow)} - $
                          {formatMoney(adjustedWorksHigh)}
                        </p>
                        <p className="mt-2 text-xs text-slate-500">
                          Rooms, features and construction-related works.
                        </p>
                      </div>

                      <div className="rounded-2xl border border-[#D9D2C3]/60 bg-white p-6 shadow-sm">
                        <p className="text-sm font-semibold text-slate-500">
                          Site & Project Costs
                        </p>
                        <p className="mt-2 text-2xl font-bold text-[#0F172A]">
                          ${formatMoney(projectCostAdditions?.total_low || 0)} -
                          ${formatMoney(projectCostAdditions?.total_high || 0)}
                        </p>
                        <p className="mt-2 text-xs text-slate-500">
                          Builder overhead, preliminaries and statutory
                          allowances.
                        </p>
                      </div>

                      <div className="rounded-2xl border border-[#D9D2C3]/60 bg-white p-6 shadow-sm">
                        <p className="text-sm font-semibold text-slate-500">
                          Known Selections
                        </p>
                        <p className="mt-2 text-2xl font-bold text-[#0F172A]">
                          ${formatMoney(latestEstimate.known_items_total)}
                        </p>
                        <p className="mt-2 text-xs text-slate-500">
                          Products and selections already saved to your budget.
                        </p>
                      </div>

                      <div className="rounded-2xl border border-[#D9D2C3]/60 bg-white p-6 shadow-sm">
                        <p className="text-sm font-semibold text-[#B7791F]">
                          Contingency
                        </p>
                        <p className="mt-2 text-2xl font-bold text-[#0F172A]">
                          ${formatMoney(latestEstimate.contingency_low)} - $
                          {formatMoney(latestEstimate.contingency_high)}
                        </p>
                        <p className="mt-2 text-xs text-slate-500">
                          Recommended allowance for unknowns and changes.
                        </p>
                      </div>
                    </section>

                    <section className="grid gap-6 lg:grid-cols-2">
                      <div className="rounded-2xl border border-[#D9D2C3]/60 bg-white p-6 shadow-sm">
                        <h3 className="text-2xl font-bold text-[#0F172A]">
                          What is driving the cost
                        </h3>
                        <p className="mt-2 text-sm text-slate-500">
                          These are the project factors currently shaping the
                          forecast.
                        </p>

                        <div className="mt-5 space-y-3">
                          {buildSummary.totalSqm > 0 && (
                            <div className="rounded-2xl border border-[#D9D2C3]/60 bg-[#F8F6F1] p-4 text-sm text-slate-700">
                              <span className="font-semibold text-[#0F172A]">
                                Overall floor area:
                              </span>{" "}
                              {buildSummary.totalSqm.toFixed(0)}m² included in
                              the room summary.
                            </div>
                          )}

                          {buildSummary.bathroomCount > 1 && (
                            <div className="rounded-2xl border border-[#D9D2C3]/60 bg-[#F8F6F1] p-4 text-sm text-slate-700">
                              <span className="font-semibold text-[#0F172A]">
                                Multiple wet areas:
                              </span>{" "}
                              {buildSummary.bathroomCount} bathroom or ensuite
                              spaces included.
                            </div>
                          )}

                          {buildSummary.featureHighlights.map((item) => (
                            <div
                              key={item}
                              className="rounded-2xl border border-[#D9D2C3]/60 bg-[#F8F6F1] p-4 text-sm text-slate-700"
                            >
                              <span className="font-semibold text-[#0F172A]">
                                {item.charAt(0).toUpperCase() + item.slice(1)}:
                              </span>{" "}
                              included as a cost-impacting project feature.
                            </div>
                          ))}

                          {buildSummary.featureHighlights.length === 0 &&
                            buildSummary.totalSqm === 0 &&
                            buildSummary.bathroomCount <= 1 && (
                              <div className="rounded-2xl border border-dashed border-[#D9D2C3] bg-[#F8F6F1] p-4 text-sm text-slate-600">
                                Add rooms, features and selections to reveal the
                                main cost drivers.
                              </div>
                            )}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-[#D9D2C3]/60 bg-white p-6 shadow-sm">
                        <h3 className="text-2xl font-bold text-[#0F172A]">
                          Improve this forecast
                        </h3>
                        <p className="mt-2 text-sm text-slate-500">
                          The more complete your project details are, the more
                          useful the forecast becomes.
                        </p>

                        <div className="mt-5 space-y-3">
                          {missingRoomAssumptions.length > 0 && (
                            <button
                              type="button"
                              onClick={() => setActiveTab("plans")}
                              className="w-full rounded-2xl border border-amber-200 bg-amber-50 p-4 text-left text-sm text-amber-900 transition hover:bg-amber-100"
                            >
                              <span className="font-semibold">
                                Review room details
                              </span>
                              <span className="mt-1 block text-xs">
                                {missingRoomAssumptions.length} room
                                {missingRoomAssumptions.length === 1
                                  ? ""
                                  : "s"}{" "}
                                need more detail.
                              </span>
                            </button>
                          )}

                          {missingFeatureAssumptions.length > 0 ||
                          missingFeatureMeasurements.length > 0 ? (
                            <button
                              type="button"
                              onClick={() => setActiveTab("plans")}
                              className="w-full rounded-2xl border border-amber-200 bg-amber-50 p-4 text-left text-sm text-amber-900 transition hover:bg-amber-100"
                            >
                              <span className="font-semibold">
                                Review features
                              </span>
                              <span className="mt-1 block text-xs">
                                Some features need a clearer type, quantity or
                                measurement.
                              </span>
                            </button>
                          ) : null}

                          {itemCount === 0 && (
                            <button
                              type="button"
                              onClick={() => setActiveTab("budget")}
                              className="w-full rounded-2xl border border-[#D9D2C3] bg-[#F8F6F1] p-4 text-left text-sm text-slate-700 transition hover:bg-white"
                            >
                              <span className="font-semibold text-[#0F172A]">
                                Add known selections
                              </span>
                              <span className="mt-1 block text-xs">
                                Add products or allowances you already know
                                about.
                              </span>
                            </button>
                          )}

                          {estimateStatus === "outdated" && (
                            <button
                              type="button"
                              onClick={generateEstimate}
                              disabled={isGeneratingEstimate}
                              className="w-full rounded-2xl bg-[#4F46E5] p-4 text-left text-sm font-semibold text-white transition hover:bg-[#4338CA] disabled:opacity-50"
                            >
                              Refresh the forecast with your latest changes
                            </button>
                          )}

                          {missingRoomAssumptions.length === 0 &&
                            missingFeatureAssumptions.length === 0 &&
                            missingFeatureMeasurements.length === 0 &&
                            itemCount > 0 &&
                            estimateStatus !== "outdated" && (
                              <div className="rounded-2xl border border-[#2E7D6B]/30 bg-[#2E7D6B]/10 p-4 text-sm text-[#1F5F52]">
                                Your forecast is in a good place. Keep it
                                updated as rooms, features or selections change.
                              </div>
                            )}
                        </div>
                      </div>
                    </section>

                    {projectCostAdditions?.rates && (
                      <section className="rounded-2xl border border-[#D9D2C3]/60 bg-white p-6 shadow-sm">
                        <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                          <div>
                            <h3 className="text-2xl font-bold text-[#0F172A]">
                              Included Project Costs
                            </h3>
                            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                              These allowances usually sit around the building
                              works and are included so the forecast feels
                              closer to the full project picture.
                            </p>
                          </div>
                        </div>

                        <div className="grid gap-4 md:grid-cols-4">
                          <div className="rounded-2xl border border-[#D9D2C3]/60 bg-[#F8F6F1] p-4">
                            <p className="text-xs font-semibold uppercase text-slate-500">
                              Builder & Project Overhead
                            </p>
                            <p className="mt-1 text-lg font-bold text-[#0F172A]">
                              $
                              {formatMoney(
                                projectCostAdditions.builder_margin_low || 0,
                              )}{" "}
                              - $
                              {formatMoney(
                                projectCostAdditions.builder_margin_high || 0,
                              )}
                            </p>
                          </div>
                          <div className="rounded-2xl border border-[#D9D2C3]/60 bg-[#F8F6F1] p-4">
                            <p className="text-xs font-semibold uppercase text-slate-500">
                              Preliminaries
                            </p>
                            <p className="mt-1 text-lg font-bold text-[#0F172A]">
                              $
                              {formatMoney(
                                projectCostAdditions.preliminaries_admin_low ||
                                  0,
                              )}{" "}
                              - $
                              {formatMoney(
                                projectCostAdditions.preliminaries_admin_high ||
                                  0,
                              )}
                            </p>
                          </div>
                          <div className="rounded-2xl border border-[#D9D2C3]/60 bg-[#F8F6F1] p-4">
                            <p className="text-xs font-semibold uppercase text-slate-500">
                              Q Leave Levy
                            </p>
                            <p className="mt-1 text-lg font-bold text-[#0F172A]">
                              $
                              {formatMoney(
                                projectCostAdditions.qleave_low || 0,
                              )}{" "}
                              - $
                              {formatMoney(
                                projectCostAdditions.qleave_high || 0,
                              )}
                            </p>
                          </div>
                          <div className="rounded-2xl border border-[#D9D2C3]/60 bg-[#F8F6F1] p-4">
                            <p className="text-xs font-semibold uppercase text-slate-500">
                              Warranty / Statutory
                            </p>
                            <p className="mt-1 text-lg font-bold text-[#0F172A]">
                              $
                              {formatMoney(
                                projectCostAdditions.home_warranty_low || 0,
                              )}{" "}
                              - $
                              {formatMoney(
                                projectCostAdditions.home_warranty_high || 0,
                              )}
                            </p>
                          </div>
                        </div>
                      </section>
                    )}

                    {latestEstimateConfidence && (
                      <section className="rounded-2xl border border-[#D9D2C3]/60 bg-white p-6 shadow-sm">
                        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                          <div>
                            <h3 className="text-2xl font-bold text-[#0F172A]">
                              Forecast Readiness
                            </h3>
                            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                              This reflects how complete the project information
                              is behind the forecast.
                            </p>
                          </div>

                          <div className="rounded-2xl border border-[#D9D2C3]/60 bg-[#F8F6F1] px-6 py-5 text-right">
                            <p className="text-sm font-semibold text-slate-500">Readiness</p>
                            <p className="mt-1 text-4xl font-bold text-[#0F172A]">
                              {latestEstimateConfidence.score}/100
                            </p>
                            <p className="text-sm font-semibold text-[#2E7D6B]">
                              {latestEstimateConfidence.label}
                            </p>
                          </div>
                        </div>

                        {latestEstimateConfidence.reasons?.length > 0 && (
                          <div className="mt-5 grid gap-3 md:grid-cols-2">
                            {latestEstimateConfidence.reasons.map(
                              (reason: string, index: number) => (
                                <div
                                  key={index}
                                  className="rounded-2xl border border-[#D9D2C3]/60 bg-[#F8F6F1] p-4 text-sm text-slate-700"
                                >
                                  {reason}
                                </div>
                              ),
                            )}
                          </div>
                        )}
                      </section>
                    )}

                    <section className="rounded-2xl border border-[#D9D2C3]/60 bg-white p-6 shadow-sm">
                      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                          <h3 className="text-2xl font-bold text-[#0F172A]">
                            Detailed Breakdown
                          </h3>
                          <p className="mt-2 text-sm text-slate-500">
                            A more detailed view of how rooms and features
                            contributed to the forecast.
                          </p>
                        </div>
                      </div>

                      <div className="grid gap-6 lg:grid-cols-2">
                        <div className="space-y-4">
                          <h4 className="text-lg font-bold text-[#0F172A]">
                            Rooms
                          </h4>
                          {!latestEstimateBreakdown.rooms ||
                          latestEstimateBreakdown.rooms.length === 0 ? (
                            <p className="rounded-2xl border border-dashed border-[#D9D2C3] p-5 text-sm text-slate-500">
                              No rooms included in this forecast.
                            </p>
                          ) : (
                            groupedEstimateRooms.map((group) => (
                              <div
                                key={group.name}
                                className="rounded-2xl border border-[#D9D2C3]/60 bg-[#F8F6F1] p-4"
                              >
                                <div className="mb-3 flex items-start justify-between gap-3">
                                  <div>
                                    <p className="font-bold text-[#0F172A]">
                                      {group.name}
                                    </p>
                                    <p className="text-xs text-slate-500">
                                      {group.rooms.length} room
                                      {group.rooms.length === 1
                                        ? ""
                                        : "s"} · {group.sqm.toFixed(2)} sqm
                                    </p>
                                  </div>
                                  <p className="text-sm font-bold text-[#0F172A]">
                                    ${formatMoney(group.low)} - $
                                    {formatMoney(group.high)}
                                  </p>
                                </div>

                                <div className="space-y-2">
                                  {group.rooms.map((room: any) => {
                                    const roomEstimate = room.estimate || {};
                                    const displaySqm = getDisplaySqm(room);
                                    const isMissingAssumption =
                                      roomEstimate.source ===
                                        "missing_assumption" ||
                                      room.source === "missing_assumption";

                                    return (
                                      <div
                                        key={room.id}
                                        className="flex justify-between gap-3 rounded-xl bg-white px-4 py-3 text-sm"
                                      >
                                        <div>
                                          <p className="font-semibold text-[#0F172A]">
                                            {room.room_name}
                                          </p>
                                          <p className="text-xs text-slate-500">
                                            {room.room_type || "Room"} ·{" "}
                                            {displaySqm.toFixed(2)} sqm
                                          </p>
                                        </div>
                                        <div className="text-right font-semibold text-[#0F172A]">
                                          {isMissingAssumption
                                            ? "Needs detail"
                                            : `$${formatMoney(roomEstimate.low || room.low || 0)} - $${formatMoney(roomEstimate.high || room.high || 0)}`}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            ))
                          )}
                        </div>

                        <div className="space-y-4">
                          <h4 className="text-lg font-bold text-[#0F172A]">
                            Features
                          </h4>
                          {!latestEstimateBreakdown.features ||
                          latestEstimateBreakdown.features.length === 0 ? (
                            <p className="rounded-2xl border border-dashed border-[#D9D2C3] p-5 text-sm text-slate-500">
                              No features included in this forecast.
                            </p>
                          ) : (
                            <div className="space-y-3">
                              {latestEstimateBreakdown.features.map(
                                (feature: any) => {
                                  const featureEstimate =
                                    feature.estimate || {};
                                  const isMissingAssumption =
                                    featureEstimate.source ===
                                      "missing_assumption" ||
                                    feature.source === "missing_assumption";
                                  const isMissingMeasurement =
                                    featureEstimate.source ===
                                      "missing_measurement" ||
                                    feature.source === "missing_measurement";

                                  return (
                                    <div
                                      key={feature.id}
                                      className="rounded-2xl border border-[#D9D2C3]/60 bg-[#F8F6F1] p-4"
                                    >
                                      <div className="flex justify-between gap-3">
                                        <div>
                                          <p className="font-semibold text-[#0F172A]">
                                            {feature.feature_name ||
                                              feature.feature_type ||
                                              "Feature"}
                                          </p>
                                          <p className="text-xs text-slate-500">
                                            Qty {feature.quantity || 1}
                                            {feature.estimated_area_sqm > 0
                                              ? ` · ${Number(feature.estimated_area_sqm).toFixed(2)} sqm`
                                              : ""}
                                            {feature.estimated_length_m > 0
                                              ? ` · ${Number(feature.estimated_length_m).toFixed(2)} lm`
                                              : ""}
                                          </p>
                                        </div>
                                        <div className="text-right text-sm font-bold text-[#0F172A]">
                                          {isMissingAssumption
                                            ? "Needs type"
                                            : isMissingMeasurement
                                              ? "Needs measurement"
                                              : `$${formatMoney(featureEstimate.low || feature.low || 0)} - $${formatMoney(featureEstimate.high || feature.high || 0)}`}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                },
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </section>
                  </div>
                )}
              </section>
            </div>
          )}

          {activeTab === "overview" && (
            <div className="space-y-8">
              <section className="bg-white border border-[#D9D2C3]/60 rounded-2xl p-8">
                <h2 className="text-3xl font-bold mb-3">Project Overview</h2>
                <p className="text-gray-500">
                  Capture the project information that changes the estimate.
                  These answers are used when you generate the feasibility
                  estimate.
                </p>
              </section>

              <section
                className={
                  isEditingProject
                    ? "fixed inset-0 z-50 flex items-center justify-center bg-[#0F172A]/40 p-4"
                    : "overflow-hidden rounded-2xl border bg-white shadow-sm"
                }
              >
                <div
                  className={
                    isEditingProject
                      ? "max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-2xl border bg-white shadow-xl"
                      : ""
                  }
                >
                  <div className="border-b border-[#D9D2C3]/60 bg-white px-8 py-7">
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div>
                        <p className="text-sm font-semibold uppercase tracking-wide text-[#4F46E5]">
                          Overview information
                        </p>
                        <h2 className="mt-1 text-3xl font-bold text-[#0F172A]">
                          Project Details
                        </h2>
                        <p className="mt-2 max-w-3xl text-sm text-slate-600">
                          Location, budget split and project information used
                          for your estimate. Postcode helps keep the costing
                          location-aware without needing the full address.
                        </p>
                      </div>

                      <button
                        onClick={() => setIsEditingProject(!isEditingProject)}
                        className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-gray-900 shadow-sm hover:bg-gray-100"
                      >
                        {isEditingProject ? "Cancel" : "Edit Details"}
                      </button>
                    </div>
                  </div>

                  {!isEditingProject ? (
                    <div className="space-y-6 p-8">
                      <div className="grid gap-4 lg:grid-cols-3">
                        <div className="rounded-2xl border bg-[#F8F6F1] p-5">
                          <p className="text-xs font-semibold uppercase text-gray-500">
                            Project Type
                          </p>
                          <p className="mt-2 text-xl font-bold text-gray-950">
                            {project.project_type || "Not set"}
                          </p>
                          <p className="mt-1 text-sm text-gray-500">
                            {project.property_type || "Property type not set"}
                          </p>
                        </div>

                        <div className="rounded-2xl border bg-[#F8F6F1] p-5">
                          <p className="text-xs font-semibold uppercase text-gray-500">
                            Location
                          </p>
                          <p className="mt-2 text-xl font-bold text-gray-950">
                            {projectLocation || "Not set"}
                          </p>
                          <p className="mt-1 text-sm text-gray-500">
                            {project.address || "Address optional"}
                          </p>
                        </div>

                        <div className={`rounded-2xl border p-5 ${stageMeta.softBg} ${stageMeta.border}`}>
                          <p className="text-xs font-semibold uppercase text-gray-500">
                            Current Stage
                          </p>
                          <p className={`mt-2 text-xl font-bold ${stageMeta.text}`}>
                            {stageMeta.label}
                          </p>
                          <p className="mt-1 text-sm text-gray-500">
                            Expected start:{" "}
                            {project.expected_start_date || "Not set"}
                          </p>
                        </div>
                      </div>

                      <div className="rounded-2xl border bg-[#F8F6F1] p-6">
                        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                          <div>
                            <p className="text-xs font-semibold uppercase text-gray-500">
                              Total Build Budget
                            </p>
                            <p className="mt-1 text-4xl font-bold text-gray-950">
                              ${formatMoney(displayTotalBudget)}
                            </p>
                          </div>

                          <div className="rounded-2xl bg-white px-4 py-3 text-sm text-gray-600 shadow-sm">
                            Build + selections = total budget
                          </div>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="rounded-2xl border bg-white p-5">
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <p className="text-sm font-semibold text-gray-500">
                                  Build Budget
                                </p>
                                <p className="mt-1 text-2xl font-bold">
                                  ${formatMoney(displayBuildBudget)}
                                </p>
                              </div>
                              <span className="rounded-full bg-gray-100 px-3 py-1 text-sm font-semibold text-gray-700">
                                {displayBuildBudgetPercent}%
                              </span>
                            </div>
                          </div>

                          <div className="rounded-2xl border bg-white p-5">
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <p className="text-sm font-semibold text-gray-500">
                                  Products / Selections
                                </p>
                                <p className="mt-1 text-2xl font-bold">
                                  ${formatMoney(displayProductBudget)}
                                </p>
                              </div>
                              <span className="rounded-full bg-gray-100 px-3 py-1 text-sm font-semibold text-gray-700">
                                {displayProductBudgetPercent}%
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="mt-5 h-4 overflow-hidden rounded-full bg-white">
                          <div
                            className="h-full rounded-full bg-gray-950"
                            style={{
                              width: `${Math.min(displayBuildBudgetPercent, 100)}%`,
                            }}
                          />
                        </div>
                      </div>

                      {project.notes && (
                        <div className="rounded-2xl border bg-white p-5">
                          <p className="text-xs font-semibold uppercase text-gray-500">
                            Notes
                          </p>
                          <p className="mt-2 text-sm text-gray-700">
                            {project.notes}
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-6 p-8">
                      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        <div>
                          <label className="mb-1 block text-sm font-semibold text-gray-700">
                            Project Type
                          </label>
                          <select
                            className="w-full rounded-xl border p-4"
                            value={editProjectType}
                            onChange={(e) => setEditProjectType(e.target.value)}
                          >
                            <option value="">Project type</option>
                            {projectTypes.map((type) => (
                              <option key={type} value={type}>
                                {type}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="mb-1 block text-sm font-semibold text-gray-700">
                            Property Type
                          </label>
                          <select
                            className="w-full rounded-xl border p-4"
                            value={editPropertyType}
                            onChange={(e) =>
                              setEditPropertyType(e.target.value)
                            }
                          >
                            <option value="">Property type</option>
                            {propertyTypes.map((type) => (
                              <option key={type} value={type}>
                                {type}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="mb-1 block text-sm font-semibold text-gray-700">
                            Project Stage
                          </label>
                          <select
                            className="w-full rounded-xl border p-4"
                            value={editProjectStage}
                            onChange={(e) =>
                              setEditProjectStage(e.target.value)
                            }
                          >
                            <option value="">Project stage</option>
                            {projectStages.map((stage) => (
                              <option key={stage} value={stage}>
                                {stage}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="mb-1 block text-sm font-semibold text-gray-700">
                            Suburb
                          </label>
                          <input
                            className="w-full rounded-xl border p-4"
                            value={editSuburb}
                            onChange={(e) => setEditSuburb(e.target.value)}
                          />
                        </div>

                        <div>
                          <label className="mb-1 block text-sm font-semibold text-gray-700">
                            State
                          </label>
                          <select
                            className="w-full rounded-xl border p-4"
                            value={editStateValue}
                            onChange={(e) => setEditStateValue(e.target.value)}
                          >
                            <option value="">State</option>
                            {states.map((state) => (
                              <option key={state} value={state}>
                                {state}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="mb-1 block text-sm font-semibold text-gray-700">
                            Postcode
                          </label>
                          <input
                            className="w-full rounded-xl border p-4"
                            value={editPostcode}
                            onChange={(e) => setEditPostcode(e.target.value)}
                          />
                        </div>

                        <div className="md:col-span-2 lg:col-span-3">
                          <label className="mb-1 block text-sm font-semibold text-gray-700">
                            Address optional
                          </label>
                          <input
                            className="w-full rounded-xl border p-4"
                            value={editAddress}
                            onChange={(e) => setEditAddress(e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="rounded-2xl border bg-[#F8F6F1] p-6">
                        <div className="mb-5">
                          <h3 className="text-xl font-bold">Budget Split</h3>
                          <p className="mt-1 text-sm text-gray-500">
                            Enter the total budget first. If build and
                            selections are blank, they will auto-split at 80%
                            build and 20% products/selections. Changing build or
                            selections updates the total.
                          </p>
                        </div>

                        <div className="grid gap-4 md:grid-cols-3">
                          <div>
                            <label className="mb-1 block text-sm font-semibold text-gray-700">
                              Total Build Budget
                            </label>
                            <input
                              className="w-full rounded-xl border bg-white p-4"
                              type="text"
                              inputMode="decimal"
                              value={editBudgetTarget}
                              onChange={(e) =>
                                handleTotalBudgetChange(e.target.value)
                              }
                              onBlur={() =>
                                setEditBudgetTarget(formatMoneyInput(editBudgetTarget))
                              }
                            />
                          </div>

                          <div>
                            <label className="mb-1 block text-sm font-semibold text-gray-700">
                              Build Budget
                            </label>
                            <input
                              className="w-full rounded-xl border bg-white p-4"
                              type="text"
                              inputMode="decimal"
                              value={editBuildBudget}
                              onChange={(e) =>
                                handleBuildBudgetChange(e.target.value)
                              }
                              onBlur={() =>
                                setEditBuildBudget(formatMoneyInput(editBuildBudget))
                              }
                            />
                          </div>

                          <div>
                            <label className="mb-1 block text-sm font-semibold text-gray-700">
                              Products / Selections Budget
                            </label>
                            <input
                              className="w-full rounded-xl border bg-white p-4"
                              type="text"
                              inputMode="decimal"
                              value={editProductBudget}
                              onChange={(e) =>
                                handleProductBudgetChange(e.target.value)
                              }
                              onBlur={() =>
                                setEditProductBudget(formatMoneyInput(editProductBudget))
                              }
                            />
                          </div>
                        </div>

                        <div className="mt-4 rounded-2xl border bg-white p-4 text-sm text-gray-600">
                          Current split: ${formatMoney(editBuildBudgetValue)}{" "}
                          build + ${formatMoney(editProductBudgetValue)}{" "}
                          selections = $
                          {formatMoney(
                            editBuildBudgetValue + editProductBudgetValue,
                          )}{" "}
                          total
                          {editBudgetDifference !== 0 && (
                            <span className="ml-2 font-semibold text-amber-700">
                              The displayed total will save as $
                              {formatMoney(
                                editBuildBudgetValue + editProductBudgetValue,
                              )}
                              .
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <label className="mb-1 block text-sm font-semibold text-gray-700">
                            Expected Start
                          </label>
                          <input
                            className="w-full rounded-xl border p-4"
                            type="date"
                            value={editExpectedStartDate}
                            onChange={(e) =>
                              setEditExpectedStartDate(e.target.value)
                            }
                          />
                        </div>

                        <div className="md:col-span-2">
                          <label className="mb-1 block text-sm font-semibold text-gray-700">
                            Notes
                          </label>
                          <textarea
                            className="w-full rounded-xl border p-4"
                            rows={4}
                            value={editNotes}
                            onChange={(e) => setEditNotes(e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="flex flex-col gap-3 sm:flex-row">
                        <button
                          onClick={saveProjectDetails}
                          className="rounded-xl bg-[#0F172A] px-6 py-3 text-sm font-semibold text-white shadow-md hover:shadow-md"
                        >
                          Save Project Details
                        </button>
                        <button
                          onClick={() => setIsEditingProject(false)}
                          className="rounded-xl border border-gray-300 bg-white px-6 py-3 text-sm font-semibold text-gray-700"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </section>

              {latestEstimate && (
                <section className="bg-white border border-[#D9D2C3]/60 rounded-2xl p-8">
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">
                    <div>
                      <p className="text-sm font-semibold text-gray-500 mb-2">
                        Latest Build Summary
                      </p>
                      <h3 className="text-3xl font-bold">
                        {buildSummary.headline}
                      </h3>
                      {buildSummary.location && (
                        <p className="text-gray-500 mt-2">
                          {buildSummary.location}
                        </p>
                      )}
                      <p className="text-sm text-gray-500 mt-4">
                        Based on the latest generated feasibility estimate.
                      </p>
                    </div>

                    <div className="rounded-2xl bg-[#0F172A] px-6 py-5 text-white text-right min-w-60">
                      <p className="text-sm opacity-70">Likely Total</p>
                      <p className="text-3xl font-bold mt-1">
                        ${formatMoney(likelyEstimateTotal)}
                      </p>
                      <p className="text-xs opacity-70 mt-2">
                        Expected: ${formatMoney(expectedEstimateLow)} - $
                        {formatMoney(expectedEstimateHigh)}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
                    <div className="rounded-2xl bg-[#F8F6F1] border px-4 py-3 text-center">
                      <p className="text-xs text-gray-500">Bedrooms</p>
                      <p className="text-2xl font-bold">
                        {buildSummary.bedroomCount}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-[#F8F6F1] border px-4 py-3 text-center">
                      <p className="text-xs text-gray-500">Bathrooms</p>
                      <p className="text-2xl font-bold">
                        {buildSummary.bathroomCount}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-[#F8F6F1] border px-4 py-3 text-center">
                      <p className="text-xs text-gray-500">Features</p>
                      <p className="text-2xl font-bold">
                        {buildSummary.featureCount}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-[#F8F6F1] border px-4 py-3 text-center">
                      <p className="text-xs text-gray-500">
                        Measured/Assumed Area
                      </p>
                      <p className="text-2xl font-bold">
                        {buildSummary.totalSqm.toFixed(0)}m²
                      </p>
                    </div>
                  </div>

                  {(buildSummary.roomHighlights.length > 0 ||
                    buildSummary.featureHighlights.length > 0) && (
                    <div className="mt-5 flex flex-wrap gap-2">
                      {buildSummary.roomHighlights.map((item) => (
                        <span
                          key={item}
                          className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700"
                        >
                          {item}
                        </span>
                      ))}

                      {buildSummary.featureHighlights.map((item) => (
                        <span
                          key={item}
                          className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  )}
                </section>
              )}

              <section className="bg-white border border-[#D9D2C3]/60 rounded-2xl p-8">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
                  <div>
                    <h3 className="text-2xl font-bold mb-2">
                      Project Cost Profile
                    </h3>
                    <p className="text-gray-500">
                      These settings adjust the estimate for finish level, site
                      complexity, slope, access, glazing, ceiling heights and
                      wet areas.
                    </p>
                  </div>

                  <button
                    onClick={saveCostProfile}
                    className="rounded-xl bg-[#4F46E5] px-5 py-3 text-sm font-semibold text-white shadow-md hover:shadow-md transition-all"
                  >
                    Save Cost Profile
                  </button>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-600 mb-2">
                      Quality level
                    </label>
                    <select
                      value={editQualityLevel}
                      onChange={(e) => setEditQualityLevel(e.target.value)}
                      className="w-full rounded-xl border bg-white p-3"
                    >
                      {costProfileOptions.quality_level.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-600 mb-2">
                      Site complexity
                    </label>
                    <select
                      value={editSiteComplexity}
                      onChange={(e) => setEditSiteComplexity(e.target.value)}
                      className="w-full rounded-xl border bg-white p-3"
                    >
                      {costProfileOptions.site_complexity.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-600 mb-2">
                      Access difficulty
                    </label>
                    <select
                      value={editAccessDifficulty}
                      onChange={(e) => setEditAccessDifficulty(e.target.value)}
                      className="w-full rounded-xl border bg-white p-3"
                    >
                      {costProfileOptions.access_difficulty.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-600 mb-2">
                      Slope
                    </label>
                    <select
                      value={editSlopeLevel}
                      onChange={(e) => setEditSlopeLevel(e.target.value)}
                      className="w-full rounded-xl border bg-white p-3"
                    >
                      {costProfileOptions.slope_level.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-600 mb-2">
                      Glazing level
                    </label>
                    <select
                      value={editGlazingLevel}
                      onChange={(e) => setEditGlazingLevel(e.target.value)}
                      className="w-full rounded-xl border bg-white p-3"
                    >
                      {costProfileOptions.glazing_level.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-600 mb-2">
                      Ceiling heights
                    </label>
                    <select
                      value={editCeilingHeightLevel}
                      onChange={(e) =>
                        setEditCeilingHeightLevel(e.target.value)
                      }
                      className="w-full rounded-xl border bg-white p-3"
                    >
                      {costProfileOptions.ceiling_height_level.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-600 mb-2">
                      Wet areas
                    </label>
                    <select
                      value={editWetAreaLevel}
                      onChange={(e) => setEditWetAreaLevel(e.target.value)}
                      className="w-full rounded-xl border bg-white p-3"
                    >
                      {costProfileOptions.wet_area_level.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-600 mb-2">
                      Contingency
                    </label>
                    <select
                      value={editContingencyLevel}
                      onChange={(e) => setEditContingencyLevel(e.target.value)}
                      className="w-full rounded-xl border bg-white p-3"
                    >
                      {costProfileOptions.contingency_level.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </section>
            </div>
          )}

          {activeTab === "products" && (
            <div className="space-y-8">
              <section className="bg-white border border-[#D9D2C3]/60 rounded-2xl p-8">
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5 mb-6">
                  <div>
                    <h2 className="text-3xl font-bold mb-3">
                      Products & Suppliers
                    </h2>
                    <p className="text-gray-500">
                      Review products grouped by supplier, filter by
                      room/category, and keep product photos, ideas and
                      inspiration attached to this project.
                    </p>
                  </div>

                  <select
                    value={productCategoryFilter}
                    onChange={(e) => setProductCategoryFilter(e.target.value)}
                    className="rounded-full border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 shadow-sm"
                  >
                    <option value="all">All rooms / categories</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid md:grid-cols-4 gap-4 mb-8">
                  <div className="rounded-2xl border bg-[#F8F6F1] p-5">
                    <p className="text-sm text-gray-500">Supplier Total</p>
                    <p className="text-3xl font-bold mt-1">
                      ${formatMoney(supplierGrandTotal)}
                    </p>
                  </div>

                  <div className="rounded-2xl border bg-[#F8F6F1] p-5">
                    <p className="text-sm text-gray-500">Products</p>
                    <p className="text-3xl font-bold mt-1">
                      {supplierItemCount}
                    </p>
                  </div>

                  <div className="rounded-2xl border bg-[#F8F6F1] p-5">
                    <p className="text-sm text-gray-500">Suppliers</p>
                    <p className="text-3xl font-bold mt-1">
                      {supplierSummaries.length}
                    </p>
                  </div>

                  <div className="rounded-2xl border bg-green-50 p-5">
                    <p className="text-sm text-green-700">Purchased Value</p>
                    <p className="text-3xl font-bold mt-1">
                      ${formatMoney(purchasedTotal)}
                    </p>
                  </div>
                </div>

                {supplierSummaries.length === 0 ? (
                  <div className="rounded-2xl border border-dashed p-6 text-gray-500">
                    No product-linked cost items yet. Add supplier details to
                    cost items in the Budget tab to see supplier summaries here.
                  </div>
                ) : (
                  <div className="grid lg:grid-cols-2 gap-5">
                    {supplierSummaries.map((group: any) => (
                      <div
                        key={group.supplier}
                        className="border border-[#D9D2C3]/60 rounded-2xl p-5 bg-white shadow-sm"
                      >
                        <div className="flex justify-between gap-4 items-start mb-4">
                          <div>
                            <h3 className="text-2xl font-bold">
                              {group.supplier}
                            </h3>
                            <p className="text-sm text-gray-500 mt-1">
                              {group.items.length} product
                              {group.items.length === 1 ? "" : "s"}
                            </p>
                          </div>

                          <div className="rounded-2xl bg-[#0F172A] px-5 py-3 text-white text-right">
                            <p className="text-xs opacity-70">Supplier Total</p>
                            <p className="text-xl font-bold">
                              ${formatMoney(group.total)}
                            </p>
                          </div>
                        </div>

                        <div className="space-y-3">
                          {group.items.map((item: any) => (
                            <div
                              key={item.id}
                              className="flex justify-between gap-4 rounded-2xl border bg-[#F8F6F1] p-4"
                            >
                              <div>
                                <div className="flex items-start justify-between gap-3">
                                  <p className="font-semibold">
                                    {item.item_name}
                                  </p>

                                  <select
                                    value={item.product_status || "Planned"}
                                    onChange={async (e) => {
                                      const { error } = await supabase
                                        .from("project_items")
                                        .update({
                                          product_status: e.target.value,
                                        })
                                        .eq("id", item.id);

                                      if (error) {
                                        showNotice(error.message);
                                        return;
                                      }

                                      loadItems();
                                    }}
                                    className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-semibold"
                                  >
                                    {productStatuses.map((status) => (
                                      <option key={status} value={status}>
                                        {status}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                                {item.category_id && (
                                  <p className="text-xs text-gray-500 mt-1">
                                    Category:{" "}
                                    {categories.find(
                                      (c) => c.id === item.category_id,
                                    )?.name || "Unknown"}
                                  </p>
                                )}
                                {item.product_number && (
                                  <p className="text-xs text-gray-500 mt-1">
                                    Product #: {item.product_number}
                                  </p>
                                )}
                                {item.supplier_url && (
                                  <a
                                    href={item.supplier_url}
                                    target="_blank"
                                    className="text-xs text-blue-600 underline mt-1 inline-block"
                                  >
                                    View supplier link
                                  </a>
                                )}
                              </div>

                              <p className="font-bold whitespace-nowrap">
                                ${formatMoney(getDiscountedItemTotal(item))}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="bg-white border border-[#D9D2C3]/60 rounded-2xl p-8">
                <h2 className="text-2xl font-bold mb-3">
                  Upload Product Photos, Ideas & Inspiration
                </h2>
                <p className="text-gray-500 mb-5">
                  Add screenshots, product photos, inspiration images, brochures
                  or PDFs you may want to reference later.
                </p>

                <input
                  type="file"
                  className="block mb-4"
                  accept="image/*,.pdf"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                />

                <button
                  onClick={uploadFile}
                  className="bg-[#4F46E5] text-white rounded-xl px-5 py-3 hover:bg-[#4338CA]"
                >
                  Upload Inspiration File
                </button>
              </section>

              <section className="bg-white border border-[#D9D2C3]/60 rounded-2xl p-8">
                <h2 className="text-3xl font-bold mb-6">
                  Product Photos & Inspiration Files
                </h2>

                {files.length === 0 ? (
                  <p className="text-gray-500">
                    No product inspiration files uploaded yet.
                  </p>
                ) : (
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {files.map((file) => (
                      <div
                        key={file.id}
                        className="border border-[#D9D2C3]/60 rounded-2xl overflow-hidden bg-white"
                      >
                        {file.file_type?.startsWith("image/") ? (
                          <img
                            src={file.signedUrl}
                            alt={file.file_name}
                            className="w-full h-56 object-cover"
                          />
                        ) : (
                          <div className="h-56 bg-gray-100 flex items-center justify-center">
                            <p className="text-gray-500 font-medium">
                              PDF / Document
                            </p>
                          </div>
                        )}

                        <div className="p-4">
                          <p className="font-semibold mb-3">{file.file_name}</p>

                          <div className="flex gap-3 text-sm">
                            <button
                              onClick={() => openFile(file.file_path)}
                              className="rounded-full bg-[#4F46E5] px-4 py-2 text-sm font-semibold text-white shadow-md hover:scale-105 hover:shadow-md transition-all"
                            >
                              Open
                            </button>

                            <button
                              onClick={() =>
                                deleteFile(file.id, file.file_path)
                              }
                              className="rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-[#0F172A] shadow-md hover:scale-105 hover:shadow-md transition-all"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}

          {activeTab === "timeline" && (
            <div className="bg-white border border-[#D9D2C3]/60 rounded-2xl p-8">
              <h2 className="text-3xl font-bold mb-3">Timeline</h2>
              <p className="text-gray-500 mb-8">
                Track your project stage from early ideas through to completion.
              </p>

              <div className="overflow-x-auto">
                <div className="flex items-center min-w-max">
                  {projectStages.map((stage, index) => {
                    const currentIndex = projectStages.indexOf(
                      project.project_stage,
                    );
                    const isCompleted =
                      currentIndex !== -1 && index < currentIndex;
                    const isCurrent = index === currentIndex;

                    return (
                      <div key={stage} className="flex items-center">
                        <div className="flex flex-col items-center">
                          <div
                            className={`
                            w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold border-2
                            ${
                              isCompleted
                                ? "bg-[#0F172A] border-[#0F172A] text-white"
                                : isCurrent
                                  ? "border-[#0F172A] text-[#0F172A] bg-white"
                                  : "border-gray-300 text-gray-400 bg-white"
                            }
                          `}
                          >
                            {isCompleted ? "✓" : index + 1}
                          </div>
                          <p
                            className={`
                            text-sm mt-2 whitespace-nowrap
                            ${
                              isCurrent
                                ? "font-semibold text-[#0F172A]"
                                : "text-gray-500"
                            }
                          `}
                          >
                            {stage}
                          </p>
                        </div>

                        {index < projectStages.length - 1 && (
                          <div
                            className={`
                            h-1 w-16 mx-2 rounded
                            ${isCompleted ? "bg-[#0F172A]" : "bg-gray-200"}
                          `}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {showItemModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F172A]/40 p-4">
            <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-[#D9D2C3]/60 bg-white shadow-2xl">
              <div className="sticky top-0 z-10 border-b border-[#D9D2C3]/60 bg-white px-7 py-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-[#4F46E5]">
                      {editingItemId ? "Edit selection" : "Add selection"}
                    </p>
                    <h2 className="mt-1 text-2xl font-bold text-[#0F172A]">
                      {editingItemId ? "Edit Selection or Cost Item" : "Add Selection or Cost Item"}
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      {selectedCategory
                        ? `Category: ${categories.find((category) => category.id === selectedCategory)?.name || "Selected category"}`
                        : "Choose a category and add the item details."}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      resetItemForm();
                      setShowItemModal(false);
                    }}
                    className="rounded-full border border-[#D9D2C3]/70 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-[#F8F6F1]"
                  >
                    Close
                  </button>
                </div>
              </div>

              <div id="cost-item-form" className="space-y-6 p-7">
                <section className="rounded-2xl border border-[#D9D2C3]/60 bg-[#FCFBF8] p-5">
                  <div className="flex flex-col gap-4 md:flex-row md:items-end">
                    <div className="flex-1">
                      <label className="mb-1 block text-sm font-semibold text-[#0F172A]">
                        Supplier product URL optional
                      </label>
                      <input
                        className="w-full rounded-xl border border-[#D9D2C3]/80 bg-white p-4 text-[#0F172A] outline-none transition focus:border-[#4F46E5] focus:ring-4 focus:ring-[#4F46E5]/10"
                        placeholder="https://supplier.com/product"
                        value={supplierUrl}
                        onChange={(e) => setSupplierUrl(e.target.value)}
                      />
                    </div>

                    <button
                      type="button"
                      onClick={scrapeProductInfo}
                      disabled={isScrapingProduct}
                      className="rounded-2xl bg-[#4F46E5] px-5 py-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#4338CA] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isScrapingProduct ? "Importing..." : "Import Product Details"}
                    </button>
                  </div>

                  <p className="mt-3 text-xs text-slate-500">
                    Paste a supplier URL if you want Budget My Build to help fill in the product name, price, supplier and product number.
                  </p>
                </section>

                {(productImageUrl || productNumber || supplierName || scrapedDescription) && (
                  <section className="rounded-2xl border border-[#D9D2C3]/60 bg-white p-5 shadow-sm">
                    <div className="flex gap-5 items-start">
                      {productImageUrl && (
                        <img
                          src={productImageUrl}
                          alt={itemName || "Product preview"}
                          className="h-24 w-24 rounded-2xl border border-[#D9D2C3]/60 object-cover"
                        />
                      )}

                      <div className="flex-1">
                        <p className="text-sm font-semibold text-slate-500">Product preview</p>
                        <h3 className="mt-1 text-xl font-bold text-[#0F172A]">
                          {itemName || "Product details imported"}
                        </h3>
                        <div className="mt-2 space-y-1 text-sm text-slate-500">
                          {productNumber && <p>Product #: {productNumber}</p>}
                          {supplierName && <p>Supplier: {supplierName}</p>}
                        </div>
                        {scrapedDescription && (
                          <p className="mt-3 line-clamp-3 text-sm text-slate-600">
                            {scrapedDescription}
                          </p>
                        )}
                      </div>
                    </div>
                  </section>
                )}

                <section className="grid gap-4 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <label className="mb-1 block text-sm font-semibold text-[#0F172A]">
                      Item name
                    </label>
                    <input
                      className="w-full rounded-xl border border-[#D9D2C3]/80 bg-white p-4 text-[#0F172A] outline-none transition focus:border-[#4F46E5] focus:ring-4 focus:ring-[#4F46E5]/10"
                      placeholder="e.g. Clipsal Iconic USB outlet"
                      value={itemName}
                      onChange={(e) => {
                        const value = e.target.value;
                        setItemName(value);
                        maybeAutoSelectCategory(value);
                      }}
                      onBlur={() => maybeAutoSelectCategory()}
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-semibold text-[#0F172A]">
                      Quantity
                    </label>
                    <input
                      className="w-full rounded-xl border border-[#D9D2C3]/80 bg-white p-4 text-[#0F172A] outline-none transition focus:border-[#4F46E5] focus:ring-4 focus:ring-[#4F46E5]/10"
                      placeholder="Quantity"
                      type="number"
                      min="1"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-semibold text-[#0F172A]">
                      Budget category
                    </label>
                    <select
                      className="w-full rounded-xl border border-[#D9D2C3]/80 bg-white p-4 text-[#0F172A] outline-none transition focus:border-[#4F46E5] focus:ring-4 focus:ring-[#4F46E5]/10"
                      value={selectedCategory}
                      onChange={(e) => {
                        if (e.target.value === "__create_new__") {
                          setShowQuickCategoryModal(true);
                          setSelectedCategory("");
                          return;
                        }
                        setSelectedCategory(e.target.value);
                        setSelectedFeatureId("");
                      }}
                    >
                      <option value="">Select category</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                      <option value="__create_new__">+ Create new category</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-semibold text-[#0F172A]">
                      Feature optional
                    </label>
                    <select
                      className="w-full rounded-xl border border-[#D9D2C3]/80 bg-white p-4 text-[#0F172A] outline-none transition focus:border-[#4F46E5] focus:ring-4 focus:ring-[#4F46E5]/10"
                      value={selectedFeatureName}
                      onChange={(e) => {
                        setSelectedFeatureName(e.target.value);
                        setSelectedFeatureId("");
                        if (e.target.value !== "Other") {
                          setCustomBudgetFeatureName("");
                        }
                      }}
                    >
                      <option value="">Optional: select feature</option>
                      {featureTypes.map((feature) => (
                        <option key={feature} value={feature}>
                          {feature}
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedFeatureName === "Other" && (
                    <div>
                      <label className="mb-1 block text-sm font-semibold text-[#0F172A]">
                        Custom feature name
                      </label>
                      <input
                        className="w-full rounded-xl border border-[#D9D2C3]/80 bg-white p-4 text-[#0F172A] outline-none transition focus:border-[#4F46E5] focus:ring-4 focus:ring-[#4F46E5]/10"
                        value={customBudgetFeatureName}
                        onChange={(e) => setCustomBudgetFeatureName(e.target.value)}
                        placeholder="Add custom feature name"
                      />
                    </div>
                  )}
                </section>

                {isFlooringItem && (
                  <section className="rounded-2xl border border-[#2E7D6B]/20 bg-[#2E7D6B]/5 p-5">
                    <div className="mb-4">
                      <p className="font-semibold text-[#0F172A]">Flooring quantity helper</p>
                      <p className="mt-1 text-sm text-slate-600">
                        Enter the flooring quantity yourself or calculate it from selected rooms.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={() => setQuantityMethod("manual")}
                        className={`rounded-xl border px-4 py-3 text-left text-sm font-semibold transition ${
                          quantityMethod === "manual"
                            ? "border-[#0F172A] bg-[#0F172A] text-white"
                            : "border-[#D9D2C3]/70 bg-white text-slate-700 hover:bg-[#F8F6F1]"
                        }`}
                      >
                        Enter manually
                        <span className="mt-1 block text-xs font-normal opacity-80">
                          Use the normal quantity and sqm fields.
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setQuantityMethod("rooms");
                          setUseSqmPricing(true);
                        }}
                        className={`rounded-xl border px-4 py-3 text-left text-sm font-semibold transition ${
                          quantityMethod === "rooms"
                            ? "border-[#0F172A] bg-[#0F172A] text-white"
                            : "border-[#D9D2C3]/70 bg-white text-slate-700 hover:bg-[#F8F6F1]"
                        }`}
                      >
                        Calculate from rooms
                        <span className="mt-1 block text-xs font-normal opacity-80">
                          Use room sqm from the Plans tab.
                        </span>
                      </button>
                    </div>

                    {quantityMethod === "rooms" && (
                      <div className="mt-4 space-y-4 rounded-2xl border border-[#D9D2C3]/70 bg-white p-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                          <div>
                            <p className="text-sm font-semibold text-[#0F172A]">
                              Select rooms for this flooring
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              This uses the room sqm already saved from the Plans tab.
                            </p>
                          </div>

                          <div className="w-full sm:w-36">
                            <label className="mb-1 block text-xs font-semibold text-slate-600">
                              Wastage %
                            </label>
                            <input
                              type="number"
                              min="0"
                              className="w-full rounded-xl border border-[#D9D2C3]/80 p-3 text-sm"
                              value={flooringWastagePercent}
                              onChange={(e) => setFlooringWastagePercent(e.target.value)}
                            />
                          </div>
                        </div>

                        {planRooms.length === 0 ? (
                          <div className="rounded-2xl border border-dashed border-[#D9D2C3]/80 p-4 text-sm text-slate-500">
                            No rooms have been added yet. Add rooms in the Plans tab first, or keep using manual sqm entry below.
                          </div>
                        ) : (
                          <div className="grid gap-2 sm:grid-cols-2">
                            {planRooms
                              .slice()
                              .sort((a, b) => getTextValue(a.room_name).localeCompare(getTextValue(b.room_name)))
                              .map((room) => {
                                const roomSqm = getDisplaySqm(room);
                                const checked = selectedFlooringRoomIds.includes(room.id);

                                return (
                                  <label
                                    key={room.id}
                                    className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-sm transition ${
                                      checked
                                        ? "border-[#2E7D6B] bg-[#2E7D6B]/5"
                                        : "border-[#D9D2C3]/70 bg-white hover:bg-[#F8F6F1]"
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={() => toggleFlooringRoom(room.id)}
                                      className="mt-1"
                                    />
                                    <span>
                                      <span className="block font-semibold text-[#0F172A]">
                                        {room.room_name || "Unnamed room"}
                                      </span>
                                      <span className="block text-xs text-slate-500">
                                        {room.room_type || "Room"}{room.floor_level ? ` · ${room.floor_level}` : ""}
                                      </span>
                                      <span className="mt-1 block text-xs font-semibold text-[#2E7D6B]">
                                        {roomSqm > 0 ? `${roomSqm.toFixed(2)} sqm` : "No sqm saved"}
                                      </span>
                                    </span>
                                  </label>
                                );
                              })}
                          </div>
                        )}

                        <div className="rounded-2xl bg-[#0F172A] p-5 text-white">
                          <p className="text-sm opacity-70">Recommended amount to order</p>
                          <p className="mt-1 text-3xl font-bold">
                            {getFlooringRecommendedSqm().toFixed(1)} sqm
                          </p>
                          <p className="mt-2 text-xs opacity-80">
                            Selected rooms: {getFlooringSelectedAreaSqm().toFixed(2)} sqm
                            {Number(flooringWastagePercent || 0) > 0
                              ? ` + ${Number(flooringWastagePercent || 0)}% wastage`
                              : ""}
                          </p>

                          {Number(boxCoverageSqm || 0) > 0 && (
                            <p className="mt-2 text-xs opacity-80">
                              Box coverage: {boxCoverageSqm} sqm/box · Recommended boxes: {getFlooringRecommendedBoxes()}
                            </p>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={useFlooringRecommendation}
                          className="w-full rounded-xl bg-[#2E7D6B] px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#256B5C]"
                        >
                          Use Recommended Quantity
                        </button>
                      </div>
                    )}
                  </section>
                )}

                <section className="rounded-2xl border border-[#D9D2C3]/60 bg-white p-5">
                  <div className="mb-5">
                    <p className="font-semibold text-[#0F172A]">Purchase tracking</p>
                    <p className="mt-1 text-sm text-slate-500">
                      Track whether this item is still planned, quoted or already purchased.
                    </p>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-sm font-semibold text-[#0F172A]">
                        Purchase status
                      </label>
                      <select
                        className="w-full rounded-xl border border-[#D9D2C3]/80 bg-white p-4 text-[#0F172A] outline-none transition focus:border-[#4F46E5] focus:ring-4 focus:ring-[#4F46E5]/10"
                        value={productStatus}
                        onChange={(e) => setProductStatus(e.target.value)}
                      >
                        {productStatuses.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-semibold text-[#0F172A]">
                        Purchase type
                      </label>
                      <select
                        className="w-full rounded-xl border border-[#D9D2C3]/80 bg-white p-4 text-[#0F172A] outline-none transition focus:border-[#4F46E5] focus:ring-4 focus:ring-[#4F46E5]/10"
                        value={purchaseType}
                        onChange={(e) => setPurchaseType(e.target.value)}
                      >
                        <option value="Owner purchase">Owner purchase</option>
                        <option value="Builder purchase">Builder purchase</option>
                      </select>
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-semibold text-[#0F172A]">
                        Trade discount %
                      </label>
                      <input
                        className="w-full rounded-xl border border-[#D9D2C3]/80 bg-white p-4 text-[#0F172A] outline-none transition focus:border-[#4F46E5] focus:ring-4 focus:ring-[#4F46E5]/10"
                        placeholder="e.g. 15"
                        type="number"
                        min="0"
                        max="100"
                        value={tradeDiscountPercent}
                        onChange={(e) => setTradeDiscountPercent(e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-semibold text-[#0F172A]">
                        Deposit paid ($)
                      </label>
                      <input
                        className="w-full rounded-xl border border-[#D9D2C3]/80 bg-white p-4 text-[#0F172A] outline-none transition focus:border-[#4F46E5] focus:ring-4 focus:ring-[#4F46E5]/10"
                        placeholder="e.g. 1,000"
                        type="text"
                        inputMode="decimal"
                        value={depositPaid}
                        onChange={(e) => setDepositPaid(e.target.value)}
                        onBlur={() => setDepositPaid(formatMoneyInput(depositPaid))}
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="mb-1 block text-sm font-semibold text-[#0F172A]">
                        Notes / comments
                      </label>
                      <textarea
                        className="min-h-24 w-full rounded-xl border border-[#D9D2C3]/80 bg-white p-4 text-[#0F172A] outline-none transition focus:border-[#4F46E5] focus:ring-4 focus:ring-[#4F46E5]/10"
                        placeholder="Sizes, colours, finish, material match, supplier notes or anything you want to remember."
                        value={itemNotes}
                        onChange={(e) => setItemNotes(e.target.value)}
                      />
                    </div>
                  </div>
                </section>

                <section className="rounded-2xl border border-[#D9D2C3]/60 bg-white p-5">
                  <div className="mb-5 flex items-center justify-between gap-4">
                    <div>
                      <p className="font-semibold text-[#0F172A]">Costing method</p>
                      <p className="mt-1 text-sm text-slate-500">
                        Use a simple item cost or sqm pricing for area-based selections.
                      </p>
                    </div>

                    <label className="flex items-center gap-3 text-sm font-semibold text-slate-700">
                      <input
                        type="checkbox"
                        checked={useSqmPricing}
                        onChange={(e) => setUseSqmPricing(e.target.checked)}
                      />
                      Sqm pricing
                    </label>
                  </div>

                  {!useSqmPricing ? (
                    <div>
                      <label className="mb-1 block text-sm font-semibold text-[#0F172A]">
                        Estimated cost ($)
                      </label>
                      <input
                        className="w-full rounded-xl border border-[#D9D2C3]/80 bg-white p-4 text-[#0F172A] outline-none transition focus:border-[#4F46E5] focus:ring-4 focus:ring-[#4F46E5]/10"
                        placeholder="Estimated cost"
                        type="text"
                        inputMode="decimal"
                        value={estimatedCost}
                        onChange={(e) => setEstimatedCost(e.target.value)}
                        onBlur={() => setEstimatedCost(formatMoneyInput(estimatedCost))}
                      />
                    </div>
                  ) : (
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-sm font-semibold text-[#0F172A]">
                          Area (sqm)
                        </label>
                        <input
                          className="w-full rounded-xl border border-[#D9D2C3]/80 bg-white p-4 text-[#0F172A] outline-none transition focus:border-[#4F46E5] focus:ring-4 focus:ring-[#4F46E5]/10"
                          placeholder="sqm"
                          type="number"
                          value={sqm}
                          onChange={(e) => setSqm(e.target.value)}
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-sm font-semibold text-[#0F172A]">
                          Cost per sqm ($)
                        </label>
                        <input
                          className="w-full rounded-xl border border-[#D9D2C3]/80 bg-white p-4 text-[#0F172A] outline-none transition focus:border-[#4F46E5] focus:ring-4 focus:ring-[#4F46E5]/10"
                          placeholder="Cost per sqm"
                          type="text"
                          inputMode="decimal"
                          value={costPerSqm}
                          onChange={(e) => setCostPerSqm(e.target.value)}
                          onBlur={() => setCostPerSqm(formatMoneyInput(costPerSqm))}
                        />
                      </div>

                      <label className="flex items-center gap-3 md:col-span-2 text-sm text-slate-700">
                        <input
                          type="checkbox"
                          checked={includeWastage}
                          onChange={(e) => setIncludeWastage(e.target.checked)}
                        />
                        Add 10% wastage allowance
                      </label>

                      <div className="rounded-2xl bg-[#0F172A] p-5 text-white md:col-span-2">
                        <p className="text-sm opacity-70">Calculated Total</p>
                        <p className="mt-1 text-3xl font-bold">
                          ${formatMoney(calculateSqmTotal())}
                        </p>
                      </div>
                    </div>
                  )}
                </section>
              </div>

              <div className="sticky bottom-0 border-t border-[#D9D2C3]/60 bg-white px-7 py-5">
                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      resetItemForm();
                      setShowItemModal(false);
                    }}
                    className="rounded-2xl border border-[#D9D2C3]/70 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-[#F8F6F1]"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={createItem}
                    className="rounded-2xl bg-[#4F46E5] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#4338CA]"
                  >
                    {editingItemId ? "Save Selection" : "Add Selection"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {showQuickCategoryModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F172A]/40 p-4">
            <div className="w-full max-w-lg rounded-2xl bg-white p-7 shadow-xl">
              <p className="text-sm font-semibold uppercase tracking-wide text-[#2E7D6B]">
                Budget category
              </p>
              <h2 className="mt-2 text-2xl font-bold text-[#0F172A]">
                Create New Category
              </h2>
              <p className="mt-2 text-sm text-gray-500">
                Create a new budget category for products, allowances or selections.
              </p>

              <div className="mt-5 space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-700">
                    Category name
                  </label>
                  <input
                    className="w-full rounded-xl border border-[#D9D2C3] bg-white p-4"
                    value={quickCategoryName}
                    onChange={(e) => setQuickCategoryName(e.target.value)}
                    placeholder="e.g. Windows & Doors"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-700">
                    Budget optional
                  </label>
                  <input
                    className="w-full rounded-xl border border-[#D9D2C3] bg-white p-4"
                    type="text"
                    inputMode="decimal"
                    value={quickCategoryBudget}
                    onChange={(e) => setQuickCategoryBudget(e.target.value)}
                    onBlur={() => setQuickCategoryBudget(formatMoneyInput(quickCategoryBudget))}
                    placeholder="e.g. 12,000"
                  />
                </div>
              </div>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowQuickCategoryModal(false);
                    setQuickCategoryName("");
                    setQuickCategoryBudget("");
                  }}
                  className="rounded-xl border border-[#D9D2C3] bg-white px-5 py-3 font-semibold text-slate-700 hover:bg-[#F8F6F1]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={createQuickCategory}
                  className="rounded-xl bg-[#4F46E5] px-5 py-3 font-semibold text-white hover:bg-[#4338CA]"
                >
                  Create Category
                </button>
              </div>
            </div>
          </div>
        )}

        {activeAttachmentCategory && (
          <div className="fixed inset-0 z-[75] flex items-center justify-center bg-[#0F172A]/40 p-4">
            <div className="w-full max-w-2xl rounded-2xl border bg-white p-6 shadow-xl">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wide text-[#4F46E5]">Category attachments</p>
                  <h3 className="mt-1 text-2xl font-bold text-[#0F172A]">
                    {activeAttachmentCategory.name}
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">Upload and store quotes, invoices, receipts, specs or other category documents.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveAttachmentCategoryId(null)}
                  className="rounded-full border border-[#D9D2C3] bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-[#F8F6F1]"
                >
                  Close
                </button>
              </div>

              <div className="mt-5 rounded-2xl border border-[#D9D2C3]/70 bg-[#F8F6F1] p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-semibold text-[#0F172A]">Upload a category document</p>
                    <p className="mt-1 text-sm text-slate-500">Add quotes, invoices, receipts, specs, schedules or supplier documents.</p>
                  </div>

                  <input
                    id={`active-category-attachment-upload-${activeAttachmentCategory.id}`}
                    type="file"
                    className="hidden"
                    accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx"
                    onChange={(event) => {
                      const file = event.target.files?.[0] || null;
                      uploadCategoryAttachment(activeAttachmentCategory, file);
                      event.currentTarget.value = "";
                    }}
                  />

                  <button
                    type="button"
                    onClick={() => document.getElementById(`active-category-attachment-upload-${activeAttachmentCategory.id}`)?.click()}
                    disabled={uploadingCategoryAttachmentId === activeAttachmentCategory.id}
                    className="rounded-full bg-[#4F46E5] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#4338CA] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {uploadingCategoryAttachmentId === activeAttachmentCategory.id ? "Uploading..." : "Upload attachment"}
                  </button>
                </div>
              </div>

              <div className="mt-5">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="text-sm font-bold uppercase tracking-wide text-[#0F172A]">Attached files</p>
                  <span className="rounded-full bg-[#F8F6F1] px-3 py-1 text-xs font-semibold text-slate-600">
                    {activeCategoryAttachments.length} file{activeCategoryAttachments.length === 1 ? "" : "s"}
                  </span>
                </div>

                {activeCategoryAttachments.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-[#D9D2C3] bg-white p-6 text-center">
                    <p className="font-semibold text-[#0F172A]">No attachments yet</p>
                    <p className="mt-1 text-sm text-slate-500">Upload the first quote, invoice, receipt, spec or category document above.</p>
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-2xl border border-[#D9D2C3]/70">
                    <div className="divide-y divide-[#D9D2C3]/60">
                      {activeCategoryAttachments.map((attachment) => (
                        <div key={attachment.id} className="flex flex-col gap-3 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-[#0F172A]">📄 {attachment.file_name}</p>
                            <p className="mt-1 text-xs text-slate-500">
                              Uploaded {attachment.uploaded_at ? new Date(attachment.uploaded_at).toLocaleDateString() : "recently"}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => openCategoryAttachment(attachment)}
                              className="rounded-full bg-[#0F172A] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800"
                            >
                              Open
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteCategoryAttachment(attachment)}
                              className="rounded-full border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {noticeModal && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[#0F172A]/40 p-4">
            <div className="w-full max-w-md rounded-2xl border bg-white p-6 shadow-xl">
              <div className="mb-4 flex items-start gap-3">
                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-xl ${
                    noticeModal.tone === "success"
                      ? "bg-[#2E7D6B]/10 text-[#2E7D6B]"
                      : noticeModal.tone === "warning"
                        ? "bg-amber-100 text-amber-700"
                        : noticeModal.tone === "error"
                          ? "bg-red-100 text-red-700"
                          : "bg-blue-100 text-blue-700"
                  }`}
                >
                  {noticeModal.tone === "success"
                    ? "✅"
                    : noticeModal.tone === "warning"
                      ? "⚠️"
                      : noticeModal.tone === "error"
                        ? "❌"
                        : "ℹ️"}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-950">
                    {noticeModal.title}
                  </h3>
                  <p className="mt-2 whitespace-pre-line text-sm text-gray-600">
                    {noticeModal.message}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setNoticeModal(null)}
                className="mt-2 w-full rounded-xl bg-[#0F172A] px-5 py-3 text-sm font-semibold text-white shadow-md hover:shadow-md"
              >
                OK
              </button>
            </div>
          </div>
        )}

        {confirmModal && (
          <div className="fixed inset-0 z-[90] flex items-center justify-center bg-[#0F172A]/40 p-4">
            <div className="w-full max-w-md rounded-2xl border bg-white p-6 shadow-xl">
              <div className="mb-4 flex items-start gap-3">
                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-xl ${
                    confirmModal.tone === "error"
                      ? "bg-red-100 text-red-700"
                      : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {confirmModal.tone === "error" ? "🗑️" : "⚠️"}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-950">
                    {confirmModal.title}
                  </h3>
                  <p className="mt-2 whitespace-pre-line text-sm text-gray-600">
                    {confirmModal.message}
                  </p>
                </div>
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={confirmModal.onCancel}
                  className="flex-1 rounded-xl border border-gray-300 bg-white px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-[#F8F6F1]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmModal.onConfirm}
                  className="flex-1 rounded-xl bg-[#0F172A] px-5 py-3 text-sm font-semibold text-white shadow-md hover:shadow-md"
                >
                  Continue
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
