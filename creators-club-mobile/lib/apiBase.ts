/** Production Next/Netlify backend — used when no explicit dev URL is set
 * via EXPO_PUBLIC_API_BASE_URL. */
const PRODUCTION_API_ORIGIN = "https://hatkecreators.netlify.app";

/** Origin of the Next.js API the mobile app calls. Set
 * `EXPO_PUBLIC_API_BASE_URL` for local development; otherwise we use
 * production. */
export const API_BASE_URL: string = (() => {
  const explicit = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (explicit && explicit.trim().length > 0) return explicit.replace(/\/$/, "");
  return PRODUCTION_API_ORIGIN;
})();
