const MENTION_REGEX = /(?<![\w.-])@([a-zA-Z0-9_.-]+)/g;

export function extractMentionUsernames(content: string): string[] {
  if (!content || !content.includes('@')) {
    return [];
  }

  const usernames = new Set<string>();
  const matches = content.matchAll(MENTION_REGEX);

  for (const match of matches) {
    let username = match[1];
    if (!username) {
      continue;
    }
    while (username.endsWith('.')) {
      username = username.slice(0, -1);
    }
    if (!username.length) {
      continue;
    }

    usernames.add(username.toLowerCase());
  }
  return Array.from(usernames);
}
