import { Head, Link, useForm } from "@inertiajs/react";
import { FormEventHandler } from "react";
import { Button } from "@/ShadcnComponents/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/ShadcnComponents/ui/card";
import { Input } from "@/ShadcnComponents/ui/input";
import { Label } from "@/ShadcnComponents/ui/label";
import { Activity } from "lucide-react";

export default function Login({
    status,
    canResetPassword,
}: {
    status?: string;
    canResetPassword: boolean;
}) {
    const { data, setData, post, processing, errors, reset } = useForm({
        email: "",
        password: "",
        remember: false,
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        post(route("login"), {
            onFinish: () => reset("password"),
        });
    };

    return (
        <>
            <Head title="Login" />

            <div className="flex min-h-svh">
                {/* Left Panel - Lung Image with Purple Overlay */}
                <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
                    {/* Background Image */}
                    <img
                        src="/images/lungs-bg.png"
                        alt="Medical Lungs Illustration"
                        className="absolute inset-0 w-full h-full object-cover"
                    />
                    {/* Dark Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-900/80 via-purple-800/60 to-violet-900/80" />

                    {/* Content Over Image */}
                    <div className="relative z-10 flex flex-col justify-between p-12 text-white w-full">
                        {/* Logo */}
                        <div className="flex items-center gap-3">
                            <div className="bg-white/20 backdrop-blur-sm p-2 rounded-xl border border-white/10">
                                <Activity className="h-6 w-6 text-white" />
                            </div>
                            <span className="text-xl font-bold tracking-tight">
                                SRI-Predict MDR-TB
                            </span>
                        </div>

                        {/* Center Text */}
                        <div className="max-w-md">
                            <h1 className="text-4xl font-bold leading-tight mb-4">
                                Prediksi Cerdas untuk Pengobatan MDR-TB
                            </h1>
                            <p className="text-purple-200 text-lg leading-relaxed">
                                Sistem berbasis Machine Learning yang membantu
                                tenaga medis menganalisis dan memprediksi
                                keberhasilan pengobatan Multi-Drug Resistant
                                Tuberculosis.
                            </p>
                        </div>

                        {/* Bottom Stats */}
                        <div className="flex gap-8">
                            <div>
                                <div className="text-3xl font-bold">ML</div>
                                <div className="text-sm text-purple-300">
                                    Powered
                                </div>
                            </div>
                            <div className="w-px bg-white/20" />
                            <div>
                                <div className="text-3xl font-bold">5-Fold</div>
                                <div className="text-sm text-purple-300">
                                    Cross Validation
                                </div>
                            </div>
                            <div className="w-px bg-white/20" />
                            <div>
                                <div className="text-3xl font-bold">
                                    Real-time
                                </div>
                                <div className="text-sm text-purple-300">
                                    Prediction
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Panel - Login Form */}
                <div className="flex w-full lg:w-1/2 flex-col items-center justify-center gap-6 bg-gray-50 p-6 md:p-10">
                    <div className="flex w-full max-w-sm flex-col gap-6">
                        {/* Mobile Logo (hidden on lg) */}
                        <div className="flex items-center gap-2 self-center font-medium lg:hidden">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-600 text-white">
                                <Activity className="h-5 w-5" />
                            </div>
                            <span className="text-lg font-bold">SRI-Predict MDR-TB</span>
                        </div>

                        <Card className="shadow-xl border-0">
                            <CardHeader className="text-center pb-2">
                                <CardTitle className="text-2xl font-bold">
                                    Selamat Datang
                                </CardTitle>
                                <CardDescription className="text-base">
                                    Masuk ke akun Anda untuk melanjutkan
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={submit}>
                                    <div className="grid gap-5">
                                        {status && (
                                            <div className="p-3 rounded-lg bg-green-50 text-green-600 text-sm border border-green-100">
                                                {status}
                                            </div>
                                        )}
                                        <div className="grid gap-5">
                                            <div className="grid gap-2">
                                                <Label
                                                    htmlFor="email"
                                                    className="text-sm font-medium"
                                                >
                                                    Email
                                                </Label>
                                                <Input
                                                    id="email"
                                                    type="email"
                                                    placeholder="nama@email.com"
                                                    value={data.email}
                                                    onChange={(e) =>
                                                        setData(
                                                            "email",
                                                            e.target.value,
                                                        )
                                                    }
                                                    autoComplete="username"
                                                    autoFocus
                                                    required
                                                    className="h-11"
                                                />
                                                {errors.email && (
                                                    <p className="text-sm text-destructive">
                                                        {errors.email}
                                                    </p>
                                                )}
                                            </div>
                                            <div className="grid gap-2">
                                                <div className="flex items-center">
                                                    <Label
                                                        htmlFor="password"
                                                        className="text-sm font-medium"
                                                    >
                                                        Password
                                                    </Label>
                                                    {canResetPassword && (
                                                        <Link
                                                            href={route(
                                                                "password.request",
                                                            )}
                                                            className="ml-auto text-sm text-purple-600 hover:text-purple-700 underline-offset-4 hover:underline transition"
                                                        >
                                                            Lupa password?
                                                        </Link>
                                                    )}
                                                </div>
                                                <Input
                                                    id="password"
                                                    type="password"
                                                    value={data.password}
                                                    onChange={(e) =>
                                                        setData(
                                                            "password",
                                                            e.target.value,
                                                        )
                                                    }
                                                    autoComplete="current-password"
                                                    required
                                                    className="h-11"
                                                />
                                                {errors.password && (
                                                    <p className="text-sm text-destructive">
                                                        {errors.password}
                                                    </p>
                                                )}
                                            </div>
                                            <Button
                                                type="submit"
                                                className="w-full h-11 text-base font-semibold"
                                                disabled={processing}
                                            >
                                                {processing
                                                    ? "Memproses..."
                                                    : "Masuk"}
                                            </Button>
                                        </div>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>

                        <p className="text-center text-sm text-gray-500">
                            Kembali ke{" "}
                            <Link
                                href="/"
                                className="text-purple-600 hover:text-purple-700 font-medium hover:underline transition"
                            >
                                Halaman Utama
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </>
    );
}
