jest.mock("../src/services/googleOAuth.service", () => ({
  buildBackendCallbackUrl: jest
    .fn()
    .mockReturnValue("http://backend.local/auth/google/callback"),
  createGoogleOAuthSession: jest.fn().mockReturnValue({
    state: "state-123",
    authorizationUrl:
      "https://accounts.google.com/o/oauth2/v2/auth?client_id=test-client&state=state-123",
  }),
  consumeGoogleOAuthSession: jest.fn(),
  completeGoogleOAuthLogin: jest.fn(),
}));

jest.mock("../src/config/firebase", () => ({
  verifyFirebaseToken: jest.fn(),
  admin: { auth: jest.fn() },
}));

jest.mock("../src/middleware/auth", () => ({
  authRequired: (req, _res, next) => {
    req.user = { id: "player-1" };
    next();
  },
}));

const request = require("supertest");
const { buildApp } = require("../src/app");
const googleOAuthService = require("../src/services/googleOAuth.service");

describe("browser google auth routes", () => {
  const app = buildApp();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("starts the oauth flow with a browser redirect", async () => {
    const response = await request(app)
      .get("/auth/google")
      .query({ redirect_uri: "http://127.0.0.1:49393/callback" });

    expect(response.status).toBe(302);
    expect(response.headers.location).toContain(
      "https://accounts.google.com/o/oauth2/v2/auth",
    );
    expect(googleOAuthService.createGoogleOAuthSession).toHaveBeenCalledWith({
      redirectUri: "http://127.0.0.1:49393/callback",
      callbackUrl: "http://backend.local/auth/google/callback",
    });
  });

  test("redirects back to the game with local jwt tokens on success", async () => {
    googleOAuthService.consumeGoogleOAuthSession.mockReturnValue({
      redirectUri: "http://127.0.0.1:49393/callback",
      callbackUrl: "http://backend.local/auth/google/callback",
      codeVerifier: "verifier",
    });
    googleOAuthService.completeGoogleOAuthLogin.mockResolvedValue({
      access_token: "access-jwt",
      refresh_token: "refresh-jwt",
      redirectUri: "http://127.0.0.1:49393/callback",
    });

    const response = await request(app)
      .get("/auth/google/callback")
      .query({ code: "code-123", state: "state-123" });

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe(
      "http://127.0.0.1:49393/callback?access=access-jwt&refresh=refresh-jwt",
    );
  });

  test("redirects back to the game with an error when oauth fails", async () => {
    googleOAuthService.consumeGoogleOAuthSession.mockReturnValue({
      redirectUri: "http://127.0.0.1:49393/callback",
      callbackUrl: "http://backend.local/auth/google/callback",
      codeVerifier: "verifier",
    });
    googleOAuthService.completeGoogleOAuthLogin.mockRejectedValue(
      new Error("Invalid Google account"),
    );

    const response = await request(app)
      .get("/auth/google/callback")
      .query({ code: "code-123", state: "state-123" });

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe(
      "http://127.0.0.1:49393/callback?error=Invalid+Google+account",
    );
  });
});
