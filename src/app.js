const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const { authRouter } = require('./modules/auth/auth.routes');
const { companyRouter } = require('./modules/company/company.routes');
const { journalistRouter } = require('./modules/journalists/journalists.routes');
const { articleRouter } = require('./modules/articles/articles.routes');
const { eventRouter } = require('./modules/events/events.routes');
const { leaderboardRouter } = require('./modules/leaderboard/leaderboard.routes');
const { economyRouter } = require('./modules/economy/economy.routes');
const { statsRouter } = require('./modules/economy/stats.routes');
const { errorHandler } = require('./middleware/errorHandler');
const { requestLimiter } = require('./middleware/rateLimit');

function buildApp() {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: process.env.CLIENT_ORIGIN || true, credentials: true }));
  app.use(express.json({ limit: '1mb' }));
  app.use(requestLimiter);

  app.get('/health', (_req, res) => {
    res.json(require('./utils/responseMappers').getHealthContractPayload());
  });

  app.use('/auth', authRouter);
  app.use('/company', companyRouter);
  app.use('/journalists', journalistRouter);
  app.use('/articles', articleRouter);
  app.use('/events', eventRouter);
  app.use('/leaderboard', leaderboardRouter);
  app.use('/economy', economyRouter);
  app.use('/stats', statsRouter);

  app.use(errorHandler);

  return app;
}

module.exports = { buildApp };