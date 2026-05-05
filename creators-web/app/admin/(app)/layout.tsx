import { redirect } from "next/navigation";
import Link from "next/link";
import type { ReactNode } from "react";
import { getAdminSession } from "@/lib/admin-session";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");

  return (
    <div className="min-h-screen bg-indigo-50 text-indigo-950">
      <aside className="fixed inset-y-0 left-0 flex w-60 flex-col border-r border-indigo-900 bg-indigo-800 px-4 py-6 text-white">
        <div className="mb-8 px-2">
          <p className="text-xs uppercase tracking-wider text-indigo-200">Buyhatke</p>
          <p className="text-lg font-semibold">Creators Club</p>
        </div>
        <nav className="flex flex-col gap-1 text-sm">
          <NavLink href="/admin">Overview</NavLink>
          <NavLink href="/admin/campaigns">Campaigns</NavLink>
          <NavLink href="/admin/applications">Applications</NavLink>
          <NavLink href="/admin/creators">Creators</NavLink>
          <NavLink href="/admin/submissions">Submissions</NavLink>
          <NavLink href="/admin/drafts">Draft reviews</NavLink>
          <NavLink href="/admin/ideas">Ideas inbox</NavLink>
          <NavLink href="/admin/support">Support</NavLink>
          <NavLink href="/admin/trending">Trending content</NavLink>
        </nav>
        <div className="mt-auto border-t border-indigo-700/80 pt-4 text-xs text-indigo-200">
          <p className="truncate">{session.name ?? session.email}</p>
          <form action="/api/admin/auth/logout" method="post" className="mt-2">
            <button className="text-indigo-100 underline-offset-2 hover:underline" type="submit">
              Sign out
            </button>
          </form>
        </div>
      </aside>
      <main className="pl-60">
        <div className="mx-auto max-w-5xl px-8 py-8">{children}</div>
      </main>
    </div>
  );
}

function NavLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-md px-3 py-2 text-indigo-100 hover:bg-indigo-900/60 hover:text-white"
    >
      {children}
    </Link>
  );
}
