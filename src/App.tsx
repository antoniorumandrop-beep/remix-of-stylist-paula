import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LanguageProvider } from "@/i18n/LanguageContext";
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
import NotFound from "./pages/NotFound";
import { AppShell } from "./components/AppShell";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Welcome />} />
            <Route path="/login" element={<Login />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/app" element={<AppShell />}>
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
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
