# video-viewer

Small Node.js tool that simulates **multiple concurrent HTTP “viewers”** of a video URL, each using a **different HTTP(S) proxy** (separate egress IP, when proxies are configured that way). It prints a JSON **summary** (bytes read, latency, status per proxy) for lab or load-testing scenarios.

## Requirements

- Node.js **20+**

## Install

```bash
npm install
```

## Build

```bash
npm run build
```

## Usage

```bash
node dist/index.js --url "https://example.com/video.mp4" --proxies ./proxies.json
```

Optional flags:

| Flag | Description |
|------|-------------|
| `--max-bytes N` | Cap bytes read per viewer (default `1048576`). Uses a `Range` request. |
| `--allow-platform-simulation` | Allows hosts that are blocked by default (see below). |
| `--help` | Print usage and exit. |

After a build, `npm start` runs `node dist/index.js` with **no arguments**; pass arguments explicitly as above, or use:

```bash
npm run simulate -- --url "https://example.com/video.mp4" --proxies ./proxies.json
```

(`npm run` needs `--` before script arguments.)

## Proxy file

JSON array of objects with `label` and `proxy_url` (full proxy URL, including credentials if needed). See `proxies.example.json`.

## Output

Stdout is a single JSON object: timestamps, totals, and a `results` array with one entry per proxy (`status_code`, `bytes_read`, `duration_ms`, optional `error_message`).

## Default host restrictions

By default, certain well-known social and video hosts are **rejected** so you do not accidentally run this against third-party platforms where automated or inflated “engagement” may violate terms of service or law. To override, pass `--allow-platform-simulation` only when you have **explicit written permission** for that target.

## Intended use

- URLs and infrastructure **you own** or are **authorized** to stress-test.
- Understanding how your CDN or origin behaves under **parallel egress paths**.

This is **not** a guarantee that any third party will count traffic as human views, watch time, or legitimate engagement.

## License

Private project (`"private": true` in `package.json`). Add a license file if you open-source the repo.
