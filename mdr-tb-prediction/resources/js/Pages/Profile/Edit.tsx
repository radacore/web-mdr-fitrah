import AppLayout from '@/Layouts/AppLayout';
import { Badge } from '@/ShadcnComponents/ui/badge';
import { Head } from '@inertiajs/react';
import UpdatePasswordForm from './Partials/UpdatePasswordForm';
import UpdateProfileInformationForm from './Partials/UpdateProfileInformationForm';

interface Props {
    user: { id: number; name: string; email: string; role: string };
    roleLabel: string;
}

export default function Edit({ user, roleLabel }: Props) {
    return (
        <AppLayout breadcrumbs={[{ label: 'Profil' }]}>
            <Head title="Profil" />

            <div className="mx-auto max-w-2xl space-y-6">
                <div>
                    <h1 className="text-2xl font-semibold">Profil</h1>
                    <p className="text-sm text-muted-foreground">
                        Kelola informasi akun dan kata sandi Anda.
                    </p>
                    <Badge variant="secondary" className="mt-2">
                        {roleLabel}
                    </Badge>
                </div>

                <UpdateProfileInformationForm user={user} />
                <UpdatePasswordForm />
            </div>
        </AppLayout>
    );
}
