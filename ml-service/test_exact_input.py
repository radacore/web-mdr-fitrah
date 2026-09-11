import pandas as pd
from app import load_or_train_models
import sys
import os

sys.path.append(os.path.join(os.path.dirname(__file__), 'src'))
from preprocessing import DataPreprocessor
from app import trainer
import pickle

models_dir = 'models'
preprocessor_path = os.path.join(models_dir, 'preprocessor.pkl')
preprocessor = DataPreprocessor.load(preprocessor_path)

input_data = {
    "usia": "Usia Lanjut",
    "ket_usia": "61",
    "jenis_kelamin": "Perempuan",
    "status_bekerja": "Tidak Bekerja",
    "bb": "47",
    "tb": "156",
    "imt": "19.3",
    "status_gizi": "Gizi Normal",
    "status_merokok": "Tidak Merokok",
    "pemeriksaan_kontak": "Tidak",
    "riwayat_dm": "Ya",
    "riwayat_hiv": "Tidak",
    "komorbiditas": "Ada",
    "kepatuhan_minum_obat": "Patuh",
    "efek_samping_obat": "Ada Keluhan",
    "keterangan_efek_samping": None,
    "riwayat_pengobatan": "Kasus Lama",
    "panduan_pengobatan": "Jangka Pendek"
}

trainer.load_models(models_dir)

processed = preprocessor.preprocess_single_input(input_data)
print("Processed Features:")
print(processed.to_dict('records')[0])

models = ["logistic_regression", "decision_tree", "k-nearest_neighbor", "support_vector_machine"]
for m in models:
    pred = trainer.predict(processed, m)
    prob = trainer.predict_proba(processed, m)
    print(m, pred, prob)
