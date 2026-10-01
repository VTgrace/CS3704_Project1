import "dotenv/config";
export const config = {
  port: Number(process.env.PORT || 3001),
  openaiKey: process.env.OPENAI_API_KEY || "",
  openaiModel: process.env.OPENAI_MODEL || "",
  redditToken: process.env.REDDIT_ACCESS_TOKEN || "",
  redditUserAgent: process.env.REDDIT_USER_AGENT || "",
  redditClientId: process.env.REDDIT_CLIENT_ID || "",
  redditClientSecret: process.env.REDDIT_CLIENT_SECRET || "",
  redditRefreshToken: process.env.REDDIT_REFRESH_TOKEN || "",
  reviewFeedUrl: process.env.RMP_FEED_URL || "",
  reviewFeedToken: process.env.RMP_FEED_TOKEN || "",
  catalogFile: process.env.VT_CATALOG_IMPORT_FILE || "",
  reviewFile: process.env.RMP_IMPORT_FILE || "",
};
