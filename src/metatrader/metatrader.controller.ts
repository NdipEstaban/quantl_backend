/* eslint-disable @typescript-eslint/no-unsafe-call */
// src/metatrader/metatrader.controller.ts
import {
  Controller,
  Get,
  Param,
  Query,
  UseInterceptors,
  UseFilters,
  Header,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { MetatraderService } from './metatrader.service';
import {
  TradeHistoryDto,
  TicketParamDto,
  SymbolParamDto,
} from './dto/trade-history.dto';
import { TransformInterceptor } from '../common/interceptors/transform.interceptor';
import { HttpExceptionFilter } from '../common/filters/http-exception.filter';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';

@ApiTags('Metatrader Trading Data')
@Controller('metatrader')
@UseInterceptors(TransformInterceptor)
@UseFilters(HttpExceptionFilter)
export class MetatraderController {
  constructor(private readonly metatraderService: MetatraderService) {}

  @Get('health')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Health check for metatrader service' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  async checkHealth(): Promise<{ status: string }> {
    const result = await this.metatraderService.checkHealth();
    return { status: result };
  }

  @Get('health/metatrader')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'metatrader connection health check' })
  @ApiResponse({ status: 200, description: 'metatrader is connected' })
  async checkmetatraderHealth(): Promise<{ status: string }> {
    const result = await this.metatraderService.checkMetatraderHealth();
    return { status: result };
  }

  @Get('account/info')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get metatrader account information' })
  @ApiResponse({
    status: 200,
    description: 'Account info retrieved successfully',
  })
  async getAccountInfo() {
    return this.metatraderService.getAccountInfo();
  }

  @Get('account/summary')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get account summary with additional metrics' })
  @ApiResponse({
    status: 200,
    description: 'Account summary retrieved successfully',
  })
  async getAccountSummary() {
    return this.metatraderService.getAccountSummary();
  }

  @Get('positions')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get all open positions' })
  @ApiResponse({ status: 200, description: 'Positions retrieved successfully' })
  async getAllPositions() {
    return this.metatraderService.getAllPositions();
  }

  @Get('positions/:ticket')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get specific position by ticket number' })
  @ApiParam({
    name: 'ticket',
    type: Number,
    description: 'Position ticket number',
  })
  @ApiResponse({ status: 200, description: 'Position retrieved successfully' })
  async getPositionByTicket(@Param() params: TicketParamDto) {
    return this.metatraderService.getPositionByTicket(params.ticket);
  }

  @Get('positions/symbol/:symbol')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get positions for specific symbol' })
  @ApiParam({
    name: 'symbol',
    type: String,
    description: 'Trading symbol (e.g., EURUSD)',
  })
  @ApiResponse({
    status: 200,
    description: 'Symbol positions retrieved successfully',
  })
  async getPositionsBySymbol(@Param() params: SymbolParamDto) {
    return this.metatraderService.getPositionsBySymbol(params.symbol);
  }

  @Get('trades/current')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get current trades' })
  @ApiResponse({
    status: 200,
    description: 'Current trades retrieved successfully',
  })
  async getCurrentTrades() {
    return this.metatraderService.getCurrentTrades;
  }

  @Get('trades/history')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get trade history between dates' })
  @ApiQuery({
    name: 'from_date',
    required: false,
    type: String,
    description: 'Start date (YYYY-MM-DDTHH:mm:ss)',
  })
  @ApiQuery({
    name: 'to_date',
    required: false,
    type: String,
    description: 'End date (YYYY-MM-DDTHH:mm:ss)',
  })
  @ApiResponse({
    status: 200,
    description: 'Trade history retrieved successfully',
  })
  async getTradeHistory(@Query() tradeHistoryDto: TradeHistoryDto) {
    return this.metatraderService.getTradeHistory(
      tradeHistoryDto.from_date,
      tradeHistoryDto.to_date,
    );
  }

  // WebSocket/SSE endpoints for real-time data
  @Get('account/stream')
  @Header('Content-Type', 'text/event-stream')
  @Header('Cache-Control', 'no-cache')
  @Header('Connection', 'keep-alive')
  @ApiOperation({ summary: 'Stream real-time account information (SSE)' })
  accountStream() {
    return this.metatraderService.getAccountInfoStream();
  }

  @Get('positions/stream')
  @Header('Content-Type', 'text/event-stream')
  @Header('Cache-Control', 'no-cache')
  @Header('Connection', 'keep-alive')
  @ApiOperation({ summary: 'Stream real-time positions (SSE)' })
  positionsStream() {
    return this.metatraderService.getPositionsStream();
  }
}
