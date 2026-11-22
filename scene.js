// Sève — утро в джунглях. Камера идёт по каменной тропе к лоджу, к сеноту и поднимается над кронами.
import * as THREE from 'three';

const stage = document.querySelector('.stage'), sceneEl = document.querySelector('.scene');
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const mobile = innerWidth < 760;
const gl = (() => { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (e) { return false; } })();

let seed = 11; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const smooth = (x, a, b) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const tex = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; };

function start() {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, mobile ? 1.5 : 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.25;
  renderer.shadowMap.enabled = !mobile; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const canvas = renderer.domElement; canvas.className = 'gl'; stage.prepend(canvas);

  const scene = new THREE.Scene();
  const MIST = new THREE.Color('#C3C7A6');
  scene.fog = new THREE.FogExp2(MIST, mobile ? 0.03 : 0.026);

  // небо на рассвете
  const SUN = new THREE.Vector3(-0.35, 0.16, -1).normalize();
  const sky = new THREE.Mesh(new THREE.SphereGeometry(400, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { sun: { value: SUN } },
    vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `uniform vec3 sun; varying vec3 vP; void main(){ vec3 d = normalize(vP); float h = d.y;
      vec3 c = mix(vec3(0.95,0.84,0.64), vec3(0.62,0.76,0.78), smoothstep(0.0, 0.5, h));
      c = mix(c, vec3(0.80,0.82,0.70), smoothstep(0.02, -0.15, h));
      float s = max(dot(d, sun), 0.0); c += vec3(1.0,0.8,0.5) * (pow(s, 40.0) * 0.9 + pow(s, 6.0) * 0.25);
      gl_FragColor = vec4(c, 1.0); }`
  }));
  sky.renderOrder = -1; scene.add(sky);

  // свет
  scene.add(new THREE.HemisphereLight('#E6EFE2', '#5A6A48', 1.6));
  const sun = new THREE.DirectionalLight('#FFD9A6', 2.8);
  sun.position.copy(SUN).multiplyScalar(60); sun.target.position.set(0, 0, -6);
  if (!mobile) { sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -45, right: 45, top: 45, bottom: -45, near: 1, far: 160 }); sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.04; }
  scene.add(sun, sun.target);

  // земля
  const gGeo = new THREE.PlaneGeometry(200, 200, 100, 100); gGeo.rotateX(-Math.PI / 2);
  { const p = gGeo.attributes.position, col = []; const a = new THREE.Color('#6B7A4E'), b = new THREE.Color('#8A7558'), c = new THREE.Color();
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); p.setY(i, Math.sin(x * 0.11) * 0.25 + Math.cos(z * 0.09) * 0.25 + (rnd() - 0.5) * 0.08); c.copy(a).lerp(b, 0.5 + 0.5 * Math.sin(x * 0.3 + z * 0.21)); col.push(c.r, c.g, c.b); }
    gGeo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); gGeo.computeVertexNormals(); }
  const ground = new THREE.Mesh(gGeo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 })); ground.receiveShadow = true; scene.add(ground);

  // тропа: путь камеры и камни
  const pathX = (z) => Math.sin(z * 0.09) * 1.6;
  const stoneGeo = new THREE.CylinderGeometry(0.42, 0.5, 0.14, 7);
  const stoneMat = new THREE.MeshStandardMaterial({ color: '#9A958A', roughness: 0.95, flatShading: true });
  const stones = new THREE.InstancedMesh(stoneGeo, stoneMat, 60); const o = new THREE.Object3D(); let si = 0;
  for (let z = 44; z > -7 && si < 60; z -= 0.95) { o.position.set(pathX(z) + (rnd() - 0.5) * 0.5, 0.18, z); o.rotation.set(0, rnd() * 3, 0); o.scale.setScalar(0.8 + rnd() * 0.5); o.updateMatrix(); stones.setMatrixAt(si++, o.matrix); }
  stones.count = si; stones.receiveShadow = true; scene.add(stones);

  // лоджи: камень, тёмные балки, тёплый свет, дерево сквозь крышу
  const stoneTex = tex(256, 256, (x, w) => { x.fillStyle = '#8E8778'; x.fillRect(0, 0, w, w); for (let i = 0; i < 70; i++) { const s = 18 + rnd() * 34; x.fillStyle = `hsl(${35 + rnd() * 10},${8 + rnd() * 8}%,${38 + rnd() * 22}%)`; x.beginPath(); x.ellipse(rnd() * w, rnd() * w, s, s * 0.6, rnd() * 3, 0, 7); x.fill(); x.strokeStyle = 'rgba(40,35,30,.5)'; x.lineWidth = 2; x.stroke(); } });
  stoneTex.wrapS = stoneTex.wrapT = THREE.RepeatWrapping; stoneTex.repeat.set(2, 1);
  const wallMat = new THREE.MeshStandardMaterial({ map: stoneTex, roughness: 0.95 });
  const beamMat = new THREE.MeshStandardMaterial({ color: '#1E1A17', roughness: 0.7 });
  const woodMat = new THREE.MeshStandardMaterial({ color: '#7A5A3E', roughness: 0.8 });
  const glowMat = new THREE.MeshStandardMaterial({ color: '#2A1D12', emissive: '#FFB765', emissiveIntensity: 1.4 });
  function lodge(x, z, rot, s = 1) {
    const g = new THREE.Group();
    const box = new THREE.Mesh(new THREE.BoxGeometry(8, 3.2, 6), wallMat); box.position.y = 1.6; box.castShadow = box.receiveShadow = true; g.add(box);
    const win = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 2.3), glowMat); win.position.set(-0.6, 1.45, 3.01); g.add(win);
    for (let i = 0; i < 4; i++) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.5, 0.12), beamMat); m.position.set(-3.2 + i * 1.73, 1.45, 3.06); g.add(m); }
    const deck = new THREE.Mesh(new THREE.BoxGeometry(10, 0.25, 3.4), woodMat); deck.position.set(0, 0.12, 4.6); deck.receiveShadow = true; g.add(deck);
    for (let i = 0; i < 7; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.18, 8.6), beamMat); b.position.set(-4.4 + i * 1.47, 3.45, 0.8); b.castShadow = true; g.add(b); }
    for (let i = 0; i < 2; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(9.4, 0.18, 0.16), beamMat); b.position.set(0, 3.36, -2.6 + i * 7); g.add(b); }
    for (const px of [-4.4, 4.4]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.16, 3.4, 0.16), beamMat); p.position.set(px, 1.7, 4.4); p.castShadow = true; g.add(p); }
    const l = new THREE.PointLight('#FFB765', 9, 12, 1.6); l.position.set(-0.6, 1.6, 4); g.add(l);
    g.position.set(x, 0, z); g.rotation.y = rot; g.scale.setScalar(s); scene.add(g); return g;
  }
  lodge(0, -12, 0);
  lodge(15, -30, -0.5, 0.9);
  lodge(-16, -26, 0.6, 0.9);
  lodge(-6, -46, 0.2, 0.85);

  // деревья
  const greens = ['#3F6E48', '#4E7F52', '#35603F', '#5E8A57', '#46744C'].map((c) => new THREE.Color(c));
  const trunkGeo = new THREE.CylinderGeometry(0.22, 0.42, 1, 7); trunkGeo.translate(0, 0.5, 0);
  const crownGeo = new THREE.IcosahedronGeometry(1, 1);
  const bushGeo = new THREE.IcosahedronGeometry(1, 0);
  const trunkMat = new THREE.MeshStandardMaterial({ color: '#7E6E5C', roughness: 1, flatShading: true });
  const leafMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.9, flatShading: true });
  const N = mobile ? 70 : 120, trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, N + 1), crowns = new THREE.InstancedMesh(crownGeo, leafMat, (N + 1) * 3);
  const bushes = new THREE.InstancedMesh(bushGeo, leafMat, mobile ? 160 : 300);
  const clear = (x, z) => Math.abs(x - pathX(z)) < 2.6 && z > -8 && z < 46 || Math.hypot(x, z + 12) < 7.5 || Math.hypot(x - 8, z + 22) < 6.5 || Math.hypot(x - 15, z + 30) < 6 || Math.hypot(x + 16, z + 26) < 6 || Math.hypot(x + 6, z + 46) < 6 || Math.hypot(x - 9, z + 6) < 5.5 || Math.hypot(x - 11.5, z + 13) < 6;
  let ti = 0, ci = 0;
  const tree = (x, z, h, r) => { o.position.set(x, 0, z); o.rotation.set((rnd() - 0.5) * 0.08, rnd() * 6, (rnd() - 0.5) * 0.08); o.scale.set(r, h, r); o.updateMatrix(); trunks.setMatrixAt(ti++, o.matrix);
    const k = 2 + Math.floor(rnd() * 2); for (let j = 0; j < k; j++) { const s = 2.2 + rnd() * 2.2; o.position.set(x + (rnd() - 0.5) * 3, h - 0.5 + rnd() * 2, z + (rnd() - 0.5) * 3); o.rotation.set(rnd(), rnd(), rnd()); o.scale.set(s, s * 0.7, s); o.updateMatrix(); crowns.setMatrixAt(ci, o.matrix); crowns.setColorAt(ci++, greens[Math.floor(rnd() * greens.length)]); } };
  tree(2.6, -10.5, 13, 1.3); // дерево сквозь крышу главного лоджа
  for (let tries = 0; ti < N + 1 && tries < 4000; tries++) { const x = (rnd() - 0.5) * 90, z = 48 - rnd() * 120; if (clear(x, z)) continue; tree(x, z, 8 + rnd() * 9, 0.8 + rnd() * 0.9); }
  trunks.count = ti; crowns.count = ci;
  let bi = 0; for (let tries = 0; bi < bushes.count && tries < 6000; tries++) { const x = (rnd() - 0.5) * 80, z = 46 - rnd() * 110; if (clear(x, z) || (Math.abs(x - pathX(z)) < 4 && z > -8)) continue; const s = 0.35 + rnd() * 0.6; o.position.set(x, s * 0.5, z); o.rotation.set(rnd(), rnd(), rnd()); o.scale.set(s, s * 0.8, s); o.updateMatrix(); bushes.setMatrixAt(bi, o.matrix); bushes.setColorAt(bi++, greens[Math.floor(rnd() * greens.length)]); }
  bushes.count = bi;
  [trunks, crowns, bushes].forEach((m) => { m.castShadow = true; m.receiveShadow = true; scene.add(m); });

  // пальмы у тропы и сенота
  const frondGeo = new THREE.PlaneGeometry(0.9, 4.4, 1, 8); { const p = frondGeo.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i) + 2.2; p.setY(i, y); p.setZ(i, -0.07 * y * y); } frondGeo.computeVertexNormals(); }
  const frondMat = new THREE.MeshStandardMaterial({ color: '#3F7A45', side: THREE.DoubleSide, roughness: 0.8, flatShading: true });
  const palm = (x, z, h) => { const g = new THREE.Group(); const lean = new THREE.Vector3((rnd() - 0.5) * 2, h, (rnd() - 0.5) * 2);
    const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(lean.x * 0.2, h * 0.5, lean.z * 0.2), lean);
    const t = new THREE.Mesh(new THREE.TubeGeometry(curve, 10, 0.18, 6), trunkMat); t.castShadow = true; g.add(t);
    for (let i = 0; i < 9; i++) { const f = new THREE.Mesh(frondGeo, frondMat); f.position.copy(lean); f.rotation.set(-0.9 + rnd() * 0.3, (i / 9) * Math.PI * 2, 0, 'YXZ'); f.castShadow = true; g.add(f); }
    g.position.set(x, 0, z); scene.add(g); };
  [[-3.5, 30, 7], [3.8, 20, 8], [-3.6, 9, 7.5], [-6.5, -5, 8], [15.5, -22, 7], [3.5, -25, 8.5], [11, -26, 6.5], [-5, -3, 6.5]].forEach((a) => palm(...a));

  // сенот — бассейн в камнях
  const water = new THREE.Mesh(new THREE.CircleGeometry(5, 48), new THREE.MeshStandardMaterial({ color: '#2E8C88', roughness: 0.08, metalness: 0.35, emissive: '#1A7C7A', emissiveIntensity: 0.45 }));
  water.rotation.x = -Math.PI / 2; water.position.set(8, 0.08, -22); scene.add(water);
  const rock = new THREE.DodecahedronGeometry(1, 0); const rocks = new THREE.InstancedMesh(rock, stoneMat, 26);
  for (let i = 0; i < 26; i++) { const a = (i / 26) * Math.PI * 2; o.position.set(8 + Math.cos(a) * 5.4, 0.2, -22 + Math.sin(a) * 5.4); o.rotation.set(rnd(), rnd(), rnd()); o.scale.set(0.8 + rnd() * 0.6, 0.22 + rnd() * 0.25, 0.8 + rnd() * 0.6); o.updateMatrix(); rocks.setMatrixAt(i, o.matrix); }
  rocks.castShadow = rocks.receiveShadow = true; scene.add(rocks);

  // лучи сквозь кроны, туман, пыльца
  const rayTex = tex(64, 256, (x, w, h) => { const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, 'rgba(255,236,200,0)'); g.addColorStop(0.35, 'rgba(255,236,200,.9)'); g.addColorStop(1, 'rgba(255,236,200,0)'); x.fillStyle = g; x.fillRect(0, 0, w, h); const g2 = x.createLinearGradient(0, 0, w, 0); g2.addColorStop(0, 'rgba(0,0,0,1)'); g2.addColorStop(0.5, 'rgba(0,0,0,0)'); g2.addColorStop(1, 'rgba(0,0,0,1)'); x.globalCompositeOperation = 'destination-out'; x.fillStyle = g2; x.fillRect(0, 0, w, h); });
  const rays = [];
  for (let i = 0; i < (mobile ? 6 : 10); i++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(2.5 + rnd() * 3, 26), new THREE.MeshBasicMaterial({ map: rayTex, transparent: true, opacity: 0.12, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false }));
    m.position.set((rnd() - 0.5) * 24, 9, 20 - rnd() * 50); m.rotation.set(0, rnd() * 3, -0.45); scene.add(m); rays.push({ m, ph: rnd() * 6 }); }
  const mistTex = tex(256, 128, (x, w, h) => { const g = x.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); g.addColorStop(0, 'rgba(235,236,220,.85)'); g.addColorStop(1, 'rgba(235,236,220,0)'); x.fillStyle = g; x.fillRect(0, 0, w, h); });
  const mists = [];
  for (let i = 0; i < (mobile ? 8 : 14); i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: mistTex, transparent: true, opacity: 0.28, depthWrite: false, fog: false })); s.scale.set(18 + rnd() * 14, 5 + rnd() * 3, 1); s.position.set((rnd() - 0.5) * 50, 1.2 + rnd() * 1.6, 30 - rnd() * 70); scene.add(s); mists.push({ s, v: 0.3 + rnd() * 0.4, x0: s.position.x }); }
  const dotTex = tex(32, 32, (x) => { const g = x.createRadialGradient(16, 16, 0, 16, 16, 16); g.addColorStop(0, 'rgba(255,230,170,1)'); g.addColorStop(1, 'rgba(255,230,170,0)'); x.fillStyle = g; x.fillRect(0, 0, 32, 32); });
  const PN = mobile ? 300 : 700, pp = new Float32Array(PN * 3), ps = new Float32Array(PN);
  for (let i = 0; i < PN; i++) { pp.set([(rnd() - 0.5) * 30, 0.4 + rnd() * 7, 44 - rnd() * 75], i * 3); ps[i] = rnd() * 100; }
  const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pp, 3));
  const pollen = new THREE.Points(pg, new THREE.PointsMaterial({ map: dotTex, size: 0.09, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.9 })); scene.add(pollen);

  // путь камеры
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const camCurve = new THREE.CatmullRomCurve3([V(pathX(46), 1.75, 46), V(pathX(32), 1.7, 32), V(pathX(18), 1.75, 18), V(pathX(6), 1.85, 6), V(1.5, 2.0, -0.5), V(8.5, 2.6, -5), V(11.5, 5.5, -14.5), V(10, 11, -17), V(8, 24, -16)]);
  const lookCurve = new THREE.CatmullRomCurve3([V(0, 1.8, 20), V(0, 2.0, 6), V(0, 2.2, -6), V(0, 2.3, -11), V(0, 2.2, -12), V(8, 0.6, -19), V(8, 0.2, -22), V(0, 12, -70), V(-20, 16, -150)]);
  const camera = new THREE.PerspectiveCamera(mobile ? 62 : 50, 1, 0.1, 900);
  function resize() { const w = stage.clientWidth, h = stage.clientHeight; if (!w || !h) return; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
  resize(); new ResizeObserver(resize).observe(stage);

  const progress = () => { if (reduce || !sceneEl) return 0; const r = sceneEl.getBoundingClientRect(), span = r.height - innerHeight; return span > 0 ? clamp(-r.top / span) : 0; };
  const chapters = [...document.querySelectorAll('[data-from]')], fade = document.querySelector('.fade');
  let cur = -0.035, mx = 0, my = 0, smx = 0, smy = 0, visible = true; const t0 = performance.now();
  addEventListener('pointermove', (e) => { mx = e.clientX / innerWidth - 0.5; my = e.clientY / innerHeight - 0.5; }, { passive: true });
  new IntersectionObserver((en) => { visible = en[0].isIntersecting; }).observe(stage);
  const pos = new THREE.Vector3(), look = new THREE.Vector3();
  let last = performance.now();
  renderer.setAnimationLoop(() => {
    const now = performance.now(), t = now / 1000, dt = Math.min(0.05, (now - last) / 1000); last = now;
    const intro = reduce ? 1 : clamp((now - t0) / 4200), p = progress();
    if (!visible && p >= 1) return;
    const want = p + (1 - (1 - intro) ** 3) * 0.035 - 0.035;
    cur += (want - cur) * (1 - Math.exp(-Math.min(1, (now - (window.__lt || now)) / 1000) * 3.5)); window.__lt = now;
    const k = clamp(cur, 0, 1);
    camCurve.getPointAt(k, pos); lookCurve.getPointAt(k, look);
    if (cur < 0) pos.z += -cur * 60;
    smx += (mx - smx) * 0.04; smy += (my - smy) * 0.04;
    pos.x += smx * 0.8 + Math.sin(t * 0.5) * 0.05; pos.y += -smy * 0.4 + Math.sin(t * 0.8) * 0.03;
    camera.position.copy(pos); camera.lookAt(look);
    if (fade) fade.style.opacity = 1 - intro;
    chapters.forEach((c) => { const a = +c.dataset.from, b = +c.dataset.to, w = 0.05; const v = Math.min(smooth(k, a - w, a + w * 0.4), 1 - smooth(k, b - w * 0.4, b + w)); c.style.opacity = v; c.style.transform = `translateY(${(1 - v) * 18}px)`; c.style.pointerEvents = v > 0.5 ? 'auto' : 'none'; });
    rays.forEach((r) => { r.m.material.opacity = 0.08 + 0.07 * (0.5 + 0.5 * Math.sin(t * 0.4 + r.ph)); });
    mists.forEach((m) => { m.s.position.x = m.x0 + Math.sin(t * 0.05 * m.v + m.x0) * 6; });
    if (!reduce) { const a = pg.attributes.position.array; for (let i = 0; i < PN; i++) { const j = i * 3; a[j] += Math.sin(t * 0.3 + ps[i]) * dt * 0.12; a[j + 1] += Math.cos(t * 0.25 + ps[i]) * dt * 0.08; } pg.attributes.position.needsUpdate = true; }
    water.material.emissiveIntensity = 0.42 + 0.08 * Math.sin(t * 0.7);
    renderer.render(scene, camera);
  });
  document.documentElement.classList.add('has3d');
}

if (!gl) document.documentElement.classList.add('no3d'); else start();
