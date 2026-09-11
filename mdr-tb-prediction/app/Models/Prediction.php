<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Prediction extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'slug',
        'patient_data',
        'prediction_result',
        'model_used',
        'confidence_score',
        'probabilities',
        'factor_contributions',
    ];

    protected $casts = [
        'patient_data' => 'array',
        'probabilities' => 'array',
        'factor_contributions' => 'array',
        'confidence_score' => 'float',
    ];

    /**
     * Get the user that owns the prediction.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}