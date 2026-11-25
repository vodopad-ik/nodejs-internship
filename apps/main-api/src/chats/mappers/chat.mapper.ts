import { ChatParticipantRole } from '@prisma/client';
import { MessageWithRelations, toMessageResponse } from './message.mapper';

export interface ChatParticipantItem {
  profileId: string;
  role: ChatParticipantRole;
  profile: {
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
  [key: string]: unknown;
}

export interface ChatWithRelations {
  title: string | null;
  isGroup: boolean;
  directKey?: string | null;
  participants: ChatParticipantItem[];
  messages?: MessageWithRelations[];
  [key: string]: unknown;
}

export function toChatResponse<T extends ChatWithRelations>(chat: T, currentProfileId: string) {
  const { directKey, messages, ...chatData } = chat;
  void directKey;

  const partner = chat.isGroup
    ? undefined
    : chat.participants.find((participant) => participant.profileId !== currentProfileId);

  const title = chat.isGroup
    ? chat.title
    : partner?.profile.displayName || partner?.profile.username || null;

  const avatarUrl = chat.isGroup ? null : (partner?.profile.avatarUrl ?? null);
  const lastMessage = messages?.[0] ? toMessageResponse(messages[0]) : null;

  return { ...chatData, title, avatarUrl, lastMessage };
}
