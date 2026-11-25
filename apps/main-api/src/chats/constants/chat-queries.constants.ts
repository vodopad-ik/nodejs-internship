export const CHAT_PROFILE_SELECT = {
  id: true,
  username: true,
  displayName: true,
  avatarUrl: true,
} as const;

export const MESSAGE_INCLUDE = {
  sender: {
    select: CHAT_PROFILE_SELECT,
  },
  messageAssets: {
    include: { asset: true },
    orderBy: { orderIndex: 'asc' as const },
  },
  replyToMessage: {
    select: {
      id: true,
      content: true,
      isDeleted: true,
      sender: {
        select: CHAT_PROFILE_SELECT,
      },
    },
  },
} as const;

export const CHAT_INCLUDE = {
  participants: {
    include: {
      profile: {
        select: CHAT_PROFILE_SELECT,
      },
    },
  },
  messages: {
    take: 1,
    orderBy: {
      createdAt: 'desc' as const,
    },
    include: MESSAGE_INCLUDE,
  },
} as const;
