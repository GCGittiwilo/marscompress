import { compressContext, compressMessages } from "../../../lib/compress.js";

export const runtime = "edge";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      context?: unknown;
      messages?: unknown;
      query?: unknown;
      budgetRatio?: unknown;
      policy?: unknown;
      fallbackOnHighRisk?: unknown;
    };

    if (typeof body.query !== "string") {
      return Response.json(
        { error: "query must be a string" },
        { status: 400 },
      );
    }
    if (typeof body.context !== "string" && !Array.isArray(body.messages)) {
      return Response.json(
        { error: "provide either a string context or a messages array" },
        { status: 400 },
      );
    }
    const contextCharacters =
      typeof body.context === "string"
        ? body.context.length
        : JSON.stringify(body.messages).length;
    if (contextCharacters > 1_000_000) {
      return Response.json(
        { error: "context exceeds the 1,000,000 character limit" },
        { status: 413 },
      );
    }

    const budgetRatio =
      typeof body.budgetRatio === "number" ? body.budgetRatio : undefined;
    const policy: "precision" | "balanced" | "frontier" | "aggressive" | undefined =
      body.policy === "precision" ||
      body.policy === "balanced" ||
      body.policy === "frontier" ||
      body.policy === "aggressive"
        ? body.policy
        : undefined;
    const options = {
      budgetRatio,
      policy,
      fallbackOnHighRisk: body.fallbackOnHighRisk === true,
    };
    const result =
      Array.isArray(body.messages)
        ? compressMessages(body.messages as Array<{ role: string; content: string }>, body.query, options)
        : compressContext(body.context as string, body.query, options);
    return Response.json(result, {
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
