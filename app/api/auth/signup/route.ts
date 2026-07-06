import { NextRequest, NextResponse } from "next/server";
import { AuthError, createSession, createUser, SESSION_COOKIE, SESSION_COOKIE_OPTIONS } from "@/lib/auth";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const email = (body?.email as string | undefined)?.trim() ?? "";
  const password = (body?.password as string | undefined) ?? "";

  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  try {
    const user = await createUser(email, password);
    const token = await createSession(user.id);
    const res = NextResponse.json({ email: user.email });
    res.cookies.set(SESSION_COOKIE, token, SESSION_COOKIE_OPTIONS);
    return res;
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    return NextResponse.json({ error: "Could not create account" }, { status: 500 });
  }
}
