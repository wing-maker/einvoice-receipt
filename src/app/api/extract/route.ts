import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

// Cheap/fast alternative: swap to "claude-haiku-4-5" to cut cost ~5x.
const MODEL = "claude-opus-4-8";

type MediaType = "image/jpeg" | "image/png" | "image/gif" | "image/webp";
const ALLOWED_MEDIA = new Set<string>([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
]);

// Structured schema the model must fill. Nullable via anyOf; all fields required.
const nullableString = { anyOf: [{ type: "string" }, { type: "null" }] };
const nullableNumber = { anyOf: [{ type: "number" }, { type: "null" }] };
const nullableInt = { anyOf: [{ type: "integer" }, { type: "null" }] };

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    merchant_name: nullableString,
    purchase_date: {
      ...nullableString,
      description: "Purchase/invoice date as YYYY-MM-DD",
    },
    amount: { ...nullableNumber, description: "Grand total / net total paid" },
    wait_days: {
      ...nullableInt,
      description: "Days to wait before registering, if the receipt states one",
    },
    deadline_days: {
      ...nullableInt,
      description:
        "The N in 'register e-invoice within N days', if stated relatively",
    },
    register_deadline: {
      ...nullableString,
      description: "Explicit registration deadline date as YYYY-MM-DD, if printed",
    },
    qr_url: {
      ...nullableString,
      description: "The e-invoice registration URL, often printed near the QR code",
    },
  },
  required: [
    "merchant_name",
    "purchase_date",
    "amount",
    "wait_days",
    "deadline_days",
    "register_deadline",
    "qr_url",
  ],
} as const;

const SYSTEM = `You extract e-invoice registration details from a photo of a Malaysian retail receipt (LHDN e-invoice).
Rules:
- Return null for any field not clearly visible; never guess.
- Dates must be YYYY-MM-DD. Malaysian receipts are usually DD/MM/YYYY.
- amount is the final total paid (e.g. "Net Total", "Grand Total").
- If the receipt says "register e-invoice within N days", set deadline_days to N.
- If an explicit deadline date is printed, set register_deadline.
- qr_url is the registration link, usually printed under or beside the QR code.`;

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Extraction is not configured (missing ANTHROPIC_API_KEY)." },
      { status: 503 },
    );
  }

  let file: File | null = null;
  try {
    const form = await request.formData();
    const f = form.get("image");
    if (f instanceof File) file = f;
  } catch {
    return NextResponse.json({ error: "Invalid upload." }, { status: 400 });
  }
  if (!file) {
    return NextResponse.json({ error: "No image provided." }, { status: 400 });
  }

  const mediaType: MediaType = (
    ALLOWED_MEDIA.has(file.type) ? file.type : "image/jpeg"
  ) as MediaType;
  const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");

  const client = new Anthropic({ apiKey });
  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: SYSTEM,
      output_config: { format: { type: "json_schema", schema: SCHEMA } },
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: mediaType, data: base64 },
            },
            { type: "text", text: "Extract the fields from this receipt." },
          ],
        },
      ],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    const raw = textBlock && "text" in textBlock ? textBlock.text : "{}";
    const data = JSON.parse(raw);
    return NextResponse.json({ data });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Extraction failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
