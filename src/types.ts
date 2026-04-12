export type WatcherResult = {
  proxy_label: string;
  status_code: number | null;
  bytes_read: number;
  duration_ms: number;
  error_message: string | null;
  content_type: string | null;
};

export type EngagementSummary = {
  video_url: string;
  simulated_viewers: number;
  total_bytes: number;
  total_duration_ms: number;
  results: WatcherResult[];
  started_at_iso: string;
  finished_at_iso: string;
};
