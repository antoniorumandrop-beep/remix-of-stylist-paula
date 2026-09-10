import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LanguageProvider } from "@/i18n/LanguageContext";
import { BackendProvider } from "@/lib/backend/BackendProvider";
import { RequireAuth } from "@/components/RequireAuth";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { RequireProfile } from "@/components/RequireProfile";
import Welcome from "./pages/Welcome";
import Login from "./pages/Login";
import { AppShell } from "./components/AppShell";

/**
 * Everything past the front door is loaded when it is first opened.
 *
 * The whole application used to arrive in one 550 kB bundle, which is
 * paid for on the first visit, over mobile data, by someone who has not
 * yet decided whether she wants the app. `Welcome` and `Login` stay in
 * the main chunk because they are the first thing she sees.
 */
const Onboarding = lazy(() => import("./pages/Onboarding"));
const ForYou = lazy(() => import("./pages/ForYou"));
const SearchPage = lazy(() => import("./pages/SearchPage"));
const Saved = lazy(() => import("./pages/Saved"));
const Profile = lazy(() => import("./pages/Profile"));
const BrandPage = lazy(() => import("./pages/BrandPage"));
const ProductDetail = lazy(() => import("./pages/ProductDetail"));
const CollectionDetail = lazy(() => import("./pages/CollectionDetail"));
const Alerts = lazy(() => import("./pages/Alerts"));
const BuildYourStyle = lazy(() => import("./pages/BuildYourStyle"));
const FittingRoom = lazy(() => import("./pages/FittingRoom"));
const ImportProducts = lazy(() => import("./pages/ImportProducts"));
const AddProduct = lazy(() => import("./pages/AddProduct"));
const NotFound = lazy(() => import("./pages/NotFound"));

const App = () => (
  <ErrorBoundary>
    <BackendProvider>
      <LanguageProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          {/*
          `v7_startTransition` is what makes lazy routes safe here. Without it
          React Router applies a navigation as a synchronous state update, a
          lazily-loaded route suspends inside that update, and React throws
          "a component suspended while responding to synchronous input" —
          which the error boundary then catches, replacing the whole app with
          the crash screen. Measured, not guessed: that is exactly what
          happened when the routes below were first made lazy.
        */}
        <BrowserRouter future={{ v7_startTransition: true }}>
              <Routes>
                <Route path="/" element={<Welcome />} />
                <Route path="/login" element={<Login />} />
                <Route path="/onboarding" element={<RequireAuth><Onboarding /></RequireAuth>} />
                <Route path="/app" element={<RequireAuth><RequireProfile><AppShell /></RequireProfile></RequireAuth>}>
                  <Route index element={<Navigate to="/app/search" replace />} />
                  <Route path="for-you" element={<ForYou />} />
                  <Route path="search" element={<SearchPage />} />
                  <Route path="saved" element={<Saved />} />
                  <Route path="profile" element={<Profile />} />
                  <Route path="brand/:id" element={<BrandPage />} />
                  <Route path="product/:id" element={<ProductDetail />} />
                  <Route path="collection/:id" element={<CollectionDetail />} />
                  <Route path="alerts" element={<Alerts />} />
                  <Route path="add" element={<AddProduct />} />
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
