import { extractMentionUsernames } from '../utils/mention.util';

export interface MentionProfile {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
}

export interface CommentWithCountsAndLikes {
  content: string;
  _count?: {
    likes: number;
    replies: number;
  };
  likes?: { profileId: string }[];
  [key: string]: unknown;
}

export function toCommentResponse<T extends CommentWithCountsAndLikes>(
  comment: T,
  mentionsMap: ReadonlyMap<string, MentionProfile> = new Map(),
) {
  const { _count, likes, ...commentData } = comment;
  const mentionedUsernames = extractMentionUsernames(comment.content);

  const mentions: MentionProfile[] = [];
  mentionedUsernames.forEach((username) => {
    const profile = mentionsMap.get(username);
    if (profile) {
      mentions.push(profile);
    }
  });

  return {
    ...commentData,
    likesCount: _count?.likes ?? 0,
    repliesCount: _count?.replies ?? 0,
    isLiked: Array.isArray(likes) ? likes.length > 0 : false,
    mentions,
  };
}
