import { readFile } from "node:fs/promises";
import { z } from "zod";
import { runEngagementAgent, type ProxyEntry } from "./engagement_agent.js";

const proxy_url_schema = z.union([
  z.literal("direct"),
  z.literal("DIRECT"),
  z.string().url(),
]);

const proxy_file_schema = z.array(
  z.object({
    label: z.string().min(1),
    proxy_url: proxy_url_schema,
  }),
);

function parseArgs(argv: string[]): {
  video_url: string;
  proxy_file: string;
  max_bytes: number;
  allow_platform_simulation: boolean;
  transport: "browser" | "http";
  watch_ms: number;
  headless: boolean;
  goto_timeout_ms: number;
  verbose: boolean;
} {
  const args = new Map<string, string | boolean>();
  for (let i = 2; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token?.startsWith("--")) {
      continue;
    }
    const key = token;
    const next = argv[i + 1];
    if (
      key === "--allow-platform-simulation" ||
      key === "--help" ||
      key === "--http" ||
      key === "--headed" ||
      key === "--verbose"
    ) {
      args.set(key, true);
      continue;
    }
    if (next && !next.startsWith("--")) {
      args.set(key, next);
      i += 1;
    }
  }
  if (args.get("--help")) {
    printHelpAndExit();
  }
  const video_url = String(args.get("--url") ?? "");
  const proxy_file = String(args.get("--proxies") ?? "");
  const max_bytes_raw = String(args.get("--max-bytes") ?? "1048576");
  const max_bytes = Number(max_bytes_raw);
  const watch_ms_raw = String(args.get("--watch-ms") ?? "10000");
  const watch_ms = Number(watch_ms_raw);
  const goto_timeout_raw = String(args.get("--goto-timeout-ms") ?? "60000");
  const goto_timeout_ms = Number(goto_timeout_raw);
  return {
    video_url,
    proxy_file,
    max_bytes: Number.isFinite(max_bytes) ? max_bytes : 1_048_576,
    allow_platform_simulation: Boolean(
      args.get("--allow-platform-simulation"),
    ),
    transport: args.get("--http") ? "http" : "browser",
    watch_ms: Number.isFinite(watch_ms) ? Math.max(0, watch_ms) : 10_000,
    headless: !args.get("--headed"),
    goto_timeout_ms: Number.isFinite(goto_timeout_ms)
      ? Math.max(1_000, goto_timeout_ms)
      : 60_000,
    verbose: Boolean(args.get("--verbose")),
  };
}

function printHelpAndExit(): never {
  console.log(`
video-viewer — multi-IP lab simulation (HTTP proxies or real browsers)

Usage:
  node dist/index.js --url <VIDEO_URL> --proxies <proxies.json> [options]

Default mode opens Chromium (Playwright): one browser, one isolated context
per proxy, navigates to the URL, waits for <video>, calls play(), then waits
--watch-ms. Use --http for the older fetch + Range mode.

Options:
  --watch-ms N           Browser: ms to keep playing after start (default 10000)
  --goto-timeout-ms N    Browser: navigation timeout (default 60000)
  --headed               Browser: show windows (default headless)
  --http                 Use HTTP fetch + Range instead of a browser
  --max-bytes N          HTTP mode only: bytes cap per viewer (default 1048576)
  --allow-platform-simulation
  --verbose              Browser: log page console + failed requests (stderr)
  --help

proxies.json example:
  [
    { "label": "egress-a", "proxy_url": "http://user:pass@host:8080" },
    { "label": "local-direct", "proxy_url": "direct" }
  ]

First run (browser mode): npx playwright install chromium

Notes:
  - Intended for URLs you own or are authorized to load-test.
  - Major social/video hosts are blocked unless you pass the allow flag
    and have explicit permission.
`);
  process.exit(0);
}

async function loadProxies(file_path: string): Promise<ProxyEntry[]> {
  const raw = await readFile(file_path, "utf8");
  const parsed = JSON.parse(raw) as unknown;
  return proxy_file_schema.parse(parsed);
}

async function main(): Promise<void> {
  const cli = parseArgs(process.argv);
  if (!cli.video_url || !cli.proxy_file) {
    throw new Error("Missing --url or --proxies. Use --help for usage.");
  }
  const proxies = await loadProxies(cli.proxy_file);
  const summary = await runEngagementAgent({
    video_url: cli.video_url,
    proxies,
    max_bytes_per_viewer: Math.max(1, Math.floor(cli.max_bytes)),
    allow_platform_simulation: cli.allow_platform_simulation,
    transport: cli.transport,
    watch_ms: cli.watch_ms,
    headless: cli.headless,
    goto_timeout_ms: cli.goto_timeout_ms,
    verbose: cli.verbose,
  });
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((err) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(message);
  process.exit(1);
});
