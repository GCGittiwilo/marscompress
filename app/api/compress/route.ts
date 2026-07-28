import { compressContext } from "../../../lib/compress.js";

export const runtime = "edge";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      context?: unknown;
      query?: unknown;
      budgetRatio?: unknown;
    };

    if (typeof body.context !== "string" || typeof body.query !== "string") {
      return Response.json(
        { error: "context and query must both be strings" },
        { status: 400 },
      );
    }
    if (body.context.length > 1_000_000) {
      return Response.json(
        { error: "context exceeds the 1,000,000 character limit" },
        { status: 413 },
      );
    }

    const budgetRatio =
      typeof body.budgetRatio === "number" ? body.budgetRatio : undefined;
    return Response.json(compressContext(body.context, body.query, { budgetRatio }), {
      headers: {
        "Cache-Control": "no-store",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch {
    return Response.json({ error: "invalid JSON request body" }, { status: 400 });
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "content-type",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
    },
  });
}

