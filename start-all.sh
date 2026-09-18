#!/usr/bin/env bash
# =============================================================================
# start-all.sh
#   Menjalankan seluruh layanan yang dibutuhkan sistem klasifikasi MDR-TB:
#     1. Layanan machine learning (Flask)  - port 5000
#     2. Aplikasi web (Laravel)            - port 8000
#     3. Server pengembangan aset (Vite)   - port 5173
#
#   Penggunaan : ./start-all.sh
#   Menghentikan: tekan Ctrl+C (seluruh layanan dimatikan otomatis)
# =============================================================================

set -u

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &>/dev/null && pwd)"
cd "$SCRIPT_DIR"

ML_DIR="$SCRIPT_DIR/ml-service"
LARAVEL_DIR="$SCRIPT_DIR/mdr-tb-prediction"
LOG_DIR="$SCRIPT_DIR/logs"
PYTHON_BIN="${PYTHON_BIN:-python3}"

mkdir -p "$LOG_DIR"

C_RESET='\033[0m'; C_RED='\033[0;31m'; C_GREEN='\033[0;32m'
C_YELLOW='\033[0;33m'; C_BLUE='\033[0;34m'; C_GRAY='\033[0;90m'

info() { echo -e "${C_BLUE}[info]${C_RESET} $*"; }
gagal() { echo -e "${C_RED}[gagal]${C_RESET} $*" >&2; }

# --- Pemeriksaan prasyarat ---------------------------------------------------
[ -d "$ML_DIR" ] || { gagal "Direktori ml-service tidak ditemukan."; exit 1; }
[ -d "$LARAVEL_DIR" ] || { gagal "Direktori mdr-tb-prediction tidak ditemukan."; exit 1; }

command -v "$PYTHON_BIN" >/dev/null || { gagal "Python tidak ditemukan."; exit 1; }
command -v php >/dev/null || { gagal "PHP tidak ditemukan."; exit 1; }
command -v npm >/dev/null || { gagal "npm tidak ditemukan."; exit 1; }

[ -f "$LARAVEL_DIR/.env" ] || { gagal "Berkas .env belum ada di mdr-tb-prediction."; exit 1; }

# Model harus sudah dilatih agar endpoint klasifikasi dapat digunakan.
if [ ! -f "$ML_DIR/models/random_forest.pkl" ]; then
    echo -e "${C_YELLOW}[perhatian]${C_RESET} Model belum tersedia. Jalankan Latih Ulang Model dari menu Data Rekam Medis setelah aplikasi terbuka."
fi

# --- Membebaskan port yang masih terpakai ------------------------------------
bebaskan_port() {
    local port=$1
    local pid
    pid=$(lsof -ti:"$port" 2>/dev/null) || return 0
    [ -z "$pid" ] && return 0
    info "Port $port masih dipakai, menghentikan proses lama."
    echo "$pid" | xargs kill -9 2>/dev/null
    sleep 1
}

for port in 5000 8000 5173; do bebaskan_port "$port"; done

# --- Menjalankan layanan -----------------------------------------------------
PIDS=()

jalankan() {
    local nama=$1 warna=$2 berkas_log=$3 direktori=$4; shift 4
    (
        cd "$direktori" || exit 1
        "$@" 2>&1 | while IFS= read -r baris; do
            echo -e "${warna}[${nama}]${C_RESET} $baris"
            echo "$baris" >>"$berkas_log"
        done
    ) &
    PIDS+=($!)
}

bersihkan() {
    echo
    info "Menghentikan seluruh layanan."
    for pid in "${PIDS[@]}"; do kill "$pid" 2>/dev/null; done
    for port in 5000 8000 5173; do
        lsof -ti:"$port" 2>/dev/null | xargs kill -9 2>/dev/null
    done
    exit 0
}

trap bersihkan INT TERM

: >"$LOG_DIR/ml.log"; : >"$LOG_DIR/laravel.log"; : >"$LOG_DIR/vite.log"

jalankan "ML     " "$C_YELLOW" "$LOG_DIR/ml.log" "$ML_DIR" "$PYTHON_BIN" app.py
sleep 3
jalankan "LARAVEL" "$C_GREEN" "$LOG_DIR/laravel.log" "$LARAVEL_DIR" php artisan serve --port=8000
jalankan "VITE   " "$C_BLUE" "$LOG_DIR/vite.log" "$LARAVEL_DIR" npm run dev

sleep 3
echo
echo -e "  Aplikasi web  : ${C_GREEN}http://localhost:8000${C_RESET}"
echo -e "  Layanan ML    : ${C_YELLOW}http://localhost:5000${C_RESET}"
echo -e "  Vite HMR      : ${C_BLUE}http://localhost:5173${C_RESET}"
echo
echo -e "  ${C_GRAY}Akun admin       : admin@mdrtb.test / password${C_RESET}"
echo -e "  ${C_GRAY}Akun tenaga medis: tenagamedis@mdrtb.test / password${C_RESET}"
echo -e "  ${C_GRAY}Berkas log       : $LOG_DIR/{ml,laravel,vite}.log${C_RESET}"
echo
info "Tekan Ctrl+C untuk menghentikan."

wait
