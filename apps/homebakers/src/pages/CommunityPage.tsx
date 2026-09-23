import { useState } from "react";
import { Icon } from "../shared/Icon";
import { PostEditor } from "../components/PostEditor";
import type { Post, PostInput, Recipe, User } from "../shared/types";
const tabs = ["전체", "굽기 후기", "질문", "이야기"] as const;
export function CommunityPage({
  posts,
  recipes,
  user,
  onRequireLogin,
  onAddPost,
  likedIds,
  onToggleLike,
}: {
  posts: Post[];
  recipes: Recipe[];
  user: User | null;
  onRequireLogin: () => void;
  onAddPost: (post: PostInput) => Promise<void>;
  likedIds: string[];
  onToggleLike: (id: string) => void;
}) {
  const [tab, setTab] = useState<(typeof tabs)[number]>("전체"),
    [composing, setComposing] = useState(false),
    [query, setQuery] = useState("");
  const shown = posts.filter(
    (post) =>
      (tab === "전체" || post.category === tab) &&
      `${post.title} ${post.body}`.includes(query.trim()),
  );
  const compose = () => {
    if (!user) {
      onRequireLogin();
      return;
    }
    setComposing((value) => !value);
  };
  return (
    <main className="page-main container community-page">
      <div className="community-top">
        <div className="page-heading">
          <p className="eyebrow accent">THE BAKERS' TABLE</p>
          <h1>오븐 너머의 이야기</h1>
          <p>서로의 작은 성공과 궁금증을 나누는 다정한 공간.</p>
        </div>
        <button className="button button-dark" onClick={compose}>
          <Icon name={composing ? "close" : "plus"} size={17} />
          {composing ? "닫기" : "이야기 쓰기"}
        </button>
      </div>
      {composing && <PostEditor recipes={recipes} onSave={onAddPost} />}
      <div className="community-layout">
        <div>
          <label className="search-field">
            <Icon name="search" />
            <input
              placeholder="궁금한 이야기 검색"
              aria-label="커뮤니티 검색"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <div
            className="category-tabs"
            role="group"
            aria-label="커뮤니티 글 종류"
          >
            {tabs.map((item) => (
              <button
                key={item}
                className={tab === item ? "active" : ""}
                onClick={() => setTab(item)}
              >
                {item}
              </button>
            ))}
          </div>
          <div className="community-list">
            {shown.map((post) => {
              const recipe = recipes.find((item) => item.id === post.recipeId);
              const image = post.image || recipe?.image;
              return (
                <article className="community-post" key={post.id}>
                  <div className="community-post-main">
                    <div className="community-post-top">
                      <span className="post-category">{post.category}</span>
                      <span>{post.date}</span>
                    </div>
                    <a href={`#/community/${post.id}`}>
                      <h2>{post.title}</h2>
                    </a>
                    <p>{post.body}</p>
                    {recipe && (
                      <a
                        className="attached-recipe"
                        href={`#/recipes/${recipe.id}`}
                      >
                        <Icon name="book" size={15} />
                        {recipe.title}
                      </a>
                    )}
                    <div className="community-post-bottom">
                      <span className="avatar small">
                        {post.author.slice(0, 1)}
                      </span>
                      <strong>{post.author}</strong>
                      <button
                        type="button"
                        className="community-like"
                        aria-pressed={likedIds.includes(post.id)}
                        onClick={() => onToggleLike(post.id)}
                      >
                        <Icon name="heart" size={15} />
                        좋아요 {post.likes}
                      </button>
                      <a href={`#/community/${post.id}`}>
                        <Icon name="message" size={15} />
                        {post.comments}
                      </a>
                    </div>
                  </div>
                  {image && (
                    <a
                      href={`#/community/${post.id}`}
                      className="community-post-image"
                    >
                      <img src={image} alt="게시글 사진" loading="lazy" />
                    </a>
                  )}
                </article>
              );
            })}
            {!shown.length && (
              <div className="empty-state">
                <h2>아직 이야기가 없어요</h2>
                <p>첫 이야기를 남겨주세요.</p>
              </div>
            )}
          </div>
        </div>
        <aside className="community-aside">
          <div className="aside-card">
            <span className="aside-symbol">✳</span>
            <p className="eyebrow">WELCOME TO THE TABLE</p>
            <h2>
              함께 구우면
              <br />더 즐거우니까요.
            </h2>
            <p>질문도, 작은 실패도, 뿌듯한 완성 사진도 편하게 나눠주세요.</p>
            <button className="text-link" onClick={compose}>
              이야기 남기기 →
            </button>
          </div>
        </aside>
      </div>
    </main>
  );
}
