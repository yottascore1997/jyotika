import Sidebar from "./Sidebar";
import TopBar from "./TopBar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-content-bg">
      <Sidebar />
      <main className="ml-[260px] min-h-screen bg-content-bg p-7">
        <TopBar />
        <div className="text-content-text">{children}</div>
      </main>
    </div>
  );
}
