import { supabase } from "./supabase";

export type CreatorIdea = {
  id: string;
  creator_id: string;
  title: string;
  body: string;
  ai_used: boolean;
  status: string;
  created_at: string;
};

export async function listMyIdeas(creatorId: string) {
  return supabase
    .from("creator_ideas")
    .select("*")
    .eq("creator_id", creatorId)
    .order("created_at", { ascending: false });
}

export async function createIdea(input: {
  creatorId: string;
  title: string;
  body: string;
  aiUsed: boolean;
}) {
  return supabase.from("creator_ideas").insert({
    creator_id: input.creatorId,
    title: input.title,
    body: input.body,
    ai_used: input.aiUsed
  });
}
