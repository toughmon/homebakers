import { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod/v4";
import {
  createRecipe,
  createRecipeFromName,
  recipeInput,
  type RecipeContext,
} from "./recipe.js";

const result = (value: unknown) => ({
  content: [{ type: "text" as const, text: JSON.stringify(value) }],
});
const failure = (error: unknown) => ({
  isError: true,
  content: [
    {
      type: "text" as const,
      text:
        error instanceof Error ? error.message : "레시피 등록에 실패했습니다.",
    },
  ],
});

export function createRecipeMcpServer(context?: RecipeContext) {
  const remote = Boolean(context?.remote);
  const server = new McpServer(
    { name: "homebakers-recipes", version: "0.2.0" },
    {
      instructions:
        "이름만 받으면 create_recipe_from_name, 사용자가 내용이나 사진을 주면 create_recipe으로 Homebakers 계정에 즉시 게시합니다. 사진은 base64 또는 기존 Homebakers 이미지 URL로 전달하세요.",
    },
  );
  server.registerTool(
    "create_recipe_from_name",
    {
      description:
        "레시피 이름만으로 재료·설명·조리 단계와 단계별 AI 사진을 만들어 Homebakers 계정에 즉시 게시합니다.",
      inputSchema: z.object({
        title: z.string().trim().min(1).max(160),
        notes: z.string().trim().max(4000).optional(),
      }),
    },
    async ({ title, notes }) => {
      try {
        return result(await createRecipeFromName(title, notes, context));
      } catch (error) {
        return failure(error);
      }
    },
  );
  server.registerTool(
    "create_recipe",
    {
      description: remote
        ? "사용자가 제공한 레시피 내용과 사진을 즉시 게시합니다. 사진은 base64 또는 기존 Homebakers 이미지 URL로 전달하세요."
        : "사용자가 제공한 레시피 내용과 사진을 즉시 게시합니다. 사진은 로컬 파일 경로, base64 또는 기존 Homebakers 이미지 URL로 전달하세요.",
      inputSchema: recipeInput,
    },
    async (input) => {
      try {
        return result(await createRecipe(input, context));
      } catch (error) {
        return failure(error);
      }
    },
  );
  return server;
}
