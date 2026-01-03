// src/cache/cache.decorator.ts
import { SetMetadata, applyDecorators, UseInterceptors } from "@nestjs/common";
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

// Decorator to invalidate cache
export const InvalidateCache = (keys: string | string[]) => {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const result = await originalMethod.apply(this, args);

      // Get cache service instance
      const cacheService = this.cacheService;
      if (cacheService) {
        const keysToInvalidate = Array.isArray(keys) ? keys : [keys];
        for (const key of keysToInvalidate) {
          await cacheService.del(key);
        }
      }

      return result;
    };

    return descriptor;
  };
};
