"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Session, User } from "@supabase/supabase-js";

import { getSupabaseClient, supabaseConfigured } from "../services/supabaseClient";
import { setApiAuthToken } from "../services/api";
import { setDocumentAuthToken } from "../services/documentApi";

export interface SupabaseAuthValue {
  session: Session | null;
  user: User | null;
  isLoaded: boolean;
  isSignedIn: boolean;
  signInWithPassword: (
    email: string,
    password: string,
  ) => Promise<{ error: string | null }>;
  signUpWithPassword: (
    email: string,
    password: string,
    metadata?: Record<string, unknown>,
  ) => Promise<{ error: string | null; needsEmailConfirm: boolean }>;
  signInWithOAuth: (
    provider: "google" | "github",
    redirectTo?: string,
  ) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  configured: boolean;
}

const AuthContext = createContext<SupabaseAuthValue | null>(null);

export const SupabaseAuthProvider: React.FC<React.PropsWithChildren> = ({
  children,
}) => {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoaded, setIsLoaded] = useState<boolean>(!supabaseConfigured);

  // Push the access token into the axios clients whenever it changes
  // so all REST calls carry an `Authorization: Bearer <jwt>` header
  // that the FastAPI backend's Supabase verifier accepts.
  useEffect(() => {
    const token = session?.access_token ?? null;
    setApiAuthToken(token);
    setDocumentAuthToken(token);
  }, [session?.access_token]);

  useEffect(() => {
    if (!supabaseConfigured) return;
    const client = getSupabaseClient();
    let cancelled = false;

    client.auth
      .getSession()
      .then(({ data }) => {
        if (cancelled) return;
        setSession(data.session ?? null);
      })
      .finally(() => {
        if (!cancelled) setIsLoaded(true);
      });

    const { data: sub } = client.auth.onAuthStateChange((_event, next) => {
      setSession(next ?? null);
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signInWithPassword = useCallback(
    async (email: string, password: string) => {
      if (!supabaseConfigured)
        return { error: "Supabase is not configured." };
      const { error } = await getSupabaseClient().auth.signInWithPassword({
        email,
        password,
      });
      return { error: error?.message ?? null };
    },
    [],
  );

  const signUpWithPassword = useCallback(
    async (
      email: string,
      password: string,
      metadata?: Record<string, unknown>,
    ) => {
      if (!supabaseConfigured)
        return { error: "Supabase is not configured.", needsEmailConfirm: false };
      const { data, error } = await getSupabaseClient().auth.signUp({
        email,
        password,
        options: { data: metadata },
      });
      return {
        error: error?.message ?? null,
        // If session is null but user is set, Supabase requires email confirmation.
        needsEmailConfirm: !error && !data.session && !!data.user,
      };
    },
    [],
  );

  const signInWithOAuth = useCallback(
    async (provider: "google" | "github", redirectTo?: string) => {
      if (!supabaseConfigured)
        return { error: "Supabase is not configured." };
      const { error } = await getSupabaseClient().auth.signInWithOAuth({
        provider,
        options: {
          redirectTo:
            redirectTo ??
            (typeof window !== "undefined"
              ? `${window.location.origin}/port`
              : undefined),
        },
      });
      return { error: error?.message ?? null };
    },
    [],
  );

  const signOut = useCallback(async () => {
    if (!supabaseConfigured) return;
    await getSupabaseClient().auth.signOut();
  }, []);

  const value = useMemo<SupabaseAuthValue>(
    () => ({
      session,
      user: session?.user ?? null,
      isLoaded,
      isSignedIn: !!session?.user,
      signInWithPassword,
      signUpWithPassword,
      signInWithOAuth,
      signOut,
      configured: supabaseConfigured,
    }),
    [
      session,
      isLoaded,
      signInWithPassword,
      signUpWithPassword,
      signInWithOAuth,
      signOut,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useSupabaseAuth(): SupabaseAuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error(
      "useSupabaseAuth must be used inside <SupabaseAuthProvider>.",
    );
  }
  return ctx;
}

/**
 * Lightweight helper for code that just needs to know "am I signed in
 * and what's my email?" without subscribing to the full auth surface.
 */
export function useCurrentUser() {
  const { user, isLoaded, isSignedIn } = useSupabaseAuth();
  const email = user?.email ?? null;
  const fullName =
    (user?.user_metadata?.full_name as string | undefined) ||
    (user?.user_metadata?.name as string | undefined) ||
    null;
  const avatarUrl =
    (user?.user_metadata?.avatar_url as string | undefined) || null;
  return { user, email, fullName, avatarUrl, isLoaded, isSignedIn };
}
