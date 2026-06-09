import { PostHog } from "posthog-node";

let posthogClient: PostHog | undefined;

export function getPostHogServer(): PostHog {
  if (!posthogClient) {
    posthogClient = new PostHog(process.env.NEXT_PUBLIC_POSTHOG_KEY ?? "placeholder", {
      host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://app.posthog.com",
      flushAt: 20,
      flushInterval: 10000,
    });
  }
  return posthogClient;
}

export async function track(
  distinctId: string,
  event: string,
  properties?: Record<string, unknown>
) {
  const client = getPostHogServer();
  client.capture({ distinctId, event, properties: properties ?? {} });
}

export const EVENTS = {
  SIGN_UP: "sign_up",
  SIGN_IN: "sign_in",
  CHALLENGE_STARTED: "challenge_started",
  CHALLENGE_COMPLETED: "challenge_completed",
  PITCH_SENT: "pitch_sent",
  MATCH_ACCEPTED: "match_accepted",
  MATCH_DECLINED: "match_declined",
  SALARY_VIEWED: "salary_viewed",
  PROFILE_UPDATED: "profile_updated",
} as const;
