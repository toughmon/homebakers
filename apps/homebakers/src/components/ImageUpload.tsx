import { useState } from "react";
import { api, errorMessage } from "../shared/api";
export function ImageUpload({
  onUpload,
  label = "사진 업로드",
}: {
  onUpload: (url: string) => void;
  label?: string;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <div className="upload-control">
      <label className="button button-outline">
        {busy ? "업로드 중…" : label}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={busy}
          onChange={async (event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            if (file.size > 5 * 1024 * 1024) {
              setError("5MB 이하의 이미지를 선택해주세요.");
              return;
            }
            setBusy(true);
            setError("");
            try {
              onUpload((await api.upload(file)).url);
            } catch (error) {
              setError(errorMessage(error));
            } finally {
              setBusy(false);
              event.target.value = "";
            }
          }}
        />
      </label>
      <small>JPG · PNG · WebP / 최대 5MB</small>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
