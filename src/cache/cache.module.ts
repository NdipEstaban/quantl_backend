// src/cache/cache.module.ts
import { Module, Global } from "@nestjs/common";
import { CacheModule } from "@nestjs/cache-manager";
import { ConfigModule, ConfigService } from "@nestjs/config";
import KeyvRedis from "@keyv/redis";
import { Keyv } from "keyv";
import { CacheableMemory } from "cacheable";
import { CacheService } from "./cache.service";

@Global()
@Module({
  imports: [
    CacheModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const redisEnabled = configService.get<boolean>("REDIS_ENABLED", false);
        const redisUrl = configService.get<string>("REDIS_URL", "redis://localhost:6379");

        // In-memory cache (L1 cache) - Always present
        const stores = [
          new Keyv({
            store: new CacheableMemory({
              ttl: 15 * 60 * 1000, // 10 minute
              lruSize: 10000, // Keep 10,000 items in LRU cache
            }),
            namespace: "memory-cache",
          }),
        ];

        // Redis cache (L2 cache) - if enabled
        if (redisEnabled) {
          stores.push(
            new Keyv({
              store: new KeyvRedis(redisUrl, {
                connectionTimeout: 10000, // 10 second connection timeout
              }),
              ttl: 60 * 60 * 1000, // 60 minutes TTL for Redis
              namespace: "redis-cache",
            }),
          );
        }

        return {
          stores,
          ttl: 60 * 1000, // Default TTL: 1 minute
          max: 100, // Maximum number of items in cache
        };
      },
    }),
  ],
  providers: [CacheService],
  exports: [CacheService],
})
export class CustomCacheModule {}
