export type VideoViewerLogger = {
  info: (message: string, meta?: Record<string, unknown>) => void;
  warn: (message: string, meta?: Record<string, unknown>) => void;
  verbose: (message: string, meta?: Record<string, unknown>) => void;
};

function formatLine(
  level: string,
  message: string,
  meta: Record<string, unknown> | undefined,
): string {
  const ts = new Date().toISOString();
  const meta_part =
    meta && Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : "";
  return `${ts} [video-viewer] ${level} ${message}${meta_part}`;
}

export function formatProxyForLog(proxy_url: string): string {
  const trimmed = proxy_url.trim().toLowerCase();
  if (trimmed === "direct") {
    return "direct";
  }
  try {
    const parsed = new URL(proxy_url);
    const has_user = Boolean(parsed.username);
    const auth = has_user ? "***@" : "";
    return `${parsed.protocol}//${auth}${parsed.host}`;
  } catch {
    return "invalid-proxy-url";
  }
}

export function createLogger(params: { verbose: boolean }): VideoViewerLogger {
  return {
    info(message: string, meta?: Record<string, unknown>) {
      console.error(formatLine("INFO", message, meta));
    },
    warn(message: string, meta?: Record<string, unknown>) {
      console.error(formatLine("WARN", message, meta));
    },
    verbose(message: string, meta?: Record<string, unknown>) {
      if (!params.verbose) {
        return;
      }
      console.error(formatLine("VERBOSE", message, meta));
    },
  };
}
