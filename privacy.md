# Privacy Policy — Buyhatke Creators

**Last updated:** 8 May 2026

> The canonical, always-current version of this policy is hosted at
> **https://hatkecreators.netlify.app/privacy** — that URL is the one submitted
> for Meta App Review. This file mirrors it for repository reference.

This policy explains what data Buyhatke Creators (the "app", "we", "us")
collects when you use our mobile app and web admin dashboard, why we collect
it, who we share it with, how long we keep it, and how you can ask us to delete
it. The app is operated by **BuyHatke Tech Private Limited ("Buyhatke")**, the entity
behind buyhatke.com.

## 1. What this app does
Buyhatke Creators is a marketplace where Indian Instagram creators apply for
paid brand-promotion campaigns. Brands review creator profiles and engagement
metrics, select creators, and creators upload a draft video for review before
publishing the final post on Instagram.

## 2. Data we collect
**From the creator (you) directly:**
- Email address (used for sign-in via one-time password)
- Full name and profile photo (optional, set during onboarding)
- City and content category preferences (optional)
- The video drafts you upload for brand review
- Notes you write to brands

**From your Instagram Business or Creator account** (only after you tap "Verify
Instagram" and grant consent on Instagram's official OAuth consent screen):
- Instagram user ID, username, display name, profile picture URL
- Account type (Business or Creator)
- Followers count and total media count
- Aggregated reach metrics on your last few reels (used solely to compute a
  single Engagement Rate number)
- Comments left by viewers on your reels (only when an Auto-DM rule you
  configured matches a trigger keyword)

**From third parties:**
- If you connect your Buyhatke gift-card account, we receive your referral code
  and cumulative reward balance from buyhatke.com.

## 3. How we use the data
- To show your profile to brand admins reviewing campaign applications
- To compute your Creator Score so brands can filter creators by engagement,
  not just follower count
- To run your configured Auto-DM rule: when a viewer comments your chosen
  trigger keyword on a reel, we (a) DM them the message you configured and
  (b) post a single public reply comment under the trigger comment. We never
  DM or comment without your explicit per-reel configuration.
- To process payouts when a brand approves your published post
- To send you transactional notifications about your campaigns

We do **not** use any data for advertising targeting, sell data to third
parties, or share Instagram-derived data with anyone outside the brand admin
running the specific campaign you applied to.

## 4. Where data is stored
- Identity, profile, application, and submission data: Supabase (a managed
  PostgreSQL provider) in their AP-South region.
- Draft videos uploaded for brand review: a private Google Drive shared with
  our service account. Files are accessible only to the brand admin via embedded
  preview and to you via the in-app player.
- Instagram access tokens: encrypted at rest in Supabase. We never log them or
  display them in any UI.

## 5. Who can see your data
- You — full read access to everything we hold about you
- Brand admins — only see your IG profile fields, your engagement score, and
  the specific submission you made to their campaign
- Buyhatke staff — limited operations access for support and platform integrity
- We do not give Instagram or Meta direct access to your stored data beyond what
  their own APIs return

## 6. Retention
We keep your data for as long as your account is active. If you delete your
account, we permanently remove all personal data within 30 days, including
Instagram tokens and the contents of any unfunded draft video uploads.
Anonymised, aggregated metrics may be kept indefinitely.

## 7. Deleting your data
You have three ways to delete your data:
1. **From the app:** Profile → Settings → Delete account. Your row in our
   database is hard-deleted within minutes; downstream cleanup completes within
   30 days.
2. **By revoking the app on Instagram:** Instagram → Settings → Apps and
   Websites → remove Buyhatke Creators. Meta notifies our deletion endpoint at
   `/api/auth/instagram/data-deletion`; we delete your Instagram-derived data
   within minutes.
3. **By emailing us:** send a deletion request from your registered email to
   support@buyhatke.com. We confirm and complete the deletion within 7 working
   days.

## 8. Children
The app is intended for users aged 13 and above. We do not knowingly collect
data from children younger than 13. If you believe a child has signed up,
contact us and we will remove their data.

## 9. Changes to this policy
We will update the hosted policy when our practices change and update the "Last
updated" date. Material changes will be announced inside the app at least 14
days before they take effect.

## 10. Contact
BuyHatke Tech Private Limited
Email: support@buyhatke.com
See also: https://hatkecreators.netlify.app/terms
