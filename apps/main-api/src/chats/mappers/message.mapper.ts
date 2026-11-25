import { Asset } from '@prisma/client';

export interface MessageAssetItem {
  orderIndex?: number;
  asset: Asset;
}

export interface RepliedMessageItem {
  id: string;
  content: string | null;
  isDeleted: boolean;
  sender?: {
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
  [key: string]: unknown;
}

export interface MessageWithRelations {
  content: string | null;
  isDeleted: boolean;
  messageAssets?: MessageAssetItem[];
  replyToMessage?: RepliedMessageItem | null;
  [key: string]: unknown;
}

function mapReplyToMessage(replyToMessage?: RepliedMessageItem | null) {
  if (!replyToMessage) {
    return null;
  }

  return {
    ...replyToMessage,
    content: replyToMessage.isDeleted ? '' : (replyToMessage.content ?? ''),
  };
}

export function toMessageResponse<T extends MessageWithRelations>(message: T) {
  const { messageAssets, replyToMessage, ...messageData } = message;

  return {
    ...messageData,
    content: message.isDeleted ? '' : (message.content ?? ''),
    assets: message.isDeleted ? [] : (messageAssets ?? []).map((item) => item.asset),
    replyToMessage: mapReplyToMessage(replyToMessage),
  };
}
