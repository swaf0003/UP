import { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import TopNav from "./TopNav";
import BottomNav from "./BottomNav";
import DesktopSidebar from "./DesktopSidebar";
import CommandPalette from "@/components/CommandPalette";
import { cn } from "@/lib/utils";

interface AppLayoutProps {
  children: ReactNode;
}

const AppLayout = ({ children }: AppLayoutProps) => {
  const { pathname } = useLocation();
  const isFullWidth =
    pathname.startsWith("/chat") ||
    pathname.startsWith("/messages") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/resources") ||
    pathname.startsWith("/agenda") ||
    pathname.startsWith("/tutoring");

  return (
    <div className="min-h-screen bg-background relative overflow-x-clip">
      <TopNav />
      <DesktopSidebar />
      <CommandPalette />
      <main className="pt-14 pb-[4.5rem] md:pb-0 md:pl-16 lg:pl-60 min-h-screen">
        <div
          className={cn(
            "px-4 sm:px-6 lg:px-8 py-5 mx-auto",
            isFullWidth ? "max-w-[90rem]" : "max-w-5xl"
          )}
        >
          {children}
        </div>
      </main>
      <BottomNav />
    </div>
  );
};

export default AppLayout;
