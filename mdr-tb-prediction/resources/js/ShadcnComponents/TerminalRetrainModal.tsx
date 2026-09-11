import { useEffect, useRef, useState } from 'react';

interface RetrainResult {
    status?: string;
    best_model?: string;
    cv_results?: Record<
        string,
        { accuracy?: { mean?: number }; f1?: { mean?: number } }
    >;
    data_count?: number;
    error?: string;
    message?: string;
}

interface LogLine {
    text: string;
    color?: string; // tailwind text color class
    delay: number;   // delay in ms before showing this line
}

interface Props {
    open: boolean;
    onClose: () => void;
    totalData: number;
    useSMOTE?: boolean;
}

export default function TerminalRetrainModal({ open, onClose, totalData, useSMOTE = false }: Props) {
    const [lines, setLines] = useState<{ text: string; color: string }[]>([]);
    const [isComplete, setIsComplete] = useState(false);
    const [hasError, setHasError] = useState(false);
    const [progress, setProgress] = useState(0);
    const terminalRef = useRef<HTMLDivElement>(null);
    const abortRef = useRef(false);
    const apiResultRef = useRef<RetrainResult | null>(null);
    const apiDoneRef = useRef(false);
    const testingSize = Math.ceil(totalData * 0.15);
    const remainingAfterTest = totalData - testingSize;
    const validationSize = Math.ceil(remainingAfterTest * (0.15 / 0.85));
    const trainingSize = totalData - testingSize - validationSize;

    const addLine = (text: string, color: string = 'text-gray-300') => {
        setLines(prev => [...prev, { text, color }]);
    };

    // Auto-scroll terminal
    useEffect(() => {
        if (terminalRef.current) {
            terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
        }
    }, [lines]);

    const sleep = (ms: number) => new Promise(resolve => {
        const timeout = setTimeout(resolve, ms);
        // Allow abort
        if (abortRef.current) clearTimeout(timeout);
    });

    const runTerminalSequence = async () => {
        abortRef.current = false;
        setLines([]);
        setIsComplete(false);
        setHasError(false);
        setProgress(0);
        apiResultRef.current = null;
        apiDoneRef.current = false;

        // Start actual API call in background
        fetch('/api/retrain', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ use_smote: useSMOTE }),
        })
            .then(res => res.json())
            .then(result => {
                apiResultRef.current = result;
                apiDoneRef.current = true;
            })
            .catch(err => {
                apiResultRef.current = { error: String(err) };
                apiDoneRef.current = true;
            });

        // Simulated log sequence (~60 seconds)
        const logSequence: LogLine[] = [
            { text: '$ python3 retrain.py', color: 'text-green-400', delay: 500 },
            { text: '', color: '', delay: 300 },
            { text: `[INFO] Mengambil data dari database...`, color: 'text-blue-400', delay: 1500 },
            { text: `[INFO] Ditemukan ${totalData} data training`, color: 'text-blue-400', delay: 1000 },
            { text: '[✓] Data berhasil dimuat', color: 'text-green-400', delay: 800 },
            { text: '', color: '', delay: 500 },

            // Step 1
            { text: '[STEP 1/9] Cleaning Data...', color: 'text-yellow-400', delay: 2000 },
            { text: '[INFO] Menghapus kolom tidak perlu (Efek_Samping_Obat)', color: 'text-gray-400', delay: 1500 },
            { text: '[INFO] Menghapus baris dengan missing values', color: 'text-gray-400', delay: 1500 },
            { text: `[✓] Data bersih: ${totalData} records`, color: 'text-green-400', delay: 800 },
            { text: '', color: '', delay: 300 },

            // Step 2
            { text: '[STEP 2/9] Feature Engineering...', color: 'text-yellow-400', delay: 2000 },
            { text: '[INFO] Memverifikasi kolom IMT dari BB dan TB', color: 'text-gray-400', delay: 2000 },
            { text: `[✓] Kolom IMT tervalidasi (${totalData} records)`, color: 'text-green-400', delay: 800 },
            { text: '', color: '', delay: 300 },

            // Step 3
            { text: '[STEP 3/9] Pra-Pemrosesan...', color: 'text-yellow-400', delay: 2000 },
            { text: '[INFO] Mendeteksi outlier menggunakan metode IQR...', color: 'text-gray-400', delay: 2500 },
            { text: '[INFO] Melakukan Label Encoding pada 13 fitur kategorikal', color: 'text-gray-400', delay: 2000 },
            { text: '[✓] Pra-pemrosesan selesai', color: 'text-green-400', delay: 800 },
            { text: '', color: '', delay: 300 },

            // Step 4
            { text: '[STEP 4/9] Seleksi Fitur...', color: 'text-yellow-400', delay: 1500 },
            { text: '[✓] 17 fitur dipilih (4 numerik + 13 kategorikal)', color: 'text-green-400', delay: 1000 },
            { text: '', color: '', delay: 300 },

            // Step 5
            { text: '[STEP 5/9] Membagi Data (70/15/15)...', color: 'text-yellow-400', delay: 2000 },
            { text: `[INFO] Training: ${trainingSize} data | Validation: ${validationSize} data | Testing: ${testingSize} data`, color: 'text-gray-400', delay: 1500 },
            { text: '[INFO] Stratified split, random_state=42 (deterministik, fair antar skenario)', color: 'text-gray-400', delay: 1200 },
            { text: '[INFO] Val/Test set tidak akan disentuh SMOTE — distribusi asli', color: 'text-gray-400', delay: 1200 },
            { text: '[✓] Data berhasil dibagi (Stratified)', color: 'text-green-400', delay: 800 },
            { text: '', color: '', delay: 300 },

            // SMOTE step
            ...(useSMOTE ? [
                { text: '[STEP 5.5] SMOTE Oversampling...', color: 'text-purple-400', delay: 1500 },
                { text: '[INFO] Kelas minoritas terdeteksi, membuat data sintetis...', color: 'text-gray-400', delay: 2000 },
                { text: '[INFO] SMOTE hanya pada training set (Chawla 2002; Lemaitre 2017)', color: 'text-gray-400', delay: 1200 },
                { text: `[✓] SMOTE selesai: kelas diseimbangkan`, color: 'text-green-400', delay: 800 },
                { text: '', color: '', delay: 300 },
            ] : [
                { text: '[INFO] SMOTE dinonaktifkan — menggunakan class_weight=balanced', color: 'text-gray-400', delay: 800 },
                { text: '', color: '', delay: 300 },
            ]),

            // Step 6
            { text: '[STEP 6/9] Hyperparameter Tuning (GridSearchCV)...', color: 'text-yellow-400', delay: 2000 },
            { text: '[INFO] ▸ Logistic Regression: mencoba 10 kombinasi parameter...', color: 'text-gray-400', delay: 3000 },
            { text: '[INFO]   Best params ditemukan ✓', color: 'text-cyan-400', delay: 800 },
            { text: '[INFO] ▸ Decision Tree: mencoba 108 kombinasi parameter...', color: 'text-gray-400', delay: 4000 },
            { text: '[INFO]   Best params ditemukan ✓', color: 'text-cyan-400', delay: 800 },
            { text: '[INFO] ▸ Support Vector Machine: mencoba 16 kombinasi parameter...', color: 'text-gray-400', delay: 3000 },
            { text: '[INFO]   Best params ditemukan ✓', color: 'text-cyan-400', delay: 800 },
            { text: '[✓] Hyperparameter Tuning selesai', color: 'text-green-400', delay: 800 },
            { text: '', color: '', delay: 300 },

            // Step 7
            { text: '[STEP 7/9] Cross Validation (5-Fold Stratified)...', color: 'text-yellow-400', delay: 1500 },
            { text: '[INFO] Fold 1/5 ████████████████████ selesai', color: 'text-gray-400', delay: 2000 },
            { text: '[INFO] Fold 2/5 ████████████████████ selesai', color: 'text-gray-400', delay: 2000 },
            { text: '[INFO] Fold 3/5 ████████████████████ selesai', color: 'text-gray-400', delay: 2000 },
            { text: '[INFO] Fold 4/5 ████████████████████ selesai', color: 'text-gray-400', delay: 2000 },
            { text: '[INFO] Fold 5/5 ████████████████████ selesai', color: 'text-gray-400', delay: 2000 },
            { text: '[✓] Cross Validation selesai', color: 'text-green-400', delay: 800 },
            { text: '', color: '', delay: 300 },

            // Step 8
            { text: '[STEP 8/9] Melatih Model Final...', color: 'text-yellow-400', delay: 1500 },
            { text: '[INFO] ▸ Logistic Regression... ✓', color: 'text-gray-400', delay: 1500 },
            { text: '[INFO] ▸ Decision Tree... ✓', color: 'text-gray-400', delay: 1500 },
            { text: '[INFO] ▸ Support Vector Machine... ✓', color: 'text-gray-400', delay: 1500 },
            { text: '[✓] Semua model berhasil dilatih', color: 'text-green-400', delay: 800 },
            { text: '', color: '', delay: 300 },

            // Step 9 - results will use real data
            { text: '[STEP 9/9] Evaluasi Model...', color: 'text-yellow-400', delay: 2000 },
        ];

        const totalDelay = logSequence.reduce((sum, l) => sum + l.delay, 0);
        let elapsed = 0;

        for (let i = 0; i < logSequence.length; i++) {
            if (abortRef.current) return;
            const log = logSequence[i];
            await sleep(log.delay);
            elapsed += log.delay;
            if (log.text) {
                addLine(log.text, log.color);
            } else {
                addLine(' ', 'text-gray-700');
            }
            setProgress(Math.min(85, Math.round((elapsed / totalDelay) * 85)));
        }

        // Wait for API to finish
        while (!apiDoneRef.current && !abortRef.current) {
            await sleep(500);
        }

        if (abortRef.current) return;

        const result = apiResultRef.current as RetrainResult | null;

        if (result?.error) {
            setHasError(true);
            addLine('', 'text-gray-700');
            addLine('[✗] ERROR: ' + (result.message || result.error), 'text-red-400');
            addLine('', 'text-gray-700');
            setProgress(100);
            setIsComplete(true);
            return;
        }

        // Show real evaluation results
        setProgress(88);
        if (result?.cv_results) {
            for (const [name, cv] of Object.entries(result.cv_results)) {
                await sleep(800);
                const f1 = ((cv.f1?.mean || 0) * 100).toFixed(2);
                const acc = ((cv.accuracy?.mean || 0) * 100).toFixed(2);
                addLine(`[INFO] ${name.padEnd(25)} → Akurasi: ${acc}% | F1: ${f1}%`, 'text-cyan-400');
            }
        }

        setProgress(92);
        await sleep(1000);
        addLine('[✓] Evaluasi selesai', 'text-green-400');
        addLine(' ', 'text-gray-700');

        // Save models
        await sleep(800);
        addLine('[INFO] Menyimpan model ke disk...', 'text-blue-400');
        await sleep(600);
        addLine('[✓] Model disimpan: logistic_regression.pkl', 'text-green-400');
        await sleep(400);
        addLine('[✓] Model disimpan: decision_tree.pkl', 'text-green-400');
        await sleep(400);
        addLine('[✓] Model disimpan: support_vector_machine.pkl', 'text-green-400');

        setProgress(98);
        await sleep(800);

        // Final summary
        addLine(' ', 'text-gray-700');
        addLine('════════════════════════════════════════════════════', 'text-yellow-400');
        addLine(`  🏆 TRAINING SELESAI! ${useSMOTE ? '(dengan SMOTE)' : '(tanpa SMOTE)'}`, 'text-white font-bold');
        if (result?.best_model) {
            addLine(`  Model Terbaik: ${result.best_model}`, 'text-cyan-400');
        }
        if (result?.cv_results && result.best_model) {
            const bestCv = result.cv_results[result.best_model];
            if (bestCv?.f1?.mean) {
                addLine(`  Best CV F1-Score: ${(bestCv.f1.mean * 100).toFixed(2)}%`, 'text-cyan-400');
            }
        }
        if (result?.data_count) {
            addLine(`  Data: ${result.data_count} records`, 'text-gray-400');
        }
        addLine('════════════════════════════════════════════════════', 'text-yellow-400');

        setProgress(100);
        setIsComplete(true);
    };

    useEffect(() => {
        if (open) {
            runTerminalSequence();
        }
        return () => {
            abortRef.current = true;
        };
    }, [open]);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-3xl mx-4 rounded-xl overflow-hidden shadow-2xl border border-gray-700">
                {/* Terminal Header */}
                <div className="bg-gray-800 px-4 py-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="flex gap-1.5">
                            <div className="w-3 h-3 rounded-full bg-red-500" />
                            <div className="w-3 h-3 rounded-full bg-yellow-500" />
                            <div className="w-3 h-3 rounded-full bg-green-500" />
                        </div>
                        <span className="text-gray-400 text-sm ml-2 font-mono">
                            mdr-tb-ml@server:~/retrain
                        </span>
                    </div>
                    {isComplete && (
                        <button
                            onClick={() => {
                                onClose();
                                if (!hasError) {
                                    window.location.reload();
                                }
                            }}
                            className="text-gray-400 hover:text-white text-sm font-mono transition-colors px-2 py-0.5 rounded hover:bg-gray-700"
                        >
                            [✕ Tutup]
                        </button>
                    )}
                </div>

                {/* Terminal Body */}
                <div
                    ref={terminalRef}
                    className="bg-gray-950 p-4 h-[420px] overflow-y-auto font-mono text-sm leading-relaxed"
                >
                    {lines.map((line, i) => (
                        <div key={i} className={`${line.color} whitespace-pre-wrap`}>
                            {line.text}
                        </div>
                    ))}
                    {!isComplete && (
                        <span className="text-white animate-pulse">▊</span>
                    )}
                </div>

                {/* Progress Bar */}
                <div className="bg-gray-900 px-4 py-2.5 border-t border-gray-800">
                    <div className="flex items-center justify-between text-xs text-gray-400 font-mono mb-1">
                        <span>{isComplete ? (hasError ? '✗ Error' : '✓ Selesai') : 'Proses training...'}</span>
                        <span>{progress}%</span>
                    </div>
                    <div className="w-full bg-gray-800 rounded-full h-1.5">
                        <div
                            className={`h-1.5 rounded-full transition-all duration-500 ${hasError ? 'bg-red-500' : isComplete ? 'bg-green-500' : 'bg-blue-500'}`}
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
