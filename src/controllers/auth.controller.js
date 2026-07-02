const { asyncHandler } = require("../utils/asyncHandler");
const {
  register,
  login,
  refreshTokens,
  googleAuth,
} = require("../services/auth.service");
const {
  buildBackendCallbackUrl,
  completeGoogleOAuthLogin,
  consumeGoogleOAuthSession,
  createGoogleOAuthSession,
} = require("../services/googleOAuth.service");
const {
  characterRepository,
} = require("../modules/journalists/journalists.repository");
const { deskRepository } = require("../modules/desks/desks.repository");
const {
  getAuthContractPayload,
  getRefreshContractPayload,
  getLogoutContractPayload,
} = require("../utils/responseMappers");

const registerHandler = asyncHandler(async (req, res) => {
  const { email, password, name, companyName } = req.body;
  const company_name = name || companyName || null;
  const result = await register({ email, password, companyName: company_name });

  const desks = await deskRepository.findByPlayerId(result.player.id);
  const unlockedDesks = desks.filter(function(d) { return d.unlocked; }).length;

  const payload = getAuthContractPayload(
    result.player,
    result.company,
    [],
    {
      access_token: result.access_token,
      refresh_token: result.refresh_token,
    },
    unlockedDesks,
    desks,
  );

  console.log(`[RESPONSE] POST /auth/register unlocked_desks=${unlockedDesks} desks=${JSON.stringify(desks.map(function(d) { return {deskIndex: d.deskIndex, unlocked: d.unlocked}; }))}`);
  res.status(201).json(payload);
});

const loginHandler = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const result = await login({ email, password });

  const playerCharacters = result.player
    ? await characterRepository.listByPlayer(result.player.id)
    : [];

  const desks = await deskRepository.findByPlayerId(result.player.id);
  const unlockedDesks = desks.filter(function(d) { return d.unlocked; }).length;

  const payload = getAuthContractPayload(
    result.player,
    result.company,
    playerCharacters,
    {
      access_token: result.access_token,
      refresh_token: result.refresh_token,
    },
    unlockedDesks,
    desks,
  );

  console.log(`[RESPONSE] POST /auth/login unlocked_desks=${unlockedDesks} desks=${JSON.stringify(desks.map(function(d) { return {deskIndex: d.deskIndex, unlocked: d.unlocked}; }))}`);
  res.status(200).json(payload);
});

const googleHandler = asyncHandler(async (req, res) => {
  const { idToken } = req.body;
  const result = await googleAuth({ idToken });

  const playerCharacters = result.player
    ? await characterRepository.listByPlayer(result.player.id)
    : [];

  const desks = await deskRepository.findByPlayerId(result.player.id);
  const unlockedDesks = desks.filter(function(d) { return d.unlocked; }).length;

  const payload = getAuthContractPayload(
    result.player,
    result.company,
    playerCharacters,
    {
      access_token: result.access_token,
      refresh_token: result.refresh_token,
    },
    unlockedDesks,
    desks,
  );

  console.log(`[RESPONSE] POST /auth/google unlocked_desks=${unlockedDesks} desks=${JSON.stringify(desks.map(function(d) { return {deskIndex: d.deskIndex, unlocked: d.unlocked}; }))}`);
  res.status(200).json(payload);
});

const googleStartHandler = asyncHandler(async (req, res) => {
  const { redirect_uri: redirectUri } = req.query;
  const callbackUrl = buildBackendCallbackUrl(req);
  const session = createGoogleOAuthSession({ redirectUri, callbackUrl });

  res.redirect(302, session.authorizationUrl);
});

const googleCallbackHandler = asyncHandler(async (req, res) => {
  const { code, state, error, error_description: errorDescription } = req.query;
  const session = consumeGoogleOAuthSession(state);

  if (!session) {
    return res.status(400).send("Authentication failed");
  }

  if (error) {
    const redirectUrl = new URL(session.redirectUri);
    redirectUrl.searchParams.set(
      "error",
      String(errorDescription || error || "Authentication failed"),
    );
    return res.redirect(302, redirectUrl.toString());
  }

  try {
    const result = await completeGoogleOAuthLogin({ code, session });
    const redirectUrl = new URL(result.redirectUri);
    redirectUrl.searchParams.set("access", result.access_token);
    redirectUrl.searchParams.set("refresh", result.refresh_token);
    return res.redirect(302, redirectUrl.toString());
  } catch (error) {
    const redirectUrl = new URL(session.redirectUri);
    redirectUrl.searchParams.set(
      "error",
      error.message || "Authentication failed",
    );
    return res.redirect(302, redirectUrl.toString());
  }
});

const refreshHandler = asyncHandler(async (req, res) => {
  const refreshToken = req.body.refresh_token || req.body.refreshToken;
  const tokens = await refreshTokens(refreshToken);
  res.status(200).json(getRefreshContractPayload(tokens));
});

const logoutHandler = asyncHandler(async (_req, res) => {
  res.status(200).json(getLogoutContractPayload());
});

module.exports = {
  registerHandler,
  loginHandler,
  googleHandler,
  googleStartHandler,
  googleCallbackHandler,
  refreshHandler,
  logoutHandler,
};
