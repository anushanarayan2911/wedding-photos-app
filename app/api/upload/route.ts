import { NextRequest, NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import { randomUUID } from "crypto";
import path from "path";
import { getUserFromRequest, listPhotos, addPhotos, type PhotoRecord } from "@/lib/auth";
import { isCategoryId } from "@/components/memory-board/categories";
import type { UploadedPhoto } from "@/components/memory-board/types";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");
const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB

const EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "image/heic": ".heic",
  "image/heif": ".heif",
};

function toUploadedPhoto(p: PhotoRecord): UploadedPhoto {
  return { id: p.id, url: p.url, name: p.name, uploadedAt: p.uploadedAt, category: p.category };
}

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const records = await listPhotos(user.id);
  records.sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));

  return NextResponse.json({ photos: records.map(toUploadedPhoto) });
}

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const form = await req.formData();
  const files = form.getAll("files").filter((f): f is File => f instanceof File);
  const category = form.get("category");
  if (typeof category !== "string" || !isCategoryId(category)) {
    return NextResponse.json({ error: "A valid category is required" }, { status: 400 });
  }
  if (!files.length) {
    return NextResponse.json({ error: "No files provided" }, { status: 400 });
  }

  await mkdir(UPLOAD_DIR, { recursive: true });

  const records: PhotoRecord[] = [];
  for (const file of files) {
    const ext = EXT_BY_TYPE[file.type];
    if (!ext) continue; // skip non-image / unsupported types
    if (file.size > MAX_FILE_SIZE) continue;

    const filename = `${Date.now()}-${randomUUID()}${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(UPLOAD_DIR, filename), buffer);
    records.push({
      id: filename,
      filename,
      url: `/uploads/${filename}`,
      name: file.name,
      category,
      accountId: user.id,
      uploadedAt: new Date().toISOString(),
    });
  }

  if (!records.length) {
    return NextResponse.json({ error: "No valid image files were uploaded (15MB max, images only)" }, { status: 400 });
  }

  await addPhotos(records);

  return NextResponse.json({ uploaded: records.map(toUploadedPhoto) });
}
