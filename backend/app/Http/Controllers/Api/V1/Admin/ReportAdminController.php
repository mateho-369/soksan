<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\Report;
use App\Services\ReportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Phase 0 hardening — admin report queue behind role:admin (routes). Every
 * decision is audited by ReportService.
 */
class ReportAdminController extends Controller
{
    public function __construct(private readonly ReportService $reports)
    {
    }

    /** GET /api/v1/admin/reports?status=pending */
    public function index(Request $request): JsonResponse
    {
        $status = $request->query('status', 'pending');

        $reports = Report::query()
            ->when(in_array($status, Report::STATUSES, true), fn ($query) => $query->where('status', $status))
            ->with(['reporter:id,name', 'reviewer:id,name'])
            ->latest('created_at')
            ->paginate(25);

        return response()->json($reports);
    }

    /** GET /api/v1/admin/reports/{report} */
    public function show(Report $report): JsonResponse
    {
        return response()->json($report->load(['reporter:id,name', 'reviewer:id,name', 'reportable']));
    }

    /** PATCH /api/v1/admin/reports/{report} — decision: approved|rejected|dismissed */
    public function update(Request $request, Report $report): JsonResponse
    {
        $validated = $request->validate([
            'decision' => ['required', 'string', 'in:approved,rejected,dismissed'],
        ]);

        return response()->json($this->reports->review($request->user(), $report, $validated['decision']));
    }
}
