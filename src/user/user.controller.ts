import { CacheService } from "@/cache/cache.service";
import { HttpExceptionFilter } from "@/common/filters/http-exception.filter";
import { TransformInterceptor } from "@/common/interceptors/transform.interceptor";
import { Controller, Post, UseFilters, UseGuards, UseInterceptors } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { UserService } from "./user.service";
import { Public } from "@/auth/decorators/public.decorator";
import { JwtAuthGuard } from "@/auth/guards/jwt-auth.guard";

@ApiTags("Users")
@Controller("user")
@UseInterceptors(TransformInterceptor)
@UseFilters(HttpExceptionFilter)
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UserController {
  constructor(
    private readonly cacheService: CacheService,
    private userService: UserService,
  ) {}

  @Public()
  @Post("profile")
  async getUserProfile(userId: string) {
    return this.userService.getUserProfile(userId);
  }
}
