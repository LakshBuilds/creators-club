import Image from "next/image";
import Link from "next/link";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { getAdminClient } from "@/lib/admin-supabase";

type CreatorRow = {
  id: string;
  ig_username: string | null;
  ig_name: string | null;
  ig_profile_picture_url: string | null;
  ig_user_id: string | null;
  followers_count: number | null;
  niche: string | null;
  created_at: string;
};

async function fetchCreators(): Promise<{ rows: CreatorRow[]; error: string | null }> {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("creators")
    .select(
      "id, ig_username, ig_name, ig_profile_picture_url, ig_user_id, followers_count, niche, created_at"
    )
    .order("created_at", { ascending: false })
    .limit(100);
  return { rows: (data as CreatorRow[]) ?? [], error: error?.message ?? null };
}

export default async function CreatorsPage() {
  const { rows, error } = await fetchCreators();

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-indigo-950">Creators</h1>
          <p className="mt-1 text-sm text-indigo-900/80">
            Instagram-connected creators on the platform.
          </p>
        </div>
        <span className="text-sm text-indigo-700/70">{rows.length} shown</span>
      </div>

      {error ? (
        <Card className="mt-6 border-red-200 bg-red-50">
          <CardTitle>Couldn&apos;t load creators</CardTitle>
          <CardDescription>{error}</CardDescription>
          <p className="mt-3 text-xs text-indigo-900/80">
            Tip: the signed-in user must have <code>profiles.role = &apos;admin&apos;</code> for
            RLS to allow listing.
          </p>
        </Card>
      ) : rows.length === 0 ? (
        <Card className="mt-6">
          <CardTitle>No creators yet</CardTitle>
          <CardDescription>
            Creators will appear here once they connect Instagram from the mobile app.
          </CardDescription>
        </Card>
      ) : (
        <div className="mt-6 overflow-hidden rounded-xl border border-indigo-100 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-indigo-100/80 text-xs uppercase tracking-wide text-indigo-800/80">
              <tr>
                <th className="px-4 py-3">Creator</th>
                <th className="px-4 py-3">IG user id</th>
                <th className="px-4 py-3">Niche</th>
                <th className="px-4 py-3 text-right">Followers</th>
                <th className="px-4 py-3">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-indigo-100">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-indigo-50/80">
                  <td className="px-4 py-3">
                    <Link href={`/admin/creators/${r.id}`} className="flex items-center gap-3">
                      {r.ig_profile_picture_url ? (
                        <Image
                          src={r.ig_profile_picture_url}
                          alt=""
                          width={32}
                          height={32}
                          className="h-8 w-8 rounded-full object-cover"
                          unoptimized
                        />
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-indigo-200" />
                      )}
                      <div>
                        <p className="font-medium text-indigo-950 hover:text-indigo-800">
                          @{r.ig_username ?? "unknown"}
                        </p>
                        {r.ig_name ? (
                          <p className="text-xs text-indigo-700/70">{r.ig_name}</p>
                        ) : null}
                      </div>
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-indigo-700/70">
                    {r.ig_user_id ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-indigo-900/85">{r.niche ?? "—"}</td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {r.followers_count ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-indigo-800/80">
                    {new Date(r.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
