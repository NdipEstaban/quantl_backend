// src/cache/cache.service.ts
import { Injectable, Inject, Logger, OnModuleInit } from "@nestjs/common";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Cache } from "cache-manager";

@Injectable()
export class CacheService implements OnModuleInit {
  private readonly logger = new Logger(CacheService.name);
  private readonly memoryCachePrefix = "memory:";
  private readonly redisCachePrefix = "redis:";
  private redisClient: any;
  // Double namespace due to cache-manager + Keyv setup
  private readonly redisKeyPrefix = "quantl-cache::quantl-cache:";

  constructor(@Inject(CACHE_MANAGER) private readonly cacheManager: Cache) {}

  async onModuleInit() {
    try {
      const stores = (this.cacheManager as any).stores;

      if (stores && Array.isArray(stores) && stores.length > 1) {
        this.logger.log(`Found ${stores.length} cache stores`);

        // Access Redis client from the second store (L2 cache)
        const redisStore = stores[1];
        this.redisClient = redisStore?._store?._client;

        if (this.redisClient) {
          // Check if client is already connected
          if (!this.redisClient.isOpen) {
            this.logger.log("Redis client is closed, attempting to connect...");

            try {
              await this.redisClient.connect();
              this.logger.log("✅ Redis client connected successfully");
            } catch (connectError) {
              this.logger.error("Failed to connect Redis client:", connectError);
              return;
            }
          } else {
            this.logger.log("✅ Redis client already connected");
          }

          // Test the connection with correct prefix
          try {
            const testKeys = await this.redisClient.keys(`${this.redisKeyPrefix}*`);
            this.logger.log(
              `Redis test: found ${testKeys?.length || 0} keys with prefix ${this.redisKeyPrefix}`,
            );
            if (testKeys?.length > 0) {
              this.logger.debug(`Sample keys: ${testKeys.slice(0, 3).join(", ")}`);
            }
          } catch (testError) {
            this.logger.error("Redis connection test failed:", testError);
          }
        } else {
          this.logger.error("Could not access Redis client at stores[1]._store._client");
        }
      } else {
        this.logger.error("Expected multi-tier cache stores not found");
      }
    } catch (error) {
      this.logger.error("Error initializing Redis client:", error);
    }
  }

  /**
   * Get data from cache with two-level strategy
   */
  async get<T>(key: string): Promise<T | null> {
    try {
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
  async set<T>(key: string, value: T, ttl: number = 0): Promise<void> {
    try {
      await this.cacheManager.set(key, value, ttl);
      this.logger.debug(`Cache set for key: ${key}`);
    } catch (error) {
      this.logger.error(`Error setting cache for key ${key}:`, error);
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
   * Ensure Redis client is connected
   */
  private async ensureRedisConnected(): Promise<boolean> {
    if (!this.redisClient) {
      return false;
    }

    if (!this.redisClient.isOpen) {
      try {
        await this.redisClient.connect();
        this.logger.debug("Redis client reconnected");
      } catch (error) {
        this.logger.error("Failed to reconnect Redis client:", error);
        return false;
      }
    }

    return true;
  }

  /**
   * Get cache keys matching a pattern using Redis SCAN
   * Handles the double namespace prefix automatically
   */
  async keys(pattern?: string): Promise<string[]> {
    try {
      // Ensure Redis is connected
      const isConnected = await this.ensureRedisConnected();
      if (!isConnected) {
        this.logger.error("Redis client not available or not connected");
        return [];
      }

      // Add the double namespace prefix to pattern
      const searchPattern = pattern ? `${this.redisKeyPrefix}${pattern}` : `${this.redisKeyPrefix}*`;

      this.logger.debug(`Searching Redis with pattern: ${searchPattern}`);

      const foundKeys: string[] = [];
      let cursor = "0";

      // Use SCAN for non-blocking iteration
      do {
        const result = await this.redisClient.scan(cursor, {
          MATCH: searchPattern,
          COUNT: 100,
        });

        cursor = result.cursor.toString();
        const keys = result.keys;

        if (keys && keys.length > 0) {
          // Strip the double namespace prefix from results
          const cleanKeys = keys.map((key: string) => key.replace(this.redisKeyPrefix, ""));
          foundKeys.push(...cleanKeys);
          this.logger.debug(`SCAN found ${keys.length} keys (cursor: ${cursor})`);
        }
      } while (cursor !== "0");

      this.logger.log(`Found ${foundKeys.length} keys matching pattern: ${pattern || "*"}`);

      return foundKeys;
    } catch (error) {
      this.logger.error(`Error scanning keys for pattern ${pattern}:`, error);

      // Fallback to KEYS command
      try {
        const isConnected = await this.ensureRedisConnected();
        if (isConnected && typeof this.redisClient.keys === "function") {
          this.logger.warn("Falling back to KEYS command (blocking operation)");

          const searchPattern = pattern ? `${this.redisKeyPrefix}${pattern}` : `${this.redisKeyPrefix}*`;

          this.logger.debug(`KEYS command pattern: ${searchPattern}`);

          const keys = await this.redisClient.keys(searchPattern);

          // Strip prefix from results
          const cleanKeys = (keys || []).map((key: string) => key.replace(this.redisKeyPrefix, ""));

          this.logger.log(`KEYS command found ${cleanKeys.length} keys`);
          if (cleanKeys.length > 0) {
            this.logger.debug(`Sample clean keys: ${cleanKeys.slice(0, 3).join(", ")}`);
          }

          return cleanKeys;
        }
      } catch (fallbackError) {
        this.logger.error("Fallback KEYS command also failed:", fallbackError);
      }

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
