import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { getAdminClient } from "@/lib/admin-supabase";
import { createCampaign } from "../actions";

export default async function NewCampaignPage() {
  const supabase = getAdminClient();
  const { data: brands } = await supabase
    .from("brands")
    .select("id, name")
    .order("name", { ascending: true });

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-indigo-950">New campaign</h1>
          <p className="mt-1 text-sm text-indigo-900/80">
            Brief creators receive in the mobile app.
          </p>
        </div>
        <Link
          href="/admin/campaigns"
          className="text-sm text-indigo-800/90 hover:text-indigo-950"
        >
          ← Back
        </Link>
      </div>

      <Card className="mt-6">
        <CardTitle>Brief</CardTitle>
        <CardDescription>Title, description and budget are required.</CardDescription>

        <form action={createCampaign} className="mt-6 space-y-4">
          <Field label="Title" name="title" required placeholder="Buyhatke price drop review" />
          <Field
            label="Brief"
            name="brief"
            as="textarea"
            required
            hint="What should the creator show/say?"
          />

          <div className="grid grid-cols-2 gap-4">
            <Field label="Budget (INR)" name="budget_inr" type="number" min={0} required />
            <Field label="Deadline" name="deadline" type="date" />
          </div>

          <Field
            label="Deliverable"
            name="deliverable"
            placeholder="1 Reel + 1 Story, 30-60s"
          />

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-indigo-950">Brand</span>
            <select
              name="brand_id"
              defaultValue=""
              className="w-full rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm text-indigo-950 focus:outline-none focus:ring-2 focus:ring-indigo-800"
            >
              <option value="">— No brand —</option>
              {(brands ?? []).map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
              <option value="__new">+ Add new brand…</option>
            </select>
          </label>

          <Field
            label="New brand name"
            name="new_brand_name"
            placeholder="Only if 'Add new brand' is selected above"
          />

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-indigo-950">Status</span>
            <select
              name="status"
              defaultValue="open"
              className="w-full rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm text-indigo-950 focus:outline-none focus:ring-2 focus:ring-indigo-800"
            >
              <option value="draft">Draft</option>
              <option value="open">Open</option>
            </select>
          </label>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Link
              href="/admin/campaigns"
              className="text-sm text-indigo-800/90 hover:text-indigo-950"
            >
              Cancel
            </Link>
            <Button type="submit">Create campaign</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
