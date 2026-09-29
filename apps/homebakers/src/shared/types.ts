export type Recipe = {
  authorId?: string;
  createdAt?: string;
  id: string;
  title: string;
  englishTitle: string;
  description: string;
  image: string;
  category: string;
  difficulty: "쉬움" | "보통" | "도전";
  minutes: number;
  servings: number;
  author: string;
  likes: number;
  reviewCount?: number;
  featured?: boolean;
  ingredients: { name: string; amount: number; unit: string }[];
  steps: { title: string; body: string; minutes?: number; image?: string }[];
};

export type Post = {
  authorId?: string;
  createdAt?: string;
  image?: string;
  id: string;
  category: "굽기 후기" | "질문" | "이야기";
  title: string;
  body: string;
  author: string;
  date: string;
  comments: number;
  likes: number;
  recipeId?: string;
};

export type User = {
  id: string;
  email: string;
  name: string;
  googleLinked: boolean;
};
export type Comment = {
  helpfulCount?: number;
  helpfulByMe?: boolean;
  accepted?: boolean;
  id: string;
  body: string;
  author: string;
  authorId: string;
  createdAt: string;
};
export type BakeReview = {
  id: string;
  body: string;
  image?: string | null;
  author: string;
  authorId: string;
  createdAt: string;
};
export type Follow = { id: string; name: string };
export type Notification = {
  id: string;
  kind: "new_recipe" | "badge_earned";
  badgeId?: string;
  badgeName?: string;
  recipeId: string;
  recipeTitle: string;
  actorName: string;
  createdAt: string;
  readAt: string | null;
};
export type ShoppingItem = {
  id: string;
  recipeId: string | null;
  recipeTitle: string | null;
  name: string;
  amount: number;
  unit: string;
  checked: boolean;
};
export type RecipeInput = Pick<
  Recipe,
  | "title"
  | "description"
  | "image"
  | "category"
  | "difficulty"
  | "minutes"
  | "servings"
  | "ingredients"
  | "steps"
>;
export type PostInput = Pick<
  Post,
  "category" | "title" | "body" | "recipeId" | "image"
>;
export type McpProvider = "codex" | "claude" | "gemini" | "chatgpt" | "other";
export type McpConnection = {
  id: string;
  provider: McpProvider;
  createdAt: string;
  expiresAt: string;
  localConnected: boolean;
};

export interface Journal {
  id: string;
  recipeId: string | null;
  recipeTitle: string;
  category: string;
  bakedOn: string;
  body: string;
  changes: string;
  outcome: "성공" | "아쉬움" | "다시 도전";
  image: string | null;
  createdAt: string;
}
export type JournalInput = Omit<
  Journal,
  "id" | "recipeTitle" | "category" | "createdAt" | "recipeId" | "image"
> & { recipeId: string; image?: string };
export interface Growth {
  xp: number;
  level: number;
  levelName: string;
  levelMinimum: number;
  nextLevel: { name: string; minimum: number } | null;
  bakeCount: number;
  featuredBadge: string | null;
  badges: {
    id: string;
    name: string;
    description: string;
    earned: boolean;
    current: number;
    target: number;
    remaining?: string[];
    earnedAt: string | null;
  }[];
  history: {
    eventKey: string;
    points: number;
    reason: string;
    active: boolean;
    createdAt: string;
  }[];
}
export interface Challenge {
  id: string;
  weekStart: string;
  weekEnd: string;
  category: string;
  title: string;
  description: string;
  joined: boolean;
  journalId: string | null;
  participants: {
    name: string;
    image: string;
    body: string;
    recipeTitle: string;
  }[];
}
