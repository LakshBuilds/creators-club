import "server-only";

const GRAPH_BASE = "https://graph.facebook.com/v22.0";

export type IgInsights = {
  handle: string;
  configured: boolean;
  error?: string;
  profile?: {
    username: string;
    name?: string;
    biography?: string;
    followers_count?: number;
    media_count?: number;
    profile_picture_url?: string;
    website?: string;
  };
  recentMedia?: Array<{
    id: string;
    caption?: string;
    media_type?: string;
    media_url?: string;
    permalink?: string;
    timestamp?: string;
    like_count?: number;
    comments_count?: number;
    comments?: Array<{
      id: string;
      text: string;
      username?: string;
      timestamp?: string;
    }>;
  }>;
};

export async function fetchInstagramInsights(handle: string): Promise<IgInsights> {
  const token = process.env.META_IG_LONG_LIVED_TOKEN;
  const igUserId = process.env.META_IG_USER_ID;

  if (!token || !igUserId) {
    return {
      handle,
      configured: false,
      error:
        "Set META_IG_USER_ID and META_IG_LONG_LIVED_TOKEN to query the Business Discovery API."
    };
  }

  const mediaFields =
    "id,caption,media_type,media_url,permalink,timestamp,like_count,comments_count,comments.limit(5){id,text,username,timestamp}";
  const profileFields = `business_discovery.username(${handle}){username,name,biography,followers_count,media_count,profile_picture_url,website,media.limit(6){${mediaFields}}}`;

  const url = new URL(`${GRAPH_BASE}/${igUserId}`);
  url.searchParams.set("fields", profileFields);
  url.searchParams.set("access_token", token);

  try {
    const res = await fetch(url.toString(), { next: { revalidate: 60 } });
    const body = await res.json();
    if (body.error) {
      return { handle, configured: true, error: body.error.message ?? "Meta API error" };
    }
    const bd = body.business_discovery;
    if (!bd) {
      return { handle, configured: true, error: "No business_discovery in response" };
    }
    return {
      handle,
      configured: true,
      profile: {
        username: bd.username,
        name: bd.name,
        biography: bd.biography,
        followers_count: bd.followers_count,
        media_count: bd.media_count,
        profile_picture_url: bd.profile_picture_url,
        website: bd.website
      },
      recentMedia: (bd.media?.data ?? []).map(
        (m: {
          id: string;
          caption?: string;
          media_type?: string;
          media_url?: string;
          permalink?: string;
          timestamp?: string;
          like_count?: number;
          comments_count?: number;
          comments?: { data?: Array<{ id: string; text: string; username?: string; timestamp?: string }> };
        }) => ({
          id: m.id,
          caption: m.caption,
          media_type: m.media_type,
          media_url: m.media_url,
          permalink: m.permalink,
          timestamp: m.timestamp,
          like_count: m.like_count,
          comments_count: m.comments_count,
          comments: m.comments?.data ?? []
        })
      )
    };
  } catch (e) {
    return {
      handle,
      configured: true,
      error: e instanceof Error ? e.message : "Fetch failed"
    };
  }
}
