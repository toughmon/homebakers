import { useState } from "react";
import { api, errorMessage } from "../shared/api";
import type { User } from "../shared/types";
import { GoogleButton } from "../components/GoogleButton";
export function AuthPage({
  onLogin,
  googleClientId,
}: {
  onLogin: (user: User) => void;
  googleClientId: string | null;
}) {
  const [register, setRegister] = useState(false);
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [name, setName] = useState("");
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = register
        ? await api.register(email, password, name)
        : await api.login(email, password);
      onLogin(result.user);
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="page-main container">
      <section className="auth-card">
        <p className="eyebrow accent">WELCOME TO OVEN SALON</p>
        <h1>{register ? "함께 굽는 즐거움의 시작" : "다시 만나 반가워요"}</h1>
        <p>나만의 레시피와 이야기를 나눠보세요.</p>
        {googleClientId && (
          <>
            <GoogleButton
              clientId={googleClientId}
              onCredential={async (credential) => {
                const result = await api.google(credential);
                onLogin(result.user);
              }}
            />
            <div className="auth-divider">또는 이메일로 계속하기</div>
          </>
        )}
        <form onSubmit={submit}>
          {register && (
            <label>
              닉네임
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                minLength={2}
                maxLength={40}
                autoComplete="nickname"
                required
              />
            </label>
          )}
          <label>
            이메일
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              maxLength={254}
              required
            />
          </label>
          <label>
            비밀번호
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={10}
              maxLength={128}
              autoComplete={register ? "new-password" : "current-password"}
              required
            />
          </label>
          {register && <small>비밀번호는 10자 이상으로 설정해주세요.</small>}
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <button className="button button-dark" disabled={busy}>
            {busy ? "처리 중…" : register ? "회원가입" : "로그인"}
          </button>
        </form>
        <button
          className="auth-switch"
          onClick={() => {
            setRegister((value) => !value);
            setError("");
          }}
        >
          {register ? "이미 계정이 있나요? 로그인" : "처음 오셨나요? 회원가입"}
        </button>
      </section>
    </main>
  );
}
