import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AccessGuard } from './guards/access.guard';

@Module({
  controllers: [AuthController],
  providers: [AuthService, AccessGuard],
  exports: [AuthService, AccessGuard],
})
export class AuthModule {}
