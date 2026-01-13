// src/metatrader/metatrader.controller.ts
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Query,
  Body,
  UseInterceptors,
  UseFilters,
  Header,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { MetatraderService } from "./metatrader.service";
import {
  ConnectionNameQueryDto,
  PlaceOrderDto,
  ConnectionConfigDto,
  UpdateConnectionDto,
  ImportConnectionsDto,
  BulkConnectDto,
} from "./dto/metatrader.dto";
import { TransformInterceptor } from "../common/interceptors/transform.interceptor";
import { HttpExceptionFilter } from "../common/filters/http-exception.filter";
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBody } from "@nestjs/swagger";

@ApiTags("Metatrader Trading Data")
@Controller("metatrader")
@UseInterceptors(TransformInterceptor)
@UseFilters(HttpExceptionFilter)
export class MetatraderController {
  constructor(private readonly metatraderService: MetatraderService) {}

  // ============ Health Endpoints ============
  @Get("health")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Health check for metatrader service" })
  @ApiResponse({ status: 200, description: "Service is healthy" })
  async checkHealth(): Promise<{ status: string }> {
    const result = await this.metatraderService.checkHealth();
    return { status: result.status };
  }

  @Get("health/mt5")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "MT5 connection health check" })
  @ApiQuery({ name: "connection_name", required: false, type: String })
  @ApiResponse({ status: 200, description: "MT5 health status" })
  async checkMetatraderHealth(@Query() query: ConnectionNameQueryDto): Promise<any> {
    return this.metatraderService.checkMetatraderHealth(query.connection_name);
  }

  @Get("health/full")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Full health check including all connections" })
  @ApiResponse({ status: 200, description: "Full health status" })
  async fullHealthCheck(): Promise<any> {
    return this.metatraderService.fullHealthCheck();
  }

  // ============ Account Endpoints ============
  @Get("account/info")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Get MT5 account information for a specific connection" })
  @ApiQuery({ name: "connection_name", required: false, type: String })
  @ApiResponse({ status: 200, description: "Account info retrieved successfully" })
  async getAccountInfo(@Query() query: ConnectionNameQueryDto) {
    return this.metatraderService.getAccountInfo(query.connection_name);
  }

  @Get("account/summary")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Get account summary with additional metrics" })
  @ApiQuery({ name: "connection_name", required: false, type: String })
  @ApiResponse({ status: 200, description: "Account summary retrieved successfully" })
  async getAccountSummary(@Query() query: ConnectionNameQueryDto) {
    return this.metatraderService.getAccountSummary(query.connection_name);
  }

  @Get("account/all-summary")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Get summary for all connected accounts" })
  @ApiResponse({ status: 200, description: "All accounts summary retrieved successfully" })
  async getAllAccountsSummary() {
    return this.metatraderService.getAllAccountsSummary();
  }

  @Get("account/connections")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Get status of MT5 connections" })
  @ApiQuery({ name: "connection_name", required: false, type: String })
  @ApiResponse({ status: 200, description: "Connections status retrieved successfully" })
  async getConnectionsStatus(@Query() query: ConnectionNameQueryDto) {
    return this.metatraderService.getConnectionsStatus(query.connection_name);
  }

  // ============ Connection Management Endpoints ============
  @Post("connections")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Create a new MT5 connection" })
  @ApiBody({ type: ConnectionConfigDto })
  @ApiResponse({ status: 201, description: "Connection created successfully" })
  async createConnection(@Body() config: ConnectionConfigDto) {
    return this.metatraderService.createConnection(config);
  }

  @Post("connections/test")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Test MT5 connection without adding it to manager" })
  @ApiBody({ type: ConnectionConfigDto })
  @ApiResponse({ status: 200, description: "Connection test completed" })
  async testConnection(@Body() config: ConnectionConfigDto) {
    return this.metatraderService.testConnection(config);
  }

  @Get("connections")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "List all MT5 connections" })
  @ApiQuery({ name: "detailed", required: false, type: Boolean })
  @ApiQuery({ name: "status", required: false, type: String })
  @ApiResponse({ status: 200, description: "Connections list retrieved" })
  async listConnections(@Query("detailed") detailed?: boolean, @Query("status") status?: string) {
    return this.metatraderService.listConnections(detailed, status);
  }

  @Get("connections/:name")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Get detailed information about a specific connection" })
  @ApiParam({ name: "name", type: String })
  @ApiResponse({ status: 200, description: "Connection details retrieved" })
  async getConnection(@Param("name") name: string) {
    return this.metatraderService.getConnection(name);
  }

  @Put("connections/:name")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Update an existing connection configuration" })
  @ApiParam({ name: "name", type: String })
  @ApiBody({ type: UpdateConnectionDto })
  @ApiResponse({ status: 200, description: "Connection updated successfully" })
  async updateConnection(@Param("name") name: string, @Body() config: UpdateConnectionDto) {
    return this.metatraderService.updateConnection(name, config);
  }

  @Delete("connections/:name")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Delete a connection" })
  @ApiParam({ name: "name", type: String })
  @ApiQuery({ name: "force", required: false, type: Boolean })
  @ApiResponse({ status: 200, description: "Connection deleted successfully" })
  async deleteConnection(@Param("name") name: string, @Query("force") force?: boolean) {
    return this.metatraderService.deleteConnection(name, force);
  }

  @Post("connections/:name/connect")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Connect to a specific MT5 account" })
  @ApiParam({ name: "name", type: String })
  @ApiResponse({ status: 200, description: "Connected successfully" })
  async connectToAccount(@Param("name") name: string) {
    return this.metatraderService.connectToAccount(name);
  }

  @Post("connections/:name/disconnect")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Disconnect from a specific MT5 account" })
  @ApiParam({ name: "name", type: String })
  @ApiResponse({ status: 200, description: "Disconnected successfully" })
  async disconnectFromAccount(@Param("name") name: string) {
    return this.metatraderService.disconnectFromAccount(name);
  }

  @Post("connections/:name/reconnect")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Reconnect to a specific MT5 account" })
  @ApiParam({ name: "name", type: String })
  @ApiResponse({ status: 200, description: "Reconnected successfully" })
  async reconnectToAccount(@Param("name") name: string) {
    return this.metatraderService.reconnectToAccount(name);
  }

  @Post("connections/:name/set-default")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Set a connection as the default" })
  @ApiParam({ name: "name", type: String })
  @ApiResponse({ status: 200, description: "Default connection set" })
  async setDefaultConnection(@Param("name") name: string) {
    return this.metatraderService.setDefaultConnection(name);
  }

  @Get("connections/stats/summary")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Get connection statistics and summary" })
  @ApiResponse({ status: 200, description: "Connection stats retrieved" })
  async getConnectionStats() {
    return this.metatraderService.getConnectionStats();
  }

  @Get("connections/available/servers")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Get list of commonly used MT5 servers" })
  @ApiResponse({ status: 200, description: "Servers list retrieved" })
  async getAvailableServers() {
    return this.metatraderService.getAvailableServers();
  }

  @Post("connections/bulk/connect")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Connect to multiple accounts simultaneously" })
  @ApiBody({ type: BulkConnectDto })
  @ApiResponse({ status: 200, description: "Bulk connect completed" })
  async connectMultiple(@Body() body: BulkConnectDto) {
    return this.metatraderService.connectMultiple(body.names);
  }

  @Post("connections/bulk/disconnect")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Disconnect from multiple accounts" })
  @ApiBody({ type: BulkConnectDto })
  @ApiResponse({ status: 200, description: "Bulk disconnect completed" })
  async disconnectMultiple(@Body() body: BulkConnectDto) {
    return this.metatraderService.disconnectMultiple(body.names);
  }

  @Post("connections/import/json")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Import multiple connections from JSON" })
  @ApiBody({ type: ImportConnectionsDto })
  @ApiResponse({ status: 200, description: "Connections imported" })
  async importConnections(@Body() body: ImportConnectionsDto) {
    return this.metatraderService.importConnections(body.connections, body.auto_connect);
  }

  @Get("connections/export/json")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Export all connections to JSON format" })
  @ApiQuery({ name: "include_passwords", required: false, type: Boolean })
  @ApiResponse({ status: 200, description: "Connections exported" })
  async exportConnections(@Query("include_passwords") includePasswords?: boolean) {
    return this.metatraderService.exportConnections(includePasswords);
  }

  // ============ Positions Endpoints ============
  @Get("positions")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Get all open positions for a specific connection" })
  @ApiQuery({ name: "connection_name", required: false, type: String })
  @ApiResponse({ status: 200, description: "Positions retrieved successfully" })
  async getAllPositions(@Query() query: ConnectionNameQueryDto) {
    return this.metatraderService.getAllPositions(query.connection_name);
  }

  @Get("positions/all")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Get positions from all connected accounts" })
  @ApiResponse({ status: 200, description: "All positions retrieved successfully" })
  async getAllPositionsAllConnections() {
    return this.metatraderService.getAllPositionsAllConnections();
  }

  @Get("positions/:ticket")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Get specific position by ticket number" })
  @ApiParam({ name: "ticket", type: Number, description: "Position ticket number" })
  @ApiQuery({ name: "connection_name", required: false, type: String })
  @ApiResponse({ status: 200, description: "Position retrieved successfully" })
  async getPositionByTicket(@Param("ticket") ticket: number, @Query() query: ConnectionNameQueryDto) {
    return this.metatraderService.getPositionByTicket(ticket, query.connection_name);
  }

  @Get("positions/symbol/:symbol")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Get positions for specific symbol" })
  @ApiParam({ name: "symbol", type: String, description: "Trading symbol (e.g., EURUSD)" })
  @ApiQuery({ name: "connection_name", required: false, type: String })
  @ApiResponse({ status: 200, description: "Symbol positions retrieved successfully" })
  async getPositionsBySymbol(@Param("symbol") symbol: string, @Query() query: ConnectionNameQueryDto) {
    return this.metatraderService.getPositionsBySymbol(symbol, query.connection_name);
  }

  @Get("positions/symbol/:symbol/all")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Get positions for a symbol across all connections" })
  @ApiParam({ name: "symbol", type: String, description: "Trading symbol (e.g., EURUSD)" })
  @ApiResponse({ status: 200, description: "Symbol positions across connections retrieved" })
  async getPositionsBySymbolAllConnections(@Param("symbol") symbol: string) {
    return this.metatraderService.getPositionsBySymbolAllConnections(symbol);
  }

  @Delete("positions/:ticket")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Close a specific position" })
  @ApiParam({ name: "ticket", type: Number, description: "Position ticket number" })
  @ApiQuery({ name: "volume", required: false, type: Number })
  @ApiQuery({ name: "connection_name", required: false, type: String })
  @ApiResponse({ status: 200, description: "Position closed successfully" })
  async closePosition(
    @Param("ticket") ticket: number,
    @Query("volume") volume?: number,
    @Query() query?: ConnectionNameQueryDto,
  ) {
    return this.metatraderService.closePosition(ticket, volume, query?.connection_name);
  }

  // ============ Trade Endpoints ============
  @Get("trade/history")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Get trade history for a specific connection" })
  @ApiQuery({ name: "days", required: false, type: Number, description: "Number of days to look back" })
  @ApiQuery({ name: "connection_name", required: false, type: String })
  @ApiResponse({ status: 200, description: "Trade history retrieved successfully" })
  async getTradeHistory(@Query("days") days: number = 7, @Query() query: ConnectionNameQueryDto) {
    return this.metatraderService.getTradeHistory(days, query.connection_name);
  }

  @Get("trade/state")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Get current account state for a specific connection" })
  @ApiQuery({ name: "connection_name", required: false, type: String })
  @ApiResponse({ status: 200, description: "Current state retrieved successfully" })
  async getCurrentState(@Query() query: ConnectionNameQueryDto) {
    return this.metatraderService.getCurrentState(query.connection_name);
  }

  @Post("trade/order")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Place a new order on a specific connection" })
  @ApiBody({ type: PlaceOrderDto })
  @ApiResponse({ status: 200, description: "Order placed successfully" })
  async placeOrder(@Body() orderData: PlaceOrderDto) {
    return this.metatraderService.placeOrder(orderData);
  }

  @Get("trade/symbols")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Get available symbols from a specific connection" })
  @ApiQuery({ name: "connection_name", required: false, type: String })
  @ApiResponse({ status: 200, description: "Symbols retrieved successfully" })
  async getAvailableSymbols(@Query() query: ConnectionNameQueryDto) {
    return this.metatraderService.getAvailableSymbols(query.connection_name);
  }

  @Get("trade/symbol/:symbol/info")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Get information about a trading symbol from a specific connection" })
  @ApiParam({ name: "symbol", type: String, description: "Trading symbol (e.g., EURUSD)" })
  @ApiQuery({ name: "connection_name", required: false, type: String })
  @ApiResponse({ status: 200, description: "Symbol info retrieved successfully" })
  async getSymbolInfo(@Param("symbol") symbol: string, @Query() query: ConnectionNameQueryDto) {
    return this.metatraderService.getSymbolInfo(symbol, query.connection_name);
  }

  // ============ Stream Endpoints ============
  @Get("account/stream")
  @Header("Content-Type", "text/event-stream")
  @Header("Cache-Control", "no-cache")
  @Header("Connection", "keep-alive")
  @ApiOperation({ summary: "Stream real-time account information (SSE)" })
  @ApiQuery({ name: "connection_name", required: false, type: String })
  accountStream(@Query() query: ConnectionNameQueryDto) {
    return this.metatraderService.getAccountInfoStream(query.connection_name);
  }

  @Get("positions/stream")
  @Header("Content-Type", "text/event-stream")
  @Header("Cache-Control", "no-cache")
  @Header("Connection", "keep-alive")
  @ApiOperation({ summary: "Stream real-time positions (SSE)" })
  @ApiQuery({ name: "connection_name", required: false, type: String })
  positionsStream(@Query() query: ConnectionNameQueryDto) {
    return this.metatraderService.getPositionsStream(query.connection_name);
  }
}
