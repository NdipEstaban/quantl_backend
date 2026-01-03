// src/cache/cache.service.ts
import { Injectable, Inject, Logger } from "@nestjs/common";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Cache } from "cache-manager";

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private readonly memoryCachePrefix = "memory:";
  private readonly redisCachePrefix = "redis:";

  constructor(@Inject(CACHE_MANAGER) private readonly cacheManager: Cache) {}

  /**
   * Get data from cache with two-level strategy
   * 1. Check memory cache first (L1)
   * 2. If not found, check Redis cache (L2)
   * 3. If found in Redis, store in memory cache for future fast access
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      // Try to get from cache
      const value = await this.cacheManager.get<T>(key);

      if (value !== null && value !== undefined) {
        this.logger.debug(`Cache hit for key: ${key}`);
        return value;
      }

      this.logger.debug(`Cache miss for key: ${key}`);
      return null;
    } catch (error) {
      this.logger.error(`Error getting cache for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set data in both cache levels
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    try {
      await this.cacheManager.set(key, value, ttl);
      this.logger.debug(`Cache set for key: ${key}`);
    } catch (error) {
      this.logger.error(`Error setting cache for key ${key}:`, error);
      // Continue without cache if there's an error
    }
  }

  /**
   * Delete data from all cache levels
   */
  async del(key: string): Promise<void> {
    try {
      await this.cacheManager.del(key);
      this.logger.debug(`Cache deleted for key: ${key}`);
    } catch (error) {
      this.logger.error(`Error deleting cache for key ${key}:`, error);
    }
  }

  /**
   * Reset all cache levels
   */
  async reset(): Promise<void> {
    try {
      await this.cacheManager.clear();
      this.logger.debug("All cache levels reset");
    } catch (error) {
      this.logger.error("Error resetting cache:", error);
    }
  }

  /**
   * Get cache keys (for debugging/monitoring)
   */
  async keys(pattern?: string): Promise<string[]> {
    try {
      // Note: This might not work with all cache stores
      const keys = (await (this.cacheManager.stores as any).keys?.(pattern)) || [];
      return keys;
    } catch (error) {
      this.logger.error("Error getting cache keys:", error);
      return [];
    }
  }

  /**
   * Check if key exists in cache
   */
  async has(key: string): Promise<boolean> {
    try {
      const value = await this.get(key);
      return value !== null && value !== undefined;
    } catch (error) {
      this.logger.error(`Error checking cache for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Get or set data with fallback to fetch function
   */
  async wrap<T>(key: string, fetchFn: () => Promise<T>, ttl?: number): Promise<T> {
    const cached = await this.get<T>(key);

    if (cached !== null && cached !== undefined) {
      return cached;
    }

    const freshData = await fetchFn();
    await this.set(key, freshData, ttl);
    return freshData;
  }
}
