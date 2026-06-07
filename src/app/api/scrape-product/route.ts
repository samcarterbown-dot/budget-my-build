import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function cleanText(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 50000);
}

function extractMeta(html: string, property: string) {
  const regex = new RegExp(
    `<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']+)["']`,
    "i"
  );

  const match = html.match(regex);
  return match?.[1] || "";
}

function extractPriceFromMeta(html: string) {
  const metaPrice =
    extractMeta(html, "product:price:amount") ||
    extractMeta(html, "og:price:amount") ||
    extractMeta(html, "twitter:data1");

  if (!metaPrice) return 0;

  return Number(metaPrice.replace(/[^0-9.]/g, "")) || 0;
}

function extractPriceCandidates(text: string) {
  const matches = text.match(/\$ ?\d[\d,]*(?:\.\d{2})?/g) || [];
  return [...new Set(matches)].slice(0, 30);
}

function normalisePrice(priceText: string) {
  return Number(priceText.replace(/[^0-9.]/g, "")) || 0;
}

function isBadMarketingPrice(price: number) {
  return [1000, 9.95, 14.95, 25].includes(price);
}

function extractAbiPrice(text: string) {
  const lowerText = text.toLowerCase();

  if (!lowerText.includes("abi interiors")) return 0;

  const addToCartIndex = lowerText.indexOf("add to cart");

  if (addToCartIndex !== -1) {
    const beforeAddToCart = text.slice(
      Math.max(0, addToCartIndex - 1800),
      addToCartIndex
    );

    const priceMatches =
      beforeAddToCart.match(/\$ ?\d[\d,]*(?:\.\d{2})?/g) || [];

    const prices = priceMatches
      .map(normalisePrice)
      .filter((price) => price > 50 && price < 10000)
      .filter((price) => !isBadMarketingPrice(price));

    if (prices.length) {
      return prices[prices.length - 1];
    }
  }

  const skuIndex =
    lowerText.indexOf("sku:") !== -1
      ? lowerText.indexOf("sku:")
      : lowerText.indexOf("sku");

  if (skuIndex !== -1) {
    const productWindow = text.slice(
      Math.max(0, skuIndex - 800),
      skuIndex + 2500
    );

    const priceMatches =
      productWindow.match(/\$ ?\d[\d,]*(?:\.\d{2})?/g) || [];

    const prices = priceMatches
      .map(normalisePrice)
      .filter((price) => price > 50 && price < 10000)
      .filter((price) => !isBadMarketingPrice(price));

    if (prices.length) {
      return prices[0];
    }
  }

  return 0;
}

function extractJson(text: string) {
  const cleaned = text
    .replace(/```json/g, "")
    .replace(/```/g, "")
    .trim();

  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");

  if (firstBrace === -1 || lastBrace === -1) {
    throw new Error("AI did not return valid JSON.");
  }

  return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
}

export async function GET() {
  return Response.json({
    ok: true,
    message: "Scrape product API route is working",
  });
}

export async function POST(request: Request) {
  try {
    const { url } = await request.json();

    if (!url) {
      return Response.json({ error: "URL required" }, { status: 400 });
    }

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; BudgetMyBuildBot/1.0)",
      },
    });

    if (!response.ok) {
      return Response.json(
        { error: "Could not fetch page" },
        { status: 400 }
      );
    }

    const html = await response.text();

    const metaTitle =
      extractMeta(html, "og:title") || extractMeta(html, "twitter:title");

    const metaDescription =
      extractMeta(html, "og:description") || extractMeta(html, "description");

    const metaImage =
      extractMeta(html, "og:image") || extractMeta(html, "twitter:image");

    const pageText = cleanText(html);
    const detectedMetaPrice = extractPriceFromMeta(html);
    const isAbi = url.includes("abiinteriors.com.au");
    const abiDetectedPrice = isAbi ? extractAbiPrice(pageText) : 0;
    const priceCandidates = extractPriceCandidates(pageText);

    const aiResponse = await openai.responses.create({
      model: "gpt-4.1-mini",
      input: `
Extract product details from this supplier page.

Return ONLY valid JSON. Do not include markdown, comments or explanation.

For ABI Interiors:
- Ignore $1,000 because that is usually a free-shipping threshold.
- Ignore sample, newsletter, delivery, discount and gift card prices.
- Prefer the price nearest the main product title, SKU and Add to Cart area.

For tiles, flooring, timber flooring, carpet, cladding or sheet materials:
- Detect whether the listed price is per item, per m2, per sqm, per box, per pack or per sheet.
- If price is shown as "$X/m2", "$X/m²", "$X per sqm" or "$X per square metre", set priceUnit to "sqm" and pricePerSqm to X.
- If price is shown per box/pack/carton, set priceUnit to "box", pricePerBox to X, and boxCoverageSqm if available.
- If unsure, use priceUnit "item".

For all suppliers:
- Use the actual product price only.
- Ignore unrelated prices such as delivery fees, finance repayments, samples, add-ons, accessories, discounts, recommended products, newsletter offers or free-shipping thresholds.

{
  "productName": "",
  "productNumber": "",
  "price": 0,
  "supplierName": "",
  "description": "",
  "imageUrl": "",
  "priceUnit": "item",
  "pricePerSqm": 0,
  "pricePerBox": 0,
  "boxCoverageSqm": 0
}

URL:
${url}

META TITLE:
${metaTitle}

META DESCRIPTION:
${metaDescription}

META IMAGE:
${metaImage}

ABI DETECTED PRICE:
${abiDetectedPrice}

DETECTED META PRICE:
${detectedMetaPrice}

PRICE CANDIDATES:
${priceCandidates.join(", ")}

PAGE TEXT:
${pageText}
`,
    });

    const raw = aiResponse.output_text;
    const parsed = extractJson(raw);

    const aiPrice = Number(parsed.price || 0);

    const finalPrice = isAbi
      ? abiDetectedPrice ||
        (aiPrice !== 1000 ? aiPrice : 0) ||
        detectedMetaPrice ||
        0
      : aiPrice || detectedMetaPrice || 0;

    const responsePayload: any = {
      productName: parsed.productName || metaTitle || "",
      productNumber: parsed.productNumber || "",
      price: finalPrice,
      supplierName: parsed.supplierName || (isAbi ? "ABI Interiors" : ""),
      description: parsed.description || metaDescription || "",
      imageUrl: parsed.imageUrl || metaImage || "",
      sourceUrl: url,
      priceUnit: parsed.priceUnit || "item",
      pricePerSqm: Number(parsed.pricePerSqm || 0),
      pricePerBox: Number(parsed.pricePerBox || 0),
      boxCoverageSqm: Number(parsed.boxCoverageSqm || 0),
    };

    if (process.env.NODE_ENV !== "production") {
      responsePayload.debug = {
        isAbi,
        finalPrice,
        abiDetectedPrice,
        detectedMetaPrice,
        aiPrice,
        priceCandidates,
        addToCartIndex: pageText.toLowerCase().indexOf("add to cart"),
        skuIndex: pageText.toLowerCase().indexOf("sku"),
        pageTextPreview: pageText.slice(0, 3000),
        aiRawResponse: raw,
      };
    }

    return Response.json(responsePayload);
  } catch (error: any) {
    return Response.json(
      {
        error: error.message || "Failed to import product details",
      },
      { status: 500 }
    );
  }
}