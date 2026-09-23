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

export type User = { id: string; email: string; name: string };
export type Comment = {
  id: string;
  body: string;
  author: string;
  authorId: string;
  createdAt: string;
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
