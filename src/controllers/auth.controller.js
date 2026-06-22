const { asyncHandler } = require('../utils/asyncHandler');
const { register, login, refresh, logout } = require('../services/auth.service');

const registerHandler = asyncHandler(async (req, res) => {
  const result = await register(req.body);
  res.status(201).json(result);
});

const loginHandler = asyncHandler(async (req, res) => {
  const result = await login({ identity: req.body.identifier || req.body.identity, password: req.body.password });
  res.json(result);
});

const refreshHandler = asyncHandler(async (req, res) => {
  const result = await refresh(req.body.refreshToken);
  res.json(result);
});

const logoutHandler = asyncHandler(async (req, res) => {
  const result = await logout(req.body.refreshToken);
  res.json(result);
});

module.exports = { registerHandler, loginHandler, refreshHandler, logoutHandler };
