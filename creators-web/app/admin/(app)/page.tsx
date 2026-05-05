import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { getAdminClient } from "@/lib/admin-supabase";

async function counts() {
  const supabase = getAdminClient();
  // Run every count in parallel — keeps page TTFB tight as the dataset grows.
  const [
    profiles,
    creators,
    igConnected,
    campaigns,
    activeCampaigns,
    applications,
    submissions,
    draftSubs,
    autoDmRules,
    autoDmReels,
    ideas,
    tickets,
    buyhatkeLinked
  ] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase.from("creators").select("*", { count: "exact", head: true }),
    supabase
      .from("creators")
      .select("*", { count: "exact", head: true })
      .not("ig_long_lived_token", "is", null),
    supabase.from("campaigns").select("*", { count: "exact", head: true }),
    supabase
      .from("campaigns")
      .select("*", { count: "exact", head: true })
      .eq("status", "open"),
    supabase.from("applications").select("*", { count: "exact", head: true }),
    supabase.from("submissions").select("*", { count: "exact", head: true }),
    supabase
      .from("submissions")
      .select("*", { count: "exact", head: true })
      .eq("status", "draft"),
    supabase.from("auto_dm_rules").select("*", { count: "exact", head: true }),
    supabase
      .from("auto_dm_rules")
      .select("ig_media_id", { head: false })
      .neq("ig_media_id", null),
    supabase.from("creator_ideas").select("*", { count: "exact", head: true }),
    supabase
      .from("support_tickets")
      .select("*", { count: "exact", head: true })
      .eq("status", "open"),
    supabase
      .from("creators")
      .select("*", { count: "exact", head: true })
      .not("buyhatke_email", "is", null)
  ]);

  // auto_dm_rules with non-null ig_media_id ≈ "videos with a rule attached".
  const autoDmReelCount = autoDmReels.error
    ? 0
    : new Set(((autoDmReels.data ?? []) as { ig_media_id: string | null }[])
        .map((r) => r.ig_media_id)
        .filter(Boolean)).size;

  return {
    signups: profiles.count ?? 0,
    creators: creators.count ?? 0,
    igConnected: igConnected.count ?? 0,
    campaigns: campaigns.count ?? 0,
    activeCampaigns: activeCampaigns.count ?? 0,
    applications: applications.count ?? 0,
    submissions: submissions.count ?? 0,
    drafts: draftSubs.count ?? 0,
    autoDm: autoDmRules.count ?? 0,
    autoDmReels: autoDmReelCount,
    ideas: ideas.count ?? 0,
    openTickets: tickets.count ?? 0,
    buyhatkeLinked: buyhatkeLinked.count ?? 0
  };
}

export default async function AdminOverviewPage() {
  const c = await counts();
  return (
    <div>
      <h1 className="text-2xl font-semibold text-indigo-950">Overview</h1>
      <p className="mt-1 text-sm text-indigo-900/80">
        Live snapshot. Click a tile in the sidebar for the full list.
      </p>

      <h2 className="mt-8 text-sm font-semibold uppercase tracking-wide text-indigo-900/70">
        Audience
      </h2>
      <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Stat label="Sign-ups" value={c.signups} hint="Profiles created" />
        <Stat label="IG-connected" value={c.igConnected} hint="Have a long-lived token" />
        <Stat label="Buyhatke-linked" value={c.buyhatkeLinked} hint="Gift card / referral access" />
      </div>

      <h2 className="mt-8 text-sm font-semibold uppercase tracking-wide text-indigo-900/70">
        Campaigns
      </h2>
      <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-4">
        <Stat label="Total campaigns" value={c.campaigns} hint="All time" />
        <Stat label="Open" value={c.activeCampaigns} hint="Status = open" />
        <Stat label="Applications" value={c.applications} hint="All statuses" />
        <Stat label="Submissions" value={c.submissions} hint={`${c.drafts} in draft`} />
      </div>

      <h2 className="mt-8 text-sm font-semibold uppercase tracking-wide text-indigo-900/70">
        Engagement
      </h2>
      <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-4">
        <Stat label="Auto-DM rules" value={c.autoDm} hint="Total rules created" />
        <Stat label="Auto-DM reels" value={c.autoDmReels} hint="Distinct videos with a rule" />
        <Stat label="Ideas inbox" value={c.ideas} hint="Submitted by creators" />
        <Stat label="Open tickets" value={c.openTickets} hint="Need a human reply" />
      </div>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: number; hint: string }) {
  return (
    <Card>
      <CardTitle>{label}</CardTitle>
      <CardDescription>{hint}</CardDescription>
      <p className="mt-4 text-3xl font-semibold tabular-nums text-indigo-800">{value}</p>
    </Card>
  );
}
