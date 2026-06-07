import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function numberValue(value: any) {
  return Number(value || 0);
}

function calculateItemTotal(item: any) {
  const quantity = numberValue(item.quantity || 1) || 1;

  if (item.use_sqm_pricing) {
    const base = numberValue(item.sqm) * numberValue(item.cost_per_sqm);
    const total = item.include_wastage ? base * 1.1 : base;
    return total * quantity;
  }

  return numberValue(item.estimated_cost) * quantity;
}

function normaliseFeatureGroup(feature: any) {
  const type = String(feature.feature_type || "Other").toLowerCase();
  const name = String(
    feature.feature_name || feature.feature_type || "Feature",
  ).toLowerCase();
  const value = `${type} ${name}`;

  const isWindow = value.includes("window");
  const isDoor = value.includes("door");

  if (isWindow) {
    if (value.includes("sliding")) return "Sliding Window";
    if (value.includes("double hung") || value.includes("double-hung"))
      return "Double Hung Window";
    if (value.includes("tilt") || value.includes("turn"))
      return "Tilt Turn Window";
    if (value.includes("awning")) return "Awning Window";
    if (value.includes("casement")) return "Casement Window";
    return "Window";
  }

  if (
    isDoor ||
    value.includes("sliding") ||
    value.includes("cavity") ||
    value.includes("patio") ||
    value.includes("stacker") ||
    value.includes("bifold") ||
    value.includes("bi-fold") ||
    value.includes("bi fold")
  ) {
    if (
      value.includes("large") ||
      value.includes("patio") ||
      value.includes("stacker") ||
      value.includes("bifold") ||
      value.includes("bi-fold") ||
      value.includes("bi fold")
    ) {
      return "Large Sliding Door";
    }

    if (value.includes("cavity")) return "Cavity Sliding Door";
    if (value.includes("sliding")) return "Sliding Door";
    if (value.includes("external") || value.includes("entry"))
      return "External Door";
    return "Internal Door";
  }

  if (value.includes("stair")) return "Staircase";
  if (value.includes("void")) return "Void";
  if (value.includes("deck")) return "Deck";
  if (value.includes("balcony")) return "Balcony";
  if (value.includes("alfresco") || value.includes("patio")) return "Alfresco";
  if (value.includes("pool") || value.includes("spa")) return "Pool";
  if (value.includes("garage")) return "Garage";
  if (value.includes("carport")) return "Carport";
  if (value.includes("solar")) return "Solar";
  if (value.includes("pergola")) return "Pergola";
  if (value.includes("fireplace")) return "Fireplace";
  if (value.includes("retaining")) return "Retaining Wall";
  if (value.includes("skylight")) return "Skylight";
  if (
    value.includes("robe") ||
    value.includes("joinery") ||
    value.includes("linen")
  )
    return "Robe";

  return feature.feature_type || feature.feature_name || "Feature";
}

function groupFeatures(features: any[]) {
  const groups: Record<string, any> = {};

  features.forEach((feature) => {
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
        features: [],
      };
    }

    groups[groupName].features.push(feature);
    groups[groupName].quantity += numberValue(feature.quantity || 1) || 1;
    groups[groupName].estimated_length_m += numberValue(
      feature.estimated_length_m,
    );
    groups[groupName].estimated_width_m += numberValue(
      feature.estimated_width_m,
    );
    groups[groupName].estimated_area_sqm += numberValue(
      feature.estimated_area_sqm,
    );
  });

  return Object.values(groups).map((group: any) => {
    const singleItemFeatures = ["Pool"];

    if (singleItemFeatures.includes(group.feature_type)) {
      return {
        ...group,
        quantity: 1,
      };
    }

    return group;
  });
}

function findAssumption(assumptions: any[], type: string, category: string) {
  const cleanCategory = String(category || "")
    .toLowerCase()
    .trim();
  if (!cleanCategory) return null;

  return (
    assumptions.find(
      (assumption) =>
        assumption.assumption_type === type &&
        String(assumption.category || "")
          .toLowerCase()
          .trim() === cleanCategory,
    ) ||
    assumptions.find((assumption) => {
      const assumptionCategory = String(assumption.category || "")
        .toLowerCase()
        .trim();
      return (
        assumption.assumption_type === type &&
        assumptionCategory &&
        cleanCategory.includes(assumptionCategory)
      );
    }) ||
    null
  );
}

function getFallbackRoomSqm(room: any) {
  const value = String(room.room_type || room.room_name || "").toLowerCase();

  if (value.includes("bath")) return 6;
  if (value.includes("ensuite") || value.includes("ens")) return 4;
  if (value.includes("bed")) return 12;
  if (value.includes("kitchen")) return 15;
  if (value.includes("living")) return 25;
  if (value.includes("dining")) return 14;
  if (value.includes("laundry")) return 5;
  if (value.includes("wir") || value.includes("robe")) return 5;
  if (value.includes("pantry")) return 3;
  if (value.includes("study")) return 8;
  if (value.includes("hall")) return 6;

  return 10;
}

function getRoomRenovationMultiplier(room: any) {
  const renovationType = String(
    room.renovation_type || "renovation",
  ).toLowerCase();
  const roomType = String(room.room_type || room.room_name || "").toLowerCase();
  const isWetArea =
    roomType.includes("bath") ||
    roomType.includes("ensuite") ||
    roomType.includes("laundry") ||
    roomType.includes("kitchen");

  if (renovationType.includes("existing")) return 0;
  if (renovationType.includes("extension")) return 1;
  if (renovationType.includes("new")) return 0.95;
  if (renovationType.includes("renovation")) return isWetArea ? 1.25 : 1.15;

  return 1;
}

function calculateRoomEstimate(room: any, assumptions: any[]) {
  const assumption =
    findAssumption(assumptions, "room", room.room_type) ||
    findAssumption(assumptions, "room", room.room_name) ||
    findAssumption(assumptions, "room", "Other");

  let sqm = numberValue(room.estimated_sqm);
  const usedFallbackSqm = !sqm || sqm <= 0;

  if (usedFallbackSqm) {
    sqm = getFallbackRoomSqm(room);
  }

  if (!assumption) {
    return {
      ...room,
      estimate: {
        low: 0,
        high: 0,
        source: "missing_assumption",
        assumed_sqm: sqm,
        used_fallback_sqm: usedFallbackSqm,
        assumption: null,
        renovation_multiplier: 1,
      },
    };
  }

  const renovationMultiplier = getRoomRenovationMultiplier(room);
  const baseLow = sqm * numberValue(assumption.low_rate);
  const baseHigh = sqm * numberValue(assumption.high_rate);

  return {
    ...room,
    estimate: {
      low: baseLow * renovationMultiplier,
      high: baseHigh * renovationMultiplier,
      base_low: baseLow,
      base_high: baseHigh,
      source: "system_assumption",
      assumption,
      assumed_sqm: sqm,
      used_fallback_sqm: usedFallbackSqm,
      renovation_multiplier: renovationMultiplier,
    },
  };
}

function calculateFeatureEstimate(feature: any, assumptions: any[]) {
  const assumption =
    findAssumption(assumptions, "feature", feature.feature_type) ||
    findAssumption(assumptions, "feature", feature.feature_name);

  const quantity = numberValue(feature.quantity || 1) || 1;
  const area = numberValue(feature.estimated_area_sqm);
  const length = numberValue(feature.estimated_length_m);

  if (!assumption) {
    return {
      ...feature,
      estimate: {
        low: 0,
        high: 0,
        source: "missing_assumption",
        assumption: null,
        multiplier_used: 0,
        missing_reason: "No matching feature cost assumption found.",
      },
    };
  }

  let multiplier = quantity;
  let source = "system_assumption";
  let missingReason = null;

  if (assumption.unit === "sqm") {
    if (area > 0) multiplier = area;
    else {
      multiplier = 0;
      source = "missing_measurement";
      missingReason =
        "This feature needs an area in sqm before it can be costed.";
    }
  }

  if (assumption.unit === "lm") {
    if (length > 0) multiplier = length;
    else {
      multiplier = 0;
      source = "missing_measurement";
      missingReason =
        "This feature needs a length in linear metres before it can be costed.";
    }
  }

  return {
    ...feature,
    estimate: {
      low: multiplier * numberValue(assumption.low_rate),
      high: multiplier * numberValue(assumption.high_rate),
      source,
      assumption,
      multiplier_used: multiplier,
      missing_reason: missingReason,
    },
  };
}

function getMultiplier(profile: any) {
  const multipliers = {
    quality_level: { budget: 0.9, mid: 1, high: 1.25, luxury: 1.55 },
    site_complexity: { simple: 0.95, standard: 1, complex: 1.2 },
    access_difficulty: { easy: 0.95, normal: 1, difficult: 1.15 },
    slope_level: { flat: 1, slight: 1.05, moderate: 1.15, steep: 1.3 },
    glazing_level: { standard: 1, high: 1.08, very_high: 1.18 },
    ceiling_height_level: { standard: 1, high: 1.08, raked: 1.15, mixed: 1.1 },
    wet_area_level: { standard: 1, multiple: 1.08, high_end: 1.18 },
  } as const;

  const breakdown = {
    quality_level:
      multipliers.quality_level[
        (profile.quality_level ||
          "mid") as keyof typeof multipliers.quality_level
      ] || 1,
    site_complexity:
      multipliers.site_complexity[
        (profile.site_complexity ||
          "standard") as keyof typeof multipliers.site_complexity
      ] || 1,
    access_difficulty:
      multipliers.access_difficulty[
        (profile.access_difficulty ||
          "normal") as keyof typeof multipliers.access_difficulty
      ] || 1,
    slope_level:
      multipliers.slope_level[
        (profile.slope_level || "flat") as keyof typeof multipliers.slope_level
      ] || 1,
    glazing_level:
      multipliers.glazing_level[
        (profile.glazing_level ||
          "standard") as keyof typeof multipliers.glazing_level
      ] || 1,
    ceiling_height_level:
      multipliers.ceiling_height_level[
        (profile.ceiling_height_level ||
          "standard") as keyof typeof multipliers.ceiling_height_level
      ] || 1,
    wet_area_level:
      multipliers.wet_area_level[
        (profile.wet_area_level ||
          "standard") as keyof typeof multipliers.wet_area_level
      ] || 1,
  };

  const values: number[] = Object.values(breakdown);
  const total = values.reduce((product, value) => product * value, 1);

  return { total, breakdown };
}

function getContingencyRates(level: string) {
  if (level === "low") return { low: 0.07, high: 0.1 };
  if (level === "high") return { low: 0.15, high: 0.22 };
  return { low: 0.1, high: 0.15 };
}

function getProjectCostRates() {
  return {
    builder_margin_rate: 0.12,
    preliminaries_admin_rate: 0.08,
    qleave_rate: 0.00575,
    home_warranty_rate: 0.0075,
    gst_treatment: "Assumption rates and product costs are treated as GST-inclusive. GST is not added again.",
  };
}

function calculateProjectCostAdditions(worksLow: number, worksHigh: number) {
  const rates = getProjectCostRates();

  const builderMarginLow = worksLow * rates.builder_margin_rate;
  const builderMarginHigh = worksHigh * rates.builder_margin_rate;

  const preliminariesAdminLow = worksLow * rates.preliminaries_admin_rate;
  const preliminariesAdminHigh = worksHigh * rates.preliminaries_admin_rate;

  const statutoryBaseLow = worksLow + builderMarginLow + preliminariesAdminLow;
  const statutoryBaseHigh = worksHigh + builderMarginHigh + preliminariesAdminHigh;

  const qleaveLow = statutoryBaseLow * rates.qleave_rate;
  const qleaveHigh = statutoryBaseHigh * rates.qleave_rate;

  const homeWarrantyLow = statutoryBaseLow * rates.home_warranty_rate;
  const homeWarrantyHigh = statutoryBaseHigh * rates.home_warranty_rate;

  const totalLow = builderMarginLow + preliminariesAdminLow + qleaveLow + homeWarrantyLow;
  const totalHigh = builderMarginHigh + preliminariesAdminHigh + qleaveHigh + homeWarrantyHigh;

  return {
    rates,
    builder_margin_low: builderMarginLow,
    builder_margin_high: builderMarginHigh,
    preliminaries_admin_low: preliminariesAdminLow,
    preliminaries_admin_high: preliminariesAdminHigh,
    qleave_low: qleaveLow,
    qleave_high: qleaveHigh,
    home_warranty_low: homeWarrantyLow,
    home_warranty_high: homeWarrantyHigh,
    statutory_base_low: statutoryBaseLow,
    statutory_base_high: statutoryBaseHigh,
    total_low: totalLow,
    total_high: totalHigh,
  };
}

function buildConfidence(
  roomBreakdown: any[],
  featureBreakdown: any[],
  items: any[],
) {
  const roomCount = roomBreakdown.length;
  const featureCount = featureBreakdown.length;
  const itemCount = items.length;

  const roomsWithMeasuredSqm = roomBreakdown.filter(
    (room) => !room.estimate?.used_fallback_sqm,
  ).length;
  const roomsWithAssumptions = roomBreakdown.filter(
    (room) => room.estimate?.source !== "missing_assumption",
  ).length;
  const featuresCosted = featureBreakdown.filter(
    (feature) => feature.estimate?.source === "system_assumption",
  ).length;
  const knownProductValue = items.reduce(
    (sum, item) => sum + calculateItemTotal(item),
    0,
  );

  const roomMeasurementScore =
    roomCount === 0 ? 20 : (roomsWithMeasuredSqm / roomCount) * 30;
  const roomAssumptionScore =
    roomCount === 0 ? 0 : (roomsWithAssumptions / roomCount) * 25;
  const featureScore =
    featureCount === 0 ? 10 : (featuresCosted / featureCount) * 20;
  const productScore = knownProductValue > 0 || itemCount > 0 ? 15 : 5;
  const baseScore = 10;

  const score = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        baseScore +
          roomMeasurementScore +
          roomAssumptionScore +
          featureScore +
          productScore,
      ),
    ),
  );

  let label = "Low";
  if (score >= 75) label = "High";
  else if (score >= 50) label = "Medium";

  const reasons = [];

  if (roomCount === 0)
    reasons.push("No rooms have been detected or entered yet.");
  if (roomCount > 0 && roomsWithMeasuredSqm < roomCount) {
    reasons.push(
      `${roomCount - roomsWithMeasuredSqm} room(s) are using assumed sizes.`,
    );
  }
  if (featureCount > 0 && featuresCosted < featureCount) {
    reasons.push(
      `${featureCount - featuresCosted} feature(s) need a matching assumption or measurement.`,
    );
  }
  if (knownProductValue > 0)
    reasons.push(
      "Known product selections have been included in the estimate.",
    );

  return { score, label, reasons };
}

function buildEstimateCommentary(
  profile: any,
  multiplier: any,
  confidence: any,
  roomBreakdown: any[],
  featureBreakdown: any[],
) {
  const commentary = [];
  const roomsUsingFallback = roomBreakdown.filter(
    (room) => room.estimate?.used_fallback_sqm,
  );
  const missingFeatures = featureBreakdown.filter(
    (feature) => feature.estimate?.source !== "system_assumption",
  );

  if (multiplier.total > 1.25) {
    commentary.push(
      "The project profile is materially increasing the estimate due to selected complexity, access, finish, glazing, ceiling or wet-area settings.",
    );
  }

  if (profile.quality_level === "high" || profile.quality_level === "luxury") {
    commentary.push(
      "The selected finish level is increasing the estimate range compared with a mid-range allowance.",
    );
  }

  if (
    profile.site_complexity === "complex" ||
    profile.access_difficulty === "difficult"
  ) {
    commentary.push(
      "Site complexity and/or difficult access are increasing the adjusted subtotal.",
    );
  }

  if (roomsUsingFallback.length > 0) {
    commentary.push(
      `${roomsUsingFallback.length} room(s) are using assumed room sizes because dimensions were not available.`,
    );
  }

  if (missingFeatures.length > 0) {
    commentary.push(
      `${missingFeatures.length} feature(s) were detected but could not be fully costed yet.`,
    );
  }

  commentary.push(
    `Estimate confidence is currently ${confidence.label.toLowerCase()} at ${confidence.score}/100.`,
  );

  return commentary;
}

export async function POST(request: Request) {
  try {
    const { projectId } = await request.json();

    if (!projectId) {
      return NextResponse.json({ error: "Missing projectId" }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: "Missing Supabase server environment variables." },
        { status: 500 },
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const [
      { data: project, error: projectError },
      { data: assumptions, error: assumptionsError },
      { data: rooms, error: roomsError },
      { data: features, error: featuresError },
      { data: items, error: itemsError },
    ] = await Promise.all([
      supabase.from("projects").select("*").eq("id", projectId).single(),
      supabase.from("cost_assumptions").select("*").eq("active", true),
      supabase
        .from("plan_rooms")
        .select(
          "*, plan_pages!inner(id, project_plan_id, floor_level, project_plans!inner(project_id))",
        )
        .eq("plan_pages.project_plans.project_id", projectId),
      supabase.from("plan_features").select("*").eq("project_id", projectId),
      supabase.from("project_items").select("*").eq("project_id", projectId),
    ]);

    if (projectError) throw projectError;
    if (assumptionsError) throw assumptionsError;
    if (roomsError) throw roomsError;
    if (featuresError) throw featuresError;
    if (itemsError) throw itemsError;

    const groupedFeatures = groupFeatures(features || []);

    const roomBreakdown = (rooms || []).map((room) =>
      calculateRoomEstimate(room, assumptions || []),
    );
    const featureBreakdown = groupedFeatures.map((feature) =>
      calculateFeatureEstimate(feature, assumptions || []),
    );

    const roomsLow = roomBreakdown.reduce(
      (sum, room) => sum + numberValue(room.estimate?.low),
      0,
    );
    const roomsHigh = roomBreakdown.reduce(
      (sum, room) => sum + numberValue(room.estimate?.high),
      0,
    );
    const featuresLow = featureBreakdown.reduce(
      (sum, feature) => sum + numberValue(feature.estimate?.low),
      0,
    );
    const featuresHigh = featureBreakdown.reduce(
      (sum, feature) => sum + numberValue(feature.estimate?.high),
      0,
    );
    const knownItemsTotal = (items || []).reduce(
      (sum, item) => sum + calculateItemTotal(item),
      0,
    );

    const profile = {
      quality_level: project.quality_level || "mid",
      site_complexity: project.site_complexity || "standard",
      access_difficulty: project.access_difficulty || "normal",
      slope_level: project.slope_level || "flat",
      glazing_level: project.glazing_level || "standard",
      ceiling_height_level: project.ceiling_height_level || "standard",
      wet_area_level: project.wet_area_level || "standard",
      contingency_level: project.contingency_level || "standard",
    };

    const multiplier = getMultiplier(profile);
    const contingencyRates = getContingencyRates(profile.contingency_level);

    const baseSubtotalLow = roomsLow + featuresLow + knownItemsTotal;
    const baseSubtotalHigh = roomsHigh + featuresHigh + knownItemsTotal;

    const adjustedWorksLow = baseSubtotalLow * multiplier.total;
    const adjustedWorksHigh = baseSubtotalHigh * multiplier.total;

    const projectCostAdditions = calculateProjectCostAdditions(
      adjustedWorksLow,
      adjustedWorksHigh,
    );

    const subtotalLow = adjustedWorksLow + projectCostAdditions.total_low;
    const subtotalHigh = adjustedWorksHigh + projectCostAdditions.total_high;

    const contingencyLow = subtotalLow * contingencyRates.low;
    const contingencyHigh = subtotalHigh * contingencyRates.high;

    const totalLow = subtotalLow + contingencyLow;
    const totalHigh = subtotalHigh + contingencyHigh;

    const missingRoomAssumptions = roomBreakdown.filter(
      (room) => room.estimate?.source === "missing_assumption",
    );
    const missingFeatureAssumptions = featureBreakdown.filter(
      (feature) => feature.estimate?.source === "missing_assumption",
    );
    const missingFeatureMeasurements = featureBreakdown.filter(
      (feature) => feature.estimate?.source === "missing_measurement",
    );
    const confidence = buildConfidence(
      roomBreakdown,
      featureBreakdown,
      items || [],
    );
    const commentary = buildEstimateCommentary(
      profile,
      multiplier,
      confidence,
      roomBreakdown,
      featureBreakdown,
    );

    const likely_total = (totalLow + totalHigh) / 2;
    const expectedSpread =
      confidence.score >= 80
        ? 0.06
        : confidence.score >= 60
          ? 0.08
          : confidence.score >= 40
            ? 0.1
            : 0.12;
    const expected_low = likely_total * (1 - expectedSpread);
    const expected_high = likely_total * (1 + expectedSpread);

    const payload = {
      project_id: projectId,
      rooms_low: roomsLow,
      rooms_high: roomsHigh,
      features_low: featuresLow,
      features_high: featuresHigh,
      known_items_total: knownItemsTotal,
      subtotal_low: subtotalLow,
      subtotal_high: subtotalHigh,
      multiplier: multiplier.total,
      contingency_low: contingencyLow,
      contingency_high: contingencyHigh,
      total_low: totalLow,
      total_high: totalHigh,
      likely_total,
      expected_low,
      expected_high,
      caution_low: totalLow,
      caution_high: totalHigh,
      inputs: {
        profile,
        ...profile,
        multiplier_breakdown: multiplier.breakdown,
        contingency_rates: contingencyRates,
        project_cost_additions: projectCostAdditions,
        confidence,
        commentary,
        estimate_display: {
          likely_total,
          expected_low,
          expected_high,
          expected_spread: expectedSpread,
          caution_low: totalLow,
          caution_high: totalHigh,
        },
        counts: {
          rooms: roomBreakdown.length,
          features: featureBreakdown.length,
          known_items: (items || []).length,
          missing_room_assumptions: missingRoomAssumptions.length,
          missing_feature_assumptions: missingFeatureAssumptions.length,
          missing_feature_measurements: missingFeatureMeasurements.length,
        },
      },
      breakdown: {
        rooms: roomBreakdown,
        features: featureBreakdown,
        known_items: (items || []).map((item) => ({
          id: item.id,
          item_name: item.item_name,
          total: calculateItemTotal(item),
          category_id: item.category_id,
          feature_id: item.feature_id,
          supplier_name: item.supplier_name,
          product_status: item.product_status,
        })),
        missing_room_assumptions: missingRoomAssumptions,
        missing_feature_assumptions: missingFeatureAssumptions,
        missing_feature_measurements: missingFeatureMeasurements,
        base_subtotal_low: baseSubtotalLow,
        base_subtotal_high: baseSubtotalHigh,
        adjusted_works_low: adjustedWorksLow,
        adjusted_works_high: adjustedWorksHigh,
        project_cost_additions: projectCostAdditions,
        likely_total,
        expected_low,
        expected_high,
        expected_spread: expectedSpread,
        caution_low: totalLow,
        caution_high: totalHigh,
        confidence,
        commentary,
      },
    };

    const { data: estimate, error: insertError } = await supabase
      .from("project_estimates")
      .insert(payload)
      .select("*")
      .single();

    if (insertError) throw insertError;

    return NextResponse.json({ estimate });
  } catch (error: any) {
    console.error("Generate estimate failed:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate estimate" },
      { status: 500 },
    );
  }
}
