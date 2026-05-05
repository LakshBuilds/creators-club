import { Card } from "@/components/ui/Card";
import { getAdminClient } from "@/lib/admin-supabase";
import { resolveTicket } from "./actions";

type Ticket = {
  id: string;
  creator_id: string | null;
  topic: string;
  message: string;
  context: { role: string; content: string }[] | null;
  status: string;
  created_at: string;
  profiles?: { full_name: string | null } | null;
};

async function load(): Promise<Ticket[]> {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("support_tickets")
    .select("*, profiles!creator_id(full_name)")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) {
    console.error("[admin/support]", error);
    return [];
  }
  return (data ?? []) as unknown as Ticket[];
}

export default async function SupportPage() {
  const items = await load();
  return (
    <div>
      <h1 className="text-2xl font-semibold text-indigo-950">Support tickets</h1>
      <p className="mt-1 text-sm text-indigo-900/80">
        Tickets are opened when a creator hits "Talk to a human" in the chatbot.
      </p>

      {items.length === 0 ? (
        <Card className="mt-6">
          <p className="text-sm text-indigo-900/80">No tickets yet.</p>
        </Card>
      ) : (
        <div className="mt-6 flex flex-col gap-4">
          {items.map((t) => (
            <Card key={t.id}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-base font-semibold text-indigo-950">
                    {t.topic || "(no topic)"}
                  </h3>
                  <p className="text-xs text-indigo-900/60">
                    {t.profiles?.full_name ?? "Unknown creator"} ·{" "}
                    {new Date(t.created_at).toLocaleString()}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide ${
                    t.status === "open"
                      ? "bg-amber-100 text-amber-700"
                      : "bg-emerald-100 text-emerald-700"
                  }`}
                >
                  {t.status}
                </span>
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm text-indigo-900/90">{t.message}</p>
              {t.context && t.context.length > 0 ? (
                <details className="mt-4 rounded-md border border-indigo-100 bg-indigo-50/40 p-3">
                  <summary className="cursor-pointer text-xs font-semibold text-indigo-900/70">
                    Chatbot transcript ({t.context.length} turns)
                  </summary>
                  <div className="mt-2 flex flex-col gap-2">
                    {t.context.map((m, i) => (
                      <div key={i} className="text-xs">
                        <span className="font-semibold text-indigo-900">{m.role}:</span>{" "}
                        <span className="text-indigo-900/80">{m.content}</span>
                      </div>
                    ))}
                  </div>
                </details>
              ) : null}
              {t.status === "open" ? (
                <form action={resolveTicket} className="mt-4">
                  <input type="hidden" name="ticketId" value={t.id} />
                  <button
                    type="submit"
                    className="rounded-md bg-indigo-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-800"
                  >
                    Mark resolved
                  </button>
                </form>
              ) : null}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
