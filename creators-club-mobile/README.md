# creators-club-mobile

Expo (React Native) app for Instagram OAuth through the shared `server.js` at the repo root.

## Flow

1. Tap **Connect Instagram** → opens `SERVER_URL/auth/instagram?platform=mobile` in the in-app browser.
2. Instagram approves → callback `/auth/callback` on the server exchanges code → long-lived token.
3. Because `state=mobile`, the server redirects to `creatorsclub://auth?access_token=…&user_id=…&username=…`.
4. The app catches the deep link via `expo-linking` and shows the profile.

## Run

1. In **terminal A** (repo root): `node server.js` and make sure `OAUTH_REDIRECT_URI` (in `.env`) points at a public URL (e.g. ngrok).
2. Register that **exact** `OAUTH_REDIRECT_URI` under **Valid OAuth redirect URIs** in your Meta app.
3. In **terminal B** (`creators-club-mobile`): `npx expo start`.
4. Open **Expo Go** on your phone, scan the QR code, tap **Connect Instagram**.

## Config

- `SERVER_URL` is read from `app.json → expo.extra.serverUrl`. Change it there.
- Deep link scheme is `creatorsclub` (`app.json → expo.scheme`), matching `MOBILE_APP_SCHEME` in `server.js`.
