const { Router } = require('express');
const { authLimiter } = require('../../middleware/rateLimit');
const { requireFields } = require('../../middleware/validate');
const { googleSignInHandler, refreshHandler, logoutHandler } = require('../../controllers/auth.controller');

const authRouter = Router();

authRouter.post('/google', authLimiter, requireFields(['idToken']), googleSignInHandler);
authRouter.post('/register', authLimiter, googleSignInHandler);
authRouter.post('/login', authLimiter, googleSignInHandler);
authRouter.post('/refresh', refreshHandler);
authRouter.post('/logout', logoutHandler);

module.exports = { authRouter };