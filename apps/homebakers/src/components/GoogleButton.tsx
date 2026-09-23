import { useEffect, useRef, useState } from "react";
type GoogleIdentity = {
  initialize: (options: {
    client_id: string;
    callback: (value: { credential: string }) => void;
  }) => void;
  renderButton: (
    element: HTMLElement,
    options: Record<string, unknown>,
  ) => void;
};
declare global {
  interface Window {
    google?: { accounts: { id: GoogleIdentity } };
  }
}
let loading: Promise<void> | undefined;
function loadGoogle() {
  if (window.google) return Promise.resolve();
  if (!loading)
    loading = new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => {
        loading = undefined;
        script.remove();
        reject(new Error("Google 로그인 버튼을 불러오지 못했습니다."));
      };
      document.head.append(script);
    });
  return loading;
}
export function GoogleButton({
  clientId,
  onCredential,
}: {
  clientId: string;
  onCredential: (credential: string) => Promise<void>;
}) {
  const element = useRef<HTMLDivElement>(null);
  const callback = useRef(onCredential);
  callback.current = onCredential;
  const [error, setError] = useState("");
  useEffect(() => {
    let live = true;
    loadGoogle()
      .then(() => {
        if (!live || !element.current || !window.google) return;
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (value) => {
            void callback
              .current(value.credential)
              .catch((error) =>
                setError(
                  error instanceof Error
                    ? error.message
                    : "Google 로그인에 실패했습니다.",
                ),
              );
          },
        });
        window.google.accounts.id.renderButton(element.current, {
          theme: "outline",
          size: "large",
          width: 320,
          locale: "ko",
        });
      })
      .catch((error) => {
        if (live) setError(error.message);
      });
    return () => {
      live = false;
    };
  }, [clientId]);
  return (
    <div className="google-login">
      <div ref={element} />
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
