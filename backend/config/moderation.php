<?php

/*
|--------------------------------------------------------------------------
| Moderation policy (Phase 0 hardening)
|--------------------------------------------------------------------------
| The closed allow-list of report reasons plus the threshold at which a
| post is automatically pulled from the public feed into the review queue.
| Auto-hide is reversible: an admin can publish the post again after
| review, which also clears the reports' effect.
*/

return [
    'reasons' => [
        'spam',
        'nudity',
        'violence',
        'scam',
        'private_location', // someone published an exact sensitive location
        'harassment',
        'illegal',
        'copyright',
        'fake_place',
        'other',
    ],

    // Pending reports needed before a post is auto-hidden for review.
    'auto_hide_reports' => (int) env('MODERATION_AUTO_HIDE_REPORTS', 3),

    // Keyword screen applied by ModeratePostJob (case-insensitive
    // substring). Kept deliberately small & editable without a deploy.
    'spam_keywords' => [
        'buy followers',
        'casino bonus',
        'crypto guaranteed profit',
        'click here to win',
    ],
];
