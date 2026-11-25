import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ERROR_MESSAGES } from '../common/constants/messages.constants';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { createPaginatedResponse, getPaginationOffsets } from '../common/utils/pagination.util';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { ChatsService } from './chats.service';
import { MESSAGE_INCLUDE } from './constants/chat-queries.constants';
import { CreateMessageDto } from './dto/create-message.dto';
import { UpdateMessageDto } from './dto/update-message.dto';
import { toMessageResponse } from './mappers/message.mapper';

@Injectable()
export class MessagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    private readonly chatsService: ChatsService,
  ) {}

  private async getMessageAndCheckOwnership(chatId: string, messageId: string, userId: string) {
    const currentProfile = await this.usersService.getProfileByUserId(userId);
    await this.chatsService.assertParticipant(chatId, currentProfile.id);

    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      include: { messageAssets: true },
    });

    if (!message || message.chatId !== chatId) {
      throw new NotFoundException(ERROR_MESSAGES.MESSAGE_NOT_FOUND);
    }
    if (message.senderId !== currentProfile.id) {
      throw new ForbiddenException(ERROR_MESSAGES.NOT_ALLOWED_TO_MODIFY_MESSAGE);
    }

    return { message, currentProfile };
  }

  async createMessage(userId: string, chatId: string, dto: CreateMessageDto) {
    const currentProfile = await this.usersService.getProfileByUserId(userId);
    await this.chatsService.assertParticipant(chatId, currentProfile.id);

    const hasContent = Boolean(dto.content && dto.content.length > 0);
    const hasAssets = Boolean(dto.assetIds && dto.assetIds.length > 0);
    if (!hasContent && !hasAssets) {
      throw new BadRequestException(ERROR_MESSAGES.EMPTY_MESSAGE_CONTENT);
    }

    if (dto.assetIds?.length) {
      const count = await this.prisma.asset.count({ where: { id: { in: dto.assetIds } } });

      if (count !== dto.assetIds.length) {
        throw new BadRequestException(ERROR_MESSAGES.ASSETS_DO_NOT_EXIST);
      }
    }

    if (dto.replyToMessageId) {
      const replyTarget = await this.prisma.message.findUnique({
        where: { id: dto.replyToMessageId },
        select: { id: true, chatId: true },
      });
      if (!replyTarget) {
        throw new NotFoundException(ERROR_MESSAGES.REPLY_MESSAGE_NOT_FOUND);
      }
      if (replyTarget.chatId !== chatId) {
        throw new BadRequestException(ERROR_MESSAGES.REPLY_MESSAGE_WRONG_CHAT);
      }
    }

    const [message] = await this.prisma.$transaction([
      this.prisma.message.create({
        data: {
          chatId,
          senderId: currentProfile.id,
          content: dto.content ?? '',
          replyToMessageId: dto.replyToMessageId,
          ...(dto.assetIds?.length && {
            messageAssets: {
              create: dto.assetIds.map((assetId, orderIndex) => ({
                assetId,
                orderIndex,
              })),
            },
          }),
        },
        include: MESSAGE_INCLUDE,
      }),
      this.prisma.chat.update({ where: { id: chatId }, data: { updatedAt: new Date() } }),
    ]);

    return toMessageResponse(message);
  }

  async getChatMessages(userId: string, chatId: string, query: PaginationQueryDto) {
    const currentProfile = await this.usersService.getProfileByUserId(userId);
    await this.chatsService.assertParticipant(chatId, currentProfile.id);

    const { skip, take } = getPaginationOffsets(query);
    const where = { chatId };

    const [total, messages] = await Promise.all([
      this.prisma.message.count({ where }),
      this.prisma.message.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: MESSAGE_INCLUDE,
      }),
    ]);
    const items = messages.map((message) => toMessageResponse(message));
    return createPaginatedResponse(items, total, query);
  }

  async updateMessage(userId: string, chatId: string, messageId: string, dto: UpdateMessageDto) {
    if (dto.content === undefined && dto.assetIds === undefined) {
      throw new BadRequestException(ERROR_MESSAGES.NO_FIELDS_TO_UPDATE);
    }

    const { message } = await this.getMessageAndCheckOwnership(chatId, messageId, userId);
    if (message.isDeleted) {
      throw new BadRequestException(ERROR_MESSAGES.DELETED_MESSAGE_CANNOT_BE_MODIFIED);
    }

    const nextContent = dto.content !== undefined ? dto.content : (message.content ?? '');
    const nextAssetsCount =
      dto.assetIds !== undefined ? dto.assetIds.length : message.messageAssets.length;
    if (!nextContent && nextAssetsCount === 0) {
      throw new BadRequestException(ERROR_MESSAGES.EMPTY_MESSAGE_CONTENT);
    }

    if (dto.assetIds && dto.assetIds.length > 0) {
      const count = await this.prisma.asset.count({
        where: { id: { in: dto.assetIds } },
      });
      if (count !== dto.assetIds.length) {
        throw new BadRequestException(ERROR_MESSAGES.ASSETS_DO_NOT_EXIST);
      }
    }

    if (dto.assetIds === undefined) {
      const updatedMessage = await this.prisma.message.update({
        where: { id: messageId },
        data: { content: nextContent, isEdited: true },
        include: MESSAGE_INCLUDE,
      });
      return toMessageResponse(updatedMessage);
    }

    const [, updatedMessage] = await this.prisma.$transaction([
      this.prisma.messageAsset.deleteMany({ where: { messageId } }),
      this.prisma.message.update({
        where: { id: messageId },
        data: {
          content: nextContent,
          isEdited: true,
          ...(dto.assetIds.length > 0 && {
            messageAssets: {
              create: dto.assetIds.map((assetId, orderIndex) => ({
                assetId,
                orderIndex,
              })),
            },
          }),
        },
        include: MESSAGE_INCLUDE,
      }),
    ]);

    return toMessageResponse(updatedMessage);
  }

  async deleteMessage(userId: string, chatId: string, messageId: string) {
    const { message } = await this.getMessageAndCheckOwnership(chatId, messageId, userId);
    if (message.isDeleted) {
      throw new BadRequestException(ERROR_MESSAGES.MESSAGE_ALREADY_DELETED);
    }

    const [, deletedMessage] = await this.prisma.$transaction([
      this.prisma.messageAsset.deleteMany({ where: { messageId } }),
      this.prisma.message.update({
        where: { id: messageId },
        data: { isDeleted: true, deletedAt: new Date(), content: '' },
        include: MESSAGE_INCLUDE,
      }),
    ]);
    return toMessageResponse(deletedMessage);
  }
}
