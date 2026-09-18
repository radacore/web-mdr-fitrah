<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Membatasi akses pada fitur yang hanya boleh diakses admin,
 * yaitu manajemen akun tenaga medis dan pengelolaan data rekam medis.
 */
class EnsureUserIsAdmin
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user || ! $user->isAdmin()) {
            abort(403, 'Halaman ini hanya dapat diakses oleh admin.');
        }

        return $next($request);
    }
}
