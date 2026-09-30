<?php

namespace App\Services;

/**
 * Phase 9 — Safety & accessibility tags.
 *
 * A CLOSED allow-list of tags a traveller may attach to a place at publish
 * time. Tags are self-reported traveller observations: they never affect
 * ranking, they are never required, and the list can only grow here — this
 * class is the single source of truth shared by the webapp, the admin tool
 * and any future API client (mirrored client-side in src/lib/safetyTags.ts).
 */
class SafetyTagService
{
    /** Safety observations. */
    public const SAFETY_TAGS = [
        'well_lit',
        'security_present',
        'family_friendly',
        'solo_friendly',
    ];

    /** Accessibility observations. */
    public const ACCESS_TAGS = [
        'wheelchair_accessible',
        'accessible_restroom',
        'step_free',
        'quiet_space',
    ];

    /** Every tag that may legally appear on a post. */
    public static function allowed(): array
    {
        return array_merge(self::SAFETY_TAGS, self::ACCESS_TAGS);
    }

    /**
     * Keep only known tags and dedupe (order preserved). Used where we want
     * to be lenient; the HTTP layer rejects unknown tags with 422 instead.
     *
     * @param  array<int, mixed>  $tags
     * @return array<int, string>
     */
    public static function filter(array $tags): array
    {
        return array_values(array_unique(array_intersect($tags, self::allowed())));
    }
}
