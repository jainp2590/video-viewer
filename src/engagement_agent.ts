import { chromium } from "playwright";
import { watchVideoInBrowserContext } from "./browser_watcher.js";
import { createLogger } from "./log.js";
import type { EngagementSummary, WatcherResult } from "./types.js";
import { assertUrlIsPermitted } from "./validate_url.js";
import { watchVideoThroughProxy } from "./watcher.js";

export type ProxyEntry = {
  label: string;
  proxy_url: string;
};

export type EngagementAgentInput = {
  video_url: string;
  proxies: ProxyEntry[];
  max_bytes_per_viewer: number;
  allow_platform_simulation: boolean;
  transport: "browser" | "http";
  watch_ms: number;
  headless: boolean;
  goto_timeout_ms: number;
  verbose: boolean;
};

function sumNumbers(values: number[]): number {
  return values.reduce((acc, value) => acc + value, 0);
}

async function runHttpEngagement(
  input: EngagementAgentInput,
): Promise<WatcherResult[]> {
  const tasks = input.proxies.map((entry) => {
    return watchVideoThroughProxy({
      video_url: input.video_url,
      proxy_url: entry.proxy_url,
      proxy_label: entry.label,
      max_bytes: input.max_bytes_per_viewer,
    });
  });
  return Promise.all(tasks);
}

async function runBrowserEngagement(
  input: EngagementAgentInput,
): Promise<WatcherResult[]> {
  const log = createLogger({ verbose: input.verbose });
  log.info("Launching Chromium", {
    headless: input.headless,
    viewers: input.proxies.length,
    video_url: input.video_url,
  });
  const launch_started = performance.now();
  const browser = await chromium.launch({ headless: input.headless });
  const launch_ms = Math.round(performance.now() - launch_started);
  const version = await browser.version();
  log.info("Chromium ready", { launch_ms, version });
  try {
    const tasks = input.proxies.map((entry) => {
      return watchVideoInBrowserContext({
        browser,
        video_url: input.video_url,
        proxy_url: entry.proxy_url,
        proxy_label: entry.label,
        watch_ms: input.watch_ms,
        goto_timeout_ms: input.goto_timeout_ms,
        log,
      });
    });
    return await Promise.all(tasks);
  } finally {
    log.info("Closing Chromium");
    await browser.close();
    log.info("Chromium closed");
  }
}

export async function runEngagementAgent(
  input: EngagementAgentInput,
): Promise<EngagementSummary> {
  assertUrlIsPermitted(input.video_url, input.allow_platform_simulation);
  const started_at_iso = new Date().toISOString();
  const results =
    input.transport === "http"
      ? await runHttpEngagement(input)
      : await runBrowserEngagement(input);
  const finished_at_iso = new Date().toISOString();
  return {
    video_url: input.video_url,
    simulated_viewers: results.length,
    total_bytes: sumNumbers(results.map((r) => r.bytes_read)),
    total_duration_ms: sumNumbers(results.map((r) => r.duration_ms)),
    results,
    started_at_iso,
    finished_at_iso,
  };
}
