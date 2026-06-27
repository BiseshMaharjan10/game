const { AppError } = require('./appError');

function requireString(value, fieldName, minLength = 1) {
  if (typeof value !== 'string' || value.trim().length < minLength) {
    throw new AppError(`${fieldName} is required`, 400);
  }
  return value.trim();
}

function requireEmail(value) {
  const email = requireString(value, 'email');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new AppError('email is invalid', 400);
  }
  return email.toLowerCase();
}

function requireInteger(value, fieldName, min = Number.NEGATIVE_INFINITY, max = Number.POSITIVE_INFINITY) {
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new AppError(`${fieldName} must be an integer between ${min} and ${max}`, 400);
  }
  return value;
}

function requireBoolean(value, fieldName) {
  if (typeof value !== 'boolean') {
    throw new AppError(`${fieldName} must be a boolean`, 400);
  }
  return value;
}

module.exports = {
  requireString,
  requireEmail,
  requireInteger,
  requireBoolean
};