import { redditConfigured, redditToken } from "./redditAuth";
import { config } from "../config";
import type { ProviderResult } from "../contracts";
import type { SourceCitation } from "../../src/types/index";
import { cached, clean, fetchText } from "./http";
export async function reddit(
  courseIds: string[],
): Promise<ProviderResult<SourceCitation>> {
  if (!redditConfigured())
    return {
      items: [],
      status: {
        source: "reddit",
        state: "not-configured",
        detail:
          "Reddit API access is not configured. No Reddit feedback was used.",
      },
    };
  if (!courseIds.length)
    return {
      items: [],
      status: {
        source: "reddit",
        state: "ready",
        detail: "No candidate courses to search.",
      },
    };
  return cached(`reddit:${courseIds.join(",")}`, 300_000, async () => {
    try {
      const items: SourceCitation[] = [];
      const accessToken = await redditToken();
      // Only r/VirginiaTech; never accept arbitrary URLs or subreddits from chat.
      await Promise.all(
        courseIds.slice(0, 3).map(async (courseId) => {
          const params = new URLSearchParams({
            q: `"${courseId}"`,
            restrict_sr: "on",
            sort: "relevance",
            limit: "4",
            t: "year",
          });
          const response = JSON.parse(
            await fetchText(
              "https://oauth.reddit.com/r/VirginiaTech/search?" + params,
              {
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                  "User-Agent": config.redditUserAgent,
                },
              },
            ),
          );
          for (const child of response?.data?.children ?? []) {
            const p = child?.data;
            if (
              typeof p?.title !== "string" ||
              typeof p?.permalink !== "string" ||
              !/^\/r\/VirginiaTech\/comments\/[a-z0-9]+\//i.test(p.permalink)
            )
              continue;
            const excerpt = clean(`${p.title}. ${p.selftext || ""}`);
            const pattern = new RegExp(courseId.replace(" ", "[ -]?"), "i");
            if (!pattern.test(excerpt) || p.over_18 || p.removed_by_category)
              continue;
            items.push({
              id: `reddit-${p.id}`,
              source: "reddit",
              title: p.title.slice(0, 180),
              url: "https://www.reddit.com" + p.permalink,
              retrievedAt: new Date().toISOString(),
              excerpt: excerpt.slice(0, 1000),
              courseIds: [courseId],
            });
          }
        }),
      );
      return {
        items,
        status: {
          source: "reddit",
          state: "ready",
          detail: `${items.length} matching r/VirginiaTech posts retrieved. Anecdotal student opinions; no professor ratings inferred.`,
        },
      };
    } catch {
      return {
        items: [],
        status: {
          source: "reddit",
          state: "unavailable",
          detail:
            "Reddit API request failed or the token expired. No Reddit claims were generated.",
        },
      };
    }
  });
}
