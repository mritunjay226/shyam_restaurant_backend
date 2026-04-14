import { Sidebar } from "@/components/Sidebar";
import { Topbar } from "@/components/Topbar";
import { BottomNav } from "@/components/BottomNav";
import { RoleGuard } from "@/components/RoleGuard";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen w-full bg-[#F3F4F8] overflow-x-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0 lg:pl-[240px]">
        <Topbar />
        <main className="flex-1 pb-20 lg:pb-0 w-full min-w-0">
          <RoleGuard>{children}</RoleGuard>
        </main>
        <BottomNav />
      </div>
    </div>
  );
}
