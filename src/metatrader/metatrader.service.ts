// src/metatrader/metatrader.service.ts
import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { Observable, throwError, firstValueFrom } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { AxiosError, AxiosResponse } from 'axios';
import { AccountInfo, AccountSummary } from './interfaces/account.interface';
import { Position } from './interfaces/position.interface';
import { TradeHistoryResponse } from './interfaces/trade.interface';

@Injectable()
export class MetatraderService {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly logger = new Logger(MetatraderService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    // Use type assertion to tell TypeScript the shape
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const metatraderConfig = this.configService.get('metatraderService') as
      | {
          baseUrl: string;
          apiKey: string;
        }
      | undefined;

    if (!metatraderConfig) {
      throw new Error('Metatrader configuration not found');
    }

    this.baseUrl = metatraderConfig.baseUrl;
    this.apiKey = metatraderConfig.apiKey;
  }

  private getHeaders(): Record<string, string> {
    return {
      'x-api-key': this.apiKey,
      'Content-Type': 'application/json',
    };
  }

  private handleError(error: unknown, context: string): never {
    // Safely extract error message
    let errorMessage = 'Unknown error';
    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let errorDetails: unknown = undefined;

    if (error instanceof AxiosError) {
      errorMessage = error.message;
      statusCode = error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR;
      errorDetails = error.response?.data;
      this.logger.error(`${context}: ${errorMessage}`, error.stack);

      throw new HttpException(
        {
          statusCode,
          message: errorMessage,
          details: errorDetails,
        },
        statusCode,
      );
    }

    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    }

    this.logger.error(`${context}: ${errorMessage}`);
    throw new HttpException(
      {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: errorMessage,
      },
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }

  // Health checks
  async checkHealth(): Promise<string> {
    try {
      const response$ = this.httpService.get<string>(
        `${this.baseUrl}/api/v1/health`,
      );
      const response = await firstValueFrom(response$);
      return response.data;
    } catch (error) {
      this.handleError(error, 'Health check failed');
    }
  }

  async checkMetatraderHealth(): Promise<string> {
    try {
      const response$ = this.httpService.get<string>(
        `${this.baseUrl}/api/v1/health/metatrader`,
      );
      const response = await firstValueFrom(response$);
      return response.data;
    } catch (error) {
      this.handleError(error, 'Metatrader health check failed');
    }
  }

  // Account endpoints
  async getAccountInfo(): Promise<AccountInfo> {
    try {
      const response$ = this.httpService.get<AccountInfo>(
        `${this.baseUrl}/api/v1/account/info`,
        { headers: this.getHeaders() },
      );
      const response = await firstValueFrom(response$);
      return response.data;
    } catch (error) {
      this.handleError(error, 'Failed to get account info');
    }
  }

  async getAccountSummary(): Promise<AccountSummary> {
    try {
      const response$ = this.httpService.get<AccountSummary>(
        `${this.baseUrl}/api/v1/account/summary`,
        { headers: this.getHeaders() },
      );
      const response = await firstValueFrom(response$);
      return response.data;
    } catch (error) {
      this.handleError(error, 'Failed to get account summary');
    }
  }

  // Positions endpoints
  async getAllPositions(): Promise<Position[]> {
    try {
      const response$ = this.httpService.get<Position[]>(
        `${this.baseUrl}/api/v1/positions/`,
        { headers: this.getHeaders() },
      );
      const response = await firstValueFrom(response$);
      return response.data;
    } catch (error) {
      this.handleError(error, 'Failed to get all positions');
    }
  }

  async getPositionByTicket(ticket: number): Promise<Position> {
    try {
      const response$ = this.httpService.get<Position>(
        `${this.baseUrl}/api/v1/positions/${ticket}`,
        { headers: this.getHeaders() },
      );
      const response = await firstValueFrom(response$);
      return response.data;
    } catch (error) {
      this.handleError(error, `Failed to get position ${ticket}`);
    }
  }

  async getPositionsBySymbol(symbol: string): Promise<Position[]> {
    try {
      const response$ = this.httpService.get<Position[]>(
        `${this.baseUrl}/api/v1/positions/symbol/${symbol}`,
        { headers: this.getHeaders() },
      );
      const response = await firstValueFrom(response$);
      return response.data;
    } catch (error) {
      this.handleError(error, `Failed to get positions for ${symbol}`);
    }
  }

  // Trades endpoints
  async getCurrentTrades(): Promise<any> {
    try {
      const response$ = this.httpService.get<any>(
        `${this.baseUrl}/api/v1/trades/current`,
        { headers: this.getHeaders() },
      );
      const response = await firstValueFrom(response$);
      return response.data;
    } catch (error) {
      this.handleError(error, 'Failed to get current trades');
    }
  }

  async getTradeHistory(
    fromDate?: string,
    toDate?: string,
  ): Promise<TradeHistoryResponse> {
    try {
      const params: Record<string, string> = {};
      if (fromDate) params.from_date = fromDate;
      if (toDate) params.to_date = toDate;

      const response$ = this.httpService.get<TradeHistoryResponse>(
        `${this.baseUrl}/api/v1/trades/history`,
        {
          headers: this.getHeaders(),
          params,
        },
      );
      const response = await firstValueFrom(response$);
      return response.data;
    } catch (error) {
      this.handleError(error, 'Failed to get trade history');
    }
  }

  // Observable versions for real-time updates
  getAccountInfoStream(): Observable<AccountInfo> {
    return this.httpService
      .get<AccountInfo>(`${this.baseUrl}/api/v1/account/info`, {
        headers: this.getHeaders(),
      })
      .pipe(
        map((response: AxiosResponse<AccountInfo>) => response.data),
        catchError((error: AxiosError) => {
          this.logger.error(`Stream error for account info: ${error.message}`);
          return throwError(
            () =>
              new HttpException(
                error.message,
                error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
              ),
          );
        }),
      );
  }

  getPositionsStream(): Observable<Position[]> {
    return this.httpService
      .get<Position[]>(`${this.baseUrl}/api/v1/positions/`, {
        headers: this.getHeaders(),
      })
      .pipe(
        map((response: AxiosResponse<Position[]>) => response.data),
        catchError((error: AxiosError) => {
          this.logger.error(`Stream error for positions: ${error.message}`);
          return throwError(
            () =>
              new HttpException(
                error.message,
                error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
              ),
          );
        }),
      );
  }
}
