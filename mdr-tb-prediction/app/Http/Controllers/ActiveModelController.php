<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\ActiveModel;

class ActiveModelController extends Controller
{
    public function index()
    {
        return response()->json(ActiveModel::all());
    }

    public function update(Request $request)
    {
        $request->validate([
            'model_name' => 'required|string|exists:active_models,model_name',
            'is_active' => 'required|boolean',
        ]);

        $model = ActiveModel::where('model_name', $request->model_name)->firstOrFail();
        $model->update(['is_active' => $request->is_active]);

        return response()->json(['message' => 'Sistem berhasil diperbarui.', 'model' => $model]);
    }
}