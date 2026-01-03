// src/config/configuration.ts
export default () => ({
  port: parseInt(process.env.PORT || '3000', 10),
  metatraderService: {
    baseUrl: process.env.MT5_SERVICE_URL || 'http://localhost:8000',
    apiKey: process.env.MT5_API_KEY || 'default-api-key',
  },
});
