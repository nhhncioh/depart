import { NextRequest } from "next/server";
import { runSelfTests } from "@/lib/fixtures/recommend.samples";

export const runtime = "nodejs";

export async function GET(_req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return new Response("Not Found", { status: 404 });
  }
  try {
    const result = await runSelfTests();
    return new Response(JSON.stringify(result, null, 2), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ pass: false, failures: [String(e?.message || e)] }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}

