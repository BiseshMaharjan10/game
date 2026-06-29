function parseClientOrigins(rawValue) {
  if (!rawValue) {
    return '*';
  }

  const origins = rawValue
    .split(',')
    .map(function(origin) {
      return origin.trim();
    })
    .filter(Boolean);

  if (origins.length === 0) {
    return '*';
  }

  if (origins.length === 1) {
    return origins[0];
  }

  return origins;
}

function buildCorsOptions() {
  return {
    origin: parseClientOrigins(process.env.CLIENT_ORIGIN),
    credentials: false,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    optionsSuccessStatus: 204
  };
}

module.exports = {
  buildCorsOptions,
  parseClientOrigins
};
