import { readFile } from "node:fs/promises";
import { z } from "zod";
import { runEngagementAgent, type ProxyEntry } from "./engagement_agent.js";

const proxy_file_schema = z.array(
  z.object({
    label: z.string().min(1),
    proxy_url: z.string().url(),
  }),
);

function parseArgs(argv: string[]): {
  video_url: string;
  proxy_file: string;
  max_bytes: number;
  allow_platform_simulation: boolean;
} {
  const args = new Map<string, string | boolean>();
  for (let i = 2; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token?.startsWith("--")) {
      continue;
    }
    const key = token;
    const next = argv[i + 1];
    if (key === "--allow-platform-simulation" || key === "--help") {
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
  return {
    video_url,
    proxy_file,
    max_bytes: Number.isFinite(max_bytes) ? max_bytes : 1_048_576,
    allow_platform_simulation: Boolean(
      args.get("--allow-platform-simulation"),
    ),
  };
}

function printHelpAndExit(): never {
  console.log(`
video-viewer — multi-IP lab simulation (HTTP proxies)

Usage:
  node dist/index.js --url <VIDEO_URL> --proxies <proxies.json> [--max-bytes N]
    [--allow-platform-simulation]

proxies.json example:
  [
    { "label": "egress-a", "proxy_url": "http://user:pass@host:8080" },
    { "label": "egress-b", "proxy_url": "http://host:3128" }
  ]

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
  });
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((err) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(message);
  process.exit(1);
});
