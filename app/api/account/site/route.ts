import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest, saveUserSite } from "@/lib/auth";
import type { SiteSnapshot } from "@/lib/site-snapshot";

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  return NextResponse.json({ site: user.site });
}

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const site = body?.site as SiteSnapshot | undefined;
  if (!site) return NextResponse.json({ error: "Missing site" }, { status: 400 });

  await saveUserSite(user.id, site);
  return NextResponse.json({ ok: true });
}
