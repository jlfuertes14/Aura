// Expo Metro Configuration with Unified Backend API Middleware
// Enables real-time YouTube audio stream extraction and lyrics proxying directly on port 8081
const { getDefaultConfig } = require('expo/metro-config');
const { handleApiRequest } = require('./server/apiHandler');

const config = getDefaultConfig(__dirname);

const originalEnhanceMiddleware = config.server?.enhanceMiddleware;

config.server = {
  ...config.server,
  enhanceMiddleware: (metroMiddleware, server) => {
    const customMiddleware = (req, res, next) => {
      // Intercept our custom API endpoints, health check, and image assets
      if (
        req.url.startsWith('/api/') ||
        req.url.startsWith('/assets/images/') ||
        req.url === '/health'
      ) {
        return handleApiRequest(req, res, next);
      }
      return metroMiddleware(req, res, next);
    };

    if (typeof originalEnhanceMiddleware === 'function') {
      return originalEnhanceMiddleware(customMiddleware, server);
    }
    return customMiddleware;
  },
};

module.exports = config;
