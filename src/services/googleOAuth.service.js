const crypto = require("crypto");
const { AppError } = require("../utils/appError");
const { issueLocalAuthTokens, resolveGooglePlayer } = require("./auth.service");

const GOOGLE_AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const GOOGLE_TOKENINFO_ENDPOINT = "https://oauth2.googleapis.com/tokeninfo";
const GOOGLE_USERINFO_ENDPOINT =
  "https://openidconnect.googleapis.com/v1/userinfo";
const OAUTH_SESSION_TTL_MS = 10 * 60 * 1000;

const oauthSessions = new Map();

function toBase64Url(buffer) {
  return Buffer.from(buffer)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function randomBase64Url(bytes = 32) {
  return toBase64Url(crypto.randomBytes(bytes));
}

function createCodeChallenge(codeVerifier) {
  return toBase64Url(crypto.createHash("sha256").update(codeVerifier).digest());
}

function getGoogleOAuthConfig() {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new AppError("Google OAuth is not configured", 500);
  }

  return { clientId, clientSecret };
}

function isLoopbackHost(hostname) {
  const normalized = String(hostname || "").toLowerCase();
  return (
    normalized === "localhost" ||
    normalized === "::1" ||
    /^127(?:\.\d{1,3}){3}$/.test(normalized)
  );
}

function normalizeRedirectUri(redirectUri) {
  if (!redirectUri) {
    throw new AppError("redirect_uri is required", 400);
  }

  let parsed;
  try {
    parsed = new URL(redirectUri);
  } catch (_error) {
    throw new AppError("redirect_uri must be a valid URL", 400);
  }

  if (
    !["http:", "https:"].includes(parsed.protocol) ||
    !isLoopbackHost(parsed.hostname)
  ) {
    throw new AppError("redirect_uri must be a loopback HTTP(S) URL", 400);
  }

  return parsed.toString();
}

function buildBackendCallbackUrl(req) {
  const forwardedProto = req.headers["x-forwarded-proto"];
  const protocol = Array.isArray(forwardedProto)
    ? forwardedProto[0]
    : forwardedProto || req.protocol || "http";
  const host = req.headers["x-forwarded-host"] || req.get("host");

  if (!host) {
    throw new AppError("Unable to determine OAuth callback URL", 500);
  }

  return new URL("/auth/google/callback", `${protocol}://${host}`).toString();
}

function purgeExpiredSessions() {
  const now = Date.now();

  for (const [state, session] of oauthSessions.entries()) {
    if (session.expiresAt <= now || session.used) {
      oauthSessions.delete(state);
    }
  }
}

function createGoogleOAuthSession({ redirectUri, callbackUrl }) {
  const { clientId } = getGoogleOAuthConfig();
  const normalizedRedirectUri = normalizeRedirectUri(redirectUri);
  const state = randomBase64Url(32);
  const codeVerifier = randomBase64Url(64);
  const codeChallenge = createCodeChallenge(codeVerifier);

  purgeExpiredSessions();

  oauthSessions.set(state, {
    redirectUri: normalizedRedirectUri,
    callbackUrl,
    codeVerifier,
    expiresAt: Date.now() + OAUTH_SESSION_TTL_MS,
    used: false,
  });

  const authorizationUrl = new URL(GOOGLE_AUTH_ENDPOINT);
  authorizationUrl.searchParams.set("client_id", clientId);
  authorizationUrl.searchParams.set("redirect_uri", callbackUrl);
  authorizationUrl.searchParams.set("response_type", "code");
  authorizationUrl.searchParams.set("scope", "openid email profile");
  authorizationUrl.searchParams.set("state", state);
  authorizationUrl.searchParams.set("code_challenge", codeChallenge);
  authorizationUrl.searchParams.set("code_challenge_method", "S256");
  authorizationUrl.searchParams.set("prompt", "select_account");

  return {
    state,
    authorizationUrl: authorizationUrl.toString(),
  };
}

function consumeGoogleOAuthSession(state) {
  purgeExpiredSessions();

  if (!state) {
    return null;
  }

  const session = oauthSessions.get(state);
  if (!session) {
    return null;
  }

  oauthSessions.delete(state);
  session.used = true;
  return session;
}

async function exchangeGoogleAuthorizationCode({
  code,
  codeVerifier,
  callbackUrl,
}) {
  const { clientId, clientSecret } = getGoogleOAuthConfig();

  const response = await fetch(GOOGLE_TOKEN_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      code_verifier: codeVerifier,
      grant_type: "authorization_code",
      redirect_uri: callbackUrl,
    }),
  });

  if (!response.ok) {
    throw new AppError("Authentication failed", 401);
  }

  const tokenPayload = await response.json();
  if (!tokenPayload.access_token || !tokenPayload.id_token) {
    throw new AppError("Invalid Google response", 401);
  }

  return tokenPayload;
}

async function fetchGoogleIdentity({ accessToken, idToken }) {
  const { clientId } = getGoogleOAuthConfig();

  const [tokenInfoResponse, userInfoResponse] = await Promise.all([
    fetch(
      `${GOOGLE_TOKENINFO_ENDPOINT}?id_token=${encodeURIComponent(idToken)}`,
    ),
    fetch(GOOGLE_USERINFO_ENDPOINT, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }),
  ]);

  if (!tokenInfoResponse.ok || !userInfoResponse.ok) {
    throw new AppError("Invalid Google account", 401);
  }

  const tokenInfo = await tokenInfoResponse.json();
  const userInfo = await userInfoResponse.json();

  const issuer = tokenInfo.iss;
  if (
    tokenInfo.aud !== clientId ||
    (issuer !== "accounts.google.com" &&
      issuer !== "https://accounts.google.com") ||
    String(tokenInfo.email_verified) !== "true"
  ) {
    throw new AppError("Invalid Google account", 401);
  }

  const firebaseUid = tokenInfo.sub || userInfo.sub;
  const email = userInfo.email || tokenInfo.email;

  if (!firebaseUid || !email) {
    throw new AppError("Invalid Google account", 401);
  }

  return {
    firebaseUid,
    email,
    displayName: userInfo.name || tokenInfo.name || userInfo.given_name || null,
    photoURL: userInfo.picture || tokenInfo.picture || null,
  };
}

async function completeGoogleOAuthLogin({ code, session }) {
  if (!session) {
    throw new AppError("Invalid or expired OAuth state", 400);
  }

  if (!code) {
    throw new AppError("Authentication failed", 401);
  }

  const tokenPayload = await exchangeGoogleAuthorizationCode({
    code,
    codeVerifier: session.codeVerifier,
    callbackUrl: session.callbackUrl,
  });

  const identity = await fetchGoogleIdentity({
    accessToken: tokenPayload.access_token,
    idToken: tokenPayload.id_token,
  });

  const player = await resolveGooglePlayer(identity);
  const tokens = issueLocalAuthTokens(player);

  return {
    player,
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    redirectUri: session.redirectUri,
  };
}

module.exports = {
  buildBackendCallbackUrl,
  completeGoogleOAuthLogin,
  consumeGoogleOAuthSession,
  createGoogleOAuthSession,
  normalizeRedirectUri,
};
