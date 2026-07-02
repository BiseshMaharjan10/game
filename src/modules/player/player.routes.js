const { Router } = require("express");
const { authRequired } = require("../../middleware/auth");
const {
  setCompanyNameHandler,
} = require("../../controllers/player.controller");

const playerRouter = Router();

playerRouter.post(
  "/company-name",
  authRequired,
  setCompanyNameHandler,
);

module.exports = { playerRouter };
