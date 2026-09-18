import { Role } from '@/types';
import { UserForm } from './Partials/UserForm';

interface Props {
    roles: Record<Role, string>;
    user: { id: number; name: string; email: string; role: Role };
}

export default function Edit({ roles, user }: Props) {
    return <UserForm roles={roles} user={user} />;
}
