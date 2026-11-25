import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { AccessGuard } from '../auth/guards/access.guard';
import { CurrentUserId } from '../common/decorators/current-user-id.decorator';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { ChatsService } from './chats.service';
import { AddParticipantsDto } from './dto/add-participants.dto';
import { CreateGroupChatDto } from './dto/create-group-chat.dto';
import { CreateMessageDto } from './dto/create-message.dto';
import { CreatePrivateChatDto } from './dto/create-private-chat.dto';
import { LeaveChatDto } from './dto/leave-chat.dto';
import { UpdateGroupChatDto } from './dto/update-group-chat.dto';
import { UpdateMessageDto } from './dto/update-message.dto';
import { MessagesService } from './messages.service';

@ApiTags('chats')
@ApiBearerAuth()
@UseGuards(AccessGuard)
@Controller('chats')
export class ChatsController {
  constructor(
    private readonly chatsService: ChatsService,
    private readonly messagesService: MessagesService,
  ) {}

  @Post('private')
  @ApiOperation({ summary: 'Create or retrieve an existing private 1-on-1 chat' })
  @ApiCreatedResponse({ description: 'Private chat created or retrieved successfully' })
  @ApiBadRequestResponse({ description: 'Cannot create a private chat with yourself' })
  @ApiNotFoundResponse({ description: 'Target profile not found' })
  async createOrGetPrivateChat(@CurrentUserId() userId: string, @Body() dto: CreatePrivateChatDto) {
    return this.chatsService.createOrGetPrivateChat(userId, dto);
  }

  @Post('group')
  @ApiOperation({ summary: 'Create a new group chat' })
  @ApiCreatedResponse({ description: 'Group chat created successfully' })
  @ApiBadRequestResponse({ description: 'Group chat requires at least 3 participants' })
  @ApiNotFoundResponse({ description: 'One or more participant profiles not found' })
  async createGroupChat(@CurrentUserId() userId: string, @Body() dto: CreateGroupChatDto) {
    return this.chatsService.createGroupChat(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get paginated list of current user chats' })
  @ApiOkResponse({ description: 'Paginated list of user chats' })
  async findMyChats(@CurrentUserId() userId: string, @Query() query: PaginationQueryDto) {
    return this.chatsService.findMyChats(userId, query);
  }

  @Get(':chatId')
  @ApiOperation({ summary: 'Get single chat details by ID' })
  @ApiParam({ name: 'chatId', description: 'Chat ID' })
  @ApiOkResponse({ description: 'Chat details' })
  @ApiForbiddenResponse({ description: 'You are not a participant of this chat' })
  @ApiNotFoundResponse({ description: 'Chat not found' })
  async findChatById(@CurrentUserId() userId: string, @Param('chatId') chatId: string) {
    return this.chatsService.findChatById(userId, chatId);
  }

  @Patch(':chatId')
  @ApiOperation({ summary: 'Update group chat title or description (admin only)' })
  @ApiParam({ name: 'chatId', description: 'Chat ID' })
  @ApiOkResponse({ description: 'Group chat updated successfully' })
  @ApiBadRequestResponse({ description: 'Not a group chat or no fields provided to update' })
  @ApiForbiddenResponse({ description: 'Only chat administrators can perform this action' })
  @ApiNotFoundResponse({ description: 'Chat not found' })
  async updateGroupChat(
    @CurrentUserId() userId: string,
    @Param('chatId') chatId: string,
    @Body() dto: UpdateGroupChatDto,
  ) {
    return this.chatsService.updateGroupChat(userId, chatId, dto);
  }

  @Post(':chatId/participants')
  @ApiOperation({ summary: 'Add participants to a group chat (admin only)' })
  @ApiParam({ name: 'chatId', description: 'Chat ID' })
  @ApiCreatedResponse({ description: 'Participants added successfully' })
  @ApiBadRequestResponse({ description: 'This action is only allowed in group chats' })
  @ApiForbiddenResponse({ description: 'Only chat administrators can perform this action' })
  @ApiNotFoundResponse({ description: 'Chat or target profiles not found' })
  async addParticipants(
    @CurrentUserId() userId: string,
    @Param('chatId') chatId: string,
    @Body() dto: AddParticipantsDto,
  ) {
    return this.chatsService.addParticipants(userId, chatId, dto);
  }

  @Delete(':chatId/participants/:profileId')
  @ApiOperation({ summary: 'Remove a participant from a group chat (admin only)' })
  @ApiParam({ name: 'chatId', description: 'Chat ID' })
  @ApiParam({ name: 'profileId', description: 'Target Profile ID' })
  @ApiOkResponse({ description: 'Participant removed successfully' })
  @ApiBadRequestResponse({ description: 'Cannot remove yourself or not a group chat' })
  @ApiForbiddenResponse({ description: 'Only chat administrators can perform this action' })
  @ApiNotFoundResponse({ description: 'Chat or participant not found' })
  async removeParticipant(
    @CurrentUserId() userId: string,
    @Param('chatId') chatId: string,
    @Param('profileId') profileId: string,
  ) {
    return this.chatsService.removeParticipant(userId, chatId, profileId);
  }

  @Post(':chatId/leave')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Leave a group chat (admin must transfer role if others remain)' })
  @ApiParam({ name: 'chatId', description: 'Chat ID' })
  @ApiOkResponse({ description: 'Successfully left group chat' })
  @ApiBadRequestResponse({ description: 'Not a group chat or admin role transfer required' })
  @ApiForbiddenResponse({ description: 'You are not a participant of this chat' })
  @ApiNotFoundResponse({ description: 'Chat not found' })
  async leaveGroupChat(
    @CurrentUserId() userId: string,
    @Param('chatId') chatId: string,
    @Body() dto: LeaveChatDto,
  ) {
    return this.chatsService.leaveGroupChat(userId, chatId, dto);
  }

  @Get(':chatId/messages')
  @ApiOperation({ summary: 'Get paginated messages history for a chat' })
  @ApiParam({ name: 'chatId', description: 'Chat ID' })
  @ApiOkResponse({ description: 'Paginated list of chat messages' })
  @ApiForbiddenResponse({ description: 'You are not a participant of this chat' })
  @ApiNotFoundResponse({ description: 'Chat not found' })
  async getChatMessages(
    @CurrentUserId() userId: string,
    @Param('chatId') chatId: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.messagesService.getChatMessages(userId, chatId, query);
  }

  @Post(':chatId/messages')
  @ApiOperation({ summary: 'Send a new message in a chat' })
  @ApiParam({ name: 'chatId', description: 'Chat ID' })
  @ApiCreatedResponse({ description: 'Message sent successfully' })
  @ApiBadRequestResponse({ description: 'Empty message or invalid reply/assets' })
  @ApiForbiddenResponse({ description: 'You are not a participant of this chat' })
  @ApiNotFoundResponse({ description: 'Chat or replied message not found' })
  async createMessage(
    @CurrentUserId() userId: string,
    @Param('chatId') chatId: string,
    @Body() dto: CreateMessageDto,
  ) {
    return this.messagesService.createMessage(userId, chatId, dto);
  }

  @Patch(':chatId/messages/:messageId')
  @ApiOperation({ summary: 'Edit own message text and/or assets' })
  @ApiParam({ name: 'chatId', description: 'Chat ID' })
  @ApiParam({ name: 'messageId', description: 'Message ID' })
  @ApiOkResponse({ description: 'Message updated successfully' })
  @ApiBadRequestResponse({ description: 'Deleted message cannot be edited or empty payload' })
  @ApiForbiddenResponse({ description: 'You are not allowed to modify this message' })
  @ApiNotFoundResponse({ description: 'Chat or message not found' })
  async updateMessage(
    @CurrentUserId() userId: string,
    @Param('chatId') chatId: string,
    @Param('messageId') messageId: string,
    @Body() dto: UpdateMessageDto,
  ) {
    return this.messagesService.updateMessage(userId, chatId, messageId, dto);
  }

  @Delete(':chatId/messages/:messageId')
  @ApiOperation({ summary: 'Soft-delete own message' })
  @ApiParam({ name: 'chatId', description: 'Chat ID' })
  @ApiParam({ name: 'messageId', description: 'Message ID' })
  @ApiOkResponse({ description: 'Message soft-deleted successfully' })
  @ApiBadRequestResponse({ description: 'Message is already deleted' })
  @ApiForbiddenResponse({ description: 'You are not allowed to modify this message' })
  @ApiNotFoundResponse({ description: 'Chat or message not found' })
  async deleteMessage(
    @CurrentUserId() userId: string,
    @Param('chatId') chatId: string,
    @Param('messageId') messageId: string,
  ) {
    return this.messagesService.deleteMessage(userId, chatId, messageId);
  }
}
