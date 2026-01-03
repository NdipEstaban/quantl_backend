// guards/refresh-auth.guard.ts
import { Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

@Injectable()
export class RefreshAuthGuard extends AuthGuard("refresh") {}
