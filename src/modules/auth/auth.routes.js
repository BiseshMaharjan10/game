const { Router } = require('express');
const { authLimiter } = require('../../middleware/rateLimit');
const { requireFields } = require('../../middleware/validate');
const { registerHandler, loginHandler, refreshHandler, logoutHandler } = require('../../controllers/auth.controller');

const authRouter = Router();

authRouter.post('/register', authLimiter, requireFields(['username', 'email', 'password']), registerHandler);
authRouter.post('/login', authLimiter, requireFields(['identifier', 'password']), loginHandler);
authRouter.post('/refresh', authLimiter, requireFields(['refreshToken']), refreshHandler);
authRouter.post('/logout', authLimiter, logoutHandler);

module.exports = { authRouter };