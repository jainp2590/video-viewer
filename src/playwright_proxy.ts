import type { BrowserContextOptions } from "playwright";

const DIRECT_TOKEN = "direct";

function parseNonDirectProxy(proxy_url: string): NonNullable<
  BrowserContextOptions["proxy"]
> {
  const parsed = new URL(proxy_url);
  const server = `${parsed.protocol}//${parsed.host}`;
  const username = parsed.username
    ? decodeURIComponent(parsed.username)
    : undefined;
  const password = parsed.password
    ? decodeURIComponent(parsed.password)
    : undefined;
  return { server, username, password };
}

export function buildBrowserContextOptions(proxy_url: string): BrowserContextOptions {
  const is_direct = proxy_url.trim().toLowerCase() === DIRECT_TOKEN;
  if (is_direct) {
    return { ignoreHTTPSErrors: true };
  }
  return {
    ignoreHTTPSErrors: true,
    proxy: parseNonDirectProxy(proxy_url),
  };
}
