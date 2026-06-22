const { AppError } = require('../utils/appError');

function errorHandler(err, _req, res, _next) {
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
