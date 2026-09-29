import { useEffect, useRef } from "react";

export function HeroSteam() {
  const host = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const element = host.current;
    const target = canvas.current;
    if (!element || !target) return;
    let cancelled = false;
    let cleanup: (() => void) | undefined;
    const observer = new IntersectionObserver(
      async ([entry]) => {
        if (!entry?.isIntersecting) return;
        observer.disconnect();
        try {
          const { mountHeroSteam } = await import("./hero-steam");
          if (cancelled) return;
          cleanup = mountHeroSteam(element, target);
        } catch {
          element.dataset.fallback = "true";
        }
      },
      { rootMargin: "100px" },
    );
    observer.observe(element);
    return () => {
      cancelled = true;
      observer.disconnect();
      cleanup?.();
    };
  }, []);

  return (
    <div ref={host} className="hero-steam" aria-hidden="true">
      <canvas ref={canvas} />
      <div className="hero-steam-fallback">
        <i />
        <i />
        <i />
      </div>
    </div>
  );
}
