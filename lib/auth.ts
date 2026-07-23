import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";
import type { NextRequest } from "next/server";
import type { ExtractedStyles } from "./theme";
import type { CategoryId } from "@/components/memory-board/categories";

// ── Storage ────────────────────────────────────────────────────────────────
// No database in this project — accounts are a small couple-per-record JSON
// file, consistent with how uploads are stored as flat files on disk. Fine
// for a single-couple prototype; not built for concurrent multi-writer load.

const DATA_DIR = path.join(process.cwd(), ".data");
const USERS_FILE = path.join(DATA_DIR, "users.json");
const SESSIONS_FILE = path.join(DATA_DIR, "sessions.json");
const PHOTOS_FILE = path.join(DATA_DIR, "photos.json");

export const SESSION_COOKIE = "session_token";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  passwordSalt: string;
  createdAt: string;
  styles: ExtractedStyles | null;
}

interface SessionRecord {
  userId: string;
  expiresAt: number;
}

async function readJson<T>(file: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await fs.readFile(file, "utf-8")) as T;
  } catch {
    return fallback;
  }
}

async function writeJson(file: string, data: unknown): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(file, JSON.stringify(data, null, 2), "utf-8");
}

// ── Password hashing (scrypt — built into Node, no native deps to compile) ──

function hashPassword(password: string, salt: string): Promise<string> {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) reject(err);
      else resolve(derivedKey.toString("hex"));
    });
  });
}

function passwordsMatch(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "hex");
  const bufB = Buffer.from(b, "hex");
  return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
}

// ── Users ────────────────────────────────────────────────────────────────

export class AuthError extends Error {}

export async function createUser(email: string, password: string): Promise<User> {
  const normalizedEmail = email.trim().toLowerCase();
  const users = await readJson<User[]>(USERS_FILE, []);
  if (users.some((u) => u.email === normalizedEmail)) {
    throw new AuthError("An account with this email already exists");
  }

  const passwordSalt = crypto.randomBytes(16).toString("hex");
  const passwordHash = await hashPassword(password, passwordSalt);
  const user: User = {
    id: crypto.randomUUID(),
    email: normalizedEmail,
    passwordHash,
    passwordSalt,
    createdAt: new Date().toISOString(),
    styles: null,
  };

  users.push(user);
  await writeJson(USERS_FILE, users);
  return user;
}

export async function verifyUser(email: string, password: string): Promise<User | null> {
  const normalizedEmail = email.trim().toLowerCase();
  const users = await readJson<User[]>(USERS_FILE, []);
  const user = users.find((u) => u.email === normalizedEmail);
  if (!user) return null;

  const hash = await hashPassword(password, user.passwordSalt);
  return passwordsMatch(hash, user.passwordHash) ? user : null;
}

export async function getUserById(id: string): Promise<User | null> {
  const users = await readJson<User[]>(USERS_FILE, []);
  return users.find((u) => u.id === id) ?? null;
}

export async function saveUserStyles(id: string, styles: ExtractedStyles): Promise<void> {
  const users = await readJson<User[]>(USERS_FILE, []);
  const index = users.findIndex((u) => u.id === id);
  if (index === -1) throw new AuthError("Account not found");
  users[index].styles = styles;
  await writeJson(USERS_FILE, users);
}

// ── Sessions ─────────────────────────────────────────────────────────────

export async function createSession(userId: string): Promise<string> {
  const sessions = await readJson<Record<string, SessionRecord>>(SESSIONS_FILE, {});
  const token = crypto.randomBytes(32).toString("hex");
  sessions[token] = { userId, expiresAt: Date.now() + SESSION_TTL_MS };
  await writeJson(SESSIONS_FILE, sessions);
  return token;
}

export async function destroySession(token: string | undefined): Promise<void> {
  if (!token) return;
  const sessions = await readJson<Record<string, SessionRecord>>(SESSIONS_FILE, {});
  delete sessions[token];
  await writeJson(SESSIONS_FILE, sessions);
}

async function getSessionUserId(token: string | undefined): Promise<string | null> {
  if (!token) return null;
  const sessions = await readJson<Record<string, SessionRecord>>(SESSIONS_FILE, {});
  const record = sessions[token];
  if (!record || record.expiresAt < Date.now()) return null;
  return record.userId;
}

/** Resolves the logged-in user (if any) from the session cookie on a request. */
export async function getUserFromRequest(req: NextRequest): Promise<User | null> {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const userId = await getSessionUserId(token);
  if (!userId) return null;
  return getUserById(userId);
}

// ── Photos ───────────────────────────────────────────────────────────────

export interface PhotoRecord {
  id: string;
  filename: string;
  url: string;
  name: string;
  category: CategoryId;
  accountId: string;
  uploadedAt: string;
}

export async function listPhotos(accountId: string): Promise<PhotoRecord[]> {
  const photos = await readJson<PhotoRecord[]>(PHOTOS_FILE, []);
  return photos.filter((p) => p.accountId === accountId);
}

export async function addPhotos(records: PhotoRecord[]): Promise<void> {
  const photos = await readJson<PhotoRecord[]>(PHOTOS_FILE, []);
  photos.push(...records);
  await writeJson(PHOTOS_FILE, photos);
}

export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: SESSION_TTL_MS / 1000,
};
