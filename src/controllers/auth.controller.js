const { asyncHandler } = require('../utils/asyncHandler');
const { register, login, refreshTokens } = require('../services/auth.service');
const { journalistRepository } = require('../modules/journalists/journalists.repository');
const {
  getAuthContractPayload,
  getRefreshContractPayload,
  getLogoutContractPayload,
} = require('../utils/responseMappers');

const registerHandler = asyncHandler(async (req, res) => {
  const { email, password, company_name } = req.body;
  const result = await register({ email, password, company_name });

  const journalists = result.company
    ? await journalistRepository.listByCompany(result.company.id)
    : [];

  const payload = getAuthContractPayload(result.player, result.company, journalists, {
    access_token: result.access_token,
    refresh_token: result.refresh_token,
  });

  res.status(201).json(payload);
});

const loginHandler = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const result = await login({ email, password });

  const journalists = result.company
    ? await journalistRepository.listByCompany(result.company.id)
    : [];

  const payload = getAuthContractPayload(result.player, result.company, journalists, {
    access_token: result.access_token,
    refresh_token: result.refresh_token,
  });

  res.status(200).json(payload);
});

const refreshHandler = asyncHandler(async (req, res) => {
  const refreshToken = req.body.refresh_token || req.body.refreshToken;
  const tokens = await refreshTokens(refreshToken);
  res.status(200).json(getRefreshContractPayload(tokens));
});

const logoutHandler = asyncHandler(async (_req, res) => {
  res.status(200).json(getLogoutContractPayload());
});

module.exports = { registerHandler, loginHandler, refreshHandler, logoutHandler };
