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
};

function sumNumbers(values: number[]): number {
  return values.reduce((acc, value) => acc + value, 0);
}

export async function runEngagementAgent(
  input: EngagementAgentInput,
): Promise<EngagementSummary> {
  assertUrlIsPermitted(input.video_url, input.allow_platform_simulation);
  const started_at_iso = new Date().toISOString();
  const tasks = input.proxies.map((entry) => {
    return watchVideoThroughProxy({
      video_url: input.video_url,
      proxy_url: entry.proxy_url,
      proxy_label: entry.label,
      max_bytes: input.max_bytes_per_viewer,
    });
  });
  const results: WatcherResult[] = await Promise.all(tasks);
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
