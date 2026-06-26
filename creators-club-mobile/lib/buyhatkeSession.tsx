import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";
import {
  buildJoinUrl,
  disconnect as apiDisconnect,
  generateOtp as apiGenerateOtp,
  getReferralCode,
  getReferralInfo,
  hasStoredSession,
  isLoggedIn,
  verifyOtp as apiVerifyOtp,
  type ReferralCodeData,
  type ReferralInfo
} from "./buyhatke";
import { createLogger } from "./logger";

const log = createLogger("buyhatke-session");

type Status = "unknown" | "disconnected" | "connected";

export type NormalizedReferralInfo = {
  redeemable: number;
  pending: number;
  lifetime: number;
  raw: ReferralInfo | null;
};

type Ctx = {
  status: Status;
  loading: boolean;
  refreshing: boolean;
  email: string | null;
  referralCode: string | null;
  joinUrl: string | null;
  info: NormalizedReferralInfo;
  generateOtp: (email: string) => Promise<{ ok: true } | { ok: false; err: string }>;
  verifyOtp: (
    email: string,
    otp: string
  ) => Promise<{ ok: true } | { ok: false; err: string }>;
  refresh: () => Promise<void>;
  disconnect: () => Promise<void>;
};

const emptyInfo: NormalizedReferralInfo = {
  redeemable: 0,
  pending: 0,
  lifetime: 0,
  raw: null
};

const BuyhatkeSessionContext = createContext<Ctx>({
  status: "unknown",
  loading: true,
  refreshing: false,
  email: null,
  referralCode: null,
  joinUrl: null,
  info: emptyInfo,
  generateOtp: async () => ({ ok: false, err: "not initialised" }),
  verifyOtp: async () => ({ ok: false, err: "not initialised" }),
  refresh: async () => {},
  disconnect: async () => {}
});

function pickNumber(o: Record<string, unknown> | null | undefined, keys: string[]): number {
  if (!o) return 0;
  for (const k of keys) {
    const v = o[k];
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v))) return Number(v);
  }
  return 0;
}

function normalizeInfo(raw: ReferralInfo | null | undefined): NormalizedReferralInfo {
  const r = (raw ?? null) as Record<string, unknown> | null;
  return {
    redeemable: pickNumber(r, [
      "rewardBalance",
      "redeemablePoints",
      "redeemable",
      "redeemableBalance",
      "balance"
    ]),
    pending: pickNumber(r, [
      "pendingReward",
      "pendingPoints",
      "pending",
      "pendingBalance"
    ]),
    lifetime: pickNumber(r, [
      "totalEarning",
      "lifetimeEarned",
      "lifetime",
      "totalEarned",
      "lifetimePoints"
    ]),
    raw: (raw as ReferralInfo | null) ?? null
  };
}

function pickCode(raw: ReferralCodeData | null | undefined): string | null {
  if (!raw) return null;
  const r = raw as Record<string, unknown>;
  // Prefer customReferrerCode (user's vanity code) over the auto-assigned one.
  for (const k of ["customReferrerCode", "referrerCode", "referralCode", "code", "userCode"]) {
    const v = r[k];
    if (typeof v === "string" && v.trim().length > 0) return v.trim();
  }
  return null;
}

export function BuyhatkeSessionProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>("unknown");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [info, setInfo] = useState<NormalizedReferralInfo>(emptyInfo);

  const loadData = useCallback(async () => {
    const [codeRes, infoRes] = await Promise.all([getReferralCode(), getReferralInfo()]);
    if (codeRes.status === 1) {
      const code = pickCode(codeRes.data);
      if (code) setReferralCode(code);
    } else {
      log.warn("getReferralCode failed", codeRes.err);
    }
    if (infoRes.status === 1) {
      setInfo(normalizeInfo(infoRes.data));
    } else {
      log.warn("getReferralInfo failed", infoRes.err);
    }
  }, []);

  const bootstrap = useCallback(async () => {
    setLoading(true);
    try {
      const has = await hasStoredSession();
      if (!has) {
        setStatus("disconnected");
        return;
      }
      const r = await isLoggedIn();
      if (r.status !== 1) {
        // server says session is invalid; clear it
        await apiDisconnect();
        setStatus("disconnected");
        return;
      }
      const data = (r as { data?: { email?: unknown } }).data;
      const e = typeof data?.email === "string" ? data.email : null;
      if (e) setEmail(e);
      setStatus("connected");
      await loadData();
    } catch (e) {
      log.error("bootstrap failed", e);
      setStatus("disconnected");
    } finally {
      setLoading(false);
    }
  }, [loadData]);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  const generateOtp = useCallback(
    async (e: string): Promise<{ ok: true } | { ok: false; err: string }> => {
      const r = await apiGenerateOtp(e);
      if (r.status === 1) return { ok: true };
      return { ok: false, err: r.err ?? "Could not send OTP" };
    },
    []
  );

  const verifyOtp = useCallback(
    async (e: string, otp: string): Promise<{ ok: true } | { ok: false; err: string }> => {
      const r = await apiVerifyOtp(e, otp);
      if (r.status !== 1) return { ok: false, err: r.err ?? "Invalid OTP" };
      setEmail(e);
      setStatus("connected");
      try {
        await loadData();
      } catch (err) {
        log.warn("post-verify load failed", err);
      }
      return { ok: true };
    },
    [loadData]
  );

  const refresh = useCallback(async () => {
    if (status !== "connected") return;
    setRefreshing(true);
    try {
      await loadData();
    } finally {
      setRefreshing(false);
    }
  }, [loadData, status]);

  const disconnect = useCallback(async () => {
    await apiDisconnect();
    setEmail(null);
    setReferralCode(null);
    setInfo(emptyInfo);
    setStatus("disconnected");
  }, []);

  const joinUrl = useMemo(
    () => (referralCode ? buildJoinUrl(referralCode) : null),
    [referralCode]
  );

  const value = useMemo<Ctx>(
    () => ({
      status,
      loading,
      refreshing,
      email,
      referralCode,
      joinUrl,
      info,
      generateOtp,
      verifyOtp,
      refresh,
      disconnect
    }),
    [
      status,
      loading,
      refreshing,
      email,
      referralCode,
      joinUrl,
      info,
      generateOtp,
      verifyOtp,
      refresh,
      disconnect
    ]
  );

  return (
    <BuyhatkeSessionContext.Provider value={value}>
      {children}
    </BuyhatkeSessionContext.Provider>
  );
}

export function useBuyhatkeSession() {
  return useContext(BuyhatkeSessionContext);
}
