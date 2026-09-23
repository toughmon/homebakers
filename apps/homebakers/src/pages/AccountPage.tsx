import { useEffect, useState } from "react";
import { GoogleButton } from "../components/GoogleButton";
import { api, errorMessage } from "../shared/api";
import { readStorage, writeStorage } from "../shared/storage";
import type {
  McpConnection,
  McpProvider,
  Follow,
  Post,
  Recipe,
  User,
} from "../shared/types";
const mcpProviderLabels: Record<McpProvider, string> = {
  codex: "Codex",
  claude: "Claude",
  gemini: "Gemini",
  chatgpt: "ChatGPT",
  other: "기타 MCP 클라이언트",
};
export function AccountPage({
  user,
  googleClientId,
  mcpUrl,
  recipes,
  posts,
  follows,
  onLogout,
  onRefresh,
}: {
  user: User;
  googleClientId: string | null;
  mcpUrl: string | null;
  recipes: Recipe[];
  posts: Post[];
  follows: Follow[];
  onLogout: () => Promise<void>;
  onRefresh: () => Promise<void>;
}) {
  const [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false);
  const [mcp, setMcp] = useState<McpConnection[] | null>(null);
  const [oauthGrants, setOauthGrants] = useState<
    { id: string; name: string; expiresAt: string }[]
  >([]);
  const [mcpLocalAvailable, setMcpLocalAvailable] = useState(false);
  const [mcpProvider, setMcpProvider] = useState<McpProvider>("codex");
  const [issuedToken, setIssuedToken] = useState<{
    provider: McpProvider;
    value: string;
  } | null>(null);
  const [mcpBusy, setMcpBusy] = useState(false);
  useEffect(() => {
    let active = true;
    setIssuedToken(null);
    void Promise.all([api.mcpStatus(), api.oauthGrants()])
      .then(([status, grants]) => {
        if (active) {
          setMcp(status.connections);
          setMcpLocalAvailable(status.localAvailable);
          setOauthGrants(grants.grants);
        }
      })
      .catch(() => {
        if (active) {
          setMcp(null);
          setMcpLocalAvailable(false);
        }
      });
    return () => {
      active = false;
    };
  }, [user.id]);
  async function connectMcp() {
    setMcpBusy(true);
    setNotice("");
    try {
      const result = await api.connectMcp(mcpProvider);
      setIssuedToken({ provider: mcpProvider, value: result.token });
      setMcp((previous) => [
        result.connection,
        ...(previous ?? []).filter((item) => item.provider !== mcpProvider),
      ]);
      setNotice(
        mcpProvider === "codex" && mcpLocalAvailable
          ? "Codex 연결 토큰을 발급하고 이 컴퓨터에 설정했습니다."
          : `${mcpProviderLabels[mcpProvider]} 연결 토큰을 발급했습니다. 지금 복사해 보관하세요.`,
      );
    } catch (error) {
      setNotice(errorMessage(error));
    } finally {
      setMcpBusy(false);
    }
  }
  async function disconnectMcp(connection: McpConnection) {
    setMcpBusy(true);
    setNotice("");
    try {
      await api.disconnectMcp(connection.id);
      setMcp(
        (previous) =>
          previous?.filter((item) => item.id !== connection.id) ?? [],
      );
      if (issuedToken?.provider === connection.provider) setIssuedToken(null);
      setNotice(
        `${mcpProviderLabels[connection.provider]} 연결을 해제했습니다.`,
      );
    } catch (error) {
      setNotice(errorMessage(error));
    } finally {
      setMcpBusy(false);
    }
  }
  async function disconnectOauth(id: string) {
    setMcpBusy(true);
    setNotice("");
    try {
      await api.revokeOauthGrant(id);
      setOauthGrants((previous) => previous.filter((item) => item.id !== id));
      setNotice("원격 MCP 연결을 해제했습니다.");
    } catch (error) {
      setNotice(errorMessage(error));
    } finally {
      setMcpBusy(false);
    }
  }
  const legacyRecipes = readStorage<Recipe[]>("oven-salon-recipes", []),
    legacyPosts = readStorage<Post[]>("oven-salon-posts", []);
  async function importLegacy() {
    setBusy(true);
    setNotice("");
    const key = `oven-salon-imported-${user.id}`;
    const map = readStorage<Record<string, string>>(key, {});
    try {
      for (const recipe of legacyRecipes) {
        if (map[recipe.id]) continue;
        const {
          title,
          description,
          image,
          category,
          difficulty,
          minutes,
          servings,
          ingredients,
          steps,
        } = recipe;
        const saved = await api.saveRecipe({
          title,
          description,
          image,
          category,
          difficulty,
          minutes,
          servings,
          ingredients,
          steps,
        });
        map[recipe.id] = saved.id;
        writeStorage(key, map);
      }
      for (const post of legacyPosts) {
        if (map[post.id]) continue;
        const saved = await api.savePost({
          category: post.category,
          title: post.title,
          body: post.body,
          recipeId: post.recipeId
            ? (map[post.recipeId] ?? post.recipeId)
            : undefined,
        });
        map[post.id] = saved.id;
        writeStorage(key, map);
      }
      for (const id of readStorage<string[]>("oven-salon-saved", [])) {
        await api.bookmark(map[id] ?? id, true).catch(() => undefined);
      }
      await onRefresh();
      setNotice("이 브라우저의 이전 글을 계정으로 가져왔습니다.");
    } catch (error) {
      setNotice(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="page-main container">
      <div className="page-heading">
        <p className="eyebrow accent">MY OVEN SALON</p>
        <h1>{user.name} 님의 오븐</h1>
        <p>{user.email}</p>
      </div>
      <div className="account-grid">
        <section className="form-card">
          <h2>내 레시피 {recipes.length}</h2>
          {recipes.map((recipe) => (
            <a
              key={recipe.id}
              className="account-item"
              href={`#/recipes/${recipe.id}`}
            >
              {recipe.title} →
            </a>
          ))}
          {!recipes.length && <p>첫 레시피를 나눠보세요.</p>}
          <a className="text-link" href="#/write">
            레시피 쓰기 →
          </a>
        </section>
        <section className="form-card">
          <h2>내 이야기 {posts.length}</h2>
          {posts.map((post) => (
            <a
              key={post.id}
              className="account-item"
              href={`#/community/${post.id}`}
            >
              {post.title} →
            </a>
          ))}
          {!posts.length && <p>아직 작성한 이야기가 없어요.</p>}
        </section>
      </div>
      <div className="account-grid">
        <section className="form-card">
          <h2>팔로우한 베이커 {follows.length}</h2>
          {follows.map((follow) => (
            <p key={follow.id}>{follow.name}</p>
          ))}
          {!follows.length && (
            <p>마음에 드는 레시피의 베이커를 팔로우해보세요.</p>
          )}
        </section>
        <section className="form-card">
          <h2>베이킹 도구</h2>
          <a className="account-item" href="#/shopping">
            장보기 목록 →
          </a>
          <a className="account-item" href="#/notifications">
            새 레시피 알림 →
          </a>
        </section>
      </div>
      {googleClientId && !user.googleLinked && (
        <section className="account-settings">
          <h2>Google 계정 연결</h2>
          <p>
            같은 이메일의 Google 계정을 연결하면 Google로도 로그인할 수 있어요.
          </p>
          <GoogleButton
            clientId={googleClientId}
            onCredential={async (credential) => {
              await api.linkGoogle(credential);
              await onRefresh();
              setNotice("Google 계정을 연결했습니다.");
            }}
          />
        </section>
      )}
      {mcp && (
        <section className="account-settings">
          <h2>레시피 등록 도구</h2>
          {mcpUrl && (
            <p>
              원격 MCP 주소: <code>{mcpUrl}</code>
              <br />
              {new URL(mcpUrl).hostname === "127.0.0.1" ||
              new URL(mcpUrl).hostname === "localhost"
                ? "현재 로컬 테스트 주소입니다. 다른 사람은 공개 HTTPS 주소로 배포한 후 연결할 수 있습니다."
                : "AI 서비스에 이 주소를 등록하면 Homebakers 로그인과 연결 허용 화면이 열립니다."}
            </p>
          )}
          <p>
            연결 대상마다 별도 토큰을 발급합니다. 토큰은 내 계정의 레시피와 사진
            등록에만 사용할 수 있고 90일 후 만료됩니다.
          </p>
          <label htmlFor="mcp-provider">연결 대상</label>
          <select
            id="mcp-provider"
            value={mcpProvider}
            onChange={(event) => {
              setMcpProvider(event.target.value as McpProvider);
              setIssuedToken(null);
            }}
          >
            {Object.entries(mcpProviderLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <button
            className="button button-outline"
            onClick={() => void connectMcp()}
            disabled={mcpBusy}
          >
            {mcpBusy
              ? "처리 중…"
              : mcp.some((item) => item.provider === mcpProvider)
                ? "토큰 재발급"
                : "토큰 발급"}
          </button>
          {mcpProvider === "codex" && mcpLocalAvailable ? (
            <p>Codex 토큰은 이 컴퓨터에 자동 설정됩니다.</p>
          ) : (
            <p>
              수동 토큰은 Bearer 헤더를 직접 설정하는 MCP 클라이언트에서 사용할
              수 있습니다. 웹 서비스에서는 위 MCP 주소의 로그인 연결을
              사용하세요.
            </p>
          )}
          {issuedToken && (
            <div className="mcp-issued-token">
              <label htmlFor="mcp-issued-token">
                {mcpProviderLabels[issuedToken.provider]} 토큰 · 지금만
                표시됩니다
              </label>
              <input
                id="mcp-issued-token"
                readOnly
                value={issuedToken.value}
                onFocus={(event) => event.currentTarget.select()}
              />
              <button
                className="button button-outline"
                onClick={() =>
                  void navigator.clipboard
                    .writeText(issuedToken.value)
                    .then(() => setNotice("토큰을 복사했습니다."))
                    .catch(() =>
                      setNotice(
                        "복사하지 못했습니다. 토큰을 직접 선택해 복사해주세요.",
                      ),
                    )
                }
              >
                토큰 복사
              </button>
            </div>
          )}
          {mcp.map((connection) => (
            <div className="account-item mcp-connection" key={connection.id}>
              <span>
                {mcpProviderLabels[connection.provider]}
                {connection.localConnected ? " · 이 컴퓨터 연결됨" : ""}
                <br />
                만료:{" "}
                {new Date(connection.expiresAt).toLocaleDateString("ko-KR")}
              </span>
              <button
                className="button button-outline"
                disabled={mcpBusy}
                onClick={() => void disconnectMcp(connection)}
              >
                연결 해제
              </button>
            </div>
          ))}
          {oauthGrants.map((grant) => (
            <div className="account-item mcp-connection" key={grant.id}>
              <span>
                {grant.name} · 원격 연결
                <br />
                만료: {new Date(grant.expiresAt).toLocaleDateString("ko-KR")}
              </span>
              <button
                className="button button-outline"
                disabled={mcpBusy}
                onClick={() => void disconnectOauth(grant.id)}
              >
                연결 해제
              </button>
            </div>
          ))}
        </section>
      )}
      {(legacyRecipes.length > 0 || legacyPosts.length > 0) && (
        <section className="account-settings">
          <h2>이전 브라우저 데이터</h2>
          <p>
            기존 시안에서 작성한 레시피 {legacyRecipes.length}개와 글{" "}
            {legacyPosts.length}개를 현재 계정으로 가져옵니다. 기존 브라우저
            데이터는 보존됩니다.
          </p>
          <button
            className="button button-outline"
            onClick={() => void importLegacy()}
            disabled={busy}
          >
            {busy ? "가져오는 중…" : "내 계정으로 가져오기"}
          </button>
        </section>
      )}
      {notice && (
        <p className="app-notice" role="status">
          {notice}
        </p>
      )}
      <button
        className="button button-outline"
        onClick={() =>
          void onLogout().catch((error) => setNotice(errorMessage(error)))
        }
      >
        로그아웃
      </button>
    </main>
  );
}
