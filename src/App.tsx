import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LanguageProvider } from "@/i18n/LanguageContext";
import { BackendProvider } from "@/lib/backend/BackendProvider";
import { RequireAuth } from "@/components/RequireAuth";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import Welcome from "./pages/Welcome";
import Login from "./pages/Login";
import Onboarding from "./pages/Onboarding";
import ForYou from "./pages/ForYou";
import SearchPage from "./pages/SearchPage";
import Saved from "./pages/Saved";
import Profile from "./pages/Profile";
import BrandPage from "./pages/BrandPage";
import ProductDetail from "./pages/ProductDetail";
import CollectionDetail from "./pages/CollectionDetail";
import Alerts from "./pages/Alerts";
import BuildYourStyle from "./pages/BuildYourStyle";
import FittingRoom from "./pages/FittingRoom";
import ImportProducts from "./pages/ImportProducts";
import NotFound from "./pages/NotFound";
import { AppShell } from "./components/AppShell";

const App = () => (
  <ErrorBoundary>
    <BackendProvider>
      <LanguageProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Welcome />} />
              <Route path="/login" element={<Login />} />
              <Route path="/onboarding" element={<RequireAuth><Onboarding /></RequireAuth>} />
              <Route path="/app" element={<RequireAuth><AppShell /></RequireAuth>}>
                <Route index element={<Navigate to="/app/search" replace />} />
                <Route path="for-you" element={<ForYou />} />
                <Route path="search" element={<SearchPage />} />
                <Route path="saved" element={<Saved />} />
                <Route path="profile" element={<Profile />} />
                <Route path="brand/:id" element={<BrandPage />} />
                <Route path="product/:id" element={<ProductDetail />} />
                <Route path="collection/:id" element={<CollectionDetail />} />
                <Route path="alerts" element={<Alerts />} />
                <Route path="build-your-style" element={<BuildYourStyle />} />
                <Route path="fitting-room" element={<FittingRoom />} />
              </Route>
              {/* Brand-side tooling, not linked from the app's navigation. */}
              <Route path="/admin/import" element={<RequireAuth><ImportProducts /></RequireAuth>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </LanguageProvider>
    </BackendProvider>
  </ErrorBoundary>
);

export default App;
