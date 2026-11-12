export interface PostWithCountsAndLikes {
  _count?: {
    likes: number;
    comments: number;
  };
  likes?: { profileId: string }[];
  [key: string]: unknown;
}

export function toPostResponse<T extends PostWithCountsAndLikes>(post: T) {
  const { _count, likes, ...postData } = post;

  return {
    ...postData,
    likesCount: _count?.likes ?? 0,
    commentsCount: _count?.comments ?? 0,
    isLiked: Array.isArray(likes) ? likes.length > 0 : false,
  };
}
