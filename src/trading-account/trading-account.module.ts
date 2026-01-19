// src/trade-account/trade-account.module.ts
import { Module } from "@nestjs/common";
import { PrismaService } from "@/prisma.service";
import { MetatraderModule } from "@/metatrader/metatrader.module";
import { JwtModule } from "@nestjs/jwt";
import { CustomCacheModule } from "@/cache/cache.module";
import { TradeAccountController } from "./trading-account.controller";
import { TradingAccountService } from "./trading-account.service";

@Module({
  imports: [
    CustomCacheModule,
    MetatraderModule,
    /*JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: "1d" },
    }),*/
  ],
  controllers: [TradeAccountController],
  providers: [TradingAccountService, PrismaService],
  exports: [TradingAccountService],
})
export class TradingAccountModule {}
