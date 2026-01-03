// src/config/cache.config.ts
export default () => ({
  cache: {
    redis: {
      enabled: process.env.REDIS_ENABLED === "true",
      url: process.env.REDIS_URL || "redis://localhost:6379",
    },
    ttl: {
      short: parseInt(process.env.CACHE_TTL_SHORT ? process.env.CACHE_TTL_SHORT : "60000"),
      medium: parseInt(process.env.CACHE_TTL_MEDIUM ? process.env.CACHE_TTL_MEDIUM : "300000"),
      long: parseInt(process.env.CACHE_TTL_LONG ? process.env.CACHE_TTL_LONG : "1800000"),
    },
  },
});
