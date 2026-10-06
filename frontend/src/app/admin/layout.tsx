import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { ProtectedRoute } from "@/components/auth/protected-route";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute allowedRoles={["owner", "staff", "trainer"]} showHeader={false}>
      <SidebarProvider>
        <AdminSidebar />
        <SidebarInset className="min-h-svh bg-muted/30">
          <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur">
            <SidebarTrigger />
            <div>
              <p className="text-sm font-semibold">Site Fitness</p>
              <p className="text-xs text-muted-foreground">Admin workspace</p>
            </div>
          </header>
          {children}
        </SidebarInset>
      </SidebarProvider>
    </ProtectedRoute>
  );
}
