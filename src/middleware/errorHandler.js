const { AppError } = require('../utils/appError');
const { errorLogger } = require('../utils/logger');

function errorHandler(err, req, res, _next) {
  errorLogger(err, req, res, () => {});

  const statusCode = err.statusCode || (err.name === 'PrismaClientKnownRequestError' ? 400 : 500);
  const payload = {
    message: err.message || 'Internal server error'
  };

  if (err.details) {
    payload.details = err.details;
  }

  if (process.env.NODE_ENV !== 'production' && !(err instanceof AppError)) {
    payload.stack = err.stack;
  }

  res.status(statusCode).json({ error: payload });
}

module.exports = { errorHandler };
