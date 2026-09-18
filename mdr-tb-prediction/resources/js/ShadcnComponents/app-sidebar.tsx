import { Avatar, AvatarFallback } from '@/ShadcnComponents/ui/avatar';
import { Badge } from '@/ShadcnComponents/ui/badge';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/ShadcnComponents/ui/dropdown-menu';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarRail,
} from '@/ShadcnComponents/ui/sidebar';
import { PageProps } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import {
    Activity,
    BarChart3,
    ChevronUp,
    Database,
    FlaskConical,
    History,
    LayoutDashboard,
    LogOut,
    Scale,
    Stethoscope,
    User,
    Users,
} from 'lucide-react';

interface MenuItem {
    title: string;
    icon: typeof LayoutDashboard;
    href: string;
    routeName: string;
}

/** Menu yang dapat diakses seluruh pengguna terautentikasi */
const menuUmum: MenuItem[] = [
    {
        title: 'Dashboard',
        icon: LayoutDashboard,
        href: '/dashboard',
        routeName: 'dashboard',
    },
    {
        title: 'Klasifikasi',
        icon: Activity,
        href: '/prediction',
        routeName: 'prediction.index',
    },
    {
        title: 'Riwayat',
        icon: History,
        href: '/prediction/history',
        routeName: 'prediction.history',
    },
];

/** Menu evaluasi model yang dapat diakses seluruh pengguna terautentikasi */
const menuEvaluasi: MenuItem[] = [
    {
        title: 'Evaluasi Model',
        icon: BarChart3,
        href: '/prediction/statistics',
        routeName: 'prediction.statistics',
    },
];

/**
 * Skenario pengujian melatih ulang model beberapa kali, sehingga hanya
 * disediakan bagi admin (Bab III.C.5).
 */
const menuPengujian: MenuItem[] = [
    {
        title: 'Pengujian SMOTE',
        icon: Scale,
        href: '/prediction/compare-smote',
        routeName: 'prediction.compare-smote',
    },
    {
        title: 'Skenario Pengujian',
        icon: FlaskConical,
        href: '/prediction/test-scenarios',
        routeName: 'prediction.test-scenarios',
    },
];

/** Menu yang hanya dapat diakses admin */
const menuAdmin: MenuItem[] = [
    {
        title: 'Data Rekam Medis',
        icon: Database,
        href: '/training-data',
        routeName: 'training-data.index',
    },
    {
        title: 'Manajemen Akun',
        icon: Users,
        href: '/users',
        routeName: 'users.index',
    },
];

function inisial(nama: string): string {
    return nama
        .split(' ')
        .map((bagian) => bagian[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
}

function MenuGrup({ label, items }: { label: string; items: MenuItem[] }) {
    return (
        <SidebarGroup>
            <SidebarGroupLabel>{label}</SidebarGroupLabel>
            <SidebarGroupContent>
                <SidebarMenu>
                    {items.map((item) => (
                        <SidebarMenuItem key={item.routeName}>
                            <SidebarMenuButton
                                asChild
                                isActive={
                                    route().current(item.routeName) ||
                                    route().current(item.routeName + '.*')
                                }
                                tooltip={item.title}
                            >
                                <Link href={item.href}>
                                    <item.icon />
                                    <span>{item.title}</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    ))}
                </SidebarMenu>
            </SidebarGroupContent>
        </SidebarGroup>
    );
}

export function AppSidebar() {
    const { auth } = usePage<PageProps>().props;
    const user = auth.user;

    return (
        <Sidebar collapsible="icon">
            <SidebarHeader className="border-b border-sidebar-border">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href="/dashboard">
                                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                                    <Stethoscope className="size-4" />
                                </div>
                                <div className="flex flex-col gap-0.5 leading-none">
                                    <span className="font-semibold">
                                        Klasifikasi MDR-TB
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                        SMOTE &amp; Random Forest
                                    </span>
                                </div>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <MenuGrup label="Utama" items={menuUmum} />
                <MenuGrup
                    label="Evaluasi"
                    items={
                        user.is_admin
                            ? [...menuEvaluasi, ...menuPengujian]
                            : menuEvaluasi
                    }
                />
                {user.is_admin && <MenuGrup label="Administrasi" items={menuAdmin} />}
            </SidebarContent>

            <SidebarFooter className="border-t border-sidebar-border">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <SidebarMenuButton
                                    size="lg"
                                    className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                                >
                                    <Avatar className="h-8 w-8 rounded-lg">
                                        <AvatarFallback className="rounded-lg bg-primary text-primary-foreground">
                                            {inisial(user.name)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="grid flex-1 text-left text-sm leading-tight">
                                        <span className="truncate font-semibold">
                                            {user.name}
                                        </span>
                                        <span className="truncate text-xs text-muted-foreground">
                                            {user.role_label}
                                        </span>
                                    </div>
                                    <ChevronUp className="ml-auto size-4" />
                                </SidebarMenuButton>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                                side="top"
                                align="end"
                                sideOffset={4}
                            >
                                <div className="px-2 py-1.5">
                                    <p className="truncate text-sm font-medium">
                                        {user.name}
                                    </p>
                                    <p className="truncate text-xs text-muted-foreground">
                                        {user.email}
                                    </p>
                                    <Badge variant="secondary" className="mt-1.5">
                                        {user.role_label}
                                    </Badge>
                                </div>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem asChild>
                                    <Link href={route('profile.edit')} className="gap-2">
                                        <User className="size-4" />
                                        Profil
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem asChild>
                                    <Link
                                        href={route('logout')}
                                        method="post"
                                        as="button"
                                        className="w-full gap-2 text-destructive"
                                    >
                                        <LogOut className="size-4" />
                                        Keluar
                                    </Link>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarFooter>
            <SidebarRail />
        </Sidebar>
    );
}
