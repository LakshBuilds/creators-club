import type { Session } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode
} from "react";
import { clearSummary } from "./creatorScore";
import { createLogger } from "./logger";
import { supabase } from "./supabase";

const log = createLogger("session");

type OnboardingState = "unknown" | "needed" | "done";

const cacheKey = (uid: string) => `onboarding_v1:${uid}`;

async function getCachedOnboarding(uid: string): Promise<"done" | "needed" | null> {
  try {
    const v = await AsyncStorage.getItem(cacheKey(uid));
    if (v === "done" || v === "needed") return v;
    return null;
  } catch { return null; }
}

async function setCachedOnboarding(uid: string, state: "done" | "needed"): Promise<void> {
  try { await AsyncStorage.setItem(cacheKey(uid), state); } catch {}
}

async function clearCachedOnboarding(uid: string): Promise<void> {
  try { await AsyncStorage.removeItem(cacheKey(uid)); } catch {}
}

type Ctx = {
  session: Session | null;
  loading: boolean;
  onboarding: OnboardingState;
  refreshOnboarding: () => Promise<void>;
  signOut: () => Promise<void>;
};

const SessionContext = createContext<Ctx>({
  session: null,
  loading: true,
  onboarding: "unknown",
  refreshOnboarding: async () => {},
  signOut: async () => {}
});

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [onboarding, setOnboarding] = useState<OnboardingState>("unknown");

  const loadOnboarding = useCallback(async (userId: string) => {
    // Fast path: serve from local cache so returning users see no spinner.
    // A background query then silently refreshes the cache.
    const cached = await getCachedOnboarding(userId);
    if (cached !== null) {
      setOnboarding(cached);
      void (async () => {
        const { data } = await supabase
          .from("profiles")
          .select("onboarding_completed")
          .eq("id", userId)
          .maybeSingle();
        if (data) {
          const fresh: "done" | "needed" = data.onboarding_completed ? "done" : "needed";
          if (fresh !== cached) {
            setOnboarding(fresh);
            void setCachedOnboarding(userId, fresh);
          }
        }
      })();
      return;
    }

    // No cache yet (first launch / after account deletion) — query with
    // retry/timeout so a slow network doesn't spin forever.
    for (let attempt = 0; attempt < 2; attempt++) {
      const queryPromise = supabase
        .from("profiles")
        .select("onboarding_completed")
        .eq("id", userId)
        .maybeSingle();
      const timeoutPromise = new Promise<"timeout">((resolve) => {
        setTimeout(() => resolve("timeout"), 5_000);
      });
      const first = await Promise.race([queryPromise, timeoutPromise]);

      if (first !== "timeout") {
        const { data, error } = first;
        if (!error) {
          const state: "done" | "needed" = data?.onboarding_completed ? "done" : "needed";
          setOnboarding(state);
          void setCachedOnboarding(userId, state);
          return;
        }
        log.warn("loadOnboarding attempt failed", { attempt, error });
      } else {
        log.warn("loadOnboarding attempt timed out", { attempt });
      }

      if (attempt < 1) await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
    }
    // Both retries failed. Default to "needed" so the AuthGate doesn't spin
    // forever — sending an already-onboarded user to /personal-details once
    // is recoverable (they can navigate back); a permanent spinner is not.
    log.error("loadOnboarding gave up after retries; defaulting onboarding=needed");
    setOnboarding("needed");
  }, []);

  useEffect(() => {
    let mounted = true;
    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (!mounted) return;
        if (error) log.error("getSession failed", error);
        else
          log.info("getSession", {
            hasSession: !!data.session,
            userId: data.session?.user.id
          });
        setSession(data.session);
        // Do not await profile fetch here — a hanging Supabase request would keep loading=true forever
        if (data.session) void loadOnboarding(data.session.user.id);
        else setOnboarding("unknown");
        setLoading(false);
      })
      .catch((e) => {
        log.error("getSession threw", e);
        if (mounted) setLoading(false);
      });
    const { data: sub } = supabase.auth.onAuthStateChange(async (evt, s) => {
      log.info("authStateChange", { event: evt, userId: s?.user.id });
      // Wipe the cached creator-score summary on every auth boundary so a
      // previous account's score never leaks into a fresh sign-in on the
      // same device. The Profile screen repopulates the cache the moment
      // it loads IG insights for the now-current user.
      if (evt === "SIGNED_OUT" || evt === "SIGNED_IN" || evt === "USER_UPDATED") {
        void clearSummary();
      }
      setSession(s);
      if (s) await loadOnboarding(s.user.id);
      else setOnboarding("unknown");
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [loadOnboarding]);

  const refreshOnboarding = useCallback(async () => {
    if (!session?.user.id) return;
    await loadOnboarding(session.user.id);
  }, [loadOnboarding, session?.user.id]);

  return (
    <SessionContext.Provider
      value={{
        session,
        loading,
        onboarding,
        refreshOnboarding,
        signOut: async () => {
          if (session?.user.id) void clearCachedOnboarding(session.user.id);
          await clearSummary();
          // Try the normal server-side signOut first (revokes the refresh token
          // upstream). If the user's auth row was just deleted server-side,
          // the access token is invalid and this errors — fall back to a local
          // scope signOut which always clears AsyncStorage. Without the
          // fallback the local session lingers and AuthGate keeps the user
          // logged-in to a phantom account, routing them straight to
          // onboarding instead of back to sign-in.
          const { error } = await supabase.auth.signOut();
          if (error) {
            log.warn("server signOut failed, forcing local clear", error);
            const { error: localErr } = await supabase.auth.signOut({ scope: "local" });
            if (localErr) log.error("local signOut also failed", localErr);
          } else {
            log.info("signOut");
          }
          // Belt and suspenders: explicitly null the in-memory state so the
          // AuthGate's segment listener fires SIGNED_OUT routing immediately,
          // even if the auth subscription is slow to deliver.
          setSession(null);
          setOnboarding("unknown");
        }
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  return useContext(SessionContext);
}
