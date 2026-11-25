import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { ChatsController } from './chats.controller';
import { ChatsService } from './chats.service';
import { MessagesService } from './messages.service';

@Module({
  imports: [UsersModule, AuthModule],
  controllers: [ChatsController],
  providers: [ChatsService, MessagesService],
  exports: [ChatsService, MessagesService],
})
export class ChatsModule {}
