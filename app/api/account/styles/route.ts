import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest, saveUserStyles } from "@/lib/auth";
import type { ExtractedStyles } from "@/lib/theme";

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  return NextResponse.json({ styles: user.styles });
}

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const styles = body?.styles as ExtractedStyles | undefined;
  if (!styles) return NextResponse.json({ error: "Missing styles" }, { status: 400 });

  await saveUserStyles(user.id, styles);
  return NextResponse.json({ ok: true });
}
