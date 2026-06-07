import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { v2 as cloudinary } from "cloudinary";

export const runtime = "nodejs";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
});

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function POST(request: Request) {
  try {
    const { planId, pages } = await request.json();

    const selectedPages: number[] = Array.isArray(pages)
      ? pages
          .map((page) => Number(page))
          .filter((page) => Number.isInteger(page) && page > 0)
      : [];

    if (!planId) {
      return NextResponse.json(
        { error: "Missing planId" },
        { status: 400 },
      );
    }

    const { data: plan, error: planError } = await supabaseAdmin
      .from("project_plans")
      .select("*")
      .eq("id", planId)
      .single();

    if (planError || !plan) {
      return NextResponse.json(
        { error: "Plan not found" },
        { status: 404 },
      );
    }

    await supabaseAdmin
      .from("plan_pages")
      .delete()
      .eq("project_plan_id", plan.id);

    await supabaseAdmin
      .from("project_plans")
      .update({ status: "processing" })
      .eq("id", planId);

    const fileType = String(plan.file_type || "").toLowerCase();

    const isImage = ["jpg", "jpeg", "png", "webp"].includes(
      fileType,
    );

    // =====================================
    // IMAGE FILES
    // =====================================

    if (isImage) {
      const { error: pageError } = await supabaseAdmin
        .from("plan_pages")
        .insert({
          project_plan_id: plan.id,
          page_number: 1,
          image_path: plan.storage_path,
          detected_type: "pending",
          confidence: null,
          is_selected: false,
          preview_only: false,
        });

      if (pageError) throw pageError;

      await supabaseAdmin
        .from("project_plans")
        .update({ status: "processed" })
        .eq("id", planId);

      return NextResponse.json({
        success: true,
        message: "Image plan processed.",
        pageCount: 1,
      });
    }

    // =====================================
    // PDF FILES
    // =====================================

    if (fileType === "pdf") {
      const { data: signedUrlData, error: signedUrlError } =
        await supabaseAdmin.storage
          .from("project-plans")
          .createSignedUrl(plan.storage_path, 3600);

      if (signedUrlError || !signedUrlData?.signedUrl) {
        throw new Error(
          signedUrlError?.message ||
            "Failed to create signed PDF URL",
        );
      }

      const publicId =
        `budget-my-build/${plan.project_id}/${plan.id}`;

      const uploadResult =
        await cloudinary.uploader.upload(
          signedUrlData.signedUrl,
          {
            resource_type: "image",
            public_id: publicId,
            overwrite: true,
          },
        );

      const pagesToProcess =
        selectedPages.length > 0
          ? selectedPages
          : [1];

      const insertedPages = [];

      for (const pageNumber of pagesToProcess) {
        const pageImageUrl = cloudinary.url(
          uploadResult.public_id,
          {
            resource_type: "image",
            format: "jpg",
            transformation: [
              {
                raw_transformation: `pg_${pageNumber}`,
              },
              {
                quality: "auto",
              },
            ],
            secure: true,
          },
        );

        const imageResponse =
          await fetch(pageImageUrl);

        if (!imageResponse.ok) {
          console.warn(
            `Skipping Cloudinary page ${pageNumber}`,
          );
          continue;
        }

        const imageBuffer = Buffer.from(
          await imageResponse.arrayBuffer(),
        );

        const pageImagePath =
          `${plan.project_id}/processed-pages/${plan.id}/page-${pageNumber}.jpg`;

        const { error: uploadPageError } =
          await supabaseAdmin.storage
            .from("project-plans")
            .upload(
              pageImagePath,
              imageBuffer,
              {
                contentType: "image/jpeg",
                upsert: true,
              },
            );

        if (uploadPageError) {
          throw uploadPageError;
        }

        insertedPages.push({
          project_plan_id: plan.id,
          page_number: pageNumber,
          image_path: pageImagePath,
          detected_type: "pending",
          confidence: null,
          is_selected: false,
          preview_only: false,
        });
      }

      const { error: insertPagesError } =
        await supabaseAdmin
          .from("plan_pages")
          .insert(insertedPages);

      if (insertPagesError) {
        throw insertPagesError;
      }

      await supabaseAdmin
        .from("project_plans")
        .update({
          status: "processed",
        })
        .eq("id", planId);

      await cloudinary.uploader.destroy(
        uploadResult.public_id,
        {
          resource_type: "image",
        },
      );

      return NextResponse.json({
        success: true,
        message: `Processed ${insertedPages.length} selected page(s).`,
        pageCount: insertedPages.length,
        processedPages: pagesToProcess,
      });
    }

    // =====================================
    // UNSUPPORTED
    // =====================================

    await supabaseAdmin
      .from("project_plans")
      .update({
        status: "unsupported_file_type",
      })
      .eq("id", planId);

    return NextResponse.json(
      { error: "Unsupported file type" },
      { status: 400 },
    );
  } catch (error: any) {
    console.error("Process plan error:", error);

    return NextResponse.json(
      {
        error:
          error.message ||
          "Failed to process plan",
      },
      { status: 500 },
    );
  }
}