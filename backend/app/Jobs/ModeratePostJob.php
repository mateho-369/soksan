<?php

namespace App\Jobs;

use App\Models\Post;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

/**
 * Content moderation runs on a Redis-backed queue (QUEUE_CONNECTION=redis),
 * NEVER inline in the request. The api container dispatches; dedicated
 * worker containers consume the "moderation" queue so a slow provider call
 * never delays a user.
 *
 * The three checks below are deliberately pluggable: each step is a small
 * method returning a score/flag, so Google Safe Browsing, Cloud Vision or
 * any spam-scoring provider can be swapped in without touching the job.
 */
class ModeratePostJob implements ShouldQueue
{
    use Dispatchable;
    use InteractsWithQueue;
    use Queueable;
    use SerializesModels;

    public int $tries = 3;

    public int $backoff = 30;

    public function __construct(public Post $post)
    {
        $this->onQueue('moderation');
    }

    public function handle(): void
    {
        $flags = [];

        $flags['spam'] = $this->scoreSpam($this->post);
        $flags['links'] = $this->scanLinks($this->post);
        $flags['media'] = $this->scanMedia($this->post);

        $verdict = in_array('blocked', $flags, true) ? 'blocked'
            : (in_array('review', $flags, true) ? 'needs_review' : 'published');

        // New posts start published for a frictionless UX; moderation can
        // still pull them down. Flip to 'draft' defaults once providers
        // are wired if stricter pre-publication review is wanted.
        if ($verdict !== 'published') {
            $this->post->update(['status' => $verdict]);
        }

        Log::info("Moderation finished for post {$this->post->id}", [
            'verdict' => $verdict,
            'flags' => $flags,
        ]);
    }

    /**
     * Heuristic spam score. Real deployment: replace with a provider call
     * (e.g. Perspective API) — it already runs off-request here.
     *
     * @return string 'ok'|'review'|'blocked'
     */
    private function scoreSpam(Post $post): string
    {
        $caption = (string) $post->caption;

        if ($caption === '') {
            return 'ok';
        }

        $uppercaseRatio = mb_strlen($caption) > 20
            ? mb_strlen(preg_replace('/[^A-Z]/u', '', $caption)) / mb_strlen($caption)
            : 0;
        $linkCount = preg_match_all('#https?://#i', $caption);

        if ($linkCount >= 3 || $uppercaseRatio > 0.7) {
            return 'review';
        }

        return 'ok';
    }

    /**
     * URL safety check placeholder — wire Google Safe Browsing here.
     *
     * @return string 'ok'|'review'
     */
    private function scanLinks(Post $post): string
    {
        $urls = [];

        foreach ($post->media as $media) {
            if (preg_match('#^https?://#i', (string) $media->url)) {
                $urls[] = $media->url;
            }
        }

        // Any remote URL we have not allow-listed goes to human review.
        $allowListed = fn (string $url): bool => str_contains($url, env('R2_PUBLIC_URL', '://soksan-media'));

        foreach ($urls as $url) {
            if (! $allowListed($url)) {
                return 'review';
            }
        }

        return 'ok';
    }

    /**
     * Image safety placeholder — wire Cloud Vision SafeSearch here.
     *
     * @return string 'ok'
     */
    private function scanMedia(Post $post): string
    {
        // Provider integration point; structured so the job signature
        // does not change when Cloud Vision is added.
        return 'ok';
    }
}
