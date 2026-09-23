import { useState } from "react";
import { GoogleButton } from "../components/GoogleButton";
import { api, errorMessage } from "../shared/api";
import { readStorage, writeStorage } from "../shared/storage";
import type { Post, Recipe, User } from "../shared/types";
export function AccountPage({
  user,
  googleClientId,
  recipes,
  posts,
  onLogout,
  onRefresh,
}: {
  user: User;
  googleClientId: string | null;
  recipes: Recipe[];
  posts: Post[];
  onLogout: () => Promise<void>;
  onRefresh: () => Promise<void>;
}) {
  const [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false);
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
      {googleClientId && (
        <section className="account-settings">
          <h2>Google 계정 연결</h2>
          <p>
            같은 이메일의 Google 계정을 연결하면 Google로도 로그인할 수 있어요.
          </p>
          <GoogleButton
            clientId={googleClientId}
            onCredential={async (credential) => {
              await api.linkGoogle(credential);
              setNotice("Google 계정을 연결했습니다.");
            }}
          />
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
