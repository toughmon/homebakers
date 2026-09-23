import type {
  Comment,
  Post,
  PostInput,
  Recipe,
  RecipeInput,
  User,
  McpConnection,
  McpProvider,
} from "./types";
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
export async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("x-requested-with", "oven-salon");
  if (options.body && !(options.body instanceof FormData))
    headers.set("Content-Type", "application/json");
  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      ...options,
      headers,
      credentials: "same-origin",
    });
  } catch {
    throw new ApiError(
      "서버에 연결하지 못했습니다. 잠시 후 다시 시도해주세요.",
      0,
    );
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new ApiError(
      data.message || "요청을 처리하지 못했습니다.",
      response.status,
    );
  return data as T;
}
const json = (method: string, body?: unknown) => ({
  method,
  ...(body === undefined ? {} : { body: JSON.stringify(body) }),
});
export const api = {
  me: () => request<{ user: User | null }>("/auth/me"),
  config: () =>
    request<{ googleClientId: string | null; mcpUrl: string | null }>(
      "/auth/config",
    ),
  login: (email: string, password: string) =>
    request<{ user: User }>("/auth/login", json("POST", { email, password })),
  register: (email: string, password: string, name: string) =>
    request<{ user: User }>(
      "/auth/register",
      json("POST", { email, password, name }),
    ),
  google: (credential: string) =>
    request<{ user: User }>("/auth/google", json("POST", { credential })),
  linkGoogle: (credential: string) =>
    request("/auth/google/link", json("POST", { credential })),
  mcpStatus: () =>
    request<{ localAvailable: boolean; connections: McpConnection[] }>(
      "/auth/mcp",
    ),
  connectMcp: (provider: McpProvider) =>
    request<{ connection: McpConnection; token: string }>(
      "/auth/mcp",
      json("POST", { provider }),
    ),
  disconnectMcp: (id: string) =>
    request<{ disconnected: true }>(
      `/auth/mcp/${encodeURIComponent(id)}`,
      json("DELETE"),
    ),
  oauthPending: (id: string) =>
    request<{ clientName: string; scope: string }>(
      `/oauth/pending/${encodeURIComponent(id)}`,
    ),
  oauthRespond: (id: string, approve: boolean) =>
    request<{ redirectTo: string }>(
      `/oauth/pending/${encodeURIComponent(id)}`,
      json("POST", { approve }),
    ),
  oauthGrants: () =>
    request<{
      grants: {
        id: string;
        name: string;
        createdAt: string;
        expiresAt: string;
      }[];
    }>("/oauth/grants"),
  revokeOauthGrant: (id: string) =>
    request<{ disconnected: true }>(
      `/oauth/grants/${encodeURIComponent(id)}`,
      json("DELETE"),
    ),
  logout: () => request("/auth/logout", json("POST")),
  recipes: () => request<Recipe[]>("/recipes"),
  saveRecipe: (body: RecipeInput, id?: string) =>
    request<Recipe>(
      id ? `/recipes/${id}` : "/recipes",
      json(id ? "PUT" : "POST", body),
    ),
  deleteRecipe: (id: string) => request(`/recipes/${id}`, json("DELETE")),
  bookmarks: () => request<string[]>("/bookmarks"),
  bookmark: (id: string, saved: boolean) =>
    request(`/bookmarks/${id}`, json(saved ? "PUT" : "DELETE")),
  posts: () => request<Post[]>("/posts"),
  savePost: (body: PostInput, id?: string) =>
    request<Post>(
      id ? `/posts/${id}` : "/posts",
      json(id ? "PUT" : "POST", body),
    ),
  deletePost: (id: string) => request(`/posts/${id}`, json("DELETE")),
  postLikes: () => request<string[]>("/post-likes"),
  likePost: (id: string, liked: boolean) =>
    request(`/posts/${id}/like`, json(liked ? "PUT" : "DELETE")),
  comments: (kind: "recipes" | "posts", id: string) =>
    request<Comment[]>(`/${kind}/${id}/comments`),
  addComment: (kind: "recipes" | "posts", id: string, body: string) =>
    request<Comment>(`/${kind}/${id}/comments`, json("POST", { body })),
  deleteComment: (id: string) => request(`/comments/${id}`, json("DELETE")),
  upload: (file: File) => {
    const body = new FormData();
    body.append("file", file);
    return request<{ url: string }>("/uploads", { method: "POST", body });
  },
};
export const errorMessage = (error: unknown) =>
  error instanceof Error
    ? error.message
    : "처리하지 못했습니다. 다시 시도해주세요.";
