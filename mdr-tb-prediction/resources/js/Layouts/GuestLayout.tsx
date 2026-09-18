import { Card, CardContent } from '@/ShadcnComponents/ui/card';
import { Link } from '@inertiajs/react';
import { Activity } from 'lucide-react';
import { PropsWithChildren } from 'react';

/** Kerangka halaman untuk pengguna yang belum terautentikasi. */
export default function GuestLayout({ children }: PropsWithChildren) {
    return (
        <div className="flex min-h-svh flex-col items-center justify-center bg-muted/40 px-4 py-10">
            <Link
                href={route('login')}
                className="mb-6 flex items-center gap-3 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
                <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                    <Activity className="size-5" />
                </div>
                <div className="text-left">
                    <p className="font-semibold leading-tight">Klasifikasi MDR-TB</p>
                    <p className="text-xs text-muted-foreground">
                        SMOTE &amp; Random Forest
                    </p>
                </div>
            </Link>

            <Card className="w-full max-w-md">
                <CardContent className="pt-6">{children}</CardContent>
            </Card>
        </div>
    );
}
