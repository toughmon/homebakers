import { useEffect, useState } from "react";
import { api, errorMessage } from "../shared/api";

export function McpConnectPage({ id }: { id: string }) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    void api
      .oauthPending(id)
      .then((result) => {
        if (active) setName(result.clientName);
      })
      .catch((issue) => {
        if (active) setError(errorMessage(issue));
      });
    return () => {
      active = false;
    };
  }, [id]);
  async function respond(approve: boolean) {
    setBusy(true);
    setError("");
    try {
      const { redirectTo } = await api.oauthRespond(id, approve);
      window.location.assign(redirectTo);
    } catch (issue) {
      setError(errorMessage(issue));
      setBusy(false);
    }
  }
  return (
    <main className="page-main container">
      <section className="auth-card">
        <p className="eyebrow accent">HOMEBAKERS MCP</p>
        <h1>레시피 등록 연결</h1>
        {name && (
          <p>
            <strong>{name}</strong>에 내 Homebakers 계정의 레시피 및 사진 등록
            권한을 허용할까요?
          </p>
        )}
        <p>
          허용하면 이 서비스가 내 계정에 레시피를 게시할 수 있습니다.
          마이페이지에서 언제든 연결을 해제할 수 있습니다.
        </p>
        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
        <div className="mcp-connect-actions">
          <button
            className="button button-dark"
            disabled={!name || busy}
            onClick={() => void respond(true)}
          >
            연결 허용
          </button>
          <button
            className="button button-outline"
            disabled={!name || busy}
            onClick={() => void respond(false)}
          >
            취소
          </button>
        </div>
      </section>
    </main>
  );
}
