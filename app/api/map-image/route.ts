import { NextResponse } from "next/server";
import { getStaticMapPolyline } from "@/lib/mappls";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {

    const defaultPolyline = "[[77.227437,28.611004],[77.224885,28.610022]]";

    const url = new URL(request.url);
    const polyline = url.searchParams.get("polyline") ?? defaultPolyline;

    const imageBuffer = await getStaticMapPolyline(polyline, 400, 400);

    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": "inline; filename=map.png",
        "Cache-Control": "no-store",
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
