import { ReactNode, useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import TopNav from "./TopNav";
import BottomNav from "./BottomNav";
import DesktopSidebar from "./DesktopSidebar";
import RightRail from "./RightRail";
import { DetailPanelProvider } from "./DetailPanel";
import Onboarding from "@/components/Onboarding";
import CommandPalette from "@/components/CommandPalette";

// Routes that already ship their own list + conversation split view
const FULL_WIDTH_ROUTES = ["/chat", "/messages", "/admin", "/resources", "/agenda"];

const AppLayout = ({ children }: { children: ReactNode }) => {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => {
    const done = localStorage.getItem("onboarding-done");
    if (!done) setShowOnboarding(true);
  }, []);

  const fullWidth = FULL_WIDTH_ROUTES.some((r) => pathname.startsWith(r));

  return (
    <DetailPanelProvider>
      <div className="min-h-[100dvh] bg-background transition-colors duration-300">
        {showOnboarding && <Onboarding onComplete={() => setShowOnboarding(false)} />}
        <CommandPalette />
        <TopNav />
        <DesktopSidebar />
        <main className="pt-14 pb-[5rem] md:pb-0 md:pl-16 lg:pl-60">
          <div className="mx-auto w-full max-w-[100rem] px-4 md:px-6 py-5 flex gap-6 items-start">
            <div className={fullWidth ? "flex-1 min-w-0" : "flex-1 min-w-0 max-w-4xl mx-auto xl:mx-0"}>
              {children}
            </div>
            {!fullWidth && <RightRail />}
          </div>
        </main>
        <BottomNav />
      </div>
    </DetailPanelProvider>
  );
};

export default AppLayout;
