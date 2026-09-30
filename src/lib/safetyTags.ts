/**
 * Phase 9 — Safety & accessibility tags.
 *
 * One CLOSED allow-list shared by the composer, the feed display and the
 * demo seam; the Laravel backend mirrors it in SafetyTagService. Tags are
 * self-reported traveller observations — they never affect ranking and are
 * never required. Adding a tag means adding it here (plus its EN/KH labels
 * in LanguageContext under `safety.tag.*`).
 */

export const SAFETY_TAGS = ['well_lit', 'security_present', 'family_friendly', 'solo_friendly'] as const;

export const ACCESS_TAGS = ['wheelchair_accessible', 'accessible_restroom', 'step_free', 'quiet_space'] as const;

export type SafetyTag = (typeof SAFETY_TAGS)[number] | (typeof ACCESS_TAGS)[number];

export const ALL_SAFETY_TAGS: readonly SafetyTag[] = [...SAFETY_TAGS, ...ACCESS_TAGS];

/** Hard cap per post, mirroring the backend `max:8` rule. */
export const MAX_SAFETY_TAGS = 8;

export function isSafetyTag(value: unknown): value is SafetyTag {
  return typeof value === 'string' && (ALL_SAFETY_TAGS as readonly string[]).includes(value);
}
