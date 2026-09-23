import { useEffect, useState } from "react";
import { api, errorMessage } from "../shared/api";
import type { BakeReview, User } from "../shared/types";

export function BakeReviews({
  recipeId,
  user,
  onRequireLogin,
}: {
  recipeId: string;
  user: User | null;
  onRequireLogin: () => void;
}) {
  const [reviews, setReviews] = useState<BakeReview[]>([]);
  const [body, setBody] = useState("");
  const [image, setImage] = useState("");
  const [imageTouched, setImageTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    void api
      .reviews(recipeId)
      .then((items) => {
        if (active) setReviews(items);
      })
      .catch((error) => {
        if (active) setError(errorMessage(error));
      });
    return () => {
      active = false;
    };
  }, [recipeId]);
  const mine = reviews.find((item) => item.authorId === user?.id);
  return (
    <section className="bake-reviews" aria-label="만들어봤어요 후기">
      <h2>
        만들어봤어요 <span>{reviews.length}</span>
      </h2>
      <p>직접 구운 모습과 따라 하며 발견한 팁을 나눠주세요.</p>
      {reviews.map((review) => (
        <article className="bake-review" key={review.id}>
          <div>
            <strong>{review.author}</strong>
            <time>
              {new Date(review.createdAt).toLocaleDateString("ko-KR")}
            </time>
          </div>
          {review.image && (
            <img
              src={review.image}
              alt={`${review.author}님의 완성 사진`}
              loading="lazy"
            />
          )}
          <p>{review.body}</p>
          {review.authorId === user?.id && (
            <button
              className="text-link"
              type="button"
              onClick={() => {
                setBody(review.body);
                setImage(review.image ?? "");
                setImageTouched(false);
                document
                  .getElementById("bake-review-body")
                  ?.scrollIntoView({ behavior: "smooth", block: "center" });
              }}
            >
              후기 수정
            </button>
          )}
          {review.authorId === user?.id && (
            <button
              className="text-link"
              type="button"
              onClick={async () => {
                try {
                  await api.deleteReview(review.id);
                  setReviews((items) =>
                    items.filter((item) => item.id !== review.id),
                  );
                  setBody("");
                  setImage("");
                  setImageTouched(false);
                } catch (error) {
                  setError(errorMessage(error));
                }
              }}
            >
              후기 삭제
            </button>
          )}
        </article>
      ))}
      {!user ? (
        <button
          className="button button-outline"
          type="button"
          onClick={onRequireLogin}
        >
          로그인하고 후기 남기기
        </button>
      ) : (
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            if (!user) return onRequireLogin();
            setBusy(true);
            setError("");
            try {
              const saved = await api.saveReview(
                recipeId,
                body,
                image ||
                  (!imageTouched ? (mine?.image ?? undefined) : undefined),
              );
              setReviews((items) => [
                saved,
                ...items.filter((item) => item.id !== saved.id),
              ]);
              setBody("");
              setImage("");
              setImageTouched(false);
            } catch (error) {
              setError(errorMessage(error));
            } finally {
              setBusy(false);
            }
          }}
        >
          <label htmlFor="bake-review-body">
            {mine ? "내 후기 수정" : "내 베이킹 후기"}
          </label>
          <textarea
            id="bake-review-body"
            value={body}
            onChange={(event) => setBody(event.target.value)}
            maxLength={2000}
            required
            placeholder="맛과 식감, 바꿔 본 재료를 알려주세요."
          />
          <label className="review-upload">
            완성 사진 (선택)
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              disabled={busy}
              onChange={async (event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                setBusy(true);
                setError("");
                try {
                  setImage((await api.upload(file)).url);
                  setImageTouched(true);
                } catch (error) {
                  setError(errorMessage(error));
                } finally {
                  setBusy(false);
                }
              }}
            />
          </label>
          {image && (
            <div className="review-preview">
              <img src={image} alt="올릴 완성 사진 미리보기" />
              <button
                type="button"
                onClick={() => {
                  setImage("");
                  setImageTouched(true);
                }}
              >
                사진 제거
              </button>
            </div>
          )}
          {error && (
            <p role="alert" className="form-error">
              {error}
            </p>
          )}
          <button className="button button-dark" type="submit" disabled={busy}>
            {mine ? "후기 저장" : "후기 올리기"}
          </button>
        </form>
      )}
    </section>
  );
}
