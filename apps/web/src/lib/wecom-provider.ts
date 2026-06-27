import type { OAuthConfig, OAuthUserConfig } from "next-auth/providers";

type WeComProfile = {
  sub: string;
  name: string;
  email: string;
};

type WeComTokenResponse = {
  access_token?: string;
  errcode?: number;
  errmsg?: string;
};

type WeComUserInfoResponse = {
  UserId?: string;
  errcode?: number;
  errmsg?: string;
};

type WeComUserDetailResponse = {
  userid?: string;
  name?: string;
  email?: string;
  biz_mail?: string;
  errcode?: number;
  errmsg?: string;
};

async function getWeComAccessToken() {
  const corpId = process.env.WEWORK_CORP_ID!;
  const secret = process.env.WEWORK_SECRET!;
  const res = await fetch(
    `https://qyapi.weixin.qq.com/cgi-bin/gettoken?corpid=${corpId}&corpsecret=${secret}`,
    { cache: "no-store" },
  );
  const data = (await res.json()) as WeComTokenResponse;
  if (!data.access_token) {
    throw new Error(data.errmsg ?? "Failed to get WeCom access token");
  }
  return data.access_token;
}

export function WeComProvider(): OAuthConfig<WeComProfile> {
  const corpId = process.env.WEWORK_CORP_ID!;
  const agentId = process.env.WEWORK_AGENT_ID!;
  const authUrl = process.env.AUTH_URL ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000";

  return {
    id: "wecom",
    name: "企业微信",
    type: "oauth",
    clientId: corpId,
    clientSecret: process.env.WEWORK_SECRET!,
    authorization: {
      url: "https://open.weixin.qq.com/connect/oauth2/authorize",
      params: {
        appid: corpId,
        agentid: agentId,
        redirect_uri: `${authUrl}/api/auth/callback/wecom`,
        response_type: "code",
        scope: "snsapi_privateinfo",
      },
    },
    token: {
      url: "https://qyapi.weixin.qq.com/cgi-bin/gettoken",
      async request({ provider }: { provider: OAuthUserConfig<WeComProfile> & { id: string } }): Promise<{
        access_token: string;
        token_type: string;
      }> {
        const accessToken = await getWeComAccessToken();
        return {
          access_token: accessToken,
          token_type: "Bearer",
        };
      },
    },
    userinfo: {
      url: "https://qyapi.weixin.qq.com/cgi-bin/user/getuserinfo",
      async request({
        params,
        provider,
      }: {
        params: Record<string, unknown>;
        provider: OAuthUserConfig<WeComProfile> & { id: string };
      }): Promise<WeComProfile> {
        const code = params.code as string;
        const accessToken = await getWeComAccessToken();

        const userInfoRes = await fetch(
          `https://qyapi.weixin.qq.com/cgi-bin/user/getuserinfo?access_token=${accessToken}&code=${code}`,
          { cache: "no-store" },
        );
        const userInfo = (await userInfoRes.json()) as WeComUserInfoResponse;
        if (!userInfo.UserId) {
          throw new Error(userInfo.errmsg ?? "WeCom userinfo failed");
        }

        const detailRes = await fetch(
          `https://qyapi.weixin.qq.com/cgi-bin/user/get?access_token=${accessToken}&userid=${userInfo.UserId}`,
          { cache: "no-store" },
        );
        const detail = (await detailRes.json()) as WeComUserDetailResponse;
        const email = (detail.email || detail.biz_mail || "").toLowerCase();

        return {
          sub: userInfo.UserId,
          name: detail.name ?? userInfo.UserId,
          email,
        };
      },
    },
    profile(profile: WeComProfile) {
      return {
        id: profile.sub,
        name: profile.name,
        email: profile.email,
        role: "OPERATIONS" as const,
        permissions: [] as import("@prisma/client").AppModule[],
      };
    },
  };
}
