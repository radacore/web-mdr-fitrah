<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Manajemen akun tenaga medis oleh admin.
 * Mengacu pada Use Case Diagram (Gambar 6) proposal.
 */
class UserController extends Controller
{
    public function index(Request $request): Response
    {
        $query = User::query()->orderBy('name');

        if ($cari = $request->input('search')) {
            $query->where(function ($q) use ($cari) {
                $q->where('name', 'like', "%{$cari}%")
                    ->orWhere('email', 'like', "%{$cari}%");
            });
        }

        if ($role = $request->input('role')) {
            $query->where('role', $role);
        }

        return Inertia::render('Users/Index', [
            'users' => $query->paginate(15)->withQueryString(),
            'filters' => $request->only(['search', 'role']),
            'roles' => User::ROLES,
            'stats' => [
                'total' => User::count(),
                'admin' => User::where('role', User::ROLE_ADMIN)->count(),
                'tenaga_medis' => User::where('role', User::ROLE_TENAGA_MEDIS)->count(),
            ],
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('Users/Create', [
            'roles' => User::ROLES,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|lowercase|email|max:255|unique:users,email',
            'password' => ['required', 'confirmed', Password::defaults()],
            'role' => ['required', Rule::in(array_keys(User::ROLES))],
        ]);

        User::create($validated);

        return redirect()
            ->route('users.index')
            ->with('success', 'Akun berhasil ditambahkan.');
    }

    public function edit(User $user): Response
    {
        return Inertia::render('Users/Edit', [
            'user' => $user->only(['id', 'name', 'email', 'role']),
            'roles' => User::ROLES,
        ]);
    }

    public function update(Request $request, User $user): RedirectResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => [
                'required', 'string', 'lowercase', 'email', 'max:255',
                Rule::unique('users', 'email')->ignore($user->id),
            ],
            // Kata sandi bersifat opsional agar admin dapat memperbarui data
            // akun tanpa harus mengganti kata sandi
            'password' => ['nullable', 'confirmed', Password::defaults()],
            'role' => ['required', Rule::in(array_keys(User::ROLES))],
        ]);

        if (blank($validated['password'] ?? null)) {
            unset($validated['password']);
        }

        // Admin terakhir tidak boleh diturunkan perannya agar sistem tetap dapat dikelola
        if ($user->isAdmin() && $validated['role'] !== User::ROLE_ADMIN && $this->isLastAdmin($user)) {
            return back()->withErrors([
                'role' => 'Peran admin terakhir tidak dapat diubah.',
            ]);
        }

        $user->update($validated);

        return redirect()
            ->route('users.index')
            ->with('success', 'Akun berhasil diperbarui.');
    }

    public function destroy(Request $request, User $user): RedirectResponse
    {
        if ($request->user()->id === $user->id) {
            return back()->withErrors([
                'error' => 'Akun yang sedang digunakan tidak dapat dihapus.',
            ]);
        }

        if ($user->isAdmin() && $this->isLastAdmin($user)) {
            return back()->withErrors([
                'error' => 'Akun admin terakhir tidak dapat dihapus.',
            ]);
        }

        $user->delete();

        return redirect()
            ->route('users.index')
            ->with('success', 'Akun berhasil dihapus.');
    }

    private function isLastAdmin(User $user): bool
    {
        return User::where('role', User::ROLE_ADMIN)
            ->where('id', '!=', $user->id)
            ->doesntExist();
    }
}
