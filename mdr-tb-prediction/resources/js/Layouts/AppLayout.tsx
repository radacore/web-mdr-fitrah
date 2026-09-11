import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/ShadcnComponents/ui/sidebar";
import { AppSidebar } from "@/ShadcnComponents/app-sidebar";
import { Separator } from "@/ShadcnComponents/ui/separator";
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/ShadcnComponents/ui/breadcrumb";
import { Toaster } from "@/ShadcnComponents/ui/sonner";
import { Fragment, PropsWithChildren, ReactNode } from "react";

interface Props extends PropsWithChildren {
    header?: ReactNode;
    breadcrumbs?: Array<{ label: string; href?: string }>;
}

export default function AppLayout({ children, header, breadcrumbs }: Props) {
    return (
        <SidebarProvider>
            <AppSidebar />
            <SidebarInset>
                <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
                    <SidebarTrigger className="-ml-1" />
                    <Separator orientation="vertical" className="mr-2 h-4" />
                    {breadcrumbs && breadcrumbs.length > 0 ? (
                        <Breadcrumb>
                            <BreadcrumbList>
                                {breadcrumbs.map((crumb, index) => (
                                    <Fragment key={index}>
                                        <BreadcrumbItem>
                                            {index < breadcrumbs.length - 1 ? (
                                                <BreadcrumbLink href={crumb.href}>{crumb.label}</BreadcrumbLink>
                                            ) : (
                                                <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                                            )}
                                        </BreadcrumbItem>
                                        {index < breadcrumbs.length - 1 && <BreadcrumbSeparator />}
                                    </Fragment>
                                ))}
                            </BreadcrumbList>
                        </Breadcrumb>
                    ) : header ? (
                        <div className="flex-1">{header}</div>
                    ) : null}
                </header>
                <main className="flex-1 p-4 md:p-6">{children}</main>
            </SidebarInset>
            <Toaster richColors position="top-right" />
        </SidebarProvider>
    );
}
