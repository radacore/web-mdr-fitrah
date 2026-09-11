import { Head, Link } from "@inertiajs/react";
import { useEffect } from "react";
import {
    Activity,
    ArrowRight,
    CheckCircle2,
    ShieldCheck,
    Sparkles,
    AlertTriangle,
    Clock,
    BrainCircuit,
    Database,
    LineChart,
    Lock,
    TrendingUp,
    DollarSign,
    Users,
} from "lucide-react";
import Navbar from "@/ShadcnComponents/Navbar";
import Footer from "@/ShadcnComponents/Footer";
import axios from "axios";
import { useState } from "react";

interface ActiveModel {
    id: number;
    model_name: string;
    is_active: boolean;
}

interface Props {
    canLogin: boolean;
    canRegister: boolean;
}

export default function Landing({ canLogin, canRegister }: Props) {
    const [activeModelsText, setActiveModelsText] = useState<string>(
        "Logistic Regression, Decision Tree, KNN, & SVM",
    );
    const [activeModelCount, setActiveModelCount] = useState<number>(4);

    // Also need to reset body styles if we messed with them in previous steps
    useEffect(() => {
        document.body.style.background = "";
        document.body.style.color = "";

        // Fetch active models dynamically for Landing Page typography
        axios
            .get("/api/active-models")
            .then((res) => {
                const active = res.data.filter((m: ActiveModel) => m.is_active);
                setActiveModelCount(active.length);
                const names = active.map((m: ActiveModel) => m.model_name);

                if (names.length > 0) {
                    if (names.length === 1) {
                        setActiveModelsText(names[0]);
                    } else if (names.length === 2) {
                        setActiveModelsText(names.join(" & "));
                    } else {
                        const last = names.pop();
                        setActiveModelsText(names.join(", ") + ", & " + last);
                    }
                }
            })
            .catch((err) =>
                console.error("Failed to fetch active models", err),
            );
    }, []);

    return (
        <>
            <Head>
                <title>SRI-Predict MDR-TB | Prediksi Pengobatan Tuberkulosis Cerdas</title>
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link
                    rel="preconnect"
                    href="https://fonts.gstatic.com"
                    crossOrigin="anonymous"
                />
                <link
                    href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap"
                    rel="stylesheet"
                />
            </Head>

            <div className="font-sans text-gray-800 bg-white antialiased selection:bg-purple-500 selection:text-white">
                <Navbar canLogin={canLogin} />

                {/* Hero Section */}
                <section className="pt-32 pb-20 lg:pt-40 lg:pb-28 overflow-hidden bg-gradient-to-b from-purple-50 to-white">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
                        <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
                            {/* Text Content */}
                            <div className="max-w-2xl">
                                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-gray-900 mb-6 leading-tight">
                                    Prediksi Hasil Pengobatan{" "}
                                    <span className="text-purple-600">
                                        MDR-TB
                                    </span>{" "}
                                    Lebih Akurat.
                                </h1>
                                <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                                    Sistem cerdas berbasis Machine Learning yang
                                    menganalisis data klinis, demografis, dan
                                    resistensi obat untuk memprediksi
                                    keberhasilan pengobatan pasien Tuberculosis
                                    Multi-Drug Resistant.
                                </p>
                                <div className="flex flex-col sm:flex-row gap-4">
                                    <Link
                                        href="/lakukan-prediksi"
                                        className="inline-flex justify-center items-center px-8 py-3.5 border border-transparent text-base font-medium rounded-full text-white bg-purple-600 hover:bg-purple-700 transition shadow-lg shadow-purple-500/30"
                                    >
                                        Mulai Prediksi
                                        <ArrowRight className="ml-2 h-5 w-5" />
                                    </Link>
                                </div>
                            </div>

                            {/* Hero Image / Visual */}
                            <div className="relative lg:ml-auto hidden md:block">
                                {/* Abstract Background Shape */}
                                <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-purple-100 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-pulse"></div>
                                <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 bg-teal-500/20 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse delay-1000"></div>

                                {/* Interface Mockup */}
                                <div className="relative rounded-2xl bg-white shadow-2xl border border-gray-200 p-2 transform rotate-1 hover:rotate-0 transition duration-500">
                                    <div className="bg-gray-50 rounded-xl overflow-hidden">
                                        {/* Header Mockup */}
                                        <div className="h-12 bg-white border-b border-gray-200 flex items-center px-4 justify-between">
                                            <div className="flex gap-2">
                                                <div className="w-3 h-3 rounded-full bg-red-400"></div>
                                                <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                                                <div className="w-3 h-3 rounded-full bg-green-400"></div>
                                            </div>
                                            <div className="text-xs text-gray-400 font-mono">
                                                analysis_dashboard.js
                                            </div>
                                        </div>
                                        {/* Content Mockup */}
                                        <div className="p-6 space-y-4">
                                            <div className="flex justify-between items-start mb-6">
                                                <div>
                                                    <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                                                        HASIL PREDIKSI SISTEM
                                                    </div>
                                                    <div className="text-4xl font-semibold text-gray-900 tracking-tight">
                                                        Berhasil
                                                    </div>
                                                </div>
                                                <div className="bg-green-100/80 text-green-600 px-3 py-1 rounded-md text-xs font-semibold mt-6">
                                                    Confidence: 87.5%
                                                </div>
                                            </div>

                                            {/* Chart Bars */}
                                            <div className="space-y-4">
                                                <div>
                                                    <div className="flex items-center justify-between text-xs font-medium text-gray-500 mb-1">
                                                        <span>
                                                            Kepatuhan Minum Obat
                                                        </span>
                                                        <span>Tinggi</span>
                                                    </div>
                                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                                        <div
                                                            className="bg-purple-600 h-2 rounded-full"
                                                            style={{
                                                                width: "92%",
                                                            }}
                                                        ></div>
                                                    </div>
                                                </div>
                                                <div>
                                                    <div className="flex items-center justify-between text-xs font-medium text-gray-500 mb-1">
                                                        <span>
                                                            Risiko Komorbiditas
                                                        </span>
                                                        <span>Rendah</span>
                                                    </div>
                                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                                        <div
                                                            className="bg-teal-400 h-2 rounded-full"
                                                            style={{
                                                                width: "25%",
                                                            }}
                                                        ></div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="mt-6 p-4 bg-purple-50 rounded-xl border border-purple-100/50">
                                                <div className="flex gap-3">
                                                    <Sparkles className="text-purple-600 h-5 w-5 flex-shrink-0" />
                                                    <p className="text-xs text-purple-900/80 leading-relaxed font-medium">
                                                        <strong className="text-purple-800">
                                                            Rekomendasi Machine
                                                            Learning:
                                                        </strong>{" "}
                                                        Pasien menunjukkan
                                                        peluang kesembuhan yang
                                                        tinggi (Kasus Baru,
                                                        Patuh). Disarankan untuk
                                                        melanjutkan panduan
                                                        pengobatan jangka
                                                        pendek.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Problem & Solution Section */}
                <section id="solusi" className="py-20 bg-white">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="text-center max-w-3xl mx-auto mb-16">
                            <h2 className="text-purple-600 font-semibold tracking-wide uppercase text-sm mb-2">Mengapa SRI-Predict MDR-TB?</h2>
                            <h3 className="text-3xl font-bold text-gray-900 mb-4">Tantangan MDR-TB Masa Kini</h3>
                            <p className="text-gray-600 text-lg">
                                Pengobatan MDR-TB membutuhkan durasi panjang
                                (18-24 bulan) dengan rejimen obat yang kompleks
                                dan efek samping berat. Keputusan klinis yang
                                lambat dapat berakibat fatal.
                            </p>
                        </div>

                        <div className="grid md:grid-cols-3 gap-8">
                            {/* Card 1 */}
                            <div className="bg-gray-50 p-8 rounded-2xl border border-gray-100 hover:shadow-lg transition duration-300">
                                <div className="bg-red-100 w-12 h-12 rounded-lg flex items-center justify-center mb-6">
                                    <AlertTriangle className="text-red-600 h-6 w-6" />
                                </div>
                                <h4 className="text-xl font-bold text-gray-900 mb-3">
                                    Kompleksitas Data
                                </h4>
                                <p className="text-gray-600">
                                    Ribuan titik data dari riwayat pasien, hasil
                                    lab, dan radiologi seringkali sulit
                                    diintegrasikan secara manual oleh dokter.
                                </p>
                            </div>
                            {/* Card 2 */}
                            <div className="bg-gray-50 p-8 rounded-2xl border border-gray-100 hover:shadow-lg transition duration-300">
                                <div className="bg-orange-100 w-12 h-12 rounded-lg flex items-center justify-center mb-6">
                                    <Clock className="text-orange-600 h-6 w-6" />
                                </div>
                                <h4 className="text-xl font-bold text-gray-900 mb-3">
                                    Waktu Terbuang
                                </h4>
                                <p className="text-gray-600">
                                    Evaluasi rejimen obat yang tidak efektif
                                    seringkali baru terdeteksi setelah
                                    berbulan-bulan pengobatan berjalan.
                                </p>
                            </div>
                            {/* Card 3 */}
                            <div className="bg-gray-50 p-8 rounded-2xl border border-gray-100 hover:shadow-lg transition duration-300">
                                <div className="bg-purple-100 w-12 h-12 rounded-lg flex items-center justify-center mb-6">
                                    <BrainCircuit className="text-purple-600 h-6 w-6" />
                                </div>
                                <h4 className="text-xl font-bold text-gray-900 mb-3">
                                    Solusi Machine Learning Kami
                                </h4>
                                <p className="text-gray-600">
                                    Algoritma kami mendeteksi pola tersembunyi
                                    untuk memprediksi hasil pengobatan sejak
                                    dini, memungkinkan intervensi cepat.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Feature Section */}
                <section
                    id="fitur"
                    className="py-20 bg-gray-900 text-white relative overflow-hidden"
                >
                    {/* Decoration */}
                    <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 opacity-10 pointer-events-none">
                        <div className="absolute w-96 h-96 bg-purple-500 rounded-full blur-3xl -top-20 -left-20"></div>
                        <div className="absolute w-96 h-96 bg-purple-500 rounded-full blur-3xl bottom-0 right-0"></div>
                    </div>

                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                        <div className="grid lg:grid-cols-2 gap-16 items-center">
                            <div>
                                <h2 className="text-3xl md:text-4xl font-bold mb-6">
                                    Teknologi di Balik Prediksi
                                </h2>
                                <p className="text-gray-400 text-lg mb-8">
                                    Kami menggunakan pendekatan{" "}
                                    {activeModelCount > 1
                                        ? "Multi-Model Comparison"
                                        : "Machine Learning Predictive"}{" "}
                                    ({activeModelsText}) yang divalidasi dengan
                                    K-Fold Cross Validation untuk akurasi
                                    optimal.
                                </p>

                                <div className="space-y-6">
                                    <div className="flex gap-4">
                                        <div className="flex-shrink-0 mt-1">
                                            <div className="bg-purple-600/20 p-2 rounded-lg border border-purple-500/30">
                                                <Database className="text-purple-400 h-5 w-5" />
                                            </div>
                                        </div>
                                        <div>
                                            <h4 className="text-xl font-semibold mb-2">
                                                Integrasi Data Klinis Terpadu
                                            </h4>
                                            <p className="text-gray-400">
                                                Analisis komprehensif mencakup
                                                data demografis, riwayat
                                                pengobatan TB sebelumnya, status
                                                gizi, komorbiditas, jenis
                                                resistensi, dan kepatuhan
                                                pasien.
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex gap-4">
                                        <div className="flex-shrink-0 mt-1">
                                            <div className="bg-purple-600/20 p-2 rounded-lg border border-purple-500/30">
                                                <LineChart className="text-purple-400 h-5 w-5" />
                                            </div>
                                        </div>
                                        <div>
                                            <h4 className="text-xl font-semibold mb-2">
                                                Pembersihan Data Otomatis
                                            </h4>
                                            <p className="text-gray-400">
                                                Tahap pra-pemrosesan mandiri
                                                yang secara otomatis mengkodekan
                                                label pada data nominal dan
                                                menghapus anomali (outlier)
                                                untuk hasil prediksi yang
                                                terpercaya.
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex gap-4">
                                        <div className="flex-shrink-0 mt-1">
                                            <div className="bg-purple-600/20 p-2 rounded-lg border border-purple-500/30">
                                                <Lock className="text-purple-400 h-5 w-5" />
                                            </div>
                                        </div>
                                        <div>
                                            <h4 className="text-xl font-semibold mb-2">
                                                Evaluasi Model Ketat
                                            </h4>
                                            <p className="text-gray-400">
                                                Pemilihan model terbaik secara
                                                otomatis berdasarkan F1-Score
                                                dan Accuracy rata-rata dari
                                                5-Fold Cross Validation.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Graphic Side */}
                            <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700 shadow-2xl">
                                <h3 className="text-sm font-mono text-gray-400 mb-4 border-b border-gray-700 pb-2">
                                    Model Pipeline
                                </h3>
                                <div className="grid grid-cols-2 gap-4 mb-6">
                                    <div className="bg-gray-700/50 p-4 rounded-lg">
                                        <div className="text-2xl font-bold text-white">
                                            {activeModelCount}
                                        </div>
                                        <div className="text-xs text-gray-400">
                                            {activeModelCount > 1
                                                ? "Active Models"
                                                : "Active Model"}
                                        </div>
                                    </div>
                                    <div className="bg-gray-700/50 p-4 rounded-lg">
                                        <div className="text-2xl font-bold text-purple-400">
                                            5-Fold
                                        </div>
                                        <div className="text-xs text-gray-400">
                                            Validation
                                        </div>
                                    </div>
                                </div>
                                {/* Mock Code Block */}
                                <div className="bg-gray-900 rounded-lg p-4 font-mono text-xs overflow-x-auto">
                                    <div className="flex gap-2 mb-2">
                                        <div className="w-2 h-2 rounded-full bg-red-500"></div>
                                        <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                    </div>
                                    <p className="text-purple-400">
                                        from{" "}
                                        <span className="text-white">
                                            sklearn.svm
                                        </span>{" "}
                                        import{" "}
                                        <span className="text-white">SVC</span>
                                    </p>
                                    <p className="text-purple-400">
                                        from{" "}
                                        <span className="text-white">
                                            sklearn.pipeline
                                        </span>{" "}
                                        import{" "}
                                        <span className="text-white">
                                            Pipeline
                                        </span>
                                    </p>
                                    <p className="text-purple-400 mt-2">
                                        def{" "}
                                        <span className="text-yellow-300">
                                            train_models
                                        </span>
                                        <span className="text-white">
                                            (X, y):
                                        </span>
                                    </p>
                                    <p className="text-gray-500 pl-4">
                                        # Konfigurasi Pipeline
                                    </p>
                                    <p className="text-white pl-4">
                                        pipeline = Pipeline([
                                    </p>
                                    <p className="text-white pl-8">
                                        (
                                        <span className="text-green-400">
                                            'scaler'
                                        </span>
                                        , StandardScaler()),
                                    </p>
                                    <p className="text-white pl-8">
                                        (
                                        <span className="text-green-400">
                                            'clf'
                                        </span>
                                        , SVC(kernel=
                                        <span className="text-green-400">
                                            'rbf'
                                        </span>
                                        ))
                                    </p>
                                    <p className="text-white pl-4">])</p>
                                    <p className="text-gray-500 pl-4">
                                        # Latih dengan Cross Validation
                                    </p>
                                    <p className="text-white pl-4">
                                        scores = cross_val_score(pipeline, X, y,
                                        cv=5)
                                    </p>
                                    <p className="text-purple-400 pl-4">
                                        return{" "}
                                        <span className="text-white">
                                            scores.mean()
                                        </span>
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Benefits / Stats */}
                <section id="manfaat" className="py-20 bg-purple-50">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="grid md:grid-cols-2 gap-12 items-center">
                            <div className="order-2 md:order-1">
                                <img
                                    src="https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80"
                                    alt="Dokter menganalisis data"
                                    className="rounded-2xl shadow-xl object-cover h-[400px] w-full"
                                />
                            </div>
                            <div className="order-1 md:order-2">
                                <h2 className="text-3xl font-bold text-gray-900 mb-6">
                                    Manfaat Nyata bagi Perjalanan Kesembuhan
                                    Anda
                                </h2>
                                <ul className="space-y-6">
                                    <li className="flex items-start">
                                        <div className="flex-shrink-0 h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center mt-1">
                                            <BrainCircuit className="text-purple-600 h-4 w-4" />
                                        </div>
                                        <div className="ml-4">
                                            <h4 className="text-lg font-semibold text-gray-900">
                                                Pemahaman Kondisi Pribadi
                                            </h4>
                                            <p className="text-gray-600">
                                                Ketahui bagaimana karakteristik
                                                unik, gaya hidup, dan riwayat
                                                kesehatan Anda mempengaruhi
                                                peluang keberhasilan pengobatan.
                                            </p>
                                        </div>
                                    </li>
                                    <li className="flex items-start">
                                        <div className="flex-shrink-0 h-8 w-8 rounded-full bg-green-100 flex items-center justify-center mt-1">
                                            <Activity className="text-green-600 h-4 w-4" />
                                        </div>
                                        <div className="ml-4">
                                            <h4 className="text-lg font-semibold text-gray-900">
                                                Kesiapan Menghadapi Pengobatan
                                            </h4>
                                            <p className="text-gray-600">
                                                Dapatkan gambaran objektif agar
                                                Anda lebih siap secara mental
                                                dan fisik dalam menjalani masa
                                                pengobatan MDR-TB yang panjang.
                                            </p>
                                        </div>
                                    </li>
                                    <li className="flex items-start">
                                        <div className="flex-shrink-0 h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center mt-1">
                                            <Users className="text-purple-600 h-4 w-4" />
                                        </div>
                                        <div className="ml-4">
                                            <h4 className="text-lg font-semibold text-gray-900">
                                                Partner Diskusi dengan Dokter
                                            </h4>
                                            <p className="text-gray-600">
                                                Gunakan hasil prediksi Machine
                                                Learning sebagai bahan diskusi
                                                yang berharga saat melakukan
                                                konsultasi dengan tenaga medis
                                                profesional.
                                            </p>
                                        </div>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Call to Action */}
                <section id="kontak" className="py-20 bg-white">
                    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="bg-purple-600 rounded-3xl p-8 md:p-16 text-center shadow-2xl relative overflow-hidden">
                            {/* Decorative Circles */}
                            <div className="absolute top-0 left-0 -mt-10 -ml-10 w-40 h-40 bg-white opacity-10 rounded-full"></div>
                            <div className="absolute bottom-0 right-0 -mb-10 -mr-10 w-40 h-40 bg-white opacity-10 rounded-full"></div>

                            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
                                Gratis Akses untuk Seluruh Pejuang MDR-TB
                            </h2>
                            <p className="text-purple-100 text-lg mb-10 max-w-2xl mx-auto">
                                Platform ini dikembangkan khusus untuk membantu
                                Anda memahami peluang kesembuhan secara mandiri.
                                Ambil kendali atas kesehatan Anda sekarang.
                            </p>
                            <div className="flex flex-col sm:flex-row justify-center gap-4">
                                <Link
                                    href="/lakukan-prediksi"
                                    className="px-8 py-4 bg-white text-purple-600 rounded-full font-bold hover:bg-gray-50 transition shadow-lg text-lg"
                                >
                                    Mulai Prediksi Gratis
                                </Link>
                                <a
                                    href="#fitur"
                                    className="px-8 py-4 bg-transparent border-2 border-white text-white rounded-full font-bold hover:bg-white/10 transition text-lg"
                                >
                                    Pelajari Cara Kerja
                                </a>
                            </div>
                            <p className="mt-6 text-sm text-purple-200">
                                *Sepenuhnya gratis untuk digunakan secara
                                mandiri oleh pasien dan keluarga sebagai sarana
                                edukasi.
                            </p>
                        </div>
                    </div>
                </section>

                <Footer />
            </div>
        </>
    );
}
