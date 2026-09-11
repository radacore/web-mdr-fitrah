import { Link } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import { Activity, Menu, X } from 'lucide-react';

interface NavbarProps {
    canLogin?: boolean;
    minimal?: boolean;
}

export default function Navbar({ canLogin = true, minimal = false }: NavbarProps) {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            if (window.scrollY > 10) {
                setIsScrolled(true);
            } else {
                setIsScrolled(false);
            }
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const scrollToTop = () => {
        if (window.location.pathname === '/') {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            window.location.href = '/';
        }
    };

    return (
        <nav
            className={`fixed w-full z-50 transition-all duration-300 ${isScrolled || window.location.pathname !== '/'
                ? 'bg-white/90 backdrop-blur-md border-b border-gray-100 shadow-md'
                : 'bg-transparent'
                }`}
            id="navbar"
        >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-20">
                    {/* Logo */}
                    <div
                        className="flex-shrink-0 flex items-center gap-2 cursor-pointer"
                        onClick={scrollToTop}
                    >
                        <div className="bg-purple-600 p-2 rounded-lg">
                            <Activity className="text-white h-6 w-6" />
                        </div>
                        <span className="font-bold text-xl tracking-tight text-gray-900">
                            SRI<span className="text-purple-600">-Predict</span> MDR-TB
                        </span>
                    </div>

                    {/* Desktop Menu */}
                    <div className="hidden md:flex space-x-8 items-center">
                        {!minimal && (
                            <>
                                <Link href="/#solusi" className="text-gray-600 hover:text-purple-600 font-medium transition">Solusi</Link>
                                <Link href="/#fitur" className="text-gray-600 hover:text-purple-600 font-medium transition">Teknologi</Link>
                                <Link href="/#manfaat" className="text-gray-600 hover:text-purple-600 font-medium transition">Manfaat</Link>
                            </>
                        )}

                        {canLogin && (
                            <Link href={route('login')} className="text-gray-600 hover:text-purple-600 font-medium transition">
                                Login
                            </Link>
                        )}

                        {!minimal && (
                            <Link
                                href="/lakukan-prediksi"
                                className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-2.5 rounded-full font-medium transition shadow-lg shadow-purple-500/30 flex items-center gap-1"
                            >
                                Mulai Prediksi &rarr;
                            </Link>
                        )}
                    </div>

                    {/* Mobile Menu Button */}
                    <div className="md:hidden flex items-center">
                        <button
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            className="text-gray-600 hover:text-gray-900 focus:outline-none"
                        >
                            {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Menu Panel */}
            {!minimal && (
                <div className={`${isMobileMenuOpen ? 'block' : 'hidden'} md:hidden bg-white border-t border-gray-100 absolute w-full`}>
                    <div className="px-4 pt-2 pb-6 space-y-1 shadow-lg">
                        <Link href="/#solusi" onClick={() => setIsMobileMenuOpen(false)} className="block px-3 py-3 text-base font-medium text-gray-700 hover:text-purple-600 hover:bg-purple-50 rounded-md">Solusi</Link>
                        <Link href="/#fitur" onClick={() => setIsMobileMenuOpen(false)} className="block px-3 py-3 text-base font-medium text-gray-700 hover:text-purple-600 hover:bg-purple-50 rounded-md">Teknologi</Link>
                        <Link href="/#manfaat" onClick={() => setIsMobileMenuOpen(false)} className="block px-3 py-3 text-base font-medium text-gray-700 hover:text-purple-600 hover:bg-purple-50 rounded-md">Manfaat</Link>
                        <Link href="/lakukan-prediksi" className="block px-3 py-3 text-base font-medium text-purple-600 font-bold">
                            Mulai Prediksi Gratis
                        </Link>
                    </div>
                </div>
            )}
        </nav>
    );
}
