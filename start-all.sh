#!/usr/bin/env bash
# =============================================================================
# start-all.sh
#   Menjalankan 4 service sekaligus untuk pengembangan lokal MDR-TB:
#   1. Flask ML Service           (port 5000)
#   2. Laravel artisan serve      (port 8000)
#   3. Vite dev server (npm)      (port 5173)
#   4. Jupyter Notebook           (port 8888)
#
# Penggunaan:
#   ./start-all.sh
#
# Hentikan semua: tekan Ctrl+C (akan otomatis kill semua child process)
# =============================================================================

set -u  # error on undefined var (tidak set -e, karena kita perlu cleanup di trap)

# --- Resolve direktori absolut script ----------------------------------------
SCRIPT_DIR="$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
cd "$SCRIPT_DIR"

ML_DIR="$SCRIPT_DIR/ml-service"
LARAVEL_DIR="$SCRIPT_DIR/mdr-tb-prediction"
JUPYTER_DIR="$ML_DIR/notebooks"
LOG_DIR="$SCRIPT_DIR/logs"

mkdir -p "$LOG_DIR"

# --- Warna ANSI ---------------------------------------------------------------
C_RESET='\033[0m'
C_BOLD='\033[1m'
C_RED='\033[31m'
C_GREEN='\033[32m'
C_YELLOW='\033[33m'
C_CYAN='\033[36m'
C_MAGENTA='\033[35m'
C_GRAY='\033[90m'

log_info()  { echo -e "${C_BOLD}${C_GREEN}[INFO]${C_RESET} $*"; }
log_warn()  { echo -e "${C_BOLD}${C_YELLOW}[WARN]${C_RESET} $*"; }
log_err()   { echo -e "${C_BOLD}${C_RED}[ERR ]${C_RESET} $*"; }
log_step()  { echo -e "\n${C_BOLD}${C_CYAN}==>${C_RESET} ${C_BOLD}$*${C_RESET}"; }

# --- Tentukan Python interpreter ---------------------------------------------
# Prioritas:
#   1. ml-service/venv/bin/python (kalau venv functional)
#   2. /usr/local/bin/python3.14 (yang sudah punya semua dependencies)
#   3. python3 (fallback)
PYTHON_BIN=""
if [ -x "$ML_DIR/venv/bin/python" ] && "$ML_DIR/venv/bin/python" -c "import flask,pandas,sklearn,pymysql" 2>/dev/null; then
    PYTHON_BIN="$ML_DIR/venv/bin/python"
elif [ -x "/usr/local/bin/python3.14" ] && /usr/local/bin/python3.14 -c "import flask,pandas,sklearn,pymysql" 2>/dev/null; then
    PYTHON_BIN="/usr/local/bin/python3.14"
elif command -v python3 >/dev/null && python3 -c "import flask,pandas,sklearn,pymysql" 2>/dev/null; then
    PYTHON_BIN="$(command -v python3)"
fi

if [ -z "$PYTHON_BIN" ]; then
    log_err "Tidak menemukan Python interpreter dengan flask+pandas+sklearn+pymysql terinstall."
    log_err "Coba: cd ml-service && pip install -r requirements.txt"
    exit 1
fi

if [ ! -d "$JUPYTER_DIR" ]; then
    JUPYTER_DIR="$SCRIPT_DIR"
fi

# --- Cek tools wajib ---------------------------------------------------------
command -v php  >/dev/null || { log_err "php tidak ditemukan di PATH"; exit 1; }
command -v npm  >/dev/null || { log_err "npm tidak ditemukan di PATH"; exit 1; }
"$PYTHON_BIN" -m jupyter notebook --version >/dev/null 2>&1 || {
    log_err "Jupyter Notebook tidak ditemukan di Python interpreter: $PYTHON_BIN"
    log_err "Coba: cd ml-service && $PYTHON_BIN -m pip install -r requirements.txt"
    exit 1
}

# --- Cek port bentrok --------------------------------------------------------
# Jika ada proses lama yang menduduki port kita, bunuh otomatis lalu lanjut,
# supaya launcher bisa dijalankan ulang tanpa harus kill manual.

kill_port() {
    local port="$1"
    local pids
    pids=$(lsof -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null)
    if [ -n "$pids" ]; then
        kill -TERM $pids 2>/dev/null
        sleep 0.5
        # Force kill yang masih hidup
        pids=$(lsof -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null)
        if [ -n "$pids" ]; then
            kill -KILL $pids 2>/dev/null
        fi
    fi
}

check_port() {
    local port="$1"
    local svc="$2"
    local pids
    pids=$(lsof -nP -iTCP:"$port" -sTCP:LISTEN 2>/dev/null | awk 'NR>1 {print $2}' | sort -u)
    if [ -n "$pids" ]; then
        log_warn "Port $port dipakai proses lama ($svc) — PID: $pids"
        log_warn "  Membunuh proses lama otomatis agar $svc bisa start."
        kill_port "$port"
    fi
}

# --- Banner ------------------------------------------------------------------
clear
echo -e "${C_BOLD}${C_CYAN}"
echo "+=============================================================+"
echo "|     MDR-TB Prediction System  |  Dev Server Launcher        |"
echo "+=============================================================+"
echo -e "${C_RESET}"

log_info "Direktori : ${C_GRAY}$SCRIPT_DIR${C_RESET}"
log_info "Python    : ${C_GRAY}$PYTHON_BIN${C_RESET}"
log_info "PHP       : ${C_GRAY}$(command -v php)${C_RESET}  ($(php -r 'echo PHP_VERSION;'))"
log_info "Node      : ${C_GRAY}$(command -v node)${C_RESET}  ($(node --version))"
log_info "Notebook : ${C_GRAY}$JUPYTER_DIR${C_RESET}"
log_info "Logs      : ${C_GRAY}$LOG_DIR${C_RESET}"
echo

log_step "Memeriksa port..."
check_port 5000 "Flask"
check_port 8000 "Laravel"
check_port 5173 "Vite"
check_port 8888 "Jupyter Notebook"

# --- Array PID untuk cleanup -------------------------------------------------
PIDS=()

CLEANED_UP=0
cleanup() {
    # Cegah double-cleanup karena trap bisa fire ganda
    if [ "$CLEANED_UP" -eq 1 ]; then return; fi
    CLEANED_UP=1

    echo
    log_step "Menghentikan semua service..."

    # 1) Kirim SIGTERM ke setiap PID + process group
    for pid in "${PIDS[@]}"; do
        if kill -0 "$pid" 2>/dev/null; then
            log_info "  Stopping PID $pid"
            kill -TERM -"$pid" 2>/dev/null || true
            kill -TERM "$pid" 2>/dev/null || true
        fi
    done
    sleep 1

    # 2) Force-kill PID yang masih hidup
    for pid in "${PIDS[@]}"; do
        if kill -0 "$pid" 2>/dev/null; then
            kill -KILL -"$pid" 2>/dev/null || true
            kill -KILL "$pid" 2>/dev/null || true
        fi
    done

    # 3) Safety net: kill apa pun yang masih listen di 4 port kita
    #    (semua port dijamin milik launcher karena proses lama sudah di-kill saat start).
    kill_port 5000
    kill_port 8000
    kill_port 5173
    kill_port 8888

    log_info "Semua service dihentikan. Bye!"
    exit 0
}

trap cleanup INT TERM HUP EXIT

# --- Helper: jalankan command dengan prefix berwarna -------------------------
# Argumen: <label> <warna> <log_file> <cwd> <cmd...>
run_service() {
    local label="$1"; shift
    local color="$1"; shift
    local logfile="$1"; shift
    local cwd="$1"; shift

    # Jalankan service sebagai PID utama, lalu arahkan stdout/stderr ke logger
    # prefix berwarna + timestamp sekaligus logfile. Process substitution ini
    # menjaga PID yang disimpan tetap PID service, bukan PID pipeline logger.
    # (Pakai bash printf alih-alih `awk strftime` agar kompatibel dengan
    #  BSD awk bawaan macOS.)
    (
        cd "$cwd" || exit 1
        exec "$@" > >(
            while IFS= read -r line; do
                local ts
                ts=$(date '+%H:%M:%S')
                local prefixed="[$ts] [$label] $line"
                printf '%b%s%b\n' "$color" "$prefixed" "$C_RESET"
                printf '%s\n' "$prefixed" >> "$logfile"
            done
        ) 2>&1
    ) &
    local pid=$!
    PIDS+=("$pid")
    log_info "$label started (PID $pid) -> $logfile"
}

# --- Start ke-4 service ------------------------------------------------------
log_step "Menjalankan service..."

# Set env variables yang dibutuhkan child processes
export ML_SERVICE_URL="${ML_SERVICE_URL:-http://localhost:5000}"
export LARAVEL_API_URL="${LARAVEL_API_URL:-http://localhost:8000/api}"

run_service "FLASK   " "$C_CYAN"    "$LOG_DIR/flask.log"   "$ML_DIR"      "$PYTHON_BIN" app.py
sleep 2  # beri Flask waktu inisialisasi (load model dari .pkl)

run_service "LARAVEL " "$C_MAGENTA" "$LOG_DIR/laravel.log" "$LARAVEL_DIR" php artisan serve --host=127.0.0.1 --port=8000

run_service "VITE    " "$C_YELLOW"  "$LOG_DIR/vite.log"    "$LARAVEL_DIR" npm run dev

run_service "JUPYTER " "$C_GREEN"   "$LOG_DIR/jupyter.log" "$JUPYTER_DIR" "$PYTHON_BIN" -m jupyter notebook --ip=127.0.0.1 --port=8888 --no-browser --notebook-dir="$JUPYTER_DIR"

# --- Tampilkan akses URL setelah semua service start --------------------------
sleep 3
echo
echo -e "${C_BOLD}${C_GREEN}+-------------------------------------------------------------+${C_RESET}"
echo -e "${C_BOLD}${C_GREEN}|  Semua service berjalan!                                    |${C_RESET}"
echo -e "${C_BOLD}${C_GREEN}+-------------------------------------------------------------+${C_RESET}"
echo -e "  ${C_CYAN}Flask ML${C_RESET}      : http://localhost:5000   (health: /health)"
echo -e "  ${C_MAGENTA}Laravel App${C_RESET}   : http://localhost:8000"
echo -e "  ${C_YELLOW}Vite HMR${C_RESET}      : http://localhost:5173"
echo -e "  ${C_GREEN}Jupyter${C_RESET}       : http://localhost:8888   (token muncul di log)"
echo
echo -e "  ${C_GRAY}Log files       : $LOG_DIR/{flask,laravel,vite,jupyter}.log${C_RESET}"
echo -e "  ${C_GRAY}Tekan Ctrl+C    : hentikan semua service${C_RESET}"
echo

# --- Tunggu Ctrl+C atau salah satu service mati ------------------------------
# Kita pakai `sleep` infinite loop yang sangat ringan, supaya signal handler
# (trap) bisa segera fire saat user tekan Ctrl+C. Loop ini juga memantau
# apakah ada child yang sudah crash duluan, agar bisa langsung cleanup.
while true; do
    alive=0
    for pid in "${PIDS[@]}"; do
        if kill -0 "$pid" 2>/dev/null; then
            alive=$((alive + 1))
        fi
    done
    if [ "$alive" -lt "${#PIDS[@]}" ]; then
        log_warn "Ada service yang berhenti tak terduga ($alive/${#PIDS[@]} masih hidup)."
        log_warn "Cek log file di $LOG_DIR untuk detail."
        cleanup
    fi
    sleep 2 &
    wait $! 2>/dev/null
done
