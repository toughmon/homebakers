import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const themes: Record<
  string,
  { color: string; light: string; shape: React.ReactNode }
> = {
  "first-bake": {
    color: "#be713c",
    light: "#ffe2ac",
    shape: (
      <>
        <rect
          x="43"
          y="49"
          width="42"
          height="24"
          rx="2"
          fill="currentColor"
          fillOpacity=".2"
        />
        <path d="M43 71V51h42v20M40 51h48M49 71h30" />
        <path
          d="M46 50c-9-12 3-23 12-16 4-13 20-13 24 0 10-3 15 12 3 16"
          fill="currentColor"
          fillOpacity=".18"
        />
        <path d="m56 57 5 6 11-12" />
      </>
    ),
  },
  "five-bakes": {
    color: "#a16b37",
    light: "#ffe9b8",
    shape: (
      <>
        <path d="m45 53 5 24h28l5-24M47 59h34M55 61l2 13m7-13v13m9-13-2 13" />
        <path
          d="M43 53c0-10 11-14 16-7 4-13 19-11 20 0 8-2 12 4 7 7Z"
          fill="currentColor"
          fillOpacity=".22"
        />
        <path
          d="m64 30 2 5 6 1-4 4 1 6-5-3-5 3 1-6-4-4 6-1Z"
          fill="currentColor"
          stroke="none"
        />
      </>
    ),
  },
  "three-categories": {
    color: "#51816d",
    light: "#cde8d7",
    shape: (
      <>
        <circle cx="64" cy="55" r="23" />
        <path
          d="m75 44-7 17-15 7 7-17Z"
          fill="currentColor"
          fillOpacity=".25"
        />
        <path d="m64 28 0 5m0 44v5M37 55h5m44 0h5" />
        <circle cx="64" cy="55" r="3" fill="currentColor" stroke="none" />
      </>
    ),
  },
  weekly: {
    color: "#6482a1",
    light: "#d4e7fa",
    shape: (
      <>
        <rect x="41" y="36" width="46" height="42" rx="5" />
        <path d="M42 48h44M52 31v12m24-12v12" />
        <path d="m55 62 6 6 13-14" strokeWidth="5" />
        <circle cx="84" cy="76" r="10" fill="currentColor" stroke="none" />
        <path d="m80 76 3 3 5-6" stroke="white" strokeWidth="2" />
      </>
    ),
  },
  helpful: {
    color: "#b4667d",
    light: "#fad6df",
    shape: (
      <>
        <path d="M41 38h46v30H64L51 79V68H41Z" />
        <path
          d="M64 59s-16-8-12-16c3-6 9-3 12 1 3-4 9-7 12-1 4 8-12 16-12 16Z"
          fill="currentColor"
          fillOpacity=".35"
        />
      </>
    ),
  },
  answer: {
    color: "#8870a7",
    light: "#e8daf7",
    shape: (
      <>
        <path d="M46 33h36v12c0 17-7 24-18 26-11-2-18-9-18-26ZM46 40H36c-1 12 4 17 13 17m33-17h10c1 12-4 17-13 17M64 71v10m-14 0h28" />
        <path d="m55 48 6 6 13-13" strokeWidth="4" />
      </>
    ),
  },
};
function BadgeDrawing({ id, earned }: { id: string; earned: boolean }) {
  const theme = themes[id] ?? themes["first-bake"]!;
  return (
    <svg className="achievement-art" viewBox="0 0 128 128" aria-hidden="true">
      <path
        d="M64 8C74 8 78 17 88 18S101 28 105 37 117 50 117 64 109 79 105 91 96 108 84 109 75 120 64 120 53 110 42 109 27 101 23 91 11 78 11 64 19 49 23 37 33 20 44 19 54 8 64 8Z"
        fill="#fff4df"
        stroke={earned ? "#c39547" : "#acb1b7"}
        strokeWidth="2.5"
      />
      <circle
        cx="64"
        cy="64"
        r="44"
        fill={earned ? (metals[id]?.enamel ?? "#f1c8bd") : "#dce1e3"}
        stroke={earned ? "#c39547" : "#acb1b7"}
        strokeWidth="2"
      />
      <g
        data-badge-motif="true"
        color="#fff4df"
        fill="none"
        stroke={earned ? "#c39547" : "#acb1b7"}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        transform="translate(0 7)"
      >
        {theme.shape}
      </g>
    </svg>
  );
}
const metals: Record<string, { name: string; enamel: string }> = {
  "first-bake": { name: "첫 완성 사진", enamel: "#f1c8bd" },
  "five-bakes": { name: "다섯 가지 오븐", enamel: "#efd6ad" },
  "three-categories": { name: "베이킹 탐험가", enamel: "#c4dfce" },
  weekly: { name: "함께 굽는 베이커", enamel: "#c8dbe9" },
  helpful: { name: "다정한 조언", enamel: "#edccda" },
  answer: { name: "문제 해결사", enamel: "#d7cbed" },
};
function MetalArt({
  id,
  earned,
  large = false,
}: {
  id: string;
  earned: boolean;
  large?: boolean;
}) {
  const controls = useRef<{
    rotate: (direction: number) => void;
    reset: () => void;
  } | null>(null);
  const host = useRef<HTMLDivElement>(null),
    canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const element = host.current,
      target = canvas.current;
    if (!element || !target) return;
    let cancelled = false,
      cleanup: (() => void) | undefined,
      started = false;
    const observer = new IntersectionObserver(
      async ([entry]) => {
        if (!entry?.isIntersecting || started) return;
        started = true;
        observer.disconnect();
        try {
          const { mountMetalBadge } = await import("./badge-metal");
          if (cancelled) return;
          const motif = element.querySelector("[data-badge-motif]");
          if (!motif) return;
          const metal = mountMetalBadge(
            element,
            target,
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">' +
              motif.outerHTML +
              "</svg>",
            earned,
            metals[id]?.enamel ?? "#f1c8bd",
            large,
          );
          controls.current = metal;
          cleanup = metal.dispose;
        } catch {
          element.dataset.fallback = "true";
        }
      },
      { rootMargin: "120px" },
    );
    observer.observe(element);
    return () => {
      cancelled = true;
      observer.disconnect();
      cleanup?.();
      delete target.dataset.rendered;
    };
  }, [id, earned, large]);
  return (
    <>
      <div
        ref={host}
        className={`achievement-art metal-badge-art ${large ? "metal-badge-large" : ""} ${earned ? "is-earned" : "is-locked"}`}
        aria-hidden="true"
      >
        <div className="metal-badge-fallback">
          <BadgeDrawing id={id} earned={earned} />
        </div>
        <canvas ref={canvas} />
      </div>
      {large && (
        <div className="badge-rotation-controls">
          <button
            type="button"
            aria-label="배지 왼쪽으로 90도 회전"
            onClick={() => controls.current?.rotate(-1)}
          >
            ←
          </button>
          <button type="button" onClick={() => controls.current?.reset()}>
            정면 보기
          </button>
          <button
            type="button"
            aria-label="배지 오른쪽으로 90도 회전"
            onClick={() => controls.current?.rotate(1)}
          >
            →
          </button>
        </div>
      )}
    </>
  );
}
function BadgeInspector({
  id,
  earned,
  onClose,
}: {
  id: string;
  earned: boolean;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const node = dialog.current;
    node?.showModal();
    return () => node?.close();
  }, []);
  const name = metals[id]?.name ?? "베이킹 배지";
  return createPortal(
    <dialog
      ref={dialog}
      className="metal-badge-dialog"
      onCancel={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      aria-label={name + " 배지 상세"}
    >
      <div className="metal-badge-inspector">
        <button
          className="badge-dialog-close"
          autoFocus
          aria-label="배지 상세 닫기"
          onClick={onClose}
        >
          ×
        </button>
        <p className="eyebrow">OVEN SALON · COLLECTOR'S EDITION</p>
        <MetalArt id={id} earned={earned} large />
        <span className={earned ? "metal-status earned" : "metal-status"}>
          {earned ? "획득한 배지" : "아직 잠긴 배지"}
        </span>
        <h2>{name}</h2>
        <p className="metal-badge-hint">
          좌우로 드래그해 360° 돌려보세요. 앞면과 뒷면을 모두 살펴볼 수 있어요.
        </p>
      </div>
    </dialog>,
    document.body,
  );
}
export function AchievementBadge({
  id,
  earned,
  decorative = false,
}: {
  id: string;
  earned: boolean;
  decorative?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const name = metals[id]?.name ?? "베이킹 배지";
  if (decorative) return <MetalArt id={id} earned={earned} />;
  return (
    <>
      <button
        className="metal-badge-button"
        type="button"
        aria-label={name + " 금속 배지 크게 보기"}
        onClick={() => setOpen(true)}
      >
        <MetalArt id={id} earned={earned} />
      </button>
      {open && (
        <BadgeInspector
          id={id}
          earned={earned}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
