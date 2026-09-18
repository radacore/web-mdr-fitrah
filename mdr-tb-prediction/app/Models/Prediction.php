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
        'feature_importance',
    ];

    protected $casts = [
        'patient_data' => 'array',
        'probabilities' => 'array',
        'feature_importance' => 'array',
        'confidence_score' => 'float',
    ];

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function isBerhasil(): bool
    {
        return $this->prediction_result === 'Berhasil';
    }
}
