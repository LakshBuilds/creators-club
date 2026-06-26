# Creators Club - Instagram Analytics & OAuth

This project is a Next.js application designed for creators to connect their Instagram Business accounts and view analytics.

## 🚀 Features
- **Instagram OAuth Integration**: Securely connect Instagram Business/Creator accounts via Facebook Login.
- **Long-Lived Tokens**: Automatically exchanges short-lived tokens for 60-day long-lived tokens.
- **Privacy Policy**: Includes a standardized privacy policy for Meta App Review compliance.

## 🛠️ Setup

1. **Environment Variables**: Create a `creators-web/.env` or repo-root `.env` (Next loads it) with:
   ```env
   NEXT_PUBLIC_IG_APP_ID=your_app_id
   IG_APP_SECRET=your_app_secret
   NEXT_PUBLIC_REDIRECT_URI=https://your-domain.netlify.app/api/auth/instagram/callback
   ```
   Optional **root** `server.js` (ngrok) uses the same id/secret plus:
   ```env
   OAUTH_REDIRECT_URI=https://YOUR_NGROK_HOST/auth/callback
   ```
   Register **both** callback URLs in the Meta app if you use Netlify and ngrok. Shared OAuth settings (authorize URL, scopes) live in `config/instagram-oauth.json`.

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Run Development Server**:
   ```bash
   npm run dev
   ```

## 🔐 OAuth Flow
- **Next.js**: `GET /api/auth/instagram` (or the link on `/connect`) sends users to `https://api.instagram.com/oauth/authorize` with the scopes in `config/instagram-oauth.json`. After login, `GET /api/auth/instagram/callback` exchanges the `code` for a short-lived token, exchanges again for a **60-day** long-lived token, fetches `graph.instagram.com/me` profile fields, and redirects to `/dashboard`.
- **Local `server.js`** (repo root, default port **3001**): `GET /auth/instagram` → `GET /auth/callback` returns JSON (`access_token` is long-lived, `profile` from Graph). Set `OAUTH_REDIRECT_URI` to your public tunnel URL. Do not commit secrets.

## 📄 Compliance
- **Privacy Policy**: Hosted at `/privacy` (route `app/privacy/page.tsx`); repo mirror in root `privacy.md`. This is the URL submitted for Meta App Review.
- **Terms of Service**: Hosted at `/terms` (route `app/terms/page.tsx`).
- **Data Deletion**: Meta deletion callback at `/api/auth/instagram/data-deletion`; user-facing status page at `/data-deletion-status`.
- **Scopes**: Uses official Instagram Graph API scopes required for professional account insights (see `config/instagram-oauth.json`).
