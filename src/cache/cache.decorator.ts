// src/cache/cache.decorator.ts
import { SetMetadata, applyDecorators, UseInterceptors, Logger } from "@nestjs/common";
import { CacheInterceptor, CACHE_TTL_KEY, CACHE_KEY_PREFIX } from "./cache.interceptor";

// Decorator to set custom TTL for cache
export const CacheTTL = (ttl: number) => SetMetadata(CACHE_TTL_KEY, ttl);

// Decorator to set cache key prefix
export const CacheKeyPrefix = (prefix: string) => SetMetadata(CACHE_KEY_PREFIX, prefix);

// Main cache decorator
export function CacheResponse(options?: { ttl?: number; keyPrefix?: string }) {
  return applyDecorators(
    UseInterceptors(CacheInterceptor),
    ...(options?.ttl ? [CacheTTL(options.ttl)] : []),
    ...(options?.keyPrefix ? [CacheKeyPrefix(options.keyPrefix)] : []),
  );
}
type CacheKeyFactory = string | string[] | ((...args: any[]) => string | string[]);

export const InvalidateCache = (keys: CacheKeyFactory) => {
  const logger = new Logger("InvalidateCache");

  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const result = await originalMethod.apply(this, args);

      if (!this.cacheService) {
        logger.warn(`No cacheService found on ${target.constructor.name}`);
        return result;
      }

      // Resolve keys
      const resolvedKeys = typeof keys === "function" ? keys(...args) : keys;

      const keysArray = Array.isArray(resolvedKeys) ? resolvedKeys : [resolvedKeys];

      // Process all keys
      await Promise.all(
        keysArray.map(async (key) => {
          try {
            if (key.includes("*") || key.includes("?")) {
              // Pattern matching - get matching keys and delete them
              const matchedKeys: string[] = await this.cacheService.keys(key);

              if (matchedKeys && matchedKeys.length > 0) {
                logger.debug(`Invalidating ${matchedKeys.length} keys matching pattern: ${key}`);

                // Delete all matched keys in parallel
                await Promise.all(matchedKeys.map((matchedKey) => this.cacheService.del(matchedKey)));
              } else {
                logger.debug(`No keys found matching pattern: ${key}`);
              }
            } else {
              // Exact key deletion
              await this.cacheService.del(key);
              logger.debug(`Cache invalidated for key: ${key}`);
            }
          } catch (error) {
            logger.error(`Failed to invalidate cache for key/pattern: ${key}`, error);
            // Don't throw - cache invalidation failures shouldn't break the app
          }
        }),
      );

      return result;
    };

    return descriptor;
  };
};
