import { NextRequest, NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import { randomUUID } from "crypto";
import path from "path";
import { chromium } from "playwright";

const SCREENSHOT_DIR = path.join(process.cwd(), "public", "site-screenshots");

export async function POST(req: NextRequest) {
  let url: string;
  try {
    const body = await req.json();
    url = (body.url as string)?.trim();
    if (!url) throw new Error("Missing url");
    if (!url.startsWith("http://") && !url.startsWith("https://")) url = "https://" + url;
    new URL(url);
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  let browser;
  try {
    browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(url, { waitUntil: "load", timeout: 30000 });
    await page.waitForTimeout(1500);

    // Drop the site's own nav/header bar so the recreated page starts at its content.
    await page.evaluate(() => {
      const selectors = [
        "nav",
        '[role="navigation"]',
        "header nav",
        ".navbar",
        ".nav-bar",
        ".site-header",
        ".site-nav",
      ];
      document.querySelectorAll(selectors.join(",")).forEach((el) => el.remove());
    });

    const rawTitle = await page.title();
    const pageTitle = rawTitle.split(/[|\-–—]/)[0].trim();

    const buffer = await page.screenshot({ fullPage: true, type: "jpeg", quality: 92 });

    await mkdir(SCREENSHOT_DIR, { recursive: true });
    const filename = `${randomUUID()}.jpg`;
    await writeFile(path.join(SCREENSHOT_DIR, filename), buffer);

    return NextResponse.json({
      screenshotUrl: `/site-screenshots/${filename}`,
      pageTitle,
      url,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to capture site";
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    await browser?.close();
  }
}
