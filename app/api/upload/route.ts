import { NextRequest, NextResponse } from "next/server";
import { mkdir, readdir, stat, writeFile } from "fs/promises";
import { randomUUID } from "crypto";
import path from "path";

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

const KNOWN_EXTENSIONS = new Set(Object.values(EXT_BY_TYPE));

export interface UploadedPhoto {
  url: string;
  name: string;
  uploadedAt: string;
}

export async function GET() {
  await mkdir(UPLOAD_DIR, { recursive: true });
  const files = await readdir(UPLOAD_DIR);

  const photos: UploadedPhoto[] = await Promise.all(
    files
      .filter((f) => KNOWN_EXTENSIONS.has(path.extname(f).toLowerCase()))
      .map(async (f) => {
        const s = await stat(path.join(UPLOAD_DIR, f));
        return { url: `/uploads/${f}`, name: f, uploadedAt: s.mtime.toISOString() };
      })
  );
  photos.sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));

  return NextResponse.json({ photos });
}

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const files = form.getAll("files").filter((f): f is File => f instanceof File);
  if (!files.length) {
    return NextResponse.json({ error: "No files provided" }, { status: 400 });
  }

  await mkdir(UPLOAD_DIR, { recursive: true });

  const uploaded: UploadedPhoto[] = [];
  for (const file of files) {
    const ext = EXT_BY_TYPE[file.type];
    if (!ext) continue; // skip non-image / unsupported types
    if (file.size > MAX_FILE_SIZE) continue;

    const filename = `${Date.now()}-${randomUUID()}${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(UPLOAD_DIR, filename), buffer);
    uploaded.push({ url: `/uploads/${filename}`, name: file.name, uploadedAt: new Date().toISOString() });
  }

  if (!uploaded.length) {
    return NextResponse.json({ error: "No valid image files were uploaded (15MB max, images only)" }, { status: 400 });
  }

  return NextResponse.json({ uploaded });
}
