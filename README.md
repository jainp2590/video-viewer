# video-viewer

Simulates **multiple concurrent viewers** of a video URL. Each viewer uses a **separate HTTP(S) proxy** (when configured) or **`direct`** routing.

**Default mode** uses **Chromium (Playwright)**: one shared browser, **one isolated context per proxy**, navigation to the page, **`play()` on the first `<video>`**, then a configurable watch window. For a lightweight fetch-only path, use **`--http`**.

## Requirements

- Node.js **20+**
- **Browser mode:** after `npm install`, install Chromium once:

  ```bash
  npx playwright install chromium
  ```

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

### Options

| Flag | Description |
|------|-------------|
| `--watch-ms N` | Browser: milliseconds to keep playback running after `play()` (default `10000`). |
| `--goto-timeout-ms N` | Browser: navigation timeout (default `60000`). |
| `--headed` | Browser: show windows (default is headless). |
| `--http` | Use HTTP `fetch` + `Range` instead of a browser (`--max-bytes` applies). |
| `--max-bytes N` | **HTTP mode only:** bytes cap per viewer (default `1048576`). |
| `--allow-platform-simulation` | Allows hosts blocked by default (see below). |
| `--verbose` | Browser: extra stderr logs (page console, failed requests). Progress logs always go to stderr. |
| `--help` | Print usage and exit. |

Logs for browser mode are written to **stderr** so **stdout** stays clean for JSON.

With npm scripts (note the `--` before CLI flags):

```bash
npm run simulate -- --url "https://example.com/video.mp4" --proxies ./proxies.json
```

## Proxy file

JSON array of objects with `label` and `proxy_url`. Each `proxy_url` is either:

- A full HTTP(S) proxy URL (credentials optional), or
- The literal string **`direct`** (no proxy; uses this machine’s normal route).

See `proxies.example.json` and `proxies.direct.example.json`.

## Browser mode limitations

- Expects a **`<video>`** element in the DOM after navigation. Direct links to `.mp4` in Chromium usually satisfy this. Custom players that never expose `<video>` may time out.
- Complex sites (DRM, heavy bot checks) may block automation regardless of proxies.

## Test using your own machine / LAN IP

1. **LAN IP** (macOS example): `ipconfig getifaddr en0`
2. **Serve a file:** `python3 -m http.server 8765 --bind 0.0.0.0`
3. **Run** with `direct` proxies, e.g. `proxies.direct.example.json`:

   ```bash
   npm run build
   node dist/index.js \
     --url "http://YOUR_LAN_IP:8765/your-file.mp4" \
     --proxies ./proxies.direct.example.json
   ```

Same machine: `http://127.0.0.1:8765/...` works. Multiple `"direct"` rows add concurrent browsers/contexts but **not** different public IPs.

## Output

Stdout is one JSON object: timestamps, totals, and `results[]` per proxy. Each result includes `transport` (`browser` or `http`), `status_code`, `bytes_read` (HTTP mode fills this; browser mode is `0`), `duration_ms`, and optional `error_message`.

## Default host restrictions

Certain social/video hosts are **rejected** unless you pass `--allow-platform-simulation` **and** have explicit permission. Automated playback can still violate platform terms; this guard only blocks obvious hostnames.

## Intended use

- URLs and infrastructure **you own** or are **authorized** to test.
- Lab measurement of parallel browser sessions and egress paths.

This does **not** guarantee that any third party counts sessions as legitimate human engagement.

## License

Private project (`"private": true` in `package.json`). Add a license file if you open-source the repo
