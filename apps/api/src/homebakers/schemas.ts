import { Type, type Static } from "@sinclair/typebox";
const text = (max: number) =>
  Type.String({ minLength: 1, maxLength: max, pattern: "\\S" });
export const RecipeBody = Type.Object(
  {
    title: text(160),
    description: text(4000),
    image: Type.String({
      maxLength: 500,
      pattern: "^/(images|api/uploads)/[a-zA-Z0-9._-]+$",
    }),
    category: Type.Union(
      ["케이크", "구움과자", "빵", "타르트", "기타"].map((value) =>
        Type.Literal(value),
      ),
    ),
    difficulty: Type.Union(
      ["쉬움", "보통", "도전"].map((value) => Type.Literal(value)),
    ),
    minutes: Type.Integer({ minimum: 1, maximum: 100000 }),
    servings: Type.Integer({ minimum: 1, maximum: 10000 }),
    ingredients: Type.Array(
      Type.Object({
        name: text(100),
        amount: Type.Number({ exclusiveMinimum: 0, maximum: 1000000 }),
        unit: text(20),
      }),
      { minItems: 1, maxItems: 100 },
    ),
    steps: Type.Array(
      Type.Object({
        title: text(200),
        body: text(5000),
        minutes: Type.Optional(Type.Integer({ minimum: 1, maximum: 100000 })),
        image: Type.Optional(
          Type.String({
            maxLength: 500,
            pattern: "^/(images|api/uploads)/[a-zA-Z0-9._-]+$",
          }),
        ),
      }),
      { minItems: 1, maxItems: 100 },
    ),
  },
  { additionalProperties: false },
);
export type RecipeInput = Static<typeof RecipeBody>;
export const PostBody = Type.Object(
  {
    category: Type.Union(
      ["굽기 후기", "질문", "이야기"].map((value) => Type.Literal(value)),
    ),
    title: text(160),
    body: text(10000),
    recipeId: Type.Optional(text(100)),
    image: Type.Optional(
      Type.String({
        maxLength: 500,
        pattern: "^/(images|api/uploads)/[a-zA-Z0-9._-]+$",
      }),
    ),
  },
  { additionalProperties: false },
);
export const CommentBody = Type.Object(
  { body: text(2000) },
  { additionalProperties: false },
);
export const IdParams = Type.Object({
  id: Type.String({ minLength: 1, maxLength: 100, pattern: "^[a-zA-Z0-9-]+$" }),
});
