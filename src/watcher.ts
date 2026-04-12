import { fetch, ProxyAgent } from "undici";
import type { WatcherResult } from "./types.js";

export async function watchVideoThroughProxy(params: {
  video_url: string;
  proxy_url: string;
  proxy_label: string;
  max_bytes: number;
}): Promise<WatcherResult> {
  const started = performance.now();
  let status_code: number | null = null;
  let content_type: string | null = null;
  try {
    const dispatcher = new ProxyAgent(params.proxy_url);
    const response = await fetch(params.video_url, {
      method: "GET",
      dispatcher,
      redirect: "follow",
      headers: {
        "User-Agent": "video-viewer-simulator/0.1 (+local lab)",
        Range: `bytes=0-${params.max_bytes - 1}`,
      },
    });
    status_code = response.status;
    content_type = response.headers.get("content-type");
    const reader = response.body?.getReader();
    if (!reader) {
      return {
        proxy_label: params.proxy_label,
        status_code,
        bytes_read: 0,
        duration_ms: Math.round(performance.now() - started),
        error_message: "Response had no body.",
        content_type,
      };
    }
    let bytes_read = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      bytes_read += value.byteLength;
      if (bytes_read >= params.max_bytes) {
        await reader.cancel();
        break;
      }
    }
    const duration_ms = Math.round(performance.now() - started);
    return {
      proxy_label: params.proxy_label,
      status_code,
      bytes_read,
      duration_ms,
      error_message: null,
      content_type,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      proxy_label: params.proxy_label,
      status_code,
      bytes_read: 0,
      duration_ms: Math.round(performance.now() - started),
      error_message: message,
      content_type,
    };
  }
}
