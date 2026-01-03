// src/common/interceptors/transform.interceptor.ts
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Response } from 'express';

export interface ApiResponse<T> {
  data: T;
  timestamp: string;
  path: string;
  success: boolean;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<
  T,
  ApiResponse<T>
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiResponse<T>> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();
    const path = request.url;

    return next.handle().pipe(
      map((data: T) => ({
        data,
        timestamp: new Date().toISOString(),
        path,
        success: response.statusCode >= 200 && response.statusCode < 300,
      })),
    );
  }
}
