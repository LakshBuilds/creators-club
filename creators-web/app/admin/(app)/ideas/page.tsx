import { Card } from "@/components/ui/Card";
import { getAdminClient } from "@/lib/admin-supabase";

type Idea = {
  id: string;
  creator_id: string | null;
  title: string;
  body: string;
  ai_used: boolean;
  status: string;
  created_at: string;
  // joined
  profiles?: { full_name: string | null } | null;
};

async function load(): Promise<Idea[]> {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("creator_ideas")
    .select("*, profiles!creator_id(full_name)")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) {
    console.error("[admin/ideas]", error);
    return [];
  }
  return (data ?? []) as unknown as Idea[];
}

export default async function IdeasInboxPage() {
  const items = await load();
  return (
    <div>
      <h1 className="text-2xl font-semibold text-indigo-950">Ideas inbox</h1>
      <p className="mt-1 text-sm text-indigo-900/80">
        Reel concepts and feedback creators have shared with us. Newest first.
      </p>

      {items.length === 0 ? (
        <Card className="mt-6">
          <p className="text-sm text-indigo-900/80">No ideas yet.</p>
        </Card>
      ) : (
        <div className="mt-6 flex flex-col gap-4">
          {items.map((it) => (
            <Card key={it.id}>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-semibold text-indigo-950">{it.title}</h3>
                  <p className="text-xs text-indigo-900/60">
                    {it.profiles?.full_name ?? "Unknown creator"} ·{" "}
                    {new Date(it.created_at).toLocaleString()}
                    {it.ai_used ? " · AI-assisted" : ""}
                  </p>
                </div>
                <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-indigo-700">
                  {it.status}
                </span>
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm text-indigo-900/90">{it.body}</p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
