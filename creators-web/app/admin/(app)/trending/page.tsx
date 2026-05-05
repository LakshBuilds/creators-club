import { Card } from "@/components/ui/Card";
import { getAdminClient } from "@/lib/admin-supabase";
import { createAudio, createProduct, createReel, removeRow, toggleActive } from "./actions";

type Reel = {
  id: string;
  video_url: string;
  poster_url: string | null;
  caption: string | null;
  category: string | null;
  rank: number;
  is_active: boolean;
};

type Product = {
  id: string;
  buyhatke_site_id: string | null;
  name: string;
  image_url: string | null;
  url: string | null;
  category: string | null;
  rank: number;
  is_active: boolean;
};

type Audio = {
  id: string;
  title: string;
  artist: string | null;
  cover_url: string | null;
  preview_url: string | null;
  ig_audio_id: string | null;
  rank: number;
  is_active: boolean;
};

async function loadAll() {
  const supabase = getAdminClient();
  const [reels, products, audio] = await Promise.all([
    supabase.from("trending_reels").select("*").order("rank", { ascending: true }),
    supabase.from("trending_products").select("*").order("rank", { ascending: true }),
    supabase.from("trending_audio").select("*").order("rank", { ascending: true })
  ]);
  return {
    reels: (reels.data ?? []) as unknown as Reel[],
    products: (products.data ?? []) as unknown as Product[],
    audio: (audio.data ?? []) as unknown as Audio[]
  };
}

export default async function TrendingPage() {
  const { reels, products, audio } = await loadAll();
  return (
    <div>
      <h1 className="text-2xl font-semibold text-indigo-950">Trending content</h1>
      <p className="mt-1 text-sm text-indigo-900/80">
        Curate the rows shown on the mobile home screen. Lower rank = appears first.
      </p>

      <Section title="Reels">
        <form
          action={createReel}
          className="flex flex-wrap items-end gap-2 rounded-md border border-indigo-100 bg-white p-3"
        >
          <Field name="video_url" placeholder="Video URL (mp4 or IG reel)" required wide />
          <Field name="poster_url" placeholder="Poster image URL" wide />
          <Field name="caption" placeholder="Caption" />
          <Field name="category" placeholder="Category" />
          <Field name="rank" placeholder="Rank" type="number" small />
          <button
            type="submit"
            className="rounded-md bg-indigo-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-800"
          >
            Add reel
          </button>
        </form>
        <RowList table="trending_reels" rows={reels.map((r) => ({
          id: r.id,
          is_active: r.is_active,
          left: r.caption ?? r.video_url,
          right: `${r.category ?? "—"} · rank ${r.rank}`
        }))} />
      </Section>

      <Section title="Products">
        <form
          action={createProduct}
          className="flex flex-wrap items-end gap-2 rounded-md border border-indigo-100 bg-white p-3"
        >
          <Field name="name" placeholder="Product name" required />
          <Field name="image_url" placeholder="Image URL" wide />
          <Field name="url" placeholder="Buyhatke / product URL" wide />
          <Field name="buyhatke_site_id" placeholder="Buyhatke site id" small />
          <Field name="category" placeholder="Category" />
          <Field name="rank" placeholder="Rank" type="number" small />
          <button
            type="submit"
            className="rounded-md bg-indigo-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-800"
          >
            Add product
          </button>
        </form>
        <RowList table="trending_products" rows={products.map((p) => ({
          id: p.id,
          is_active: p.is_active,
          left: p.name,
          right: `${p.category ?? "—"} · rank ${p.rank}`
        }))} />
      </Section>

      <Section title="Audio">
        <form
          action={createAudio}
          className="flex flex-wrap items-end gap-2 rounded-md border border-indigo-100 bg-white p-3"
        >
          <Field name="title" placeholder="Audio title" required />
          <Field name="artist" placeholder="Artist" />
          <Field name="cover_url" placeholder="Cover URL" wide />
          <Field name="preview_url" placeholder="Preview audio URL" wide />
          <Field name="ig_audio_id" placeholder="IG audio id" small />
          <Field name="rank" placeholder="Rank" type="number" small />
          <button
            type="submit"
            className="rounded-md bg-indigo-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-800"
          >
            Add audio
          </button>
        </form>
        <RowList table="trending_audio" rows={audio.map((a) => ({
          id: a.id,
          is_active: a.is_active,
          left: `${a.title}${a.artist ? ` — ${a.artist}` : ""}`,
          right: `rank ${a.rank}`
        }))} />
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-indigo-900/70">{title}</h2>
      <div className="mt-3 flex flex-col gap-4">{children}</div>
    </section>
  );
}

function Field({
  name,
  placeholder,
  required,
  wide,
  small,
  type = "text"
}: {
  name: string;
  placeholder: string;
  required?: boolean;
  wide?: boolean;
  small?: boolean;
  type?: string;
}) {
  return (
    <input
      name={name}
      type={type}
      placeholder={placeholder}
      required={required}
      className={`rounded-md border border-indigo-200 px-3 py-1.5 text-xs ${
        wide ? "w-72" : small ? "w-24" : "w-44"
      }`}
    />
  );
}

function RowList({
  table,
  rows
}: {
  table: "trending_reels" | "trending_products" | "trending_audio";
  rows: { id: string; is_active: boolean; left: string; right: string }[];
}) {
  if (rows.length === 0) {
    return <Card><p className="text-sm text-indigo-900/80">No rows yet.</p></Card>;
  }
  return (
    <div className="flex flex-col gap-2">
      {rows.map((r) => (
        <div
          key={r.id}
          className={`flex items-center justify-between rounded-md border px-3 py-2 text-sm ${
            r.is_active ? "border-indigo-100 bg-white" : "border-indigo-100 bg-indigo-50/50 opacity-70"
          }`}
        >
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-indigo-950">{r.left}</p>
            <p className="text-xs text-indigo-900/60">{r.right}</p>
          </div>
          <div className="flex items-center gap-2">
            <form action={toggleActive}>
              <input type="hidden" name="id" value={r.id} />
              <input type="hidden" name="table" value={table} />
              <input type="hidden" name="is_active" value={String(r.is_active)} />
              <button
                type="submit"
                className="rounded-md border border-indigo-200 px-2 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-50"
              >
                {r.is_active ? "Hide" : "Show"}
              </button>
            </form>
            <form action={removeRow}>
              <input type="hidden" name="id" value={r.id} />
              <input type="hidden" name="table" value={table} />
              <button
                type="submit"
                className="rounded-md border border-rose-200 px-2 py-1 text-xs font-medium text-rose-700 hover:bg-rose-50"
              >
                Delete
              </button>
            </form>
          </div>
        </div>
      ))}
    </div>
  );
}
