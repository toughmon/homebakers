import { useState } from "react";
import type { PostInput, Recipe } from "../shared/types";
import { errorMessage } from "../shared/api";
import { ImageUpload } from "./ImageUpload";
export function PostEditor({
  recipes,
  initial,
  onSave,
}: {
  recipes: Recipe[];
  initial?: PostInput;
  onSave: (input: PostInput) => Promise<void>;
}) {
  const [value, setValue] = useState<PostInput>(
    initial ?? { category: "굽기 후기", title: "", body: "" },
  );
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <form
      className="compose-card"
      onSubmit={async (event) => {
        event.preventDefault();
        setBusy(true);
        setError("");
        try {
          await onSave(value);
        } catch (error) {
          setError(errorMessage(error));
        } finally {
          setBusy(false);
        }
      }}
    >
      <div className="form-row">
        <label>
          글 종류
          <select
            value={value.category}
            onChange={(event) =>
              setValue({
                ...value,
                category: event.target.value as PostInput["category"],
              })
            }
          >
            <option>굽기 후기</option>
            <option>질문</option>
            <option>이야기</option>
          </select>
        </label>
        <label>
          연결할 레시피
          <select
            value={value.recipeId ?? ""}
            onChange={(event) =>
              setValue({ ...value, recipeId: event.target.value || undefined })
            }
          >
            <option value="">선택하지 않음</option>
            {recipes.map((recipe) => (
              <option key={recipe.id} value={recipe.id}>
                {recipe.title}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label>
        제목
        <input
          value={value.title}
          maxLength={160}
          required
          onChange={(event) =>
            setValue({ ...value, title: event.target.value })
          }
        />
      </label>
      <label>
        내용
        <textarea
          value={value.body}
          maxLength={10000}
          required
          rows={7}
          onChange={(event) => setValue({ ...value, body: event.target.value })}
        />
      </label>
      <ImageUpload
        onUpload={(image) => setValue((current) => ({ ...current, image }))}
      />
      {value.image && (
        <div className="post-upload-preview">
          <img src={value.image} alt="첨부 사진" />
          <button
            type="button"
            onClick={() => setValue({ ...value, image: undefined })}
          >
            사진 제거
          </button>
        </div>
      )}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <button className="button button-dark" disabled={busy}>
        {busy ? "저장 중…" : initial ? "수정 완료" : "이야기 올리기"}
      </button>
    </form>
  );
}
