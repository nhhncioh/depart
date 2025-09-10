import { NextRequest } from "next/server";
import { computeRecommendation, type RecommendInput } from "@/lib/compute";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body: any = await req.json();

    const input: RecommendInput = {
      airport: (body?.airport ?? body?.airportCode ?? body?.iata ?? body?.code ?? "").toString().trim().toUpperCase(),
      airline: (body?.airline ?? "").toString(),
      flightType: body?.isInternational ? "international" : "domestic",
      depTimeLocalISO: (body?.depTimeLocalISO ?? body?.departureLocalISO ?? body?.departureISO ?? body?.flightDateTime ?? body?.departure ?? body?.dateISO ?? "").toString(),
      options: {
        checkedBags: !!body?.checkedBag,
        trustedTraveler: !!body?.hasNexus,
        securityOverrideMinutes: (typeof body?.securityOverrideMinutes === "number") ? body.securityOverrideMinutes : undefined,
      },
    } as any;

    const result = await computeRecommendation(input);

    return new Response(JSON.stringify({
      ...result,
      airport: input.airport,
      departureLocalISO: input.depTimeLocalISO,
    }, null, 2), { status: 200, headers: { "content-type": "application/json" }});
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? "Unknown error" }), { status: 500 });
  }
}
