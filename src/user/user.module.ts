// user.module.ts
import { Module } from "@nestjs/common";
import { UserService } from "./user.service";
import { PrismaService } from "@/prisma.service";
import { CustomCacheModule } from "@/cache/cache.module";
import { UserController } from "./user.controller";

@Module({
  imports: [CustomCacheModule],
  controllers: [UserController],
  providers: [UserService, PrismaService],
  exports: [UserService],
})
export class UserModule {}
