<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TrainingData extends Model
{
    use HasFactory;

    protected $table = 'training_data';

    protected $fillable = [
        'usia',
        'ket_usia',
        'jenis_kelamin',
        'status_bekerja',
        'bb',
        'tb',
        'imt',
        'status_gizi',
        'status_merokok',
        'pemeriksaan_kontak',
        'riwayat_dm',
        'riwayat_hiv',
        'komorbiditas',
        'kepatuhan_minum_obat',
        'efek_samping_obat',
        'keterangan_efek_samping',
        'riwayat_pengobatan',
        'panduan_pengobatan',
        'keberhasilan_pengobatan',
    ];

    protected $casts = [
        'ket_usia' => 'integer',
        'bb' => 'float',
        'tb' => 'float',
        'imt' => 'float',
    ];
}
