// src/metatrader/metatrader.module.ts
import { ConfigModule, ConfigService } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { MetatraderController } from './metatrader.controller';
import { MetatraderService } from './metatrader.service';
import { Module } from '@nestjs/common';

@Module({
  imports: [
    HttpModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        // Remove async here
        timeout: 5000,
        maxRedirects: 5,
        // You can use configService here if needed
        // Example: timeout: configService.get('HTTP_TIMEOUT') || 5000,
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [MetatraderController],
  providers: [MetatraderService],
  exports: [MetatraderService],
})
export class MetatraderModule {}
