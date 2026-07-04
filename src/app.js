const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const { buildCorsOptions } = require("./utils/cors");

const { authRouter } = require("./modules/auth/auth.routes");
const { companyRouter } = require("./modules/company/company.routes");
const {
  journalistRouter,
} = require("./modules/journalists/journalists.routes");
const { characterRouter } = require("./modules/characters/characters.routes");
const { articleRouter } = require("./modules/articles/articles.routes");
const { eventRouter } = require("./modules/events/events.routes");
const { storyRouter } = require("./modules/story/story.routes");
const {
  leaderboardRouter,
} = require("./modules/leaderboard/leaderboard.routes");
const { economyRouter } = require("./modules/economy/economy.routes");
const { statsRouter } = require("./modules/economy/stats.routes");
const { roomRouter } = require("./modules/room/room.routes");
const { newsRouter } = require("./modules/news/news.routes");
const { scenarioRouter } = require("./modules/scenario/scenario.routes");
const { investigationRouter } = require("./modules/investigation/investigation.routes");
const { matchRouter } = require("./modules/match/match.routes");
const { debugRouter } = require("./modules/debug/debug.routes");
const { errorHandler } = require("./middleware/errorHandler");
const { requestLimiter } = require("./middleware/rateLimit");
const { requestLogger } = require("./utils/logger");

function buildApp() {
  const app = express();

  app.use(helmet());
  app.use(cors(buildCorsOptions()));
  app.use(express.json({ limit: "1mb" }));
  app.use(requestLimiter);
  app.use(requestLogger);

  app.get("/health", (_req, res) => {
    res.json(require("./utils/responseMappers").getHealthContractPayload());
  });

  app.use("/auth", authRouter);
  app.use("/company", companyRouter);
  app.use("/journalists", journalistRouter);
  app.use("/characters", characterRouter);
  app.use("/articles", articleRouter);
  app.use("/events", eventRouter);
  app.use("/api", storyRouter);
  app.use("/leaderboard", leaderboardRouter);
  app.use("/economy", economyRouter);
  app.use("/stats", statsRouter);
  app.use("/scenario", scenarioRouter);
  app.use("/news", newsRouter);
  app.use("/investigation", investigationRouter);
  app.use("/match", matchRouter);
  app.use("/rooms", roomRouter);
  app.use("/debug", debugRouter);

  app.use(errorHandler);

  return app;
}

module.exports = { buildApp };
