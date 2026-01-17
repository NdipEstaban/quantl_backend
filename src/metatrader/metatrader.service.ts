// src/metatrader/metatrader.service.ts
import { Injectable, Logger, HttpException, HttpStatus } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { ConfigService } from "@nestjs/config";
import { Observable, throwError, firstValueFrom } from "rxjs";
import { map, catchError } from "rxjs/operators";
import { AxiosError, AxiosResponse } from "axios";
import {
  AccountInfo,
  AccountSummary,
  AllAccountsSummary,
  ConnectionStatus,
  ConnectionTestResult,
  ConnectionStats,
} from "./interfaces/account.interface";
import { Position, AllPositionsResponse, PositionsBySymbolResponse } from "./interfaces/position.interface";
import {
  TradeHistoryResponse,
  CurrentStateResponse,
  PlaceOrderRequest,
  PlaceOrderResponse,
  SymbolInfo,
  AvailableSymbolsResponse,
} from "./interfaces/trade.interface";
import { ConnectionConfigDto } from "./dto/metatrader.dto";

@Injectable()
export class MetatraderService {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly logger = new Logger(MetatraderService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    const metatraderConfig = this.configService.get("metatraderService");

    if (!metatraderConfig) {
      throw new Error("Metatrader configuration not found");
    }

    this.baseUrl = metatraderConfig.baseUrl;
    this.apiKey = metatraderConfig.apiKey;
  }

  private getHeaders(): Record<string, string> {
    return {
      "x-api-key": this.apiKey,
      "Content-Type": "application/json",
    };
  }

  private handleError(error: unknown, context: string): never {
    let errorMessage = "Unknown error";
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
    } else if (typeof error === "string") {
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

  // ============ Health Endpoints ============
  async checkHealth(): Promise<{ status: string }> {
    try {
      const response$ = this.httpService.get<{ status: string }>(`${this.baseUrl}/health`);
      const response = await firstValueFrom(response$);
      return response.data;
    } catch (error) {
      this.handleError(error, "Health check failed");
    }
  }

  async checkMetatraderHealth(connectionName?: string): Promise<any> {
    try {
      const params: Record<string, string> = {};
      if (connectionName) params.connection_name = connectionName;

      const response$ = this.httpService.get<any>(`${this.baseUrl}/health/mt5`, { params });
      const response = await firstValueFrom(response$);
      return response.data;
    } catch (error) {
      this.handleError(error, "Metatrader health check failed");
    }
  }

  // ============ Account Endpoints ============
  async getAccountInfo(connectionName?: string): Promise<AccountInfo> {
    try {
      const params: Record<string, string> = {};
      if (connectionName) params.connection_name = connectionName;

      const response$ = this.httpService.get<AccountInfo>(`${this.baseUrl}/account/info`, {
        headers: this.getHeaders(),
        params,
      });
      const response = await firstValueFrom(response$);
      return response.data;
    } catch (error) {
      this.handleError(error, "Failed to get account info");
    }
  }

  async getAccountSummary(connectionName?: string): Promise<AccountSummary> {
    try {
      const params: Record<string, string> = {};
      if (connectionName) params.connection_name = connectionName;

      const response$ = this.httpService.get<AccountSummary>(`${this.baseUrl}/account/summary`, {
        headers: this.getHeaders(),
        params,
      });
      const response = await firstValueFrom(response$);
      return response.data;
    } catch (error) {
      this.handleError(error, "Failed to get account summary");
    }
  }

  async getAllAccountsSummary(): Promise<AllAccountsSummary> {
    try {
      const response$ = this.httpService.get<AllAccountsSummary>(`${this.baseUrl}/account/all-summary`, {
        headers: this.getHeaders(),
      });
      const response = await firstValueFrom(response$);
      return response.data;
    } catch (error) {
      this.handleError(error, "Failed to get all accounts summary");
    }
  }

  async getConnectionsStatus(connectionName?: string): Promise<ConnectionStatus> {
    try {
      const params: Record<string, string> = {};
      if (connectionName) params.connection_name = connectionName;

      const response$ = this.httpService.get<ConnectionStatus>(`${this.baseUrl}/account/connections`, {
        headers: this.getHeaders(),
        params,
      });
      const response = await firstValueFrom(response$);
      return response.data;
    } catch (error) {
      this.handleError(error, "Failed to get connections status");
    }
  }

  // ============ Connection Management Endpoints ============
  async createConnection(config: ConnectionConfigDto): Promise<any> {
    try {
      const response$ = this.httpService.post<any>(`${this.baseUrl}/connections/`, config, {
        headers: this.getHeaders(),
      });
      const response = await firstValueFrom(response$);
      return response.data;
    } catch (error) {
      this.handleError(error, "Failed to create connection");
    }
  }

  async testConnection(config: ConnectionConfigDto): Promise<ConnectionTestResult> {
    try {
      const response$ = this.httpService.post<ConnectionTestResult>(
        `${this.baseUrl}/connections/test`,
        config,
        {
          headers: this.getHeaders(),
        },
      );
      const response = await firstValueFrom(response$);
      return response.data;
    } catch (error) {
      this.handleError(error, "Failed to test connection");
    }
  }

  async listConnections(detailed?: boolean, status?: string): Promise<any> {
    try {
      const params: Record<string, any> = {};
      if (detailed) params.detailed = detailed;
      if (status) params.status = status;

      const response$ = this.httpService.get<any>(`${this.baseUrl}/connections/`, {
        headers: this.getHeaders(),
        params,
      });
      const response = await firstValueFrom(response$);
      return response.data;
    } catch (error) {
      this.handleError(error, "Failed to list connections");
    }
  }

  async getConnection(name: string): Promise<any> {
    try {
      const response$ = this.httpService.get<any>(`${this.baseUrl}/connections/${name}`, {
        headers: this.getHeaders(),
      });
      const response = await firstValueFrom(response$);
      return response.data;
    } catch (error) {
      this.handleError(error, `Failed to get connection ${name}`);
    }
  }

  async updateConnection(name: string, config: any): Promise<any> {
    try {
      const response$ = this.httpService.put<any>(`${this.baseUrl}/connections/${name}`, config, {
        headers: this.getHeaders(),
      });
      const response = await firstValueFrom(response$);
      return response.data;
    } catch (error) {
      this.handleError(error, `Failed to update connection ${name}`);
    }
  }

  async deleteConnection(name: string, force?: boolean): Promise<any> {
    try {
      const params: Record<string, any> = {};
      if (force) params.force = force;

      const response$ = this.httpService.delete<any>(`${this.baseUrl}/connections/${name}`, {
        headers: this.getHeaders(),
        params,
      });
      const response = await firstValueFrom(response$);
      return response.data;
    } catch (error) {
      this.handleError(error, `Failed to delete connection ${name}`);
    }
  }

  async connectToAccount(name: string): Promise<any> {
    try {
      const response$ = this.httpService.post<any>(
        `${this.baseUrl}/connections/${name}/connect`,
        {},
        {
          headers: this.getHeaders(),
        },
      );
      const response = await firstValueFrom(response$);
      return response.data;
    } catch (error) {
      this.handleError(error, `Failed to connect to ${name}`);
    }
  }

  async disconnectFromAccount(name: string): Promise<any> {
    try {
      const response$ = this.httpService.post<any>(
        `${this.baseUrl}/connections/${name}/disconnect`,
        {},
        {
          headers: this.getHeaders(),
        },
      );
      const response = await firstValueFrom(response$);
      return response.data;
    } catch (error) {
      this.handleError(error, `Failed to disconnect from ${name}`);
    }
  }

  async reconnectToAccount(name: string): Promise<any> {
    try {
      const response$ = this.httpService.post<any>(
        `${this.baseUrl}/connections/${name}/reconnect`,
        {},
        {
          headers: this.getHeaders(),
        },
      );
      const response = await firstValueFrom(response$);
      return response.data;
    } catch (error) {
      this.handleError(error, `Failed to reconnect to ${name}`);
    }
  }

  async setDefaultConnection(name: string): Promise<any> {
    try {
      const response$ = this.httpService.post<any>(
        `${this.baseUrl}/connections/${name}/set-default`,
        {},
        {
          headers: this.getHeaders(),
        },
      );
      const response = await firstValueFrom(response$);
      return response.data;
    } catch (error) {
      this.handleError(error, `Failed to set default connection ${name}`);
    }
  }

  async getConnectionStats(): Promise<ConnectionStats> {
    try {
      const response$ = this.httpService.get<ConnectionStats>(`${this.baseUrl}/connections/stats/summary`, {
        headers: this.getHeaders(),
      });
      const response = await firstValueFrom(response$);
      return response.data;
    } catch (error) {
      this.handleError(error, "Failed to get connection stats");
    }
  }

  async getAvailableServers(): Promise<any> {
    try {
      const response$ = this.httpService.get<any>(`${this.baseUrl}/connections/available/servers`, {
        headers: this.getHeaders(),
      });
      const response = await firstValueFrom(response$);
      return response.data;
    } catch (error) {
      this.handleError(error, "Failed to get available servers");
    }
  }

  async connectMultiple(names: string[]): Promise<any> {
    try {
      const response$ = this.httpService.post<any>(
        `${this.baseUrl}/connections/bulk/connect`,
        { names },
        {
          headers: this.getHeaders(),
        },
      );
      const response = await firstValueFrom(response$);
      return response.data;
    } catch (error) {
      this.handleError(error, "Failed to connect multiple");
    }
  }

  async disconnectMultiple(names: string[]): Promise<any> {
    try {
      const response$ = this.httpService.post<any>(
        `${this.baseUrl}/connections/bulk/disconnect`,
        { names },
        {
          headers: this.getHeaders(),
        },
      );
      const response = await firstValueFrom(response$);
      return response.data;
    } catch (error) {
      this.handleError(error, "Failed to disconnect multiple");
    }
  }

  async importConnections(connections: ConnectionConfigDto[], autoConnect: boolean = true): Promise<any> {
    try {
      const response$ = this.httpService.post<any>(
        `${this.baseUrl}/connections/import/json`,
        { connections, auto_connect: autoConnect },
        { headers: this.getHeaders() },
      );
      const response = await firstValueFrom(response$);
      return response.data;
    } catch (error) {
      this.handleError(error, "Failed to import connections");
    }
  }

  async exportConnections(includePasswords: boolean = false): Promise<any> {
    try {
      const params: Record<string, any> = { include_passwords: includePasswords };
      const response$ = this.httpService.get<any>(`${this.baseUrl}/connections/export/json`, {
        headers: this.getHeaders(),
        params,
      });
      const response = await firstValueFrom(response$);
      return response.data;
    } catch (error) {
      this.handleError(error, "Failed to export connections");
    }
  }

  // ============ Positions Endpoints ============
  async getAllPositions(connectionName?: string): Promise<Position[]> {
    try {
      const params: Record<string, string> = {};
      if (connectionName) params.connection_name = connectionName;

      const response$ = this.httpService.get<{ positions: Position[] }>(`${this.baseUrl}/positions/`, {
        headers: this.getHeaders(),
        params,
      });
      const response = await firstValueFrom(response$);
      return response.data.positions;
    } catch (error) {
      this.handleError(error, "Failed to get all positions");
    }
  }

  async getAllPositionsAllConnections(): Promise<AllPositionsResponse> {
    try {
      const response$ = this.httpService.get<AllPositionsResponse>(`${this.baseUrl}/positions/all`, {
        headers: this.getHeaders(),
      });
      const response = await firstValueFrom(response$);
      return response.data;
    } catch (error) {
      this.handleError(error, "Failed to get all positions across connections");
    }
  }

  async getPositionByTicket(ticket: number, connectionName?: string): Promise<Position> {
    try {
      const params: Record<string, string> = {};
      if (connectionName) params.connection_name = connectionName;

      const response$ = this.httpService.get<Position>(`${this.baseUrl}/positions/${ticket}`, {
        headers: this.getHeaders(),
        params,
      });
      const response = await firstValueFrom(response$);
      return response.data;
    } catch (error) {
      this.handleError(error, `Failed to get position ${ticket}`);
    }
  }

  async getPositionsBySymbol(symbol: string, connectionName?: string): Promise<Position[]> {
    try {
      const params: Record<string, string> = {};
      if (connectionName) params.connection_name = connectionName;

      const response$ = this.httpService.get<{ positions: Position[] }>(
        `${this.baseUrl}/positions/symbol/${symbol}`,
        {
          headers: this.getHeaders(),
          params,
        },
      );
      const response = await firstValueFrom(response$);
      return response.data.positions;
    } catch (error) {
      this.handleError(error, `Failed to get positions for ${symbol}`);
    }
  }

  async getPositionsBySymbolAllConnections(symbol: string): Promise<PositionsBySymbolResponse> {
    try {
      const response$ = this.httpService.get<PositionsBySymbolResponse>(
        `${this.baseUrl}/positions/symbol/${symbol}/all`,
        { headers: this.getHeaders() },
      );
      const response = await firstValueFrom(response$);
      return response.data;
    } catch (error) {
      this.handleError(error, `Failed to get positions for ${symbol} across connections`);
    }
  }

  async closePosition(ticket: number, volume?: number, connectionName?: string): Promise<any> {
    try {
      const params: Record<string, any> = {};
      if (volume) params.volume = volume;
      if (connectionName) params.connection_name = connectionName;

      const response$ = this.httpService.delete<any>(`${this.baseUrl}/positions/${ticket}`, {
        headers: this.getHeaders(),
        params,
      });
      const response = await firstValueFrom(response$);
      return response.data;
    } catch (error) {
      this.handleError(error, `Failed to close position ${ticket}`);
    }
  }

  // ============ Trade Endpoints ============
  async getTradeHistory(days: number = 7, connectionName?: string): Promise<TradeHistoryResponse> {
    try {
      const params: Record<string, any> = { days };
      if (connectionName) params.connection_name = connectionName;

      const response$ = this.httpService.get<TradeHistoryResponse>(`${this.baseUrl}/trade/history`, {
        headers: this.getHeaders(),
        params,
      });
      const response = await firstValueFrom(response$);
      return response.data;
    } catch (error) {
      this.handleError(error, "Failed to get trade history");
    }
  }

  async getCurrentState(connectionName?: string): Promise<CurrentStateResponse> {
    try {
      const params: Record<string, string> = {};
      if (connectionName) params.connection_name = connectionName;

      const response$ = this.httpService.get<CurrentStateResponse>(`${this.baseUrl}/trade/state`, {
        headers: this.getHeaders(),
        params,
      });
      const response = await firstValueFrom(response$);
      return response.data;
    } catch (error) {
      this.handleError(error, "Failed to get current state");
    }
  }

  async placeOrder(orderData: PlaceOrderRequest): Promise<PlaceOrderResponse> {
    try {
      const { symbol, order_type, volume, price, sl, tp, connection_name } = orderData;
      const params: Record<string, any> = {
        symbol,
        order_type,
        volume,
      };

      if (price) params.price = price;
      if (sl) params.sl = sl;
      if (tp) params.tp = tp;
      if (connection_name) params.connection_name = connection_name;

      const response$ = this.httpService.post<PlaceOrderResponse>(`${this.baseUrl}/trade/order`, null, {
        headers: this.getHeaders(),
        params,
      });
      const response = await firstValueFrom(response$);
      return response.data;
    } catch (error) {
      this.handleError(error, "Failed to place order");
    }
  }

  async getAvailableSymbols(connectionName?: string): Promise<AvailableSymbolsResponse> {
    try {
      const params: Record<string, string> = {};
      if (connectionName) params.connection_name = connectionName;

      const response$ = this.httpService.get<AvailableSymbolsResponse>(`${this.baseUrl}/trade/symbols`, {
        headers: this.getHeaders(),
        params,
      });
      const response = await firstValueFrom(response$);
      return response.data;
    } catch (error) {
      this.handleError(error, "Failed to get available symbols");
    }
  }

  async getSymbolInfo(symbol: string, connectionName?: string): Promise<SymbolInfo> {
    try {
      const params: Record<string, string> = {};
      if (connectionName) params.connection_name = connectionName;

      const response$ = this.httpService.get<SymbolInfo>(`${this.baseUrl}/trade/symbol/${symbol}/info`, {
        headers: this.getHeaders(),
        params,
      });
      const response = await firstValueFrom(response$);
      return response.data;
    } catch (error) {
      this.handleError(error, `Failed to get symbol info for ${symbol}`);
    }
  }
}
