import type { Browser, Page } from "playwright";
import type { VideoViewerLogger } from "./log.js";
import { formatProxyForLog } from "./log.js";
import { buildBrowserContextOptions } from "./playwright_proxy.js";
import type { WatcherResult } from "./types.js";

function sleepMs(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function attachVerbosePageDiagnostics(params: {
  page: Page;
  proxy_label: string;
  log: VideoViewerLogger;
}): void {
  params.page.on("console", (msg) => {
    params.log.verbose("page console", {
      proxy_label: params.proxy_label,
      type: msg.type(),
      text: msg.text(),
    });
  });
  params.page.on("requestfailed", (req) => {
    params.log.verbose("request failed", {
      proxy_label: params.proxy_label,
      url: req.url(),
      error: req.failure()?.errorText ?? null,
    });
  });
}

async function navigateAndPlayVideo(params: {
  page: Page;
  video_url: string;
  goto_timeout_ms: number;
  proxy_label: string;
  log: VideoViewerLogger;
}): Promise<{ status_code: number | null; content_type: string | null }> {
  params.log.info("navigating", {
    proxy_label: params.proxy_label,
    video_url: params.video_url,
  });
  const nav_started = performance.now();
  const response = await params.page.goto(params.video_url, {
    waitUntil: "domcontentloaded",
    timeout: params.goto_timeout_ms,
  });
  const nav_ms = Math.round(performance.now() - nav_started);
  const status_code = response?.status() ?? null;
  const headers = response?.headers() ?? {};
  const content_type = headers["content-type"] ?? null;
  params.log.info("document loaded", {
    proxy_label: params.proxy_label,
    status_code,
    content_type,
    nav_ms,
  });
  params.log.info("waiting for <video>", { proxy_label: params.proxy_label });
  await params.page.waitForSelector("video", { timeout: 15_000 });
  params.log.info("calling video.play()", { proxy_label: params.proxy_label });
  await params.page.evaluate(async () => {
    const el = document.querySelector("video");
    if (!el) {
      throw new Error("No <video> element found on the page.");
    }
    await el.play();
  });
  return { status_code, content_type };
}

export async function watchVideoInBrowserContext(params: {
  browser: Browser;
  video_url: string;
  proxy_url: string;
  proxy_label: string;
  watch_ms: number;
  goto_timeout_ms: number;
  log: VideoViewerLogger;
}): Promise<WatcherResult> {
  const started = performance.now();
  const route = formatProxyForLog(params.proxy_url);
  params.log.info("opening browser context", {
    proxy_label: params.proxy_label,
    route,
  });
  const context_options = buildBrowserContextOptions(params.proxy_url);
  params.log.verbose("context options", {
    proxy_label: params.proxy_label,
    ignoreHTTPSErrors: context_options.ignoreHTTPSErrors,
    has_proxy: Boolean(context_options.proxy),
    proxy_server: context_options.proxy?.server ?? null,
  });
  const context = await params.browser.newContext(context_options);
  try {
    const page = await context.newPage();
    params.log.info("new page", { proxy_label: params.proxy_label });
    attachVerbosePageDiagnostics({
      page,
      proxy_label: params.proxy_label,
      log: params.log,
    });
    const nav = await navigateAndPlayVideo({
      page,
      video_url: params.video_url,
      goto_timeout_ms: params.goto_timeout_ms,
      proxy_label: params.proxy_label,
      log: params.log,
    });
    params.log.info("playback window", {
      proxy_label: params.proxy_label,
      watch_ms: params.watch_ms,
    });
    await sleepMs(params.watch_ms);
    const duration_ms = Math.round(performance.now() - started);
    params.log.info("context finished ok", {
      proxy_label: params.proxy_label,
      duration_ms,
      status_code: nav.status_code,
    });
    return {
      proxy_label: params.proxy_label,
      status_code: nav.status_code,
      bytes_read: 0,
      duration_ms,
      error_message: null,
      content_type: nav.content_type,
      transport: "browser",
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    params.log.warn("context failed", {
      proxy_label: params.proxy_label,
      error_message: message,
    });
    return {
      proxy_label: params.proxy_label,
      status_code: null,
      bytes_read: 0,
      duration_ms: Math.round(performance.now() - started),
      error_message: message,
      content_type: null,
      transport: "browser",
    };
  } finally {
    params.log.info("closing context", { proxy_label: params.proxy_label });
    await context.close();
  }
}
