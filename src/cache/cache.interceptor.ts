// src/cache/cache.interceptor.ts
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from "@nestjs/common";
import { Observable, of } from "rxjs";
import { tap } from "rxjs/operators";
import { Reflector } from "@nestjs/core";
import { CacheService } from "./cache.service";

export const CACHE_TTL_KEY = "cache-ttl";
export const CACHE_KEY_PREFIX = "cache-key-prefix";

@Injectable()
export class CacheInterceptor implements NestInterceptor {
  constructor(
    private readonly cacheService: CacheService,
    private readonly reflector: Reflector,
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const customTtl = this.reflector.get<number>(CACHE_TTL_KEY, context.getHandler());
    const keyPrefix = this.reflector.get<string>(CACHE_KEY_PREFIX, context.getHandler()) || "";

    // Generate cache key from request
    const cacheKey = this.generateCacheKey(request, keyPrefix);

    // Try to get from cache first
    const cachedResponse = await this.cacheService.get(cacheKey);

    if (cachedResponse) {
      return of(cachedResponse);
    }

    // If not in cache, handle request and cache response
    return next.handle().pipe(
      tap((response) => {
        // Cache the response
        this.cacheService.set(cacheKey, response, customTtl);
      }),
    );
  }

  private generateCacheKey(request: any, prefix: string): string {
    const { method, url, query, params, body } = request;

    // Create a unique key based on request details
    const keyParts = [
      prefix,
      method,
      url,
      JSON.stringify(query),
      JSON.stringify(params),
      JSON.stringify(body),
    ];

    return keyParts.join("|").replace(/\s+/g, "");
  }
}
