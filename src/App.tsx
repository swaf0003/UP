import { lazy, Suspense } from "react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { Loader2 } from "lucide-react";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ChatThemeProvider } from "@/contexts/ChatThemeContext";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import AppLayout from "@/components/layout/AppLayout";
import PageTransition from "@/components/PageTransition";

const HomePage = lazy(() => import("@/pages/HomePage"));
const ExplorePage = lazy(() => import("@/pages/ExplorePage"));
const ChatPage = lazy(() => import("@/pages/ChatPage"));
const ProfilePage = lazy(() => import("@/pages/ProfilePage"));
const ResourcesPage = lazy(() => import("@/pages/ResourcesPage"));
const TutoringPage = lazy(() => import("@/pages/TutoringPage"));
const SettingsPage = lazy(() => import("@/pages/SettingsPage"));
const UnionPage = lazy(() => import("@/pages/UnionPage"));
const MessagesPage = lazy(() => import("@/pages/MessagesPage"));
const AdminPage = lazy(() => import("@/pages/AdminPage"));
const AgendaPage = lazy(() => import("@/pages/AgendaPage"));
const UserProfilePage = lazy(() => import("@/pages/UserProfilePage"));
const OAuthConsent = lazy(() => import("@/pages/OAuthConsent"));
const ResetPasswordPage = lazy(() => import("@/pages/ResetPasswordPage"));
const NotFound = lazy(() => import("@/pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function RouteFallback() {
  return (
    <div className="flex items-center justify-center min-h-[40vh]">
      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
    </div>
  );
}

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <Suspense fallback={<RouteFallback />}>
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<PageTransition><HomePage /></PageTransition>} />
          <Route path="/explore" element={<PageTransition><ExplorePage /></PageTransition>} />
          <Route path="/chat" element={<PageTransition><ChatPage /></PageTransition>} />
          <Route path="/profile" element={<PageTransition><ProfilePage /></PageTransition>} />
          <Route path="/resources" element={<PageTransition><ResourcesPage /></PageTransition>} />
          <Route path="/tutoring" element={<PageTransition><TutoringPage /></PageTransition>} />
          <Route path="/union" element={<PageTransition><UnionPage /></PageTransition>} />
          <Route path="/messages" element={<PageTransition><MessagesPage /></PageTransition>} />
          <Route path="/messages/:contactId" element={<PageTransition><MessagesPage /></PageTransition>} />
          <Route path="/settings" element={<PageTransition><SettingsPage /></PageTransition>} />
          <Route path="/agenda" element={<PageTransition><AgendaPage /></PageTransition>} />
          <Route path="/admin" element={<PageTransition><AdminPage /></PageTransition>} />
          <Route path="/user/:userId" element={<PageTransition><UserProfilePage /></PageTransition>} />
          <Route path="/.lovable/oauth/consent" element={<PageTransition><OAuthConsent /></PageTransition>} />
          <Route path="*" element={<PageTransition><NotFound /></PageTransition>} />
        </Routes>
      </AnimatePresence>
    </Suspense>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <ChatThemeProvider>
        <TooltipProvider>
          <Sonner />
          <BrowserRouter>
            <AuthProvider>
              <Routes>
                <Route
                  path="/reset-password"
                  element={
                    <Suspense fallback={<RouteFallback />}>
                      <ResetPasswordPage />
                    </Suspense>
                  }
                />
                <Route
                  path="*"
                  element={
                    <ProtectedRoute>
                      <AppLayout>
                        <AnimatedRoutes />
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />
              </Routes>
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </ChatThemeProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
