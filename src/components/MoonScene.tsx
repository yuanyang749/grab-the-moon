"use client";

import { Suspense, useEffect, useMemo, useRef, type RefObject } from "react";
import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { clamp, spring, type Interaction } from "@/lib/interaction";
import { MOONCAKES, type MooncakeId } from "@/lib/mooncakes";

type Props = { input: RefObject<Interaction>; variant: MooncakeId; reducedMotion: boolean; onReady: () => void; onError: () => void };
const CAKE_TEXTURE_PATHS = MOONCAKES.map((cake) => cake.texture);
const SIDE_TEXTURE_PATHS = MOONCAKES.slice(1).map((cake) => cake.side);
const BOTTOM_TEXTURE_PATHS = MOONCAKES.slice(1).map((cake) => cake.bottom);
const cloneModelMap = (texture: THREE.Texture) => {
  const map = texture.clone();
  map.flipY = false;
  map.needsUpdate = true;
  return map;
};

// 3D Stardust Particle count
const PARTICLE_COUNT = 240;
const MOON_FRONT_YAW = -Math.PI / 2;

function World({ input, variant, reducedMotion, onReady, onError }: Props) {
  const moonMap = useLoader(THREE.TextureLoader, "/textures/moon/albedo.jpg");
  const cakeTextures = useLoader(THREE.TextureLoader, CAKE_TEXTURE_PATHS);
  const sideTextures = useLoader(THREE.TextureLoader, SIDE_TEXTURE_PATHS);
  const bottomTextures = useLoader(THREE.TextureLoader, BOTTOM_TEXTURE_PATHS);
  const modelTopMaps = useMemo(() => cakeTextures.map((texture, index) => {
    if (index === 0) return texture;
    const map = cloneModelMap(texture);
    map.repeat.set(1.27, 1.75);
    map.offset.set(-0.135, -0.156);
    return map;
  }), [cakeTextures]);
  const modelSideMaps = useMemo(() => sideTextures.map(cloneModelMap), [sideTextures]);
  const modelBottomMaps = useMemo(() => bottomTextures.map(cloneModelMap), [bottomTextures]);
  const gltf = useLoader(GLTFLoader, "/models/mooncake.glb");
  const cakeModel = useMemo(() => {
    const object = gltf.scene.clone(true);
    const materials: THREE.MeshStandardMaterial[] = [];
    const originals = new Map<string, { map: THREE.Texture | null; color: THREE.Color }>();
    object.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      const source = child.material as THREE.MeshStandardMaterial;
      originals.set(source.name, { map: source.map, color: source.color.clone() });
      const material = source.clone();
      material.transparent = true;
      material.opacity = 0;
      material.depthWrite = false;
      child.material = material;
      materials.push(material);
    });
    if (!originals.get("Golden pastry relief")?.map) throw new Error("Mooncake top material is missing");
    return { object, materials, originals };
  }, [gltf.scene]);

  const moon = useRef<THREE.Mesh>(null);
  const cake = useRef<THREE.Group>(null);
  const shadow = useRef<THREE.Mesh>(null);
  const halo = useRef<THREE.Mesh>(null);
  const particles = useRef<THREE.Points>(null);
  const root = useRef<THREE.Group>(null);
  const ambientLight = useRef<THREE.AmbientLight>(null);
  const keyLight = useRef<THREE.DirectionalLight>(null);
  const fillLight = useRef<THREE.DirectionalLight>(null);

  // Shader uniforms for live texture and surface morphing on the moon sphere
  const transitionUniforms = useRef({
    uCakeMap: { value: cakeTextures[0] },
    uBlend: { value: 0 },
  });

  const dynamics = useRef({ sx: 1, sy: 1, vx: 0, vy: 0 });
  const cakeZoom = useRef(1);
  const cakeQuaternion = useRef(new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.22, 0, 0)));
  const transformOrigin = useRef(new THREE.Vector3());
  const wasActive = useRef(false);
  const { camera, size, gl } = useThree();

  // Create procedural glow, halo, and contact shadow textures via 2D Canvas
  const [haloTexture, shadowTexture] = useMemo(() => {
    if (typeof document === "undefined") return [null, null];

    // Warm lunar atmospheric halo texture
    const haloCanvas = document.createElement("canvas");
    haloCanvas.width = haloCanvas.height = 256;
    const hctx = haloCanvas.getContext("2d");
    if (hctx) {
      const grad = hctx.createRadialGradient(128, 128, 65, 128, 128, 128);
      grad.addColorStop(0, "rgba(255, 231, 184, 0.58)");
      grad.addColorStop(0.35, "rgba(255, 204, 128, 0.3)");
      grad.addColorStop(0.7, "rgba(232, 154, 75, 0.11)");
      grad.addColorStop(1, "rgba(190, 100, 42, 0)");
      hctx.fillStyle = grad;
      hctx.fillRect(0, 0, 256, 256);
    }
    const hTex = new THREE.CanvasTexture(haloCanvas);

    // Soft celestial contact shadow beneath mooncake
    const shadowCanvas = document.createElement("canvas");
    shadowCanvas.width = shadowCanvas.height = 256;
    const sctx = shadowCanvas.getContext("2d");
    if (sctx) {
      const grad = sctx.createRadialGradient(128, 128, 0, 128, 128, 128);
      grad.addColorStop(0, "rgba(2, 4, 8, 0.85)");
      grad.addColorStop(0.4, "rgba(2, 4, 8, 0.45)");
      grad.addColorStop(0.8, "rgba(2, 4, 8, 0.12)");
      grad.addColorStop(1, "rgba(2, 4, 8, 0)");
      sctx.fillStyle = grad;
      sctx.fillRect(0, 0, 256, 256);
    }
    const sTex = new THREE.CanvasTexture(shadowCanvas);

    return [hTex, sTex];
  }, []);

  // 3D Stardust particle velocities and positions
  const stardust = useMemo(() => {
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const velocities = new Float32Array(PARTICLE_COUNT * 3);
    const basePositions = new Float32Array(PARTICLE_COUNT * 3);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      const speed = 2.2 + Math.random() * 3.5;

      velocities[i * 3] = Math.sin(phi) * Math.cos(theta) * speed;
      velocities[i * 3 + 1] = (Math.cos(phi) * 0.7 + 0.3) * speed;
      velocities[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * speed;

      basePositions[i * 3] = (Math.random() - 0.5) * 0.4;
      basePositions[i * 3 + 1] = (Math.random() - 0.5) * 0.4;
      basePositions[i * 3 + 2] = (Math.random() - 0.5) * 0.4;

      positions[i * 3] = basePositions[i * 3];
      positions[i * 3 + 1] = basePositions[i * 3 + 1];
      positions[i * 3 + 2] = basePositions[i * 3 + 2];
    }
    return { positions, velocities, basePositions };
  }, []);

  useEffect(() => {
    moonMap.colorSpace = THREE.SRGBColorSpace;
    moonMap.anisotropy = Math.min(8, gl.capabilities.getMaxAnisotropy());
    moonMap.needsUpdate = true;
    for (const texture of cakeTextures) {
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = Math.min(8, gl.capabilities.getMaxAnisotropy());
      texture.needsUpdate = true;
    }
    for (const texture of [...modelTopMaps, ...modelSideMaps, ...modelBottomMaps]) {
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = Math.min(8, gl.capabilities.getMaxAnisotropy());
      texture.needsUpdate = true;
    }
    for (const material of cakeModel.materials) {
      if (material.map) material.map.anisotropy = Math.min(8, gl.capabilities.getMaxAnisotropy());
    }
    onReady();
  }, [moonMap, cakeTextures, modelTopMaps, modelSideMaps, modelBottomMaps, cakeModel, gl, onReady]);

  useEffect(() => () => {
    [...modelTopMaps.slice(1), ...modelSideMaps, ...modelBottomMaps].forEach((texture) => texture.dispose());
  }, [modelTopMaps, modelSideMaps, modelBottomMaps]);

  useEffect(() => {
    const index = MOONCAKES.findIndex((cake) => cake.id === variant);
    transitionUniforms.current.uCakeMap.value = cakeTextures[index];
    cakeModel.object.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      const material = child.material as THREE.MeshStandardMaterial;
      const original = cakeModel.originals.get(material.name);
      if (material.name === "Golden pastry relief") {
        material.map = index === 0 ? original!.map : modelTopMaps[index];
        material.color.copy(original!.color);
        material.needsUpdate = true;
      } else if (material.name === "Toasted fluted sides") {
        material.map = index === 0 ? original!.map : modelSideMaps[index - 1];
        material.color.copy(original!.color);
        material.needsUpdate = true;
      } else if (material.name === "Baked underside") {
        material.map = index === 0 ? original!.map : modelBottomMaps[index - 1];
        material.color.copy(original!.color);
        material.needsUpdate = true;
      }
    });
  }, [variant, cakeTextures, modelTopMaps, modelSideMaps, modelBottomMaps, cakeModel]);

  // Front-projected shader blending: morphs the lunar crater surface into the golden mooncake relief
  const handleMoonBeforeCompile = useMemo(() => {
    return (shader: THREE.WebGLProgramParametersWithUniforms) => {
      shader.uniforms.uCakeMap = transitionUniforms.current.uCakeMap;
      shader.uniforms.uBlend = transitionUniforms.current.uBlend;

      shader.vertexShader = shader.vertexShader.replace(
        "#include <common>",
        `#include <common>
         varying vec2 vCakeUv;
         varying float vIsFront;`
      );

      shader.vertexShader = shader.vertexShader.replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
         // SphereGeometry (radius 1.3) rotated by -PI/2 around Y:
         // Local +X points toward the camera (+Z in world/view space).
         // Local -Z points to the right (+X in world/view space).
         // Local +Y points up (+Y in world/view space).
         vCakeUv = vec2(-position.z / 2.6 + 0.5, position.y / 2.6 + 0.5);
         vIsFront = position.x > 0.0 ? 1.0 : 0.0;`
      );

      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <common>",
        `#include <common>
         varying vec2 vCakeUv;
         varying float vIsFront;
         uniform sampler2D uCakeMap;
         uniform float uBlend;`
      );

      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <map_fragment>",
        `#ifdef USE_MAP
          vec4 moonTex = texture2D( map, vMapUv );
          #ifdef DECODE_VIDEO_TEXTURE
            moonTex = sRGBTransferEOTF( moonTex );
          #endif

          // Sample mooncake top texture
          vec4 cakeTex = texture2D( uCakeMap, clamp(vCakeUv, 0.0, 1.0) );

          // Circular mask: smooth falloff at perimeter of the circular face
          float rDist = distance(vCakeUv, vec2(0.5));
          float maskDist = smoothstep(0.50, 0.46, rDist) * vIsFront;

          float blendVal = clamp(uBlend, 0.0, 1.0) * maskDist;

          // Seamlessly blend lunar surface into baked golden mooncake relief
          vec4 blendedTex = mix(moonTex, cakeTex, blendVal);
          diffuseColor *= blendedTex;
        #endif`
      );

      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <emissivemap_fragment>",
        `#ifdef USE_EMISSIVEMAP
          vec4 emissiveMoon = texture2D( emissiveMap, vEmissiveMapUv );
          #ifdef DECODE_VIDEO_TEXTURE_EMISSIVE
            emissiveMoon = sRGBTransferEOTF( emissiveMoon );
          #endif
          vec4 emissiveCake = texture2D( uCakeMap, clamp(vCakeUv, 0.0, 1.0) );
          float rEmit = distance(vCakeUv, vec2(0.5));
          float maskEmit = smoothstep(0.50, 0.46, rEmit) * vIsFront;
          float blendEmit = clamp(uBlend, 0.0, 1.0) * maskEmit;
          vec3 emissiveBlended = mix(emissiveMoon.rgb, emissiveCake.rgb, blendEmit);
          totalEmissiveRadiance *= emissiveBlended;
        #endif`
      );
    };
  }, []);

  // Dynamic Camera Distance based on viewport
  useEffect(() => {
    const isMobile = size.width < 768;
    const aspect = size.width / Math.max(1, size.height);
    const targetZ = isMobile
      ? Math.max(9.2, 9.2 / Math.min(1, aspect * 1.15))
      : 8.8;
    camera.position.set(0, 0, targetZ);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
  }, [camera, size]);

  useEffect(() => {
    const canvas = gl.domElement;
    const lost = (event: Event) => {
      event.preventDefault();
      onError();
    };
    canvas.addEventListener("webglcontextlost", lost);
    return () => canvas.removeEventListener("webglcontextlost", lost);
  }, [gl, onError]);

  useFrame((state, delta) => {
    if (!moon.current || !cake.current || !root.current || !particles.current || !halo.current || !shadow.current) return;

    const s = input.current;
    const activeCake = MOONCAKES.find((item) => item.id === s.cakeVariant) || MOONCAKES[0];
    const now = performance.now();
    const dt = Math.min(delta, 1 / 45);
    const active = s.phase === "transforming" || s.phase === "mooncake";
    const t = active ? (now - s.startedAt) / 1000 : 0;

    const moonMaterial = moon.current.material as THREE.MeshStandardMaterial;
    const shadowMaterial = shadow.current.material as THREE.MeshBasicMaterial;
    const particleMaterial = particles.current.material as THREE.PointsMaterial;
    const haloMaterial = halo.current.material as THREE.MeshBasicMaterial;

    const ease = 1 - Math.exp(-dt * 10);

    // CAMERA BASE
    const isMobile = size.width < 768;
    const aspect = size.width / Math.max(1, size.height);
    const baseZ = isMobile ? Math.max(9.2, 9.2 / Math.min(1, aspect * 1.15)) : 8.8;

    // --- PHASE 1: INTERACTIVE MOON (BEFORE TRANSFORMATION) ---
    if (!active) {
      wasActive.current = false;
      root.current.position.set(0, 0, 0);
      if (ambientLight.current) {
        ambientLight.current.color.set("#ffe9c6");
        ambientLight.current.intensity = 0.95;
      }
      if (keyLight.current) {
        keyLight.current.color.set("#fff2d2");
        keyLight.current.intensity = 2.4;
      }
      if (fillLight.current) {
        fillLight.current.color.set("#ffd59c");
        fillLight.current.intensity = 0.85;
      }
      cakeZoom.current = 1;
      cakeQuaternion.current.setFromEuler(new THREE.Euler(-0.22, 0, 0));
      moon.current.visible = true;
      cake.current.visible = false;
      shadow.current.visible = false;
      particles.current.visible = false;

      moonMaterial.opacity = 1;
      moonMaterial.depthWrite = true;
      moonMaterial.color.set("#fff5df");
      moonMaterial.roughness = 0.92;
      moonMaterial.bumpScale = 0.045;
      transitionUniforms.current.uBlend.value = 0;
      for (const material of cakeModel.materials) {
        material.opacity = 0;
        material.transparent = true;
        material.depthWrite = false;
      }

      // Spring deformation when grabbing
      const tap = reducedMotion ? 0 : Math.exp(-Math.max(0, now - s.pulse) / 220) * Math.sin((now - s.pulse) / 48) * 0.065;
      const targetSx = clamp((1 + Math.abs(s.x) * 0.85 - Math.abs(s.y) * 0.28 + s.pressure * 0.3) * s.pinch + tap, 0.55, 1.5);
      const targetSy = clamp((1 + Math.abs(s.y) * 0.85 - Math.abs(s.x) * 0.3 - s.pressure * 0.55) * s.pinch - tap, 0.45, 1.5);

      const d = dynamics.current;
      if (s.phase === "idle" && !s.pressed && (Math.abs(d.sx - 1) > 0.3 || Math.abs(d.sy - 1) > 0.3)) {
        d.sx = 1;
        d.sy = 1;
        d.vx = 0;
        d.vy = 0;
      }

      if (reducedMotion) {
        d.sx = targetSx;
        d.sy = targetSy;
        d.vx = d.vy = 0;
      } else {
        [d.sx, d.vx] = spring(d.sx, d.vx, targetSx, dt);
        [d.sy, d.vy] = spring(d.sy, d.vy, targetSy, dt);
      }

      // Elastic volume preservation
      const sz = 1 / Math.sqrt(Math.max(0.35, d.sx * d.sy));
      moon.current.scale.set(d.sx, d.sy, sz);

      // Smooth tracking with mouse & floating idle breath
      const idleFloat = reducedMotion ? 0 : Math.sin(state.clock.elapsedTime * 0.8) * 0.04;
      moon.current.position.x = THREE.MathUtils.lerp(moon.current.position.x, s.x * 0.9, ease);
      moon.current.position.y = THREE.MathUtils.lerp(moon.current.position.y, -s.y * (s.y > 0 ? 4.2 : 0.9) + idleFloat, ease);
      moon.current.position.z = THREE.MathUtils.lerp(moon.current.position.z, 0, ease);

      // Keep the large halo inside the square WebGL canvas while the moon is dragged.
      halo.current.visible = !s.pressed && Math.abs(moon.current.position.x) < 0.25 && Math.abs(moon.current.position.y) < 0.25 && Math.max(d.sx, d.sy) < 1.12;

      // Subtle 3D tilt
      moon.current.rotation.y = THREE.MathUtils.lerp(moon.current.rotation.y, MOON_FRONT_YAW + s.hoverX * 0.25 + s.x * 0.6, ease);
      moon.current.rotation.x = THREE.MathUtils.lerp(moon.current.rotation.x, s.hoverY * 0.18, ease);
      moon.current.rotation.z = THREE.MathUtils.lerp(moon.current.rotation.z, -s.rotation * 0.8, ease);

      // Atmospheric Halo tracking
      halo.current.position.copy(moon.current.position);
      halo.current.position.z = -0.3;
      halo.current.scale.set(d.sx * 1.05, d.sy * 1.05, 1);
      haloMaterial.opacity = 0.78 + (s.phase === "charging" ? 0.15 : 0);

      // Golden charging pulse
      const isCharging = s.phase === "charging";
      moonMaterial.emissive.set(isCharging ? "#ffa726" : "#ffe3b7");
      moonMaterial.emissiveIntensity = isCharging
        ? 1.0 + (reducedMotion ? 0 : Math.sin(now / 90) * 0.15)
        : 0.8;

      camera.position.set(0, 0, baseZ);
      return;
    }

    // --- PHASE 2: ALCHEMY METAMORPHOSIS & 3D TACTILE MOONCAKE ---
    if (!wasActive.current) {
      transformOrigin.current.copy(moon.current.position);
      moon.current.position.set(0, 0, 0);
      halo.current.position.set(0, 0, -0.3);
      wasActive.current = true;
    }
    root.current.position.copy(transformOrigin.current).multiplyScalar(reducedMotion ? 0 : 1 - clamp(t / 1.55, 0, 1));
    if (ambientLight.current) {
      ambientLight.current.color.set("#222b3a");
      ambientLight.current.intensity = 1.2;
    }
    if (keyLight.current) {
      keyLight.current.color.set("#fff6e8");
      keyLight.current.intensity = 3.2;
    }
    if (fillLight.current) {
      fillLight.current.color.set("#ffd899");
      fillLight.current.intensity = 1.2;
    }

    // ========================================================
    // MOON -> MOONCAKE TRANSFORMATION SEQUENCE (t: 0s ~ 1.55s)
    // 物理压模工艺: 压扁面胚 + 渐变烙印月饼纹理与烘烤色泽 -> 印模交接 -> 脱模阻尼弹性弹出
    // ========================================================

    // 1. 月球面胚物理下压压扁与纹理烙印过渡 (0.0s <= t < 0.52s)
    if (t < 0.52) {
      moon.current.visible = true;
      halo.current.visible = true;

      // 下压进度曲线（加速下压，模拟模具/手掌重重压下）
      const pressProg = clamp(t / 0.38, 0, 1);
      const easePress = Math.pow(pressProg, 1.8);

      // 纹理渐变过渡进度：随着下压加深，月面纹理逐步烙印溶解为金黄月饼雕花图案
      const textureProg = Math.pow(pressProg, 1.35);
      transitionUniforms.current.uBlend.value = textureProg;

      // 物理体积守恒压缩：高度压缩至 0.36，水平面自然向四周延展至 1.28
      const moonScaleY = 1.0 - easePress * 0.64;
      const moonScaleXZ = 1.0 + easePress * 0.28;
      moon.current.scale.set(moonScaleXZ, moonScaleY, moonScaleXZ);

      // 压模时月球姿态平滑对齐正面，保证 NoBug 花纹与后续 3D 月饼模型水平朝向完美咬合
      moon.current.rotation.x = THREE.MathUtils.lerp(moon.current.rotation.x, 0, ease);
      moon.current.rotation.y = THREE.MathUtils.lerp(moon.current.rotation.y, MOON_FRONT_YAW, ease);
      moon.current.rotation.z = THREE.MathUtils.lerp(moon.current.rotation.z, 0, ease);

      // 面胚贴底压紧：质心随着压扁平稳微沉
      moon.current.position.y = -easePress * 0.28;

      // 表面色泽由清冷月光白玉（#fff5df）渐变过渡到温润金黄烘烤酥皮（#e8a245）
      moonMaterial.color.lerpColors(new THREE.Color("#fff5df"), new THREE.Color(activeCake.surface), textureProg);
      // 表面粗糙度由粉质月壤（0.92）转为烘烤蛋黄液温润光泽（0.58）
      moonMaterial.roughness = THREE.MathUtils.lerp(0.92, 0.58, textureProg);
      // 月面坑洼 bump 随着受压变平滑
      moonMaterial.bumpScale = (1 - textureProg) * 0.045;

      // 烘烤微温自发光：在压到最深处呈现金黄焦香烘烤光泽
      moonMaterial.emissive.lerpColors(new THREE.Color("#ffe3b7"), new THREE.Color(activeCake.glow), textureProg);
      moonMaterial.emissiveIntensity = THREE.MathUtils.lerp(0.8, 1.35, Math.sin(pressProg * Math.PI));

      // 在压到最扁极点（t >= 0.36s），此时月亮已经完全变成金黄月饼贴图与形状，平滑与 3D 实体模型交接
      if (t >= 0.36) {
        const fadeOut = clamp((t - 0.36) / 0.12, 0, 1);
        moonMaterial.opacity = Math.max(0, 1 - fadeOut);
        moonMaterial.depthWrite = false;
      }

      // 月晕随压模柔和收敛
      haloMaterial.opacity = Math.max(0, (1 - easePress * 0.7) * 0.78);
    } else {
      moon.current.visible = false;
      halo.current.visible = false;
    }

    // 2. 印章压印顿感微震 (0.36s <= t < 0.50s)
    if (t >= 0.36 && t < 0.50 && !reducedMotion) {
      const stampHit = (1 - (t - 0.36) / 0.14) * 0.035;
      camera.position.y = -Math.sin((t - 0.36) * 160) * stampHit;
    } else {
      camera.position.x = THREE.MathUtils.lerp(camera.position.x, 0, ease);
      camera.position.y = THREE.MathUtils.lerp(camera.position.y, 0, ease);
    }
    camera.position.z = baseZ;

    // 3. 脱模星尘如花火微粒 (0.38s <= t < 1.30s)
    const particleAge = t - 0.38;
    if (particleAge > 0 && particleAge < 0.95 && !reducedMotion) {
      particles.current.visible = true;
      const attr = particles.current.geometry.getAttribute("position") as THREE.BufferAttribute;
      const drag = Math.exp(-particleAge * 2.5);

      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const vx = stardust.velocities[i * 3];
        const vy = stardust.velocities[i * 3 + 1];
        const vz = stardust.velocities[i * 3 + 2];

        const x = stardust.basePositions[i * 3] + vx * particleAge * drag;
        const y = stardust.basePositions[i * 3 + 1] + (vy * particleAge - 1.0 * particleAge * particleAge) * drag;
        const z = stardust.basePositions[i * 3 + 2] + vz * particleAge * drag;

        attr.setXYZ(i, x, y, z);
      }
      attr.needsUpdate = true;
      particleMaterial.opacity = Math.max(0, (1 - particleAge / 0.95) * 0.9);
    } else {
      particles.current.visible = false;
    }

    // 4. 3D 月饼印花显现与脱模高回弹 (t >= 0.36s)
    if (t >= 0.36) {
      cake.current.visible = true;
      shadow.current.visible = true;

      // 瞬间交接：在最扁平压制点与已变金黄月饼贴图的面胚完美重合交接
      const cakeFade = reducedMotion ? 1 : clamp((t - 0.36) / 0.10, 0, 1);
      for (const material of cakeModel.materials) {
        material.opacity = cakeFade;
        material.transparent = cakeFade < 1;
        material.depthWrite = cakeFade >= 1;
      }
      shadowMaterial.opacity = cakeFade * 0.75;

      // 模具脱开与糕点高回弹（De-mold Spring Bounce, t >= 0.44s）
      let bounce = 0;
      let expandProgress = 1;
      if (!reducedMotion) {
        if (t < 0.44) {
          // 仍在印模中，保持与面胚吻合的扁平雕花形态
          expandProgress = 0;
        } else {
          // 模具离开，厚度快速恢复（0.44s ~ 0.58s）
          expandProgress = clamp((t - 0.44) / 0.14, 0, 1);
          // 阻尼谐波弹性回弹：频率 17 rad/s，衰减率 5.4
          const bounceTime = t - 0.44;
          bounce = Math.sin(bounceTime * 17) * Math.exp(-bounceTime * 5.4) * 0.32;
        }
      }

      // 处理展示阶段的轻触回弹交互
      const squishDecay = Math.max(0, now - s.cakePulse) / 1000;
      const pokeWobble = reducedMotion ? 0 : Math.sin(squishDecay * 22) * Math.exp(-squishDecay * 7) * s.cakeSquish;

      // 综合弹性伸缩形变（Y轴厚度弹性与 XZ 轴反相形变）
      const totalBounce = bounce + pokeWobble;
      const baseScaleY = THREE.MathUtils.lerp(0.40, 1.0, expandProgress);
      const baseScaleXZ = THREE.MathUtils.lerp(1.26, 1.0, expandProgress);

      const scaleX = baseScaleXZ + totalBounce * 0.38;
      const scaleY = baseScaleY - totalBounce * 0.55;
      const scaleZ = baseScaleXZ + totalBounce * 0.38;

      cakeZoom.current = reducedMotion ? s.cakeZoom : THREE.MathUtils.damp(cakeZoom.current, s.cakeZoom, 10, dt);
      const zoom = cakeZoom.current * 1.05;
      cake.current.scale.set(scaleX * zoom, scaleY * zoom, scaleZ * zoom);

      // Y 轴平稳弹起与恢复居中
      const restingY = (1 - expandProgress) * (-0.28);
      cake.current.position.y = restingY + bounce * 0.35;
      cake.current.position.x = 0;
      cake.current.position.z = 0.15;

      // 投影随弹起高度呼吸联动
      shadow.current.position.y = -1.85 + bounce * 0.1;
      shadow.current.scale.set(1 + totalBounce * 0.45, 1 - totalBounce * 0.2, 1);

      // 360° Continuous Quaternion Rotation (gimbal-lock-free, pitch & yaw & roll)
      if (s.phase === "mooncake") {
        if (s.cakeDragDeltaX !== 0 || s.cakeDragDeltaY !== 0) {
          const rotSpeed = 0.0075;
          const qY = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), s.cakeDragDeltaX * rotSpeed);
          const qX = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), s.cakeDragDeltaY * rotSpeed);
          cakeQuaternion.current.premultiply(qX).premultiply(qY);
          cakeQuaternion.current.normalize();
          s.cakeDragDeltaX = 0;
          s.cakeDragDeltaY = 0;
        } else if (!s.pressed) {
          if (Math.abs(s.cakeVelocityX) > 0.01 || Math.abs(s.cakeVelocityY) > 0.01) {
            const qY = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), s.cakeVelocityY * dt * 2.2);
            const qX = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), s.cakeVelocityX * dt * 2.2);
            cakeQuaternion.current.premultiply(qX).premultiply(qY);
            cakeQuaternion.current.normalize();
            const damping = Math.exp(-4.2 * dt);
            s.cakeVelocityX *= damping;
            s.cakeVelocityY *= damping;
          } else if (!reducedMotion) {
            const autoSpin = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), 0.0035);
            cakeQuaternion.current.premultiply(autoSpin);
          }
        }
        cake.current.quaternion.slerp(cakeQuaternion.current, ease);
      }

      // Dynamic light tracking across honey crust
      if (keyLight.current) {
        keyLight.current.position.x = -3 + s.hoverX * 2.5;
        keyLight.current.position.y = 4 + s.hoverY * 2.5;
      }
    }
  });

  return (
    <>
      <ambientLight ref={ambientLight} intensity={0.95} color="#ffe9c6" />
      <directionalLight ref={keyLight} position={[-3, 4, 6]} intensity={2.4} color="#fff2d2" />
      <directionalLight ref={fillLight} position={[4, -1, 3]} intensity={0.85} color="#ffd59c" />
      <directionalLight position={[0, -4, -2]} intensity={0.6} color="#8db2e5" />

      <group ref={root}>
        {/* Lunar Atmospheric Halo */}
        <mesh ref={halo} position={[0, 0, -0.3]}>
          <planeGeometry args={[3.6, 3.6]} />
          {haloTexture && (
            <meshBasicMaterial map={haloTexture} transparent opacity={0.78} depthWrite={false} blending={THREE.AdditiveBlending} />
          )}
        </mesh>

        {/* 3D Moon Sphere */}
        <mesh ref={moon} rotation={[0, MOON_FRONT_YAW, 0]}>
          <sphereGeometry args={[1.3, 128, 96]} />
          <meshStandardMaterial
            map={moonMap}
            bumpMap={moonMap}
            bumpScale={0.045}
            color="#fff5df"
            roughness={0.92}
            metalness={0.02}
            transparent={true}
            emissive="#ffe3b7"
            emissiveMap={moonMap}
            emissiveIntensity={0.8}
            onBeforeCompile={handleMoonBeforeCompile}
          />
        </mesh>

        {/* Soft Celestial Contact Shadow */}
        <mesh ref={shadow} position={[0, -1.85, -0.05]} rotation={[-Math.PI / 2.2, 0, 0]} visible={false}>
          <planeGeometry args={[3.8, 2.2]} />
          {shadowTexture && (
            <meshBasicMaterial map={shadowTexture} transparent opacity={0} depthWrite={false} />
          )}
        </mesh>

        {/* Solid model with the original NoBug top image mapped onto its face. */}
        <group ref={cake} visible={false} position={[0, 0, 0.15]}>
          <primitive object={cakeModel.object} rotation={[Math.PI / 2, 0, 0]} />
        </group>

        {/* Delicate Champagne Stardust Sparks */}
        <points ref={particles} visible={false} frustumCulled={false}>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[stardust.positions, 3]} />
          </bufferGeometry>
          <pointsMaterial size={0.045} color="#ffe8be" transparent depthWrite={false} sizeAttenuation blending={THREE.AdditiveBlending} />
        </points>
      </group>
    </>
  );
}

export default function MoonScene(props: Props) {
  return (
    <Canvas
      camera={{ position: [0, 0, 8.8], fov: 40, near: 0.1, far: 50 }}
      dpr={[1, 1.8]}
      gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
      fallback={<span className="canvas-error">The moon is hiding from this browser.</span>}
    >
      <Suspense fallback={null}>
        <World {...props} />
      </Suspense>
    </Canvas>
  );
}
