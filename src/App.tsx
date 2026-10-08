import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ChatThemeProvider } from "@/contexts/ChatThemeContext";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import AppLayout from "@/components/layout/AppLayout";
import PageTransition from "@/components/PageTransition";
import HomePage from "@/pages/HomePage";
import ExplorePage from "@/pages/ExplorePage";
import ChatPage from "@/pages/ChatPage";
import ProfilePage from "@/pages/ProfilePage";
import ResourcesPage from "@/pages/ResourcesPage";
import SettingsPage from "@/pages/SettingsPage";
import UnionPage from "@/pages/UnionPage";
import MessagesPage from "@/pages/MessagesPage";
import AdminPage from "@/pages/AdminPage";
import AgendaPage from "@/pages/AgendaPage";
import UserProfilePage from "@/pages/UserProfilePage";
import OAuthConsent from "@/pages/OAuthConsent";
import ResetPasswordPage from "@/pages/ResetPasswordPage";
import NotFound from "./pages/NotFound";


const queryClient = new QueryClient();

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<PageTransition><HomePage /></PageTransition>} />
        <Route path="/explore" element={<PageTransition><ExplorePage /></PageTransition>} />
        <Route path="/chat" element={<PageTransition><ChatPage /></PageTransition>} />
        <Route path="/profile" element={<PageTransition><ProfilePage /></PageTransition>} />
        <Route path="/resources" element={<PageTransition><ResourcesPage /></PageTransition>} />
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
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <ChatThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/reset-password" element={<ResetPasswordPage />} />
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
