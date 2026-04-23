"use client";

import React, { useEffect } from "react";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import { ClerkProvider, RedirectToSignIn, SignedIn, SignedOut, SignUp } from "@clerk/clerk-react";
import { ConfigProvider } from "antd";
import enUS from "antd/locale/en_US";

import { CommonHeader } from "../components/CommonHeader";
import { HeaderProvider } from "../context/HeaderContext";
import { AdminPage } from "../views/AdminPage";
import { DemoPage } from "../views/DemoPage";
import { DocumentUploadPage } from "../views/DocumentUploadPage";
import { PaymentPage } from "../views/PaymentPage";
import { PortSelectionPage } from "../views/PortSelectionPage";
import { SignInPage } from "../views/SignInPage";
import { UsersHome } from "../views/UsersHome";

const PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || "";

class ErrorBoundary extends React.Component<
  React.PropsWithChildren,
  { hasError: boolean; error: Error | null; errorInfo: React.ErrorInfo | null }
> {
  state = { hasError: false, error: null, errorInfo: null };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ error, errorInfo });
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 20, color: "#b91c1c" }}>
          <h1>Something went wrong.</h1>
          <details style={{ whiteSpace: "pre-wrap" }}>
            {this.state.error?.toString()}
            <br />
            {this.state.errorInfo?.componentStack}
          </details>
        </div>
      );
    }

    return this.props.children;
  }
}

function RouteTracker() {
  const location = useLocation();

  useEffect(() => {
    console.log("Route transition:", location.pathname);
  }, [location]);

  return null;
}

function ProtectedRoute({ children }: React.PropsWithChildren) {
  return (
    <>
      <SignedIn>{children}</SignedIn>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
    </>
  );
}

function MissingClerkKey() {
  return (
    <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-6">
      <section className="max-w-xl rounded-lg border border-white/10 bg-white/5 p-6">
        <h1 className="text-xl font-semibold">Missing Clerk publishable key</h1>
        <p className="mt-3 text-sm text-white/70">
          Set NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY in frontend1/.env.local, then restart the dev server.
        </p>
      </section>
    </main>
  );
}

function RoutedApp() {
  return (
    <ConfigProvider locale={enUS}>
      <HeaderProvider>
        <BrowserRouter>
          <CommonHeader />
          <RouteTracker />
          <Routes>
            <Route path="/" element={<Navigate to="/pay" replace />} />
            <Route path="/pay" element={<PaymentPage />} />
            <Route path="/usershome" element={<UsersHome />} />
            <Route path="/sign-in/*" element={<SignInPage />} />
            <Route
              path="/sign-up/*"
              element={
                <div style={{ display: "flex", justifyContent: "center", padding: 50 }}>
                  <SignUp routing="path" path="/sign-up" />
                </div>
              }
            />
            <Route
              path="/port"
              element={
                <ProtectedRoute>
                  <PortSelectionPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/demo"
              element={
                <ProtectedRoute>
                  <DemoPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/documents"
              element={
                <ProtectedRoute>
                  <DocumentUploadPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute>
                  <AdminPage />
                </ProtectedRoute>
              }
            />
          </Routes>
        </BrowserRouter>
      </HeaderProvider>
    </ConfigProvider>
  );
}

export default function ClientApp() {
  if (!PUBLISHABLE_KEY) {
    return <MissingClerkKey />;
  }

  return (
    <React.StrictMode>
      <ErrorBoundary>
        <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
          <RoutedApp />
        </ClerkProvider>
      </ErrorBoundary>
    </React.StrictMode>
  );
}
