const { asyncHandler } = require('../utils/asyncHandler');
const { googleSignIn } = require('../services/auth.service');
const { companyRepository } = require('../modules/company/company.repository');
const { journalistRepository } = require('../modules/journalists/journalists.repository');
const {
  getAuthContractPayload,
  getRefreshContractPayload,
  getLogoutContractPayload
} = require('../utils/responseMappers');

const googleSignInHandler = asyncHandler(async (req, res) => {
  // result = { player: PlayerDto }
  const result = await googleSignIn(req.body);
  const player = result.player;

  // Fetch company and journalists to populate the company block in the auth response
  // company may be null if the player has not created one yet
  const company = await companyRepository.findByOwnerId(player.id);
  const journalists = company
    ? await journalistRepository.listByCompany(company.id)
    : [];

  // Tokens: the Firebase idToken the client sent IS the access token.
  // This backend does not issue its own tokens — the client manages Firebase sessions.
  // We echo the tokens back so the client contract is satisfied.
  const tokens = {
    access_token:  req.body.idToken   || req.body.access_token  || null,
    refresh_token: req.body.refreshToken || req.body.refresh_token || null
  };

  res.status(200).json(getAuthContractPayload(player, company, journalists, tokens));
});

const refreshHandler = asyncHandler(async (req, res) => {
  const tokens = {
    access_token:  req.body.idToken      || req.body.access_token  || null,
    refresh_token: req.body.refreshToken || req.body.refresh_token || null
  };
  res.status(200).json(getRefreshContractPayload(tokens));
});

const logoutHandler = asyncHandler(async (_req, res) => {
  res.status(200).json(getLogoutContractPayload());
});

module.exports = { googleSignInHandler, refreshHandler, logoutHandler };
