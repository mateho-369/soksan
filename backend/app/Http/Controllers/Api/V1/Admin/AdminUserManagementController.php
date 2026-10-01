<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Phase 0 hardening — user administration behind role:admin (routes).
 * Status and role changes are audited.
 */
class AdminUserManagementController extends Controller
{
    public function __construct(private readonly AuditService $audit)
    {
    }

    /** GET /api/v1/admin/users?search= */
    public function index(Request $request): JsonResponse
    {
        $search = trim((string) $request->query('search', ''));

        $users = User::query()
            ->when($search !== '', function ($query) use ($search) {
                $query->where('name', 'ilike', "%{$search}%")
                    ->orWhere('email', 'ilike', "%{$search}%");
            })
            ->latest('id')
            ->paginate(25);

        return response()->json($users);
    }

    /** PATCH /api/v1/admin/users/{user}/status — is_active true|false */
    public function updateStatus(Request $request, User $user): JsonResponse
    {
        $validated = $request->validate([
            'is_active' => ['required', 'boolean'],
        ]);

        $user->update(['is_active' => $validated['is_active']]);

        $this->audit->record($request->user(), $validated['is_active'] ? 'user.activate' : 'user.deactivate', $user);

        return response()->json($user->only(['id', 'name', 'email', 'is_active']));
    }

    /** PATCH /api/v1/admin/users/{user}/role — role: user|admin */
    public function updateRole(Request $request, User $user): JsonResponse
    {
        $validated = $request->validate([
            'role' => ['required', 'string', 'in:user,admin'],
        ]);

        $user->syncRoles([$validated['role']]);

        $this->audit->record($request->user(), 'user.role', $user, ['role' => $validated['role']]);

        return response()->json($user->only(['id', 'name', 'email']));
    }
}
