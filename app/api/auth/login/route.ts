import { NextRequest, NextResponse } from "next/server";
import { createSession, SESSION_COOKIE, SESSION_COOKIE_OPTIONS, verifyUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const email = (body?.email as string | undefined)?.trim() ?? "";
  const password = (body?.password as string | undefined) ?? "";

  if (!email || !password) {
    return NextResponse.json({ error: "Enter your email and password" }, { status: 400 });
  }

  const user = await verifyUser(email, password);
  if (!user) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  const token = await createSession(user.id);
  const res = NextResponse.json({ email: user.email, hasStyles: user.styles !== null });
  res.cookies.set(SESSION_COOKIE, token, SESSION_COOKIE_OPTIONS);
  return res;
}
