const { AppError } = require("../src/utils/appError");

jest.mock("../src/config/firebase", () => ({
  verifyFirebaseToken: jest.fn(),
  admin: { auth: jest.fn() },
}));

describe("google oauth service security", () => {
  beforeEach(() => {
    process.env.GOOGLE_OAUTH_CLIENT_ID = "test-client";
    process.env.GOOGLE_OAUTH_CLIENT_SECRET = "test-secret";
    jest.resetModules();
  });

  afterEach(() => {
    delete process.env.GOOGLE_OAUTH_CLIENT_ID;
    delete process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  });

  test("rejects forged redirect uris", () => {
    const {
      normalizeRedirectUri,
    } = require("../src/services/googleOAuth.service");

    expect(() => normalizeRedirectUri("https://evil.com/callback")).toThrow(
      "redirect_uri must be a loopback HTTP(S) URL",
    );
    expect(() =>
      normalizeRedirectUri("http://127.0.0.1:49393/callback"),
    ).not.toThrow();
  });

  test("consumes oauth state once", () => {
    const {
      createGoogleOAuthSession,
      consumeGoogleOAuthSession,
    } = require("../src/services/googleOAuth.service");

    const session = createGoogleOAuthSession({
      redirectUri: "http://127.0.0.1:49393/callback",
      callbackUrl: "http://backend.local/auth/google/callback",
    });

    const first = consumeGoogleOAuthSession(session.state);
    const second = consumeGoogleOAuthSession(session.state);

    expect(first).toEqual(
      expect.objectContaining({
        redirectUri: "http://127.0.0.1:49393/callback",
        callbackUrl: "http://backend.local/auth/google/callback",
      }),
    );
    expect(second).toBeNull();
  });
});
