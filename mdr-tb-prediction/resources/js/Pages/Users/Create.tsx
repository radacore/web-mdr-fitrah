import { Role } from '@/types';
import { UserForm } from './Partials/UserForm';

export default function Create({ roles }: { roles: Record<Role, string> }) {
    return <UserForm roles={roles} />;
}
