import requests
import json

data = {
    'Usia': 1,
    'Ket.Usia': 47,
    'Jenis Kelamin': 1,
    'Status Bekerja': 0,
    'BB': 47,
    'TB': 156,
    'IMT': 19.3, # or 21?
    'Status Gizi': 1,
    'Status Merokok': 0,
    'Pemeriksaan Kontak': 0,
    'Riwayat_DM': 0,
    'Riwayat_HIV': 0,
    'Komorbiditas': 1, # Ada (1)
    'Kepatuhan Minum Obat': 0,
    'Efek Samping Obat': 1,
    'Riwayat Pengobatan Sebelumnya': 1, # Kasus Lama
    'Panduan Pengobatan': 0 # Jangka Pendek
}

models = ["logistic_regression", "decision_tree", "k-nearest_neighbor", "support_vector_machine"]
for m in models:
    data['model_name'] = m
    res = requests.post('http://127.0.0.1:5000/predict', json=data)
    print(m, res.json()['prediction'])

