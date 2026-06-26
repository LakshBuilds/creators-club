import Link from "next/link";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { getAdminClient } from "@/lib/admin-supabase";
import { setApplicationStatus } from "./actions";

type AppRow = {
  id: string;
  campaign_id: string;
  creator_id: string;
  status: string;
  pitch: string | null;
  created_at?: string | null;
};

const STATUS_BADGE: Record<string, string> = {
  pending: "bg-amber-100 text-amber-900",
  accepted: "bg-emerald-100 text-emerald-900",
  rejected: "bg-rose-100 text-rose-900"
};

export default async function ApplicationsPage() {
  const supabase = getAdminClient();

  const appsRes = await supabase.from("applications").select("*");
  const apps = (appsRes.data ?? []) as AppRow[];

  const campaignIds = [...new Set(apps.map((a) => a.campaign_id))];
  const creatorIds = [...new Set(apps.map((a) => a.creator_id))];

  const [campsRes, creatorsRes] = await Promise.all([
    campaignIds.length
      ? supabase
          .from("campaigns")
          .select("id, title, brand_id, brands(name)")
          .in("id", campaignIds)
      : Promise.resolve({ data: [] as unknown[], error: null }),
    creatorIds.length
      ? supabase
          .from("creators")
          .select("id, profile_id, ig_username, ig_profile_picture_url, followers_count")
          .in("id", creatorIds)
      : Promise.resolve({ data: [] as unknown[], error: null })
  ]);

  const camps = (campsRes.data ?? []) as Array<{
    id: string;
    title: string;
    brands: { name: string } | { name: string }[] | null;
  }>;
  const creators = (creatorsRes.data ?? []) as Array<{
    id: string;
    profile_id: string;
    ig_username: string | null;
    ig_profile_picture_url: string | null;
    followers_count: number | null;
  }>;

  const profileIds = creators.map((c) => c.profile_id).filter(Boolean);
  const profilesRes = profileIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", profileIds)
    : { data: [] as Array<{ id: string; full_name: string | null }> };
  const profileNameById = new Map(
    (profilesRes.data ?? []).map((p) => [p.id, p.full_name ?? ""])
  );

  const campById = new Map(
    camps.map((c) => {
      const brandName = Array.isArray(c.brands) ? c.brands[0]?.name : c.brands?.name;
      return [c.id, { title: c.title, brand: brandName ?? null }];
    })
  );
  const creatorById = new Map(creators.map((c) => [c.id, c]));

  const sorted = [...apps].sort((a, b) => {
    const ta = a.created_at ? Date.parse(a.created_at) : 0;
    const tb = b.created_at ? Date.parse(b.created_at) : 0;
    return tb - ta;
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold text-indigo-950">Applications</h1>
      <p className="mt-1 text-sm text-indigo-900/80">
        Creators who have shown interest in a campaign. Accept or reject from here.
      </p>

      {sorted.length === 0 ? (
        <Card className="mt-6">
          <CardTitle>No applications yet</CardTitle>
          <CardDescription>
            Once a creator taps &ldquo;Apply&rdquo; on a campaign, they appear here.
          </CardDescription>
        </Card>
      ) : (
        <div className="mt-6 space-y-3">
          {sorted.map((a) => {
            const camp = campById.get(a.campaign_id);
            const creator = creatorById.get(a.creator_id);
            const name =
              (creator?.profile_id && profileNameById.get(creator.profile_id)) ||
              creator?.ig_username ||
              "Unknown creator";
            const handle = creator?.ig_username ? `@${creator.ig_username}` : null;
            const followers = creator?.followers_count ?? null;
            const badgeCls = STATUS_BADGE[a.status] ?? "bg-slate-100 text-slate-700";

            return (
              <Card key={a.id} className="flex flex-col gap-4 sm:flex-row sm:items-start">
                <div className="flex flex-1 items-start gap-3">
                  {creator?.ig_profile_picture_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={creator.ig_profile_picture_url}
                      alt=""
                      className="h-12 w-12 flex-none rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-12 w-12 flex-none rounded-full bg-indigo-100" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-semibold text-indigo-950">{name}</p>
                      {handle ? (
                        <a
                          href={`https://instagram.com/${creator?.ig_username}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-indigo-700 hover:underline"
                        >
                          {handle}
                        </a>
                      ) : null}
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${badgeCls}`}>
                        {a.status}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-indigo-900/70">
                      Campaign:{" "}
                      <Link
                        href={`/admin/campaigns`}
                        className="font-medium text-indigo-800 hover:underline"
                      >
                        {camp?.title ?? a.campaign_id}
                      </Link>
                      {camp?.brand ? <> · {camp.brand}</> : null}
                      {followers != null ? <> · {followers.toLocaleString("en-IN")} followers</> : null}
                    </p>
                    {a.pitch ? (
                      <p className="mt-2 whitespace-pre-wrap rounded-md border border-indigo-100 bg-indigo-50/60 p-3 text-sm text-indigo-950">
                        {a.pitch}
                      </p>
                    ) : null}
                  </div>
                </div>

                {a.status === "pending" ? (
                  <div className="flex gap-2 sm:flex-col">
                    <form action={setApplicationStatus}>
                      <input type="hidden" name="id" value={a.id} />
                      <input type="hidden" name="status" value="accepted" />
                      <button
                        type="submit"
                        className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                      >
                        Accept
                      </button>
                    </form>
                    <form action={setApplicationStatus}>
                      <input type="hidden" name="id" value={a.id} />
                      <input type="hidden" name="status" value="rejected" />
                      <button
                        type="submit"
                        className="rounded-md bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700"
                      >
                        Reject
                      </button>
                    </form>
                  </div>
                ) : null}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
