// src/app.module.ts

import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import configuration from "./config/configuration";
import { MetatraderModule } from "./metatrader/metatrader.module";
import { AuthModule } from "./auth/auth.module";
import { UserModule } from "./user/user.module";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { CustomCacheModule } from "./cache/cache.module";
import { TradingAccountModule } from "./trading-account/trading-account.module";

@Module({
  imports: [
    CustomCacheModule,
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    MetatraderModule,
    AuthModule,
    UserModule,
    TradingAccountModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
