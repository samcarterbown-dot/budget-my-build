import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

function formatName(value: string) {
  const acronyms = ["TV", "WIR", "WC", "AV", "BBQ"];

  return String(value || "Room")
    .toLowerCase()
    .replace(/\bex\b/g, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => {
      const upper = word.toUpperCase();
      if (acronyms.includes(upper)) return upper;
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}

function normaliseRoomBaseName(roomName: string, roomType: string) {
  const value = `${roomName || ""} ${roomType || ""}`.toLowerCase();

  if (value.includes("master") && value.includes("bed")) return "Master Bedroom";
  if (value.includes("main") && value.includes("bed")) return "Master Bedroom";

  if (value.includes("butler")) return "Butler Pantry";
  if (value.includes("pantry")) return "Pantry";

  if (value.includes("ensuite") || value.includes("ens")) return "Ensuite";
  if (value.includes("bath")) return "Bathroom";
  if (value.includes("bed")) return "Bedroom";

  return formatName(roomName || roomType || "Room");
}

function getRoomTypeForInsert(baseName: string) {
  if (baseName === "Butler Pantry") return "Pantry";
  if (baseName === "Master Bedroom") return "Bedroom";

  return baseName;
}

function getExistingRoomNumber(roomName: string, baseName: string) {
  const regex = new RegExp(`^${baseName}\\s+(\\d+)$`, "i");
  const match = String(roomName || "").match(regex);
  return match ? Number(match[1]) : null;
}

async function getOrCreateRoomCategory(projectId: string, roomName: string) {
  const cleanName = formatName(roomName);

  const { data: existingCategory, error: findError } = await supabaseAdmin
    .from("project_categories")
    .select("id")
    .eq("project_id", projectId)
    .ilike("name", cleanName)
    .maybeSingle();

  if (findError) throw findError;
  if (existingCategory) return existingCategory.id;

  const { data: newCategory, error: createError } = await supabaseAdmin
    .from("project_categories")
    .insert({
      project_id: projectId,
      name: cleanName,
      budget_amount: 0,
      is_default: false,
    })
    .select("id")
    .single();

  if (createError) throw createError;

  return newCategory.id;
}

export async function POST(request: Request) {
  try {
    const { planPageId } = await request.json();

    if (!planPageId) {
      return NextResponse.json({ error: "Missing planPageId" }, { status: 400 });
    }

    const { data: page, error: pageError } = await supabaseAdmin
      .from("plan_pages")
      .select(`
        *,
        project_plans (
          id,
          project_id,
          user_id
        )
      `)
      .eq("id", planPageId)
      .single();

    if (pageError || !page) {
      return NextResponse.json({ error: "Plan page not found" }, { status: 404 });
    }

    const projectId = page.project_plans?.project_id;

    if (!projectId) {
      return NextResponse.json(
        { error: "Project ID not found for this plan page" },
        { status: 500 },
      );
    }

    const { data: signedUrlData, error: signedUrlError } =
      await supabaseAdmin.storage
        .from("project-plans")
        .createSignedUrl(page.image_path, 3600);

    if (signedUrlError || !signedUrlData?.signedUrl) {
      return NextResponse.json(
        { error: "Failed to create signed image URL" },
        { status: 500 },
      );
    }

    const { data: existingRooms, error: existingRoomsError } = await supabaseAdmin
      .from("plan_rooms")
      .select(`
        room_name,
        plan_pages!inner(
          project_plans!inner(project_id)
        )
      `)
      .eq("plan_pages.project_plans.project_id", projectId);

    if (existingRoomsError) throw existingRoomsError;

    const roomCounts: Record<string, number> = {
      Bedroom: 0,
      Bathroom: 0,
      Ensuite: 0,
    };

    (existingRooms || []).forEach((room: any) => {
      ["Bedroom", "Bathroom", "Ensuite"].forEach((baseName) => {
        const roomName = String(room.room_name || "");

        if (baseName === "Bedroom" && roomName.toLowerCase().includes("master")) {
          return;
        }

        const roomNumber = getExistingRoomNumber(roomName, baseName);

        if (roomNumber && roomNumber > roomCounts[baseName]) {
          roomCounts[baseName] = roomNumber;
        }

        if (
          roomName.toLowerCase() === baseName.toLowerCase() &&
          roomCounts[baseName] < 1
        ) {
          roomCounts[baseName] = 1;
        }
      });
    });

    const response = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `
You are analysing a residential floor plan.

Return ONLY valid JSON.

Extract two things:
1. internal rooms
2. high-level cost-impacting features

Do not invent precise measurements. If dimensions or sqm are not visible, return null.

Rooms are internal habitable or functional spaces only.

Do not include garages, decks, pools, balconies, alfresco areas, pergolas, staircases, stairs, voids, carports, robes, linen cupboards, cupboards or external structures as rooms.

These must only be returned in the features array.

For rooms labelled BED, BEDROOM, EX BED or similar, return room_type as Bedroom.
For rooms labelled MASTER BEDROOM, MASTER BED, MAIN BEDROOM or similar, keep room_name as Master Bedroom and return room_type as Bedroom.
For rooms labelled BATH, BATHROOM, EX BATH or similar, return room_type as Bathroom.
For rooms labelled ENS or ENSUITE, return room_type as Ensuite.
For rooms labelled BUTLER PANTRY, BUTLER'S PANTRY, BUTLERS PANTRY or similar, return room_name as Butler Pantry and room_type as Pantry.
For rooms labelled PANTRY, return room_type as Pantry.

Return this exact structure:

{
  "rooms": [
    {
      "room_name": "Bedroom",
      "room_type": "Bedroom",
      "length_m": 4.2,
      "width_m": 3.8,
      "estimated_sqm": 15.96,
      "confidence": 0.82
    }
  ],
  "features": [
    {
      "feature_type": "Door",
      "feature_name": "Internal Hinged Door",
      "quantity": 1,
      "estimated_length_m": null,
      "estimated_width_m": null,
      "estimated_area_sqm": null,
      "confidence": 0.75,
      "notes": "Standard internal door swing symbol"
    }
  ]
}

Allowed room_type values:
Kitchen, Living, Dining, Bedroom, Bathroom, Ensuite, Laundry, WIR, Pantry, Mudroom, Study, Hallway, Other

Allowed feature_type values:
Door, Window, Sliding Door, Large Sliding Door, Stacker Door, Bifold Door, Cavity Sliding Door, Entry Door, Internal Door, External Door, Skylight, Staircase, Void, Deck, Balcony, Alfresco, Patio, Pool, Spa, Garage, Carport, Solar, Pergola, Fireplace, Retaining Wall, Large Glazing, Robe, Linen, Joinery, Kitchen Island, High Ceiling, Raked Ceiling, Other

Use feature_type for broad category.
Use feature_name for specific kind.

Examples:
feature_type: "Window", feature_name: "Sliding Window"
feature_type: "Window", feature_name: "Double Hung Window"
feature_type: "Sliding Door", feature_name: "Sliding Patio Door"
feature_type: "Large Sliding Door", feature_name: "Large Multi Panel Sliding Door"
feature_type: "Door", feature_name: "Internal Hinged Door"
feature_type: "Robe", feature_name: "Built In Robe"
feature_type: "Linen", feature_name: "Linen Cupboard"

Detect standard internal hinged doors shown by a curved door swing arc.
Do not count dimension labels such as 820 or 870 as separate features.

Window and glazing detection is important.

For each visible window, sliding door, stacker door, bifold door, large opening or glazed door:
- return it as a feature
- classify the broad type using feature_type
- describe the specific type using feature_name
- estimate quantity
- only estimate dimensions if clearly shown on the plan or schedule
- do not confuse internal door swings with windows
- do not combine sliding doors and sliding windows unless they are clearly the same feature

Focus on features that affect cost:
- windows and window types
- standard internal doors
- large glazing
- sliding doors
- stacker doors
- bifold doors
- stairs
- voids
- decks
- balconies
- alfresco areas
- pools
- carports
- skylights
- fireplaces
- retaining walls
- robes/joinery
          `,
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Analyse this floor plan. Extract internal rooms and high-level cost-impacting features.",
            },
            {
              type: "image_url",
              image_url: {
                url: signedUrlData.signedUrl,
              },
            },
          ],
        },
      ],
    });

    const content = response.choices[0]?.message?.content;

    if (!content) {
      return NextResponse.json({ error: "No AI response received" }, { status: 500 });
    }

    let parsed: any;

    try {
      parsed = JSON.parse(content);
    } catch {
      return NextResponse.json(
        { error: "Failed to parse AI JSON response" },
        { status: 500 },
      );
    }

    const rooms = Array.isArray(parsed.rooms) ? parsed.rooms : [];
    const features = Array.isArray(parsed.features) ? parsed.features : [];

    const roomInserts = await Promise.all(
      rooms.map(async (room: any) => {
        const baseName = normaliseRoomBaseName(room.room_name, room.room_type);
        const roomType = getRoomTypeForInsert(baseName);

        let roomName = baseName;

        if (baseName === "Master Bedroom") {
          roomName = "Master Bedroom";
        } else if (["Bedroom", "Bathroom", "Ensuite"].includes(baseName)) {
          const nextNumber = (roomCounts[baseName] || 0) + 1;
          roomCounts[baseName] = nextNumber;
          roomName = `${baseName} ${nextNumber}`;
        }

        const categoryId = await getOrCreateRoomCategory(projectId, roomName);

        const lengthM =
          room.length_m === null || room.length_m === undefined
            ? null
            : Number(room.length_m);

        const widthM =
          room.width_m === null || room.width_m === undefined
            ? null
            : Number(room.width_m);

        const calculatedSqm =
          lengthM && widthM ? Number((lengthM * widthM).toFixed(2)) : null;

        const estimatedSqm =
          room.estimated_sqm === null || room.estimated_sqm === undefined
            ? calculatedSqm
            : Number(room.estimated_sqm);

        return {
          plan_page_id: planPageId,
          category_id: categoryId,
          room_name: roomName,
          room_type: roomType,
          floor_level: page.floor_level || null,
          renovation_type: "renovation",

          length_m: lengthM,
          width_m: widthM,
          estimated_sqm: estimatedSqm || null,
          ceiling_height: null,

          x: null,
          y: null,
          width: null,
          height: null,
        };
      }),
    );

    const featureInserts = features.map((feature: any) => ({
      plan_page_id: planPageId,
      project_id: projectId,
      feature_type: feature.feature_type || "Other",
      feature_name: formatName(feature.feature_name || feature.feature_type || "Feature"),
      quantity:
        feature.quantity === null || feature.quantity === undefined
          ? null
          : Number(feature.quantity),
      estimated_length_m:
        feature.estimated_length_m === null || feature.estimated_length_m === undefined
          ? null
          : Number(feature.estimated_length_m),
      estimated_width_m:
        feature.estimated_width_m === null || feature.estimated_width_m === undefined
          ? null
          : Number(feature.estimated_width_m),
      estimated_area_sqm:
        feature.estimated_area_sqm === null || feature.estimated_area_sqm === undefined
          ? null
          : Number(feature.estimated_area_sqm),
      confidence:
        feature.confidence === null || feature.confidence === undefined
          ? null
          : Number(feature.confidence),
      notes: feature.notes || null,
    }));

    if (roomInserts.length > 0) {
      const { error: insertRoomsError } = await supabaseAdmin
        .from("plan_rooms")
        .insert(roomInserts);

      if (insertRoomsError) {
        return NextResponse.json({ error: insertRoomsError.message }, { status: 500 });
      }
    }

    if (featureInserts.length > 0) {
      const { error: insertFeaturesError } = await supabaseAdmin
        .from("plan_features")
        .insert(featureInserts);

      if (insertFeaturesError) {
        return NextResponse.json({ error: insertFeaturesError.message }, { status: 500 });
      }
    }

    return NextResponse.json({
      success: true,
      insertedRoomCount: roomInserts.length,
      insertedFeatureCount: featureInserts.length,
      rooms: roomInserts,
      features: featureInserts,
    });
  } catch (error: any) {
    console.error("Suggest rooms/features error:", error);

    return NextResponse.json(
      { error: error.message || "Failed to suggest rooms and features" },
      { status: 500 },
    );
  }
}