// Zod schemas for Route Handler request bodies. Paired with `parseBody` in
// ./api.ts, which validates the parsed JSON against one of these and returns a
// 400 (with the first issue's message) before the data reaches Supabase.
//
// Posting bodies (candidate/employer) are validated by ./postingValidation.ts
// instead — those carry a fractional `years_exp` and several DB-enum columns the
// existing normaliser already handles, so they stay there rather than being
// re-expressed here. Profile bodies are validated inline in their routes.

import { z } from "zod";
import { MAX_PITCH_MESSAGE_LEN, MAX_CHAT_MESSAGE_LEN, MAX_TITLE_LEN } from "./constants";

// An opaque id reference (Better Auth user id / row id). Bounded, non-empty;
// the actual existence/ownership check happens against the DB in the route.
const idString = z.string().min(1).max(100);

// Candidate accepting / declining an incoming pitch.
export const respondSchema = z.object({
  action: z.enum(["accept", "decline"]),
});

// Hire-offer state machine actions on an accepted match. `offered_salary` is
// only read for `send`; the route enforces its positive-cents bound there.
export const offerSchema = z.object({
  action: z.enum(["send", "accept", "decline", "withdraw", "renege", "withdraw_match", "decline_match"]),
  offered_salary: z.number().finite().nullish(),
});

// Employer sending a pitch. pitch_message / offered_salary are further
// normalised (clampText / parseSalaryCents) in the route.
export const pitchSchema = z.object({
  candidate_id: idString,
  pitch_message: z.string().max(MAX_PITCH_MESSAGE_LEN).nullish(),
  offered_salary: z.number().finite().nullish(),
  posting_id: idString.nullish(),
  candidate_posting_id: idString.nullish(),
});

// Admin creating a pitch on an employer's behalf (employer_id supplied).
export const adminPitchSchema = pitchSchema.extend({
  employer_id: idString,
});

// Employer rating how well a portfolio reflected a candidate's ability.
export const feedbackSchema = z.object({
  rating: z.coerce.number().int().min(1).max(5),
});

// Activity-email preference toggle (both roles).
export const notificationsSchema = z.object({
  email_notifications: z.boolean(),
});

// Subscription checkout tier.
export const checkoutSchema = z.object({
  tier: z.enum(["starter", "pro"]),
});

// Admin override of a match's offer_status.
export const adminOfferStatusSchema = z.object({
  offer_status: z.enum(["pending", "accepted", "declined"]).nullable(),
});

// Admin toggle of a candidate's founder-verified flag.
export const adminVerifySchema = z.object({
  is_founder_verified: z.boolean(),
});

// A text chat message (the multipart/file branch is handled separately).
export const chatMessageSchema = z.object({
  body: z.string().trim().min(1, "Message body required").max(MAX_CHAT_MESSAGE_LEN),
});

// Salary-regression proxy body. Forwarded to the edge function, which does the
// modelling; we bound the inputs and require the experience coordinate. Extra
// keys are passed through so future edge-function params keep working.
export const salarySchema = z
  .object({
    years_exp: z.number().finite(),
    vertical: z.string().max(40).optional(),
    location: z.string().max(80).optional(),
    remote: z.boolean().optional(),
    role: z.string().max(MAX_TITLE_LEN).optional(),
    current_salary: z.number().finite().optional(),
  })
  .passthrough();
