import * as THREE from "three";
import { badgeDesign } from "./badge-designs";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { SVGLoader } from "three/addons/loaders/SVGLoader.js";

type Entry = {
  canvas: HTMLCanvasElement;
  host: HTMLElement;
  scene: THREE.Scene;
  model: THREE.Group;
  target: THREE.Vector2;
  visible: boolean;
  dirty: boolean;
  disposed: boolean;
};
let shared: ReturnType<typeof createStudio> | undefined;
function createStudio() {
  const renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: true,
    powerPreference: "low-power",
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.95;
  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const environment = pmrem.fromScene(room, 0.04);
  room.dispose();
  pmrem.dispose();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 20);
  camera.position.set(0, 0, 7.3);
  const entries = new Set<Entry>();
  let frame = 0;
  function draw(e: Entry) {
    const width = Math.max(1, e.host.clientWidth),
      height = Math.max(1, e.host.clientHeight),
      ratio = Math.min(window.devicePixelRatio || 1, 1.75);
    const w = Math.round(width * ratio),
      h = Math.round(height * ratio);
    if (e.canvas.width !== w || e.canvas.height !== h) {
      e.canvas.width = w;
      e.canvas.height = h;
    }
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.render(e.scene, camera);
    const ctx = e.canvas.getContext("2d");
    if (ctx) {
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(renderer.domElement, 0, 0);
    }
    e.canvas.dataset.rendered = "true";
  }
  function tick() {
    frame = 0;
    let again = false;
    for (const e of entries) {
      if (!e.visible || e.disposed) continue;
      const dx = e.target.x - e.model.rotation.x,
        dy = e.target.y - e.model.rotation.y;
      if (Math.abs(dx) + Math.abs(dy) > 0.001) {
        e.model.rotation.x += dx * 0.16;
        e.model.rotation.y += dy * 0.16;
        e.dirty = true;
        again = true;
      }
      if (e.dirty) {
        draw(e);
        e.dirty = false;
      }
    }
    if (again) request();
  }
  function request() {
    if (!frame && !document.hidden) frame = requestAnimationFrame(tick);
  }
  const visibility = () => {
    if (!document.hidden) {
      for (const e of entries) e.dirty = true;
      request();
    }
  };
  document.addEventListener("visibilitychange", visibility);
  return {
    renderer,
    environment,
    entries,
    request,
    dispose() {
      if (frame) cancelAnimationFrame(frame);
      document.removeEventListener("visibilitychange", visibility);
      environment.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}
function createMedal(
  svg: string,
  earned: boolean,
  enamelColor: string,
  id: string,
) {
  const group = new THREE.Group();
  const resources = new Set<
    THREE.BufferGeometry | THREE.Material | THREE.Texture
  >();
  const makeMaterial = (color: string, roughness = 0.25, metalness = 1) => {
    const m = new THREE.MeshPhysicalMaterial({
      color,
      metalness,
      roughness,
      envMapIntensity: 1.2,
      clearcoat: 0.25,
      clearcoatRoughness: 0.2,
      anisotropy: 0.35,
      anisotropyRotation: 0.6,
    });
    resources.add(m);
    return m;
  };
  const side = makeMaterial(earned ? "#8f642b" : "#626c79", 0.34);
  const bright = makeMaterial(earned ? "#c99a3e" : "#b5bac2", 0.24);
  const ivory = makeMaterial("#fff4dd", 0.45, 0.03);
  // A matte color insert keeps the pastel pigment true beneath the gold studio reflections.
  const enamel = new THREE.MeshBasicMaterial({
    color: earned ? enamelColor : "#dce1e3",
    toneMapped: false,
  });
  resources.add(enamel);
  ivory.envMapIntensity = 0.3;
  function mesh(g: THREE.BufferGeometry, m: THREE.Material, z = 0) {
    resources.add(g);
    const o = new THREE.Mesh(g, m);
    o.position.z = z;
    group.add(o);
    return o;
  }
  const design = badgeDesign(id);
  const silhouette = new SVGLoader().parse(
    `<svg xmlns="http://www.w3.org/2000/svg"><path d="${design.outline}" /></svg>`,
  );
  const contour = SVGLoader.createShapes(silhouette.paths[0]!)[0]!;
  const points = contour
    .getPoints(96)
    .map((p) => new THREE.Vector2((p.x - 64) * 0.025, (64 - p.y) * 0.025));
  function face(scale = 1) {
    return new THREE.Shape(points.map((p) => p.clone().multiplyScalar(scale)));
  }
  const edge = face();
  function outline(scale: number, z: number, radius: number) {
    const vertices = points.map(
      (p) => new THREE.Vector3(p.x * scale, p.y * scale, z),
    );
    mesh(
      new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3(vertices, true),
        240,
        radius,
        8,
        true,
      ),
      bright,
    );
  }
  mesh(
    new THREE.ExtrudeGeometry(edge, {
      depth: 0.2,
      bevelEnabled: true,
      bevelSize: 0.045,
      bevelThickness: 0.045,
      bevelSegments: 3,
      steps: 1,
    }),
    side,
  );
  mesh(
    new THREE.ExtrudeGeometry(edge, {
      depth: 0.035,
      bevelEnabled: true,
      bevelSize: 0.025,
      bevelThickness: 0.015,
      bevelSegments: 3,
    }),
    ivory,
    0.235,
  );
  outline(1, 0.29, 0.025);
  mesh(new THREE.ShapeGeometry(face(0.82), 64), enamel, 0.295);
  outline(0.82, 0.315, 0.022);

  // The reverse is a flush metal face with recessed collector lettering.
  const backCanvas = document.createElement("canvas");
  backCanvas.width = backCanvas.height = 1024;
  const ctx = backCanvas.getContext("2d")!;
  ctx.fillStyle = earned ? "#f4e8cf" : "#dce1e3";
  ctx.fillRect(0, 0, 1024, 1024);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = earned ? "#60421f" : "#59616b";
  ctx.strokeStyle = ctx.fillStyle;
  ctx.lineWidth = 3;
  ctx.font = "500 46px Georgia, serif";
  ctx.fillText("OVEN SALON", 512, 355);
  ctx.beginPath();
  ctx.moveTo(340, 410);
  ctx.lineTo(684, 410);
  ctx.stroke();
  ctx.font = "48px Georgia, serif";
  ctx.fillText("✦", 512, 480);
  ctx.font = "600 38px sans-serif";
  ctx.fillText(design.inscription, 512, 555);
  ctx.font = "30px sans-serif";
  ctx.fillText(`COLLECTION / ${design.edition}`, 512, 625);
  const texture = new THREE.CanvasTexture(backCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  resources.add(texture);
  const reverseMaterial = new THREE.MeshPhysicalMaterial({
    map: texture,
    bumpMap: texture,
    bumpScale: 0.022,
    metalness: 0.15,
    roughness: 0.7,
    envMapIntensity: 0.25,
  });
  resources.add(reverseMaterial);
  const reverseGeometry = new THREE.ShapeGeometry(face(0.94), 64);
  const positions = reverseGeometry.getAttribute("position");
  const uv = reverseGeometry.getAttribute("uv");
  for (let i = 0; i < positions.count; i++)
    uv.setXY(i, positions.getX(i) / 3.2 + 0.5, positions.getY(i) / 3.2 + 0.5);
  const reverse = mesh(reverseGeometry, reverseMaterial, -0.052);
  reverse.rotation.y = Math.PI;
  outline(0.95, -0.06, 0.018);
  const icon = new SVGLoader().parse(svg);
  for (const path of icon.paths) {
    const style = path.userData?.style as
      { fill?: string; stroke?: string; strokeWidth?: number } | undefined;
    const fill = style?.fill;
    if (fill && fill !== "none")
      for (const shape of SVGLoader.createShapes(path)) {
        const g = new THREE.ExtrudeGeometry(shape, {
          depth: 2,
          bevelEnabled: true,
          bevelThickness: 0.6,
          bevelSize: 0.6,
          bevelSegments: 2,
          curveSegments: 14,
        });
        const o = mesh(g, ivory, 0.325);
        o.scale.set(0.026, -0.026, 0.026);
        o.position.x = -64 * 0.026;
        o.position.y = 57 * 0.026;
      }
    if (style?.stroke && style.stroke !== "none")
      for (const sub of path.subPaths) {
        const points = sub
          .getPoints(28)
          .map(
            (p) =>
              new THREE.Vector3((p.x - 64) * 0.026, (57 - p.y) * 0.026, 0.375),
          );
        const curve = new THREE.CurvePath<THREE.Vector3>();
        for (let i = 1; i < points.length; i++)
          if (points[i]!.distanceTo(points[i - 1]!) > 0.00001)
            curve.add(new THREE.LineCurve3(points[i - 1]!, points[i]!));
        if (curve.curves.length)
          mesh(
            new THREE.TubeGeometry(
              curve,
              Math.max(24, points.length * 2),
              Number(style.strokeWidth || 3) * 0.011,
              8,
              false,
            ),
            bright,
          );
      }
  }
  for (const child of group.children) child.position.z -= 0.12;
  group.rotation.set(-0.08, 0.12, 0);
  return {
    group,
    dispose() {
      resources.forEach((r) => r.dispose());
    },
  };
}
export function mountMetalBadge(
  host: HTMLElement,
  canvas: HTMLCanvasElement,
  svg: string,
  earned: boolean,
  enamel: string,
  interactive = false,
  id = "first-bake",
) {
  const studio = (shared ??= createStudio());
  const medal = createMedal(svg, earned, enamel, id);
  const scene = new THREE.Scene();
  scene.environment = studio.environment.texture;
  scene.add(medal.group);
  scene.add(new THREE.HemisphereLight(0xfff5de, 0x263348, 0.4));
  const key = new THREE.DirectionalLight(0xffe3af, 0.9);
  key.position.set(-3, 4, 5);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xdbeaff, 0.65);
  rim.position.set(4, 1, 2);
  scene.add(rim);
  const e: Entry = {
    canvas,
    host,
    scene,
    model: medal.group,
    target: new THREE.Vector2(-0.08, 0.12),
    visible: true,
    dirty: true,
    disposed: false,
  };
  studio.entries.add(e);
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  let drag: { id: number; x: number; angle: number } | undefined;
  const down = (event: PointerEvent) => {
    if (!interactive || event.button !== 0) return;
    drag = { id: event.pointerId, x: event.clientX, angle: e.target.y };
    host.setPointerCapture(event.pointerId);
    host.dataset.dragging = "true";
    event.preventDefault();
  };
  const move = (event: PointerEvent) => {
    if (interactive) {
      if (!drag || drag.id !== event.pointerId) return;
      e.target.y =
        drag.angle +
        ((event.clientX - drag.x) / Math.max(host.clientWidth, 1)) *
          Math.PI *
          2;
      if (reduced.matches) e.model.rotation.y = e.target.y;
      e.dirty = true;
      host.dataset.rotation = String(e.target.y);
      studio.request();
      return;
    }
    if (reduced.matches) return;
    const r = host.getBoundingClientRect();
    e.target.set(
      -0.08 - ((event.clientY - r.top) / r.height - 0.5) * 0.35,
      0.12 + ((event.clientX - r.left) / r.width - 0.5) * 0.5,
    );
    studio.request();
  };
  const up = (event: PointerEvent) => {
    if (drag?.id !== event.pointerId) return;
    drag = undefined;
    delete host.dataset.dragging;
    if (host.hasPointerCapture(event.pointerId))
      host.releasePointerCapture(event.pointerId);
  };
  const leave = () => {
    if (!interactive) {
      e.target.set(-0.08, 0.12);
      studio.request();
    }
  };
  host.addEventListener("pointerdown", down);
  host.addEventListener("pointermove", move);
  host.addEventListener("pointerup", up);
  host.addEventListener("pointercancel", up);
  host.addEventListener("lostpointercapture", up);
  host.addEventListener("pointerleave", leave);
  const resize = new ResizeObserver(() => {
    e.dirty = true;
    studio.request();
  });
  resize.observe(host);
  const observer = new IntersectionObserver(
    ([entry]) => {
      e.visible = Boolean(entry?.isIntersecting);
      if (e.visible) {
        e.dirty = true;
        studio.request();
      }
    },
    { rootMargin: "80px" },
  );
  observer.observe(host);
  studio.request();
  return {
    rotate(direction: number) {
      e.target.y += (direction * Math.PI) / 2;
      if (reduced.matches) e.model.rotation.y = e.target.y;
      e.dirty = true;
      host.dataset.rotation = String(e.target.y);
      studio.request();
    },
    reset() {
      e.target.set(-0.08, 0.12);
      if (reduced.matches) e.model.rotation.set(-0.08, 0.12, 0);
      e.dirty = true;
      host.dataset.rotation = "0.12";
      studio.request();
    },
    dispose() {
      e.disposed = true;
      studio.entries.delete(e);
      host.removeEventListener("pointerdown", down);
      host.removeEventListener("pointerup", up);
      host.removeEventListener("pointercancel", up);
      host.removeEventListener("lostpointercapture", up);
      host.removeEventListener("pointermove", move);
      host.removeEventListener("pointerleave", leave);
      resize.disconnect();
      observer.disconnect();
      medal.dispose();
      scene.clear();
      if (studio.entries.size === 0) {
        studio.dispose();
        shared = undefined;
      }
    },
  };
}
