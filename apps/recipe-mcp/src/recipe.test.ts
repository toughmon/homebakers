import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { createText, generateImage } = vi.hoisted(() => ({
  createText: vi.fn(),
  generateImage: vi.fn(),
}));
vi.mock("openai", () => ({
  default: class {
    responses = { create: createText };
    images = { generate: generateImage };
  },
}));

import { createRecipe, createRecipeFromName } from "./recipe.js";

const png = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 0]);
const webp = Buffer.from("RIFF0000WEBP", "ascii");
const fetchMock = vi.fn(async (input: string | URL, options?: RequestInit) => {
  const path = new URL(String(input)).pathname;
  if (path === "/api/uploads") {
    const index = fetchMock.mock.calls.filter(
      ([url]) => new URL(String(url)).pathname === "/api/uploads",
    ).length;
    return new Response(
      JSON.stringify({ url: `/api/uploads/photo-${index}.webp` }),
      {
        status: 201,
      },
    );
  }
  if (path === "/api/recipes") {
    const body = JSON.parse(String(options?.body));
    return new Response(
      JSON.stringify({ id: "recipe-123", title: body.title }),
      {
        status: 201,
      },
    );
  }
  return new Response(JSON.stringify({ message: "Unexpected path" }), {
    status: 404,
  });
});

beforeEach(() => {
  vi.stubEnv("HOMEBAKERS_MCP_TOKEN", "A".repeat(43));
  vi.stubEnv("HOMEBAKERS_API_URL", "http://127.0.0.1:3002");
  vi.stubEnv("HOMEBAKERS_APP_URL", "http://127.0.0.1:5175");
  vi.stubEnv("OPENAI_API_KEY", "test-key");
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockClear();
  createText.mockClear();
  generateImage.mockClear();
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("recipe MCP", () => {
  it("uses each remote caller's token and rejects local file paths", async () => {
    const context = {
      token: "B".repeat(43),
      apiUrl: "http://127.0.0.1:3002",
      appUrl: "https://homebakers.example.com",
      remote: true as const,
    };
    const base = {
      title: "원격 치아바타",
      description: "원격 설명",
      category: "빵" as const,
      difficulty: "보통" as const,
      minutes: 90,
      servings: 2,
      ingredients: [{ name: "밀가루", amount: 200, unit: "g" }],
      steps: [
        { title: "반죽", body: "섞기", imageBase64: png.toString("base64") },
      ],
    };
    await expect(
      createRecipe(
        {
          ...base,
          steps: [{ title: "반죽", body: "섞기", imagePath: "/etc/passwd" }],
        },
        context,
      ),
    ).rejects.toThrow("로컬 파일 경로");
    const saved = await createRecipe(base, context);
    expect(saved.url).toBe(
      "https://homebakers.example.com/#/recipes/recipe-123",
    );
    expect(
      fetchMock.mock.calls.every(
        ([, options]) =>
          (options?.headers as Record<string, string>).Authorization ===
          `Bearer ${"B".repeat(43)}`,
      ),
    ).toBe(true);
  });
  it("uploads supplied photos and saves their URLs in the recipe", async () => {
    const saved = await createRecipe({
      title: "올리브치아바타",
      description: "사용자가 작성한 설명",
      category: "빵",
      difficulty: "보통",
      minutes: 180,
      servings: 4,
      ingredients: [{ name: "밀가루", amount: 300, unit: "g" }],
      steps: [
        {
          title: "반죽",
          body: "사용자가 작성한 단계",
          imageBase64: png.toString("base64"),
        },
      ],
    });
    expect(saved.url).toBe("http://127.0.0.1:5175/#/recipes/recipe-123");
    const recipeCall = fetchMock.mock.calls.find(
      ([url]) => new URL(String(url)).pathname === "/api/recipes",
    );
    const body = JSON.parse(String(recipeCall?.[1]?.body));
    expect(body.description).toBe("사용자가 작성한 설명");
    expect(body.steps[0].image).toBe("/api/uploads/photo-1.webp");
    expect(body.image).toBe(body.steps[0].image);
    expect(recipeCall?.[1]?.headers).toMatchObject({
      Authorization: `Bearer ${"A".repeat(43)}`,
    });
  });

  it("generates every step image before publishing a name-only recipe", async () => {
    const draft = {
      title: "올리브치아바타",
      description: "올리브를 넣은 치아바타",
      category: "빵",
      difficulty: "보통",
      minutes: 180,
      servings: 4,
      ingredients: [{ name: "밀가루", amount: 300, unit: "g" }],
      steps: [1, 2, 3, 4].map((number) => ({
        title: `${number}단계`,
        body: `${number}단계 설명`,
        minutes: 20,
        imagePrompt: `Photo of step ${number}`,
      })),
    };
    createText.mockResolvedValue({ output_text: JSON.stringify(draft) });
    generateImage.mockResolvedValue({
      data: [{ b64_json: webp.toString("base64") }],
    });
    const saved = await createRecipeFromName("올리브치아바타");
    expect(saved.title).toBe("올리브치아바타");
    expect(generateImage).toHaveBeenCalledTimes(4);
    const recipeCall = fetchMock.mock.calls.find(
      ([url]) => new URL(String(url)).pathname === "/api/recipes",
    );
    const body = JSON.parse(String(recipeCall?.[1]?.body));
    expect(body.steps.map((item: { image: string }) => item.image)).toEqual([
      "/api/uploads/photo-1.webp",
      "/api/uploads/photo-2.webp",
      "/api/uploads/photo-3.webp",
      "/api/uploads/photo-4.webp",
    ]);
    expect(body.image).toBe("/api/uploads/photo-4.webp");
  });
});
