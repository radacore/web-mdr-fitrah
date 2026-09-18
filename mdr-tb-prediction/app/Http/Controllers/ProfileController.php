<?php

namespace App\Http\Controllers;

use App\Http\Requests\ProfileUpdateRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ProfileController extends Controller
{
    public function edit(Request $request): Response
    {
        return Inertia::render('Profile/Edit', [
            'user' => $request->user()->only(['id', 'name', 'email', 'role']),
            'roleLabel' => $request->user()->roleLabel(),
            'status' => session('status'),
        ]);
    }

    public function update(ProfileUpdateRequest $request): RedirectResponse
    {
        $request->user()->fill($request->validated());
        $request->user()->save();

        return redirect()
            ->route('profile.edit')
            ->with('status', 'profile-updated');
    }
}
