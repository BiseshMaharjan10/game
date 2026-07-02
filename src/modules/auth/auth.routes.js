const { Router } = require("express");
const { authLimiter } = require("../../middleware/rateLimit");
const { requireFields } = require("../../middleware/validate");
const {
  registerHandler,
  loginHandler,
  googleStartHandler,
  googleCallbackHandler,
  googleHandler,
  refreshHandler,
  logoutHandler,
} = require("../../controllers/auth.controller");

const authRouter = Router();

authRouter.post("/register", authLimiter, registerHandler);
authRouter.post("/login", authLimiter, loginHandler);
authRouter.get("/google", authLimiter, googleStartHandler);
authRouter.get("/google/callback", googleCallbackHandler);
authRouter.post(
  "/google",
  authLimiter,
  requireFields(["idToken"]),
  googleHandler,
);
authRouter.post("/refresh", refreshHandler);
authRouter.post("/logout", logoutHandler);

module.exports = { authRouter };
