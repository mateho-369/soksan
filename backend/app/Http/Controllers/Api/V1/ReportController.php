<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreReportRequest;
use App\Models\Comment;
use App\Models\Post;
use App\Models\Report;
use App\Services\ReportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReportController extends Controller
{
    public function __construct(private readonly ReportService $reports)
    {
    }

    /** POST /api/v1/reports — file a report (throttle:reports in routes). */
    public function store(StoreReportRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $type = $validated['reportable_type'] === 'post' ? Post::class : Comment::class;

        $report = $this->reports->file(
            $request->user(),
            $type,
            (int) $validated['reportable_id'],
            $validated['reason'],
            $validated['details'] ?? null,
        );

        return response()->json($report, 201);
    }

    /** DELETE /api/v1/reports/{report} — withdraw your own pending report. */
    public function destroy(Request $request, Report $report): JsonResponse
    {
        $this->reports->withdraw($request->user(), $report);

        return response()->json(['message' => 'Report withdrawn.']);
    }
}
