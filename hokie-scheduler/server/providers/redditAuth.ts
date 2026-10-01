import { config } from "../config";
import { fetchText } from "./http";
export interface RedditCredentials {
  accessToken: string;
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  userAgent: string;
}
export function redditConfigured(): boolean {
  return (
    !!config.redditUserAgent &&
    !!(
      config.redditToken ||
      (config.redditClientId && config.redditClientSecret)
    )
  );
}
// Per-process token cache; no credentials are written to disk or returned to the client.
export function createRedditTokenProvider(
  credentials: RedditCredentials,
  request = fetchText,
) {
  let token = "";
  let expires = 0;
  let pending: Promise<string> | undefined;
  return async function getToken(force = false): Promise<string> {
    if (credentials.accessToken) return credentials.accessToken;
    if (
      !credentials.clientId ||
      !credentials.clientSecret ||
      !credentials.userAgent
    )
      throw new Error("Reddit credentials missing");
    if (!force && token && Date.now() < expires) return token;
    if (pending) return pending;
    pending = (async () => {
      const body = new URLSearchParams(
        credentials.refreshToken
          ? {
              grant_type: "refresh_token",
              refresh_token: credentials.refreshToken,
            }
          : { grant_type: "client_credentials" },
      );
      const data = JSON.parse(
        await request("https://www.reddit.com/api/v1/access_token", {
          method: "POST",
          body,
          headers: {
            Authorization:
              "Basic " +
              Buffer.from(
                `${credentials.clientId}:${credentials.clientSecret}`,
              ).toString("base64"),
            "User-Agent": credentials.userAgent,
          },
        }),
      );
      if (
        typeof data.access_token !== "string" ||
        !data.access_token ||
        typeof data.expires_in !== "number" ||
        data.expires_in <= 0
      )
        throw new Error("Reddit did not issue a valid token");
      token = data.access_token;
      expires = Date.now() + Math.max(0, data.expires_in - 60) * 1000;
      return token;
    })();
    try {
      return await pending;
    } finally {
      pending = undefined;
    }
  };
}
export const redditToken = createRedditTokenProvider({
  accessToken: config.redditToken,
  clientId: config.redditClientId,
  clientSecret: config.redditClientSecret,
  refreshToken: config.redditRefreshToken,
  userAgent: config.redditUserAgent,
});
