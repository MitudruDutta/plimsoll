"use client";

import React from "react";
import { ConfigProvider } from "antd";
import enUS from "antd/locale/en_US";
import { HeaderProvider } from "@/context/HeaderContext";
import { SupabaseAuthProvider } from "@/context/SupabaseAuthContext";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ConfigProvider
      locale={enUS}
      theme={{
        token: {
          colorPrimary: "#2563EB",
          colorInfo: "#2563EB",
          fontFamily: "var(--font-sans), 'Geist', 'Inter', system-ui, sans-serif",
          borderRadius: 10,
        },
      }}
    >
      <SupabaseAuthProvider>
        <HeaderProvider>
          {children}
        </HeaderProvider>
      </SupabaseAuthProvider>
    </ConfigProvider>
  );
}
