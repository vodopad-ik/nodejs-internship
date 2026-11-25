import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ChatParticipantRole, Prisma } from '@prisma/client';
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from '../common/constants/messages.constants';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { createPaginatedResponse, getPaginationOffsets } from '../common/utils/pagination.util';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { CHAT_INCLUDE } from './constants/chat-queries.constants';
import { AddParticipantsDto } from './dto/add-participants.dto';
import { CreateGroupChatDto } from './dto/create-group-chat.dto';
import { CreatePrivateChatDto } from './dto/create-private-chat.dto';
import { LeaveChatDto } from './dto/leave-chat.dto';
import { UpdateGroupChatDto } from './dto/update-group-chat.dto';
import { toChatResponse } from './mappers/chat.mapper';

@Injectable()
export class ChatsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
  ) {}

  async assertParticipant(chatId: string, profileId: string) {
    const chat = await this.prisma.chat.findUnique({
      where: { id: chatId },
      include: { participants: { where: { profileId } } },
    });
    if (!chat) {
      throw new NotFoundException(ERROR_MESSAGES.CHAT_NOT_FOUND);
    }
    const participant = chat.participants[0];
    if (!participant) {
      throw new ForbiddenException(ERROR_MESSAGES.NOT_CHAT_PARTICIPANT);
    }
    return { chat, participant };
  }

  async assertGroupAdmin(chatId: string, profileId: string) {
    const { chat, participant } = await this.assertParticipant(chatId, profileId);
    if (!chat.isGroup) {
      throw new BadRequestException(ERROR_MESSAGES.NOT_GROUP_CHAT);
    }
    if (participant.role !== ChatParticipantRole.ADMIN) {
      throw new ForbiddenException(ERROR_MESSAGES.CHAT_ADMIN_REQUIRED);
    }
    return { chat, participant };
  }

  async createOrGetPrivateChat(userId: string, dto: CreatePrivateChatDto) {
    const currentProfile = await this.usersService.getProfileByUserId(userId);
    if (currentProfile.id === dto.participantProfileId) {
      throw new BadRequestException(ERROR_MESSAGES.CANNOT_CREATE_PRIVATE_CHAT_WITH_SELF);
    }

    const participantProfile = await this.prisma.profile.findUnique({
      where: { id: dto.participantProfileId },
    });
    if (!participantProfile) {
      throw new NotFoundException(ERROR_MESSAGES.TARGET_PROFILE_NOT_FOUND);
    }

    const directKey = [currentProfile.id, dto.participantProfileId].sort().join(':');

    const existingChat = await this.prisma.chat.findUnique({
      where: { directKey },
      include: CHAT_INCLUDE,
    });

    if (existingChat) {
      return toChatResponse(existingChat, currentProfile.id);
    }

    try {
      const chat = await this.prisma.chat.create({
        data: {
          isGroup: false,
          directKey,
          participants: {
            create: [
              { profileId: currentProfile.id, role: ChatParticipantRole.MEMBER },
              { profileId: dto.participantProfileId, role: ChatParticipantRole.MEMBER },
            ],
          },
        },
        include: CHAT_INCLUDE,
      });

      return toChatResponse(chat, currentProfile.id);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const concurrentChat = await this.prisma.chat.findUnique({
          where: { directKey },
          include: CHAT_INCLUDE,
        });
        if (concurrentChat) {
          return toChatResponse(concurrentChat, currentProfile.id);
        }
      }
      throw error;
    }
  }

  async createGroupChat(userId: string, dto: CreateGroupChatDto) {
    const currentProfile = await this.usersService.getProfileByUserId(userId);
    const otherIds = dto.participantProfileIds.filter((id) => id !== currentProfile.id);
    if (otherIds.length < 2) {
      throw new BadRequestException(ERROR_MESSAGES.GROUP_CHAT_MIN_PARTICIPANTS);
    }
    const count = await this.prisma.profile.count({ where: { id: { in: otherIds } } });
    if (count !== otherIds.length) {
      throw new NotFoundException(ERROR_MESSAGES.PARTICIPANTS_NOT_FOUND);
    }

    const chat = await this.prisma.chat.create({
      data: {
        isGroup: true,
        title: dto.title,
        description: dto.description,
        participants: {
          create: [
            { profileId: currentProfile.id, role: ChatParticipantRole.ADMIN },
            ...otherIds.map((profileId) => ({
              profileId,
              role: ChatParticipantRole.MEMBER,
            })),
          ],
        },
      },
      include: CHAT_INCLUDE,
    });
    return toChatResponse(chat, currentProfile.id);
  }

  async findMyChats(userId: string, query: PaginationQueryDto) {
    const currentProfile = await this.usersService.getProfileByUserId(userId);

    const { skip, take } = getPaginationOffsets(query);
    const where = { participants: { some: { profileId: currentProfile.id } } };

    const [total, chats] = await Promise.all([
      this.prisma.chat.count({ where }),
      this.prisma.chat.findMany({
        where,
        skip,
        take,
        orderBy: { updatedAt: 'desc' },
        include: CHAT_INCLUDE,
      }),
    ]);
    const items = chats.map((chat) => toChatResponse(chat, currentProfile.id));
    return createPaginatedResponse(items, total, query);
  }

  async findChatById(userId: string, chatId: string) {
    const currentProfile = await this.usersService.getProfileByUserId(userId);
    const chat = await this.prisma.chat.findUnique({
      where: { id: chatId },
      include: CHAT_INCLUDE,
    });
    if (!chat) {
      throw new NotFoundException(ERROR_MESSAGES.CHAT_NOT_FOUND);
    }
    const isParticipant = chat.participants.some(
      (participant) => participant.profileId === currentProfile.id,
    );
    if (!isParticipant) {
      throw new ForbiddenException(ERROR_MESSAGES.NOT_CHAT_PARTICIPANT);
    }
    return toChatResponse(chat, currentProfile.id);
  }

  async updateGroupChat(userId: string, chatId: string, dto: UpdateGroupChatDto) {
    if (dto.title === undefined && dto.description === undefined) {
      throw new BadRequestException(ERROR_MESSAGES.NO_FIELDS_TO_UPDATE);
    }
    const currentProfile = await this.usersService.getProfileByUserId(userId);
    await this.assertGroupAdmin(chatId, currentProfile.id);
    const updatedChat = await this.prisma.chat.update({
      where: {
        id: chatId,
      },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
      },
      include: CHAT_INCLUDE,
    });
    return toChatResponse(updatedChat, currentProfile.id);
  }

  async addParticipants(userId: string, chatId: string, dto: AddParticipantsDto) {
    const currentProfile = await this.usersService.getProfileByUserId(userId);
    await this.assertGroupAdmin(chatId, currentProfile.id);
    const count = await this.prisma.profile.count({
      where: {
        id: { in: dto.profileIds },
      },
    });

    if (count !== dto.profileIds.length) {
      throw new NotFoundException(ERROR_MESSAGES.PARTICIPANTS_NOT_FOUND);
    }
    await this.prisma.chatParticipant.createMany({
      data: dto.profileIds.map((profileId) => ({ chatId, profileId })),
      skipDuplicates: true,
    });

    const updatedChat = await this.prisma.chat.findUnique({
      where: { id: chatId },
      include: CHAT_INCLUDE,
    });
    if (!updatedChat) {
      throw new NotFoundException(ERROR_MESSAGES.CHAT_NOT_FOUND);
    }
    return toChatResponse(updatedChat, currentProfile.id);
  }

  async removeParticipant(userId: string, chatId: string, targetProfileId: string) {
    const currentProfile = await this.usersService.getProfileByUserId(userId);
    await this.assertGroupAdmin(chatId, currentProfile.id);
    if (targetProfileId === currentProfile.id) {
      throw new BadRequestException(ERROR_MESSAGES.CANNOT_REMOVE_SELF_FROM_CHAT);
    }

    const participant = await this.prisma.chatParticipant.findUnique({
      where: { profileId_chatId: { profileId: targetProfileId, chatId } },
    });

    if (!participant) {
      throw new NotFoundException(ERROR_MESSAGES.PARTICIPANT_NOT_IN_CHAT);
    }
    await this.prisma.chatParticipant.delete({
      where: {
        profileId_chatId: { profileId: targetProfileId, chatId },
      },
    });

    return { message: SUCCESS_MESSAGES.PARTICIPANT_REMOVED };
  }

  async leaveGroupChat(userId: string, chatId: string, dto: LeaveChatDto) {
    const currentProfile = await this.usersService.getProfileByUserId(userId);
    const { chat, participant } = await this.assertParticipant(chatId, currentProfile.id);
    if (!chat.isGroup) {
      throw new BadRequestException(ERROR_MESSAGES.NOT_GROUP_CHAT);
    }
    const others = await this.prisma.chatParticipant.findMany({
      where: { chatId, profileId: { not: currentProfile.id } },
    });

    if (others.length === 0) {
      await this.prisma.chat.delete({ where: { id: chatId } });
      return { message: SUCCESS_MESSAGES.LEFT_GROUP_CHAT };
    }

    if (participant.role === ChatParticipantRole.MEMBER) {
      await this.prisma.chatParticipant.delete({
        where: { profileId_chatId: { profileId: currentProfile.id, chatId } },
      });
      return { message: SUCCESS_MESSAGES.LEFT_GROUP_CHAT };
    }

    if (!dto.newAdminProfileId) {
      throw new BadRequestException(ERROR_MESSAGES.ADMIN_MUST_TRANSFER_ROLE);
    }
    const newAdmin = others.find((other) => other.profileId === dto.newAdminProfileId);
    if (!newAdmin) {
      throw new BadRequestException(ERROR_MESSAGES.INVALID_NEW_ADMIN);
    }
    await this.prisma.$transaction([
      this.prisma.chatParticipant.update({
        where: { profileId_chatId: { profileId: dto.newAdminProfileId, chatId } },
        data: {
          role: ChatParticipantRole.ADMIN,
        },
      }),
      this.prisma.chatParticipant.delete({
        where: { profileId_chatId: { profileId: currentProfile.id, chatId } },
      }),
    ]);
    return { message: SUCCESS_MESSAGES.LEFT_GROUP_CHAT };
  }
}
