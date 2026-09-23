import { useCallback, useEffect, useRef, useState } from "react";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { Comments } from "../components/Comments";
import { CommunityPage } from "../pages/CommunityPage";
import { ExplorePage } from "../pages/ExplorePage";
import { HomePage } from "../pages/HomePage";
import { RecipeDetailPage } from "../pages/RecipeDetailPage";
import { SavedPage } from "../pages/SavedPage";
import { WritePage } from "../pages/WritePage";
import { AuthPage } from "../pages/AuthPage";
import { AccountPage } from "../pages/AccountPage";
import { McpConnectPage } from "../pages/McpConnectPage";
import { PostPage } from "../pages/PostPage";
import { api, errorMessage } from "../shared/api";
import type { Post, Recipe, User } from "../shared/types";

const currentPath = () => window.location.hash.replace(/^#/, "") || "/";
export function App() {
  const pendingActions = useRef(new Set<string>());
  const [path, setPath] = useState(currentPath);
  const [recipes, setRecipes] = useState<Recipe[]>([]),
    [posts, setPosts] = useState<Post[]>([]);
  const [user, setUser] = useState<User | null>(null),
    [savedIds, setSavedIds] = useState<string[]>([]),
    [likedIds, setLikedIds] = useState<string[]>([]);
  const [googleClientId, setGoogleClientId] = useState<string | null>(null);
  const [mcpUrl, setMcpUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [recipes, posts, session, config] = await Promise.all([
        api.recipes(),
        api.posts(),
        api.me(),
        api.config(),
      ]);
      setRecipes(recipes);
      setPosts(posts);
      setUser(session.user);
      setGoogleClientId(config.googleClientId);
      setMcpUrl(config.mcpUrl);
      if (session.user) {
        const [saved, liked] = await Promise.all([
          api.bookmarks(),
          api.postLikes(),
        ]);
        setSavedIds(saved);
        setLikedIds(liked);
      }
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    const update = () => {
      setPath(currentPath());
      setNotice("");
      window.scrollTo({ top: 0, behavior: "instant" });
    };
    window.addEventListener("hashchange", update);
    return () => window.removeEventListener("hashchange", update);
  }, []);
  useEffect(() => {
    if (loading) return;
    const refreshRecipes = () => {
      if (path !== "/account" && !/^\/recipes\/[^/]+$/.test(path)) return;
      void api.recipes().then(setRecipes).catch((error) => {
        setNotice(errorMessage(error));
      });
    };
    refreshRecipes();
    window.addEventListener("focus", refreshRecipes);
    return () => window.removeEventListener("focus", refreshRecipes);
  }, [path, loading]);
  const loginRequired = () => {
    sessionStorage.setItem("oven-return-to", window.location.hash);
    window.location.hash = "#/login";
  };
  const onLogin = async (user: User) => {
    setUser(user);
    const [saved, liked] = await Promise.all([
      api.bookmarks(),
      api.postLikes(),
    ]);
    setSavedIds(saved);
    setLikedIds(liked);
    const target = sessionStorage.getItem("oven-return-to");
    sessionStorage.removeItem("oven-return-to");
    window.location.hash =
      target && target !== "#/login" ? target : "#/account";
  };
  const toggleSave = async (id: string) => {
    if (!user) {
      loginRequired();
      return;
    }
    if (pendingActions.current.has(`save:${id}`)) return;
    pendingActions.current.add(`save:${id}`);
    const saved = !savedIds.includes(id);
    try {
      await api.bookmark(id, saved);
      setSavedIds((ids) =>
        saved ? [...ids, id] : ids.filter((value) => value !== id),
      );
    } catch (error) {
      setNotice(errorMessage(error));
    } finally {
      pendingActions.current.delete(`save:${id}`);
    }
  };
  const toggleLike = async (id: string) => {
    if (!user) {
      loginRequired();
      return;
    }
    if (pendingActions.current.has(`like:${id}`)) return;
    pendingActions.current.add(`like:${id}`);
    const liked = !likedIds.includes(id);
    try {
      await api.likePost(id, liked);
      setLikedIds((ids) =>
        liked ? [...ids, id] : ids.filter((value) => value !== id),
      );
      setPosts((items) =>
        items.map((item) =>
          item.id === id
            ? { ...item, likes: item.likes + (liked ? 1 : -1) }
            : item,
        ),
      );
    } catch (error) {
      setNotice(errorMessage(error));
    } finally {
      pendingActions.current.delete(`like:${id}`);
    }
  };
  const parts = path.split("/").filter(Boolean);
  const recipe =
    parts[0] === "recipes" && parts[1]
      ? recipes.find((item) => item.id === parts[1])
      : undefined;
  const post =
    parts[0] === "community" && parts[1]
      ? posts.find((item) => item.id === parts[1])
      : undefined;
  const editing = parts[2] === "edit";
  const route = parts[0] || "home";
  const guarded =
    ["write", "saved", "account", "mcp-connect"].includes(route) || editing;
  let content;
  if (loading)
    content = (
      <main className="page-main container">
        <div className="empty-state" role="status">
          <h2>오븐 살롱을 준비하고 있어요…</h2>
        </div>
      </main>
    );
  else if (error)
    content = (
      <main className="page-main container">
        <div className="empty-state">
          <h2>잠시 연결이 어려워요</h2>
          <p role="alert">{error}</p>
          <button className="button button-dark" onClick={() => void load()}>
            다시 시도
          </button>
        </div>
      </main>
    );
  else if (route === "login" || (guarded && !user))
    content = (
      <AuthPage
        googleClientId={googleClientId}
        onLogin={(value) => {
          if (guarded)
            sessionStorage.setItem("oven-return-to", window.location.hash);
          void onLogin(value).catch((error) => setNotice(errorMessage(error)));
        }}
      />
    );
  else if (route === "home")
    content = (
      <HomePage
        recipes={recipes}
        posts={posts}
        savedIds={savedIds}
        onToggleSave={toggleSave}
      />
    );
  else if (route === "mcp-connect" && parts[1] && user)
    content = <McpConnectPage id={parts[1]} />;
  else if (route === "recipes" && !parts[1])
    content = (
      <ExplorePage
        recipes={recipes}
        savedIds={savedIds}
        onToggleSave={toggleSave}
      />
    );
  else if (
    (route === "write" ||
      (recipe && editing && recipe.authorId === user?.id)) &&
    user
  )
    content = (
      <WritePage
        key={recipe?.id ?? user.id}
        user={user}
        recipe={editing ? recipe : undefined}
        onPublish={async (input) => {
          const saved = await api.saveRecipe(
            input,
            editing ? recipe?.id : undefined,
          );
          setRecipes((items) => [
            saved,
            ...items.filter((item) => item.id !== saved.id),
          ]);
          window.location.hash = `#/recipes/${saved.id}`;
        }}
      />
    );
  else if (recipe && !editing)
    content = (
      <>
        {recipe.authorId === user?.id && (
          <div className="container owner-actions">
            <a
              className="button button-outline"
              href={`#/recipes/${recipe.id}/edit`}
            >
              레시피 수정
            </a>
            <button
              className="button button-outline"
              onClick={async () => {
                if (!confirm("레시피와 연결된 댓글을 삭제할까요?")) return;
                try {
                  await api.deleteRecipe(recipe.id);
                  setRecipes((items) =>
                    items.filter((item) => item.id !== recipe.id),
                  );
                  window.location.hash = "#/recipes";
                } catch (error) {
                  setNotice(errorMessage(error));
                }
              }}
            >
              삭제
            </button>
          </div>
        )}
        <RecipeDetailPage
          key={recipe.id}
          recipe={recipe}
          saved={savedIds.includes(recipe.id)}
          onToggleSave={toggleSave}
        />
        <div className="container">
          <Comments key={recipe.id} kind="recipes" id={recipe.id} user={user} />
        </div>
      </>
    );
  else if (route === "community" && !parts[1])
    content = (
      <CommunityPage
        posts={posts}
        recipes={recipes}
        user={user}
        onRequireLogin={loginRequired}
        onAddPost={async (input) => {
          const post = await api.savePost(input);
          setPosts((items) => [post, ...items]);
          window.location.hash = `#/community/${post.id}`;
        }}
      />
    );
  else if (post)
    content = (
      <PostPage
        key={`${post.id}-${editing}`}
        post={post}
        recipes={recipes}
        user={user}
        editing={editing}
        liked={likedIds.includes(post.id)}
        onLike={() => void toggleLike(post.id)}
        onSave={async (input) => {
          const updated = await api.savePost(input, post.id);
          setPosts((items) =>
            items.map((item) => (item.id === updated.id ? updated : item)),
          );
          window.location.hash = `#/community/${post.id}`;
        }}
        onDelete={async () => {
          await api.deletePost(post.id);
          setPosts((items) => items.filter((item) => item.id !== post.id));
          window.location.hash = "#/community";
        }}
      />
    );
  else if (route === "saved")
    content = (
      <SavedPage
        recipes={recipes}
        savedIds={savedIds}
        onToggleSave={toggleSave}
      />
    );
  else if (route === "account" && user)
    content = (
      <AccountPage
        user={user}
        googleClientId={googleClientId}
        mcpUrl={mcpUrl}
        recipes={recipes.filter((item) => item.authorId === user.id)}
        posts={posts.filter((item) => item.authorId === user.id)}
        onRefresh={load}
        onLogout={async () => {
          await api.logout();
          setUser(null);
          setSavedIds([]);
          setLikedIds([]);
          window.location.hash = "#/";
        }}
      />
    );
  else
    content = (
      <main className="page-main container">
        <div className="empty-state">
          <h1>페이지를 찾을 수 없어요</h1>
          <a className="button button-dark" href="#/">
            홈으로 돌아가기
          </a>
        </div>
      </main>
    );
  return (
    <div className="app-shell">
      <Header route={route} savedCount={savedIds.length} user={user} />
      {notice && (
        <div className="app-notice" role="alert">
          {notice}
          <button onClick={() => setNotice("")}>닫기</button>
        </div>
      )}
      {content}
      <Footer />
    </div>
  );
}
