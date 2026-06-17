// Server-side event capture: always emits a structured log line (pick up via
// any log pipeline), and also forwards to PostHog's HTTP capture endpoint
// when NEXT_PUBLIC_POSTHOG_KEY is configured (no posthog-node dependency
// needed -- the capture API is a plain POST).
export function captureServerEvent(event: string, properties: Record<string, unknown>) {
  console.log(JSON.stringify({ event, ...properties }));

  const apiKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!apiKey) return;

  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://app.posthog.com";

  fetch(`${host}/capture/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: apiKey,
      event,
      distinct_id: "server",
      properties: { ...properties, $process_person_profile: false },
    }),
  }).catch((err) => console.error(`captureServerEvent(${event}) failed:`, err));
}
