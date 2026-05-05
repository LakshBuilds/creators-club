import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { fetchInstagramInsights } from "@/lib/instagram-insights";
import { getAdminClient } from "@/lib/admin-supabase";

type CreatorRow = {
  id: string;
  handle: string | null;
  ig_username: string | null;
  ig_name: string | null;
  ig_profile_picture_url: string | null;
  niche: string | null;
  bio: string | null;
  followers_count: number | null;
  created_at: string;
};

export default async function CreatorDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = getAdminClient();
  const { data } = await supabase
    .from("creators")
    .select(
      "id, handle, ig_username, ig_name, ig_profile_picture_url, niche, bio, followers_count, created_at"
    )
    .eq("id", id)
    .maybeSingle();

  const creator = data as CreatorRow | null;
  if (!creator) notFound();

  const handle = (creator.ig_username ?? creator.handle ?? "").replace(/^@/, "");
  const insights = handle ? await fetchInstagramInsights(handle) : null;

  return (
    <div>
      <Link href="/admin/creators" className="text-sm text-indigo-800/90 hover:text-indigo-950">
        ← Creators
      </Link>

      <div className="mt-3 flex items-center gap-4">
        {creator.ig_profile_picture_url ? (
          <Image
            src={creator.ig_profile_picture_url}
            alt=""
            width={56}
            height={56}
            unoptimized
            className="h-14 w-14 rounded-full object-cover"
          />
        ) : (
          <div className="h-14 w-14 rounded-full bg-indigo-200" />
        )}
        <div>
          <h1 className="text-2xl font-semibold text-indigo-950">@{handle || "unknown"}</h1>
          <p className="text-sm text-indigo-900/80">
            {creator.ig_name ?? "—"} · joined{" "}
            {new Date(creator.created_at).toLocaleDateString()}
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Card>
          <CardTitle>Niche</CardTitle>
          <CardDescription>{creator.niche ?? "Not set"}</CardDescription>
        </Card>
        <Card>
          <CardTitle>Bio</CardTitle>
          <CardDescription>{creator.bio ?? "Not set"}</CardDescription>
        </Card>
        <Card>
          <CardTitle>Stored followers</CardTitle>
          <CardDescription>{creator.followers_count ?? "—"}</CardDescription>
        </Card>
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-semibold text-indigo-950">Instagram insights</h2>
        <p className="text-sm text-indigo-900/80">
          Live data via Meta Graph API (Business Discovery).
        </p>

        {!handle ? (
          <Card className="mt-4">
            <CardTitle>No Instagram handle yet</CardTitle>
            <CardDescription>
              Creator has not linked their Instagram profile.
            </CardDescription>
          </Card>
        ) : !insights ? null : !insights.configured ? (
          <Card className="mt-4 border-amber-200 bg-amber-50">
            <CardTitle>Meta API not configured</CardTitle>
            <CardDescription>{insights.error}</CardDescription>
          </Card>
        ) : insights.error ? (
          <Card className="mt-4 border-red-200 bg-red-50">
            <CardTitle>Insights error</CardTitle>
            <CardDescription>{insights.error}</CardDescription>
          </Card>
        ) : (
          <div className="mt-4 space-y-4">
            {insights.profile ? (
              <Card>
                <div className="flex items-start gap-4">
                  {insights.profile.profile_picture_url ? (
                    <Image
                      src={insights.profile.profile_picture_url}
                      alt=""
                      width={48}
                      height={48}
                      unoptimized
                      className="h-12 w-12 rounded-full object-cover"
                    />
                  ) : null}
                  <div className="flex-1">
                    <p className="font-semibold">
                      @{insights.profile.username}
                      {insights.profile.name ? ` · ${insights.profile.name}` : ""}
                    </p>
                    {insights.profile.biography ? (
                      <p className="mt-1 text-sm text-indigo-900/85">
                        {insights.profile.biography}
                      </p>
                    ) : null}
                    <p className="mt-2 text-sm text-indigo-800/80">
                      <span className="font-medium">
                        {insights.profile.followers_count?.toLocaleString("en-IN") ?? "—"}
                      </span>{" "}
                      followers ·{" "}
                      <span className="font-medium">
                        {insights.profile.media_count?.toLocaleString("en-IN") ?? "—"}
                      </span>{" "}
                      posts
                    </p>
                  </div>
                </div>
              </Card>
            ) : null}

            {(insights.recentMedia ?? []).map((m) => (
              <Card key={m.id}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <p className="text-xs uppercase tracking-wide text-indigo-700/70">
                      {m.media_type ?? "POST"} ·{" "}
                      {m.timestamp ? new Date(m.timestamp).toLocaleString() : "—"}
                    </p>
                    {m.caption ? (
                      <p className="mt-1 line-clamp-3 text-sm text-indigo-950">{m.caption}</p>
                    ) : null}
                    <p className="mt-2 text-xs text-indigo-800/80">
                      <span className="font-medium">{m.like_count ?? 0}</span> likes ·{" "}
                      <span className="font-medium">{m.comments_count ?? 0}</span> comments
                    </p>
                  </div>
                  {m.permalink ? (
                    <a
                      href={m.permalink}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm text-indigo-800 hover:underline"
                    >
                      Open ↗
                    </a>
                  ) : null}
                </div>

                {m.comments && m.comments.length > 0 ? (
                  <div className="mt-3 border-t border-indigo-100 pt-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700/70">
                      Recent comments
                    </p>
                    <ul className="mt-2 space-y-2">
                      {m.comments.map((c) => (
                        <li key={c.id} className="text-sm text-indigo-900/85">
                          <span className="font-medium text-indigo-950">
                            @{c.username ?? "user"}
                          </span>{" "}
                          {c.text}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
