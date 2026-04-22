# Creators Club - Instagram Analytics & OAuth

This project is a Next.js application designed for creators to connect their Instagram Business accounts and view analytics.

## 🚀 Features
- **Instagram OAuth Integration**: Securely connect Instagram Business/Creator accounts via Facebook Login.
- **Long-Lived Tokens**: Automatically exchanges short-lived tokens for 60-day long-lived tokens.
- **Privacy Policy**: Includes a standardized privacy policy for Meta App Review compliance.

## 🛠️ Setup

1. **Environment Variables**: Create a `.env` file with the following:
   ```env
   NEXT_PUBLIC_IG_APP_ID=your_app_id
   IG_APP_SECRET=your_app_secret
   NEXT_PUBLIC_REDIRECT_URI=http://localhost:3000/api/auth/instagram/callback
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Run Development Server**:
   ```bash
   npm run dev
   ```

## 🔐 OAuth Flow
- Start at `/connect` to initiate the authorization.
- Users are redirected to Facebook to grant permissions (`instagram_basic`, `instagram_manage_insights`, etc.).
- The callback at `/api/auth/instagram/callback` handles the token exchange and redirects to the dashboard.

## 📄 Compliance
- **Privacy Policy**: Located at `/privacy.md`.
- **Scopes**: Uses official Instagram Graph API scopes required for professional account insights.
