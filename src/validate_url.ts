const RESTRICTED_HOST_SUFFIXES = [
  "youtube.com",
  "youtu.be",
  "tiktok.com",
  "instagram.com",
  "facebook.com",
  "fb.watch",
];

export function assertUrlIsPermitted(
  video_url: string,
  allow_platform_simulation: boolean,
): void {
  const parsed = new URL(video_url);
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Only http and https URLs are supported.");
  }
  const host = parsed.hostname.toLowerCase();
  const is_restricted = RESTRICTED_HOST_SUFFIXES.some((suffix) => {
    return host === suffix || host.endsWith(`.${suffix}`);
  });
  if (is_restricted && !allow_platform_simulation) {
    throw new Error(
      "This host is restricted by default because simulating engagement " +
        "against third-party platforms may violate their terms of service. " +
        "Use only URLs you control, or pass --allow-platform-simulation " +
        "after confirming you have explicit written permission.",
    );
  }
}
