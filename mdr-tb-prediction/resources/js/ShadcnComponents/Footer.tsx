import { Activity, Twitter, Linkedin, Facebook } from "lucide-react";

export default function Footer() {
    return (
        <footer className="bg-gray-50 border-t border-gray-200 pt-16 pb-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
                    <div className="col-span-1 md:col-span-2">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="bg-purple-600 p-1.5 rounded-md">
                                <Activity className="text-white h-5 w-5" />
                            </div>
                            <span className="font-bold text-xl text-gray-900">SRI-Predict MDR-TB</span>
                        </div>
                        <p className="text-gray-500 max-w-xs mb-6">
                            Menyelamatkan nyawa melalui prediksi berbasis data.
                            Teknologi cerdas untuk masa depan eliminasi
                            Tuberkulosis.
                        </p>
                        <div className="flex space-x-4">
                            <a
                                href="#"
                                className="text-gray-400 hover:text-purple-600"
                            >
                                <Twitter className="h-5 w-5" />
                            </a>
                            <a
                                href="#"
                                className="text-gray-400 hover:text-purple-600"
                            >
                                <Linkedin className="h-5 w-5" />
                            </a>
                            <a
                                href="#"
                                className="text-gray-400 hover:text-purple-600"
                            >
                                <Facebook className="h-5 w-5" />
                            </a>
                        </div>
                    </div>
                    <div>
                        <h3 className="font-semibold text-gray-900 mb-4">
                            Fitur
                        </h3>
                        <ul className="space-y-3 text-gray-500 text-sm">
                            <li>
                                <a
                                    href="/lakukan-prediksi"
                                    className="hover:text-purple-600 transition"
                                >
                                    Prediksi MDR-TB
                                </a>
                            </li>
                            <li>
                                <a
                                    href="/login"
                                    className="hover:text-purple-600 transition"
                                >
                                    Riwayat Prediksi
                                </a>
                            </li>
                            <li>
                                <a
                                    href="/login"
                                    className="hover:text-purple-600 transition"
                                >
                                    Data Training
                                </a>
                            </li>
                            <li>
                                <a
                                    href="/login"
                                    className="hover:text-purple-600 transition"
                                >
                                    Statistik Model
                                </a>
                            </li>
                        </ul>
                    </div>
                    <div>
                        <h3 className="font-semibold text-gray-900 mb-4">
                            Informasi
                        </h3>
                        <ul className="space-y-3 text-gray-500 text-sm">
                            <li>
                                <a
                                    href="#metodologi"
                                    className="hover:text-purple-600 transition"
                                >
                                    Metodologi
                                </a>
                            </li>
                            <li>
                                <a
                                    href="#cara-kerja"
                                    className="hover:text-purple-600 transition"
                                >
                                    Cara Kerja
                                </a>
                            </li>
                            <li>
                                <a
                                    href="#"
                                    className="hover:text-purple-600 transition"
                                >
                                    Tentang MDR-TB
                                </a>
                            </li>
                            <li>
                                <a
                                    href="#"
                                    className="hover:text-purple-600 transition"
                                >
                                    Hubungi Kami
                                </a>
                            </li>
                        </ul>
                    </div>
                </div>
                <div className="border-t border-gray-200 pt-8 flex flex-col md:flex-row justify-between items-center text-sm text-gray-500">
                    <p>&copy; {new Date().getFullYear()} SRI-Predict MDR-TB. Hak cipta dilindungi.</p>
                    <div className="flex space-x-6 mt-4 md:mt-0">
                        <a href="#" className="hover:text-gray-900">
                            Kebijakan Privasi
                        </a>
                        <a href="#" className="hover:text-gray-900">
                            Syarat & Ketentuan
                        </a>
                    </div>
                </div>
            </div>
        </footer>
    );
}
