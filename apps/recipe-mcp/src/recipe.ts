import { readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import OpenAI from "openai";
import { config } from "dotenv";
import { z } from "zod/v4";

const root = fileURLToPath(new URL("../../../", import.meta.url));
config({ path: resolve(root, ".env"), quiet: true });

const ingredient = z.object({
  name: z.string().trim().min(1).max(100),
  amount: z.number().positive().max(1_000_000),
  unit: z.string().trim().min(1).max(20),
});
const imageFields = {
  imagePath: z.string().min(1).optional(),
  imageBase64: z.string().min(1).optional(),
  imageUrl: z.string().min(1).optional(),
};
const step = z.object({
  title: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1).max(5000),
  minutes: z.number().int().positive().optional(),
  ...imageFields,
});
export const recipeInput = z.object({
  title: z.string().trim().min(1).max(160),
  description: z.string().trim().min(1).max(4000),
  category: z.enum(["케이크", "구움과자", "빵", "타르트", "기타"]),
  difficulty: z.enum(["쉬움", "보통", "도전"]),
  minutes: z.number().int().positive(),
  servings: z.number().int().positive(),
  ingredients: z.array(ingredient).min(1).max(100),
  steps: z.array(step).min(1).max(100),
  coverImagePath: z.string().min(1).optional(),
  coverImageBase64: z.string().min(1).optional(),
  coverImageUrl: z.string().min(1).optional(),
});
export type RecipeInput = z.infer<typeof recipeInput>;
export type RecipeContext = {
  token: string;
  apiUrl: string;
  appUrl: string;
  remote: true;
};

const generatedStep = z.object({
  title: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1).max(5000),
  minutes: z.number().int().positive(),
  imagePrompt: z.string().trim().min(1),
});
const generatedRecipe = z.object({
  title: recipeInput.shape.title,
  description: recipeInput.shape.description,
  category: recipeInput.shape.category,
  difficulty: recipeInput.shape.difficulty,
  minutes: recipeInput.shape.minutes,
  servings: recipeInput.shape.servings,
  ingredients: recipeInput.shape.ingredients,
  steps: z.array(generatedStep).min(4).max(5),
});

const generatedRecipeSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "title",
    "description",
    "category",
    "difficulty",
    "minutes",
    "servings",
    "ingredients",
    "steps",
  ],
  properties: {
    title: { type: "string" },
    description: { type: "string" },
    category: {
      type: "string",
      enum: ["케이크", "구움과자", "빵", "타르트", "기타"],
    },
    difficulty: { type: "string", enum: ["쉬움", "보통", "도전"] },
    minutes: { type: "integer" },
    servings: { type: "integer" },
    ingredients: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "amount", "unit"],
        properties: {
          name: { type: "string" },
          amount: { type: "number" },
          unit: { type: "string" },
        },
      },
    },
    steps: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "body", "minutes", "imagePrompt"],
        properties: {
          title: { type: "string" },
          body: { type: "string" },
          minutes: { type: "integer" },
          imagePrompt: { type: "string" },
        },
      },
    },
  },
} as const;

const maxImageBytes = 5 * 1024 * 1024;
function imageExtension(buffer: Buffer) {
  if (buffer.length < 12) return null;
  if (buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255) return "jpg";
  if (
    buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  )
    return "png";
  if (
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  )
    return "webp";
  return null;
}

async function imageBuffer(
  source: {
    imagePath?: string;
    imageBase64?: string;
  },
  context?: RecipeContext,
) {
  if (context?.remote && source.imagePath)
    throw new Error(
      "원격 MCP에서는 로컬 파일 경로를 사용할 수 없습니다. 사진을 base64로 전달해주세요.",
    );
  if (source.imagePath && source.imageBase64)
    throw new Error("한 사진에는 파일 경로 또는 base64 중 하나만 넣어주세요.");
  let buffer: Buffer;
  if (source.imagePath) {
    const path = resolve(root, source.imagePath);
    if ((await stat(path)).size > maxImageBytes)
      throw new Error("사진은 각 5MB 이하여야 합니다.");
    buffer = await readFile(path);
  } else if (source.imageBase64) {
    const encoded = source.imageBase64.replace(
      /^data:image\/(?:jpeg|png|webp);base64,/,
      "",
    );
    if (encoded.length > 7_000_000)
      throw new Error("사진은 각 5MB 이하여야 합니다.");
    buffer = Buffer.from(encoded, "base64");
  } else {
    throw new Error("사진 파일 경로나 base64가 필요합니다.");
  }
  const extension = imageExtension(buffer);
  if (!extension || buffer.length > maxImageBytes)
    throw new Error(
      "JPG, PNG, WebP 형식의 5MB 이하 사진만 사용할 수 있습니다.",
    );
  return { buffer, extension };
}

function apiBase() {
  const url = new URL(
    process.env.HOMEBAKERS_API_URL ?? "http://127.0.0.1:3002",
  );
  if (
    url.protocol !== "http:" ||
    !["127.0.0.1", "localhost"].includes(url.hostname)
  )
    throw new Error("HOMEBAKERS_API_URL은 로컬 HTTP 주소여야 합니다.");
  return url;
}

async function apiRequest(
  path: string,
  method: string,
  body?: BodyInit,
  json = false,
  context?: RecipeContext,
) {
  const fileToken = context
    ? ""
    : await readFile(resolve(root, "var/mcp-token"), "utf8").catch(() => "");
  const token = (
    context?.token ||
    process.env.HOMEBAKERS_MCP_TOKEN ||
    fileToken.trim() ||
    ""
  ).trim();
  if (!/^[A-Za-z0-9_-]{43}$/.test(token))
    throw new Error("마이페이지에서 '이 컴퓨터 연결'을 먼저 눌러주세요.");
  const response = await fetch(new URL(path, context?.apiUrl ?? apiBase()), {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "x-requested-with": "oven-salon",
      ...(json ? { "Content-Type": "application/json" } : {}),
    },
    body,
  });
  const data = (await response.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;
  if (!response.ok)
    throw new Error(
      typeof data.message === "string"
        ? data.message
        : `Homebakers API 오류 (${response.status})`,
    );
  return data;
}

async function upload(buffer: Buffer, context?: RecipeContext) {
  const extension = imageExtension(buffer);
  if (!extension || buffer.length > maxImageBytes)
    throw new Error(
      "JPG, PNG, WebP 형식의 5MB 이하 사진만 사용할 수 있습니다.",
    );
  const type = extension === "jpg" ? "jpeg" : extension;
  const body = new FormData();
  body.append(
    "file",
    new Blob([new Uint8Array(buffer)], { type: `image/${type}` }),
    `recipe.${extension}`,
  );
  const data = await apiRequest("/api/uploads", "POST", body, false, context);
  if (typeof data.url !== "string")
    throw new Error("사진 업로드 응답이 올바르지 않습니다.");
  return data.url;
}

async function resolveImage(
  source: {
    imagePath?: string;
    imageBase64?: string;
    imageUrl?: string;
  },
  context?: RecipeContext,
) {
  if (source.imageUrl) {
    if (source.imagePath || source.imageBase64)
      throw new Error("한 사진에는 URL 또는 파일 중 하나만 넣어주세요.");
    if (!/^\/(?:images|api\/uploads)\/[a-zA-Z0-9._-]+$/.test(source.imageUrl))
      throw new Error("기존 Homebakers 이미지 URL만 사용할 수 있습니다.");
    return source.imageUrl;
  }
  if (source.imagePath || source.imageBase64)
    return upload((await imageBuffer(source, context)).buffer, context);
  return undefined;
}

export async function createRecipe(
  input: RecipeInput,
  context?: RecipeContext,
) {
  const recipe = recipeInput.parse(input);
  const steps = [];
  for (const item of recipe.steps) {
    const image = await resolveImage(item, context);
    steps.push({
      title: item.title,
      body: item.body,
      ...(item.minutes ? { minutes: item.minutes } : {}),
      ...(image ? { image } : {}),
    });
  }
  const cover = await resolveImage(
    {
      imagePath: recipe.coverImagePath,
      imageBase64: recipe.coverImageBase64,
      imageUrl: recipe.coverImageUrl,
    },
    context,
  );
  const image = cover ?? [...steps].reverse().find((item) => item.image)?.image;
  if (!image)
    throw new Error("표지 사진이나 단계 사진을 최소 1장 제공해주세요.");
  const body = JSON.stringify({
    title: recipe.title,
    description: recipe.description,
    image,
    category: recipe.category,
    difficulty: recipe.difficulty,
    minutes: recipe.minutes,
    servings: recipe.servings,
    ingredients: recipe.ingredients,
    steps,
  });
  const saved = await apiRequest("/api/recipes", "POST", body, true, context);
  if (typeof saved.id !== "string")
    throw new Error("레시피 저장 응답이 올바르지 않습니다.");
  const appUrl = (
    context?.appUrl ??
    process.env.HOMEBAKERS_APP_URL ??
    "http://127.0.0.1:5175"
  ).replace(/\/$/, "");
  return {
    id: saved.id,
    title: saved.title,
    url: `${appUrl}/#/recipes/${saved.id}`,
  };
}

export async function createRecipeFromName(
  title: string,
  notes?: string,
  context?: RecipeContext,
) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey)
    throw new Error(
      "이름만으로 자동 생성하려면 .env에 OPENAI_API_KEY가 필요합니다.",
    );
  const openai = new OpenAI({ apiKey });
  const response = await openai.responses.create({
    model: process.env.OPENAI_RECIPE_MODEL ?? "gpt-5-mini",
    input: [
      {
        role: "system",
        content:
          "당신은 숙련된 홈베이킹 레시피 편집자입니다. 실제로 따라 만들 수 있는 한국어 레시피를 작성하세요. 계량을 정확히 하고 발효·굽기 온도와 시간을 단계 본문에 명시하세요. 총 시간은 발효·대기·굽기를 포함하세요. 4~5개 단계를 만들고 각 단계의 사진 생성 프롬프트를 영어로 작성하세요. 사실로 확인할 수 없는 효능이나 출처는 꾸며내지 마세요.",
      },
      {
        role: "user",
        content: `레시피 이름: ${title}${notes ? `\n추가 요청: ${notes}` : ""}`,
      },
    ],
    text: {
      format: {
        type: "json_schema",
        name: "homebakers_recipe",
        strict: true,
        schema: generatedRecipeSchema,
      },
    },
  });
  if (!response.output_text)
    throw new Error("레시피 본문을 생성하지 못했습니다.");
  const draft = generatedRecipe.parse(JSON.parse(response.output_text));
  const images: Buffer[] = [];
  for (const [index, item] of draft.steps.entries()) {
    const result = await openai.images.generate({
      model: process.env.OPENAI_IMAGE_MODEL ?? "gpt-image-2.5-flare",
      prompt: `Photorealistic editorial food process photograph for a Korean home baking recipe titled "${draft.title}". Step ${index + 1} of ${draft.steps.length}: ${item.imagePrompt}. Show the actual action and ingredients in this step. Warm natural kitchen light, accurate food texture, no text, no logos, no collage.`,
      size: "1024x1024",
      quality: "low",
      output_format: "webp",
      output_compression: 75,
    });
    const encoded = result.data?.[0]?.b64_json;
    if (!encoded)
      throw new Error(`${index + 1}단계 사진을 생성하지 못했습니다.`);
    images.push(Buffer.from(encoded, "base64"));
  }
  const steps = [];
  for (const [index, item] of draft.steps.entries()) {
    steps.push({
      title: item.title,
      body: item.body,
      minutes: item.minutes,
      imageUrl: await upload(images[index], context),
    });
  }
  return createRecipe(
    {
      ...draft,
      steps,
      coverImageUrl: steps.at(-1)!.imageUrl,
    },
    context,
  );
}
