import * as THREE from "three";

const vertexShader = `
  varying vec2 vUv;

  void main() {
    vUv = position.xy * 0.5 + 0.5;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const fragmentShader = `
  precision highp float;

  uniform float uTime;
  uniform float uWind;
  uniform float uCompact;
  varying vec2 vUv;

  float hash21(vec2 point) {
    point = fract(point * vec2(123.34, 456.21));
    point += dot(point, point + 45.32);
    return fract(point.x * point.y);
  }

  float noise21(vec2 point) {
    vec2 cell = floor(point);
    vec2 local = fract(point);
    local = local * local * (3.0 - 2.0 * local);
    float a = hash21(cell);
    float b = hash21(cell + vec2(1.0, 0.0));
    float c = hash21(cell + vec2(0.0, 1.0));
    float d = hash21(cell + vec2(1.0, 1.0));
    return mix(mix(a, b, local.x), mix(c, d, local.x), local.y);
  }

  float fbm(vec2 point) {
    float value = 0.0;
    float amplitude = 0.55;
    mat2 turn = mat2(0.82, -0.57, 0.57, 0.82);
    for (int octave = 0; octave < 4; octave++) {
      value += amplitude * noise21(point);
      point = turn * point * 2.03 + 13.7;
      amplitude *= 0.48;
    }
    return value;
  }

  float bell(float distanceToCenter, float width) {
    float normalized = distanceToCenter / max(width, 0.0001);
    return exp(-normalized * normalized * 2.15);
  }

  float plume(vec2 uv, float originX, float phase, float strength) {
    float baseY = mix(0.635, 0.39, uCompact);
    float progress = (uv.y - baseY) / (0.985 - baseY);
    if (progress <= 0.0 || progress >= 1.0) return 0.0;

    float thermalNoise = fbm(vec2(progress * 2.4 + phase, uTime * 0.105 + phase));
    float slowBend = (thermalNoise - 0.5) * mix(0.018, 0.11, progress);
    float curl = sin(progress * 8.4 - uTime * 0.72 + phase * 2.1)
      * mix(0.004, 0.027, progress);
    curl += sin(progress * 17.0 - uTime * 0.38 + phase)
      * mix(0.002, 0.012, progress);
    float center = originX + slowBend + curl + uWind * progress;

    float width = mix(0.0055, 0.044, pow(progress, 0.78));
    width *= mix(1.0, 1.24, uCompact);
    float distanceToCenter = abs(uv.x - center);
    float body = bell(distanceToCenter, width);
    float haze = bell(distanceToCenter, width * 2.65) * 0.22;

    vec2 detailPoint = vec2(
      (uv.x - center) / width * 0.62 + phase,
      progress * 5.5 - uTime * 0.31
    );
    float detail = fbm(detailPoint);
    float filaments = smoothstep(0.3, 0.86, detail);
    float risingPockets = 0.7 + 0.3 * sin(
      progress * 24.0 - uTime * 2.05 + detail * 4.2 + phase
    );

    float branchAmount = smoothstep(0.28, 0.68, progress);
    float branchOffset = width * (0.72 + 0.48 * sin(progress * 11.0 + phase));
    float branchCenter = center + branchOffset * sin(phase * 3.7 + progress * 5.0);
    float branch = bell(abs(uv.x - branchCenter), width * 0.42)
      * branchAmount * (0.18 + filaments * 0.28);

    float sourceFade = smoothstep(0.0, 0.055, progress);
    float topFade = 1.0 - smoothstep(0.73, 1.0, progress);
    float breathing = 0.86 + 0.14 * sin(uTime * 0.55 + phase * 5.0);
    return (body * mix(0.48, 1.08, filaments) * risingPockets + haze + branch)
      * sourceFade * topFade * strength * breathing;
  }

  void main() {
    float mobileShift = uCompact * -0.045;
    float steam = plume(vUv, 0.625 + mobileShift, 0.13, 0.78);
    steam += plume(vUv, 0.685 + mobileShift, 1.71, 1.0);
    steam += plume(vUv, 0.742 + mobileShift, 3.86, 0.72);
    steam = 1.0 - exp(-steam * 0.92);

    float grain = hash21(gl_FragCoord.xy + floor(uTime * 12.0)) - 0.5;
    steam = max(0.0, steam + grain * 0.018 * steam);
    vec3 shadowTone = vec3(0.61, 0.575, 0.54);
    vec3 litTone = vec3(1.0, 0.985, 0.945);
    vec3 steamColor = mix(shadowTone, litTone, smoothstep(0.08, 0.58, steam));
    float alpha = clamp(steam * 0.34, 0.0, 0.3);
    gl_FragColor = vec4(steamColor, alpha);
  }
`;

export function mountHeroSteam(host: HTMLElement, canvas: HTMLCanvasElement) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: false,
    powerPreference: "low-power",
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene();
  const camera = new THREE.Camera();
  const geometry = new THREE.PlaneGeometry(2, 2);
  const uniforms = {
    uTime: { value: 0 },
    uWind: { value: 0 },
    uCompact: { value: 0 },
  };
  const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    blending: THREE.NormalBlending,
  });
  scene.add(new THREE.Mesh(geometry, material));
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  const startedAt = performance.now();
  let frame = 0;
  let visible = true;
  let disposed = false;
  let wind = 0;
  let targetWind = 0;
  const interactionSurface = host.parentElement ?? host;

  function resize() {
    const width = Math.max(1, host.clientWidth);
    const height = Math.max(1, host.clientHeight);
    const ratio = Math.min(window.devicePixelRatio || 1, 1.35);
    renderer.setPixelRatio(ratio);
    renderer.setSize(width, height, false);
    uniforms.uCompact.value = width <= 760 ? 1 : 0;
    if (reduced.matches) render();
  }
  function render() {
    if (disposed || !visible) return;
    if (!reduced.matches) {
      uniforms.uTime.value = (performance.now() - startedAt) / 1000;
      wind += (targetWind - wind) * 0.025;
      uniforms.uWind.value = wind;
    }
    renderer.render(scene, camera);
    canvas.dataset.rendered = "true";
    frame = reduced.matches ? 0 : requestAnimationFrame(render);
  }
  function pointer(event: PointerEvent) {
    const bounds = host.getBoundingClientRect();
    targetWind = ((event.clientX - bounds.left) / bounds.width - 0.5) * 0.035;
  }
  function leave() {
    targetWind = 0;
  }
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(host);
  const intersection = new IntersectionObserver(([entry]) => {
    visible = Boolean(entry?.isIntersecting);
    if (visible && !frame) {
      render();
    } else if (!visible && frame) {
      cancelAnimationFrame(frame);
      frame = 0;
    }
  });
  intersection.observe(host);
  interactionSurface.addEventListener("pointermove", pointer);
  interactionSurface.addEventListener("pointerleave", leave);
  resize();
  render();

  return () => {
    disposed = true;
    if (frame) cancelAnimationFrame(frame);
    resizeObserver.disconnect();
    intersection.disconnect();
    interactionSurface.removeEventListener("pointermove", pointer);
    interactionSurface.removeEventListener("pointerleave", leave);
    geometry.dispose();
    material.dispose();
    scene.clear();
    renderer.dispose();
    renderer.forceContextLoss();
    delete canvas.dataset.rendered;
  };
}
