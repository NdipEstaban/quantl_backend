import { CustomCacheModule } from "@/cache/cache.module";
import { PrismaService } from "@/prisma.service";
import { Module } from "@nestjs/common";
import { MetricsController } from "./metrics.controller";
import { MetricsService } from "./metrics.service";

@Module({
  imports: [CustomCacheModule],
  controllers: [MetricsController],
  providers: [MetricsService, PrismaService],
  exports: [MetricsService],
})
export class MetricsModule {}
