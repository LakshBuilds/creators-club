import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { getAdminClient } from "@/lib/admin-supabase";
import { setCampaignStatus } from "./actions";

type Row = {
  id: string;
  title: string;
  budget_inr: number;
  status: "draft" | "open" | "closed" | "archived";
  deadline: string | null;
  created_at: string;
  brands: { name: string } | null;
};

export default async function CampaignsPage() {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("campaigns")
    .select("id, title, budget_inr, status, deadline, created_at, brands ( name )")
    .order("created_at", { ascending: false })
    .limit(100);

  const rows = (data ?? []) as unknown as Row[];

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-indigo-950">Campaigns</h1>
          <p className="mt-1 text-sm text-indigo-900/80">
            Briefs shown to creators in the mobile app.
          </p>
        </div>
        <Link href="/admin/campaigns/new">
          <Button>New campaign</Button>
        </Link>
      </div>

      {error ? (
        <Card className="mt-6 border-red-200 bg-red-50">
          <CardTitle>Couldn&apos;t load campaigns</CardTitle>
          <CardDescription>{error.message}</CardDescription>
        </Card>
      ) : rows.length === 0 ? (
        <Card className="mt-6">
          <CardTitle>No campaigns yet</CardTitle>
          <CardDescription>Create your first campaign to get creators started.</CardDescription>
        </Card>
      ) : (
        <div className="mt-6 overflow-hidden rounded-xl border border-indigo-100 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-indigo-100/80 text-xs uppercase tracking-wide text-indigo-800/80">
              <tr>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Brand</th>
                <th className="px-4 py-3 text-right">Budget</th>
                <th className="px-4 py-3">Deadline</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-indigo-100">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-indigo-50/80">
                  <td className="px-4 py-3 font-medium text-indigo-950">{r.title}</td>
                  <td className="px-4 py-3 text-indigo-900/85">{r.brands?.name ?? "—"}</td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    ₹{r.budget_inr.toLocaleString("en-IN")}
                  </td>
                  <td className="px-4 py-3 text-indigo-800/80">
                    {r.deadline ? new Date(r.deadline).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={r.status} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <StatusActions id={r.id} status={r.status} />
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

function StatusBadge({ status }: { status: Row["status"] }) {
  const map: Record<Row["status"], string> = {
    draft: "bg-indigo-100 text-indigo-900",
    open: "bg-emerald-100 text-emerald-800",
    closed: "bg-amber-100 text-amber-800",
    archived: "bg-indigo-200 text-indigo-900"
  };
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${map[status]}`}>
      {status}
    </span>
  );
}

function StatusActions({ id, status }: { id: string; status: Row["status"] }) {
  if (status === "archived") return null;
  const next = status === "open" ? "closed" : status === "closed" ? "open" : "open";
  const label = status === "open" ? "Close" : "Reopen";
  return (
    <form
      action={async () => {
        "use server";
        await setCampaignStatus(id, next as "open" | "closed");
      }}
      className="inline"
    >
      <button
        type="submit"
        className="rounded-md border border-indigo-200 bg-white px-2 py-1 text-xs text-indigo-900/90 hover:bg-indigo-50"
      >
        {label}
      </button>
    </form>
  );
}
