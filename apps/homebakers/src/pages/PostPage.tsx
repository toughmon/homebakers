import { useState } from "react";
import { Comments } from "../components/Comments";
import { PostEditor } from "../components/PostEditor";
import { errorMessage } from "../shared/api";
import type { Post, PostInput, Recipe, User } from "../shared/types";
export function PostPage({
  post,
  recipes,
  user,
  editing,
  liked,
  onLike,
  onSave,
  onDelete,
  followed,
  onToggleFollow,
}: {
  post: Post;
  recipes: Recipe[];
  user: User | null;
  editing: boolean;
  liked: boolean;
  onLike: () => void;
  onSave: (input: PostInput) => Promise<void>;
  onDelete: () => Promise<void>;
  followed: boolean;
  onToggleFollow: () => void;
}) {
  const [error, setError] = useState("");
  const own = user?.id === post.authorId;
  const linked = recipes.find((item) => item.id === post.recipeId);
  if (editing && !own)
    return (
      <main className="page-main container">
        <p>이 글을 수정할 권한이 없습니다.</p>
      </main>
    );
  return (
    <main className="page-main container post-detail">
      <a className="back-link" href="#/community">
        ← 커뮤니티로 돌아가기
      </a>
      {editing ? (
        <PostEditor
          recipes={recipes}
          initial={{
            category: post.category,
            title: post.title,
            body: post.body,
            recipeId: post.recipeId,
            image: post.image,
          }}
          onSave={onSave}
        />
      ) : (
        <>
          <span className="post-category">{post.category}</span>
          <h1>{post.title}</h1>
          <div className="post-byline">
            {post.author} · {post.date}
            {!own && post.authorId && (
              <button
                className="post-follow"
                onClick={onToggleFollow}
                aria-pressed={followed}
              >
                {followed ? "팔로잉" : "베이커 팔로우"}
              </button>
            )}
          </div>
          {own && (
            <div className="owner-actions">
              <a
                className="button button-outline"
                href={`#/community/${post.id}/edit`}
              >
                수정
              </a>
              <button
                className="button button-outline"
                onClick={async () => {
                  if (!confirm("이 글과 댓글을 삭제할까요?")) return;
                  try {
                    await onDelete();
                  } catch (error) {
                    setError(errorMessage(error));
                  }
                }}
              >
                삭제
              </button>
            </div>
          )}
          {post.image && (
            <img
              className="post-detail-image"
              src={post.image}
              alt="글 첨부 사진"
            />
          )}
          <p className="post-body">{post.body}</p>
          {linked && (
            <a className="attached-recipe" href={`#/recipes/${linked.id}`}>
              함께 본 레시피 · {linked.title} →
            </a>
          )}
          <div>
            <button
              className={`button button-outline ${liked ? "is-saved" : ""}`}
              aria-pressed={liked}
              onClick={onLike}
            >
              ♡ 좋아요 {post.likes}
            </button>
          </div>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <Comments kind="posts" id={post.id} user={user} />
        </>
      )}
    </main>
  );
}
