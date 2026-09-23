import { useEffect, useState } from "react";
import { api, errorMessage } from "../shared/api";
import type { Comment, User } from "../shared/types";
export function Comments({
  kind,
  id,
  user,
}: {
  kind: "recipes" | "posts";
  id: string;
  user: User | null;
}) {
  const [items, setItems] = useState<Comment[]>([]),
    [body, setBody] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    let live = true;
    api
      .comments(kind, id)
      .then((value) => {
        if (live) setItems(value);
      })
      .catch((error) => {
        if (live) setError(errorMessage(error));
      });
    return () => {
      live = false;
    };
  }, [kind, id]);
  return (
    <section className="comments-section">
      <h2>
        댓글 <span>{items.length}</span>
      </h2>
      {items.map((item) => (
        <article className="comment" key={item.id}>
          <div>
            <strong>{item.author}</strong>
            <time>{new Date(item.createdAt).toLocaleDateString("ko-KR")}</time>
            {user?.id === item.authorId && (
              <button
                onClick={async () => {
                  if (!confirm("댓글을 삭제할까요?")) return;
                  try {
                    await api.deleteComment(item.id);
                    setItems((items) =>
                      items.filter((value) => value.id !== item.id),
                    );
                  } catch (error) {
                    setError(errorMessage(error));
                  }
                }}
              >
                삭제
              </button>
            )}
          </div>
          <p>{item.body}</p>
        </article>
      ))}
      {user ? (
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            if (!body.trim()) return;
            setBusy(true);
            setError("");
            try {
              const comment = await api.addComment(kind, id, body);
              setItems((items) => [...items, comment]);
              setBody("");
            } catch (error) {
              setError(errorMessage(error));
            } finally {
              setBusy(false);
            }
          }}
        >
          <label className="sr-only" htmlFor={`comment-${id}`}>
            댓글 내용
          </label>
          <textarea
            id={`comment-${id}`}
            value={body}
            onChange={(event) => setBody(event.target.value)}
            maxLength={2000}
            required
            placeholder="궁금한 점이나 따뜻한 응원을 남겨주세요."
          />
          <button className="button button-dark" disabled={busy}>
            {busy ? "등록 중…" : "댓글 등록"}
          </button>
        </form>
      ) : (
        <a className="text-link" href="#/login">
          로그인하고 댓글 남기기
        </a>
      )}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
