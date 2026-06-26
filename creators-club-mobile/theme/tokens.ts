/** Trust-blue + sunny-yellow palette. Tailwind blue-600 anchored, yellow-400 accent. */
export const colors = {
  brand: {
    primary: "#2563EB",
    primaryDark: "#1D4ED8",
    primarySoft: "#DBEAFE",
    /** Sunny yellow — used on CTAs, badges, sparkles. */
    accent: "#FACC15",
    accentSoft: "#FEF9C3",
    success: "#22C55E"
  },
  gradient: {
    heroStart: "#2563EB",
    heroEnd: "#1E3A8A"
  },
  text: {
    primary: "#0F172A",
    secondary: "#475569",
    muted: "#64748B",
    onDark: "#FFFFFF",
    onDarkMuted: "rgba(255,255,255,0.82)"
  },
  surface: {
    app: "#F4F8FF",
    card: "#FFFFFF",
    cardAlt: "#EFF6FF",
    chip: "#1E3A8A",
    border: "#DBEAFE",
    borderStrong: "#BFDBFE"
  },
  feedback: {
    warnBg: "#FEF9C3",
    warnFg: "#854D0E",
    dangerBg: "#FEECEC",
    dangerFg: "#9B1C1C",
    infoBg: "#EFF6FF",
    infoFg: "#2563EB"
  },
  dark: {
    surface: "#0F172A",
    text: "#FFFFFF",
    mutedText: "rgba(255,255,255,0.74)"
  }
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32
};

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999
};

export const typography = {
  display: { fontSize: 30, fontWeight: "800" as const, letterSpacing: -0.5 },
  h1: { fontSize: 24, fontWeight: "800" as const, letterSpacing: -0.3 },
  h2: { fontSize: 20, fontWeight: "700" as const },
  h3: { fontSize: 17, fontWeight: "700" as const },
  body: { fontSize: 15, fontWeight: "500" as const },
  bodyStrong: { fontSize: 15, fontWeight: "700" as const },
  caption: { fontSize: 13, fontWeight: "500" as const },
  overline: {
    fontSize: 11,
    fontWeight: "700" as const,
    letterSpacing: 0.8,
    textTransform: "uppercase" as const
  },
  /** Handwritten script — used on the brand wordmark + hero headlines.
   * Loaded via @expo-google-fonts/pacifico in app/_layout.tsx. */
  brandScript: {
    fontFamily: "Pacifico_400Regular",
    fontSize: 28,
    letterSpacing: -0.5
  }
};

export const shadow = {
  card: {
    shadowColor: "#1E3A8A",
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3
  },
  lift: {
    shadowColor: "#1E3A8A",
    shadowOpacity: 0.14,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 12 },
    elevation: 6
  }
};

export const brand = {
  name: "Buyhatke Creators",
  tagline: "Get paid to make reels for the brands you love."
};
