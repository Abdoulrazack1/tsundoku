// Livre 3D interactif & étagère 3D via Three.js (§8.3 A & §5.4)
import { prefersReducedMotion } from '../core/utils.js';

function makeBookMesh(THREE, coverUrl) {
  const group = new THREE.Group();
  const geo = new THREE.BoxGeometry(2.6, 3.8, 0.5);

  const loader = new THREE.TextureLoader();
  loader.setCrossOrigin('anonymous');
  const cover = coverUrl ? loader.load(coverUrl) : null;
  if (cover) cover.colorSpace = THREE.SRGBColorSpace;

  const paper = new THREE.MeshStandardMaterial({ color: 0xefe9dd, roughness: 0.9 });
  const spine = new THREE.MeshStandardMaterial({ color: 0x8a2a22, roughness: 0.7 });
  const front = new THREE.MeshStandardMaterial({ map: cover, color: cover ? 0xffffff : 0x222222, roughness: 0.55 });

  // Ordre faces : +x, -x, +y, -y, +z(front), -z
  const mats = [spine, paper, paper, paper, front, paper];
  group.add(new THREE.Mesh(geo, mats));
  return group;
}

/** Petit livre 3D qui réagit à la souris (page article). */
export function initBook3D(container, coverUrl) {
  if (!window.THREE || !container || prefersReducedMotion()) { container?.remove?.(); return; }
  const THREE = window.THREE;
  const w = container.clientWidth, h = container.clientHeight || 360;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, w / h, 0.1, 100);
  camera.position.set(0, 0, 8);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(w, h);
  container.append(renderer.domElement);

  scene.add(new THREE.AmbientLight(0xffffff, 0.8));
  const key = new THREE.DirectionalLight(0xffffff, 1.1); key.position.set(4, 6, 8); scene.add(key);
  const rim = new THREE.DirectionalLight(0xc0392b, 0.4); rim.position.set(-6, 2, 4); scene.add(rim);

  const book = makeBookMesh(THREE, coverUrl);
  book.rotation.y = -0.5;
  scene.add(book);

  let tx = -0.5, ty = 0;
  container.addEventListener('mousemove', (e) => {
    const r = container.getBoundingClientRect();
    tx = ((e.clientX - r.left) / r.width - 0.5) * 1.4 - 0.3;
    ty = ((e.clientY - r.top) / r.height - 0.5) * -0.8;
  });
  container.addEventListener('mouseleave', () => { tx = -0.5; ty = 0; });

  let raf;
  function animate() {
    book.rotation.y += (tx - book.rotation.y) * 0.06 + 0.002;
    book.rotation.x += (ty - book.rotation.x) * 0.06;
    renderer.render(scene, camera);
    raf = requestAnimationFrame(animate);
  }
  animate();

  addEventListener('resize', () => {
    const nw = container.clientWidth, nh = container.clientHeight || 360;
    camera.aspect = nw / nh; camera.updateProjectionMatrix(); renderer.setSize(nw, nh);
  });

  // Stoppe le rendu hors écran
  new IntersectionObserver((es) => es.forEach((en) => {
    if (en.isIntersecting && !raf) animate(); else if (!en.isIntersecting && raf) { cancelAnimationFrame(raf); raf = null; }
  })).observe(container);
}

/** Étagère 3D : rangée de livres (vue bibliothèque immersive). */
export function initShelf3D(container, books = []) {
  if (!window.THREE || !container) return;
  const THREE = window.THREE;
  const w = container.clientWidth, h = container.clientHeight || 520;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x0d0a08, 12, 30);
  const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100);
  camera.position.set(0, 0, 16);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(w, h);
  container.innerHTML = '';
  container.append(renderer.domElement);

  scene.add(new THREE.AmbientLight(0xffffff, 0.6));
  const key = new THREE.DirectionalLight(0xffe6c0, 1.2); key.position.set(2, 8, 10); scene.add(key);

  const loader = new THREE.TextureLoader(); loader.setCrossOrigin('anonymous');
  const group = new THREE.Group();
  const colors = [0x8a2a22, 0x2c3e50, 0x27543a, 0x6b4226, 0x34495e, 0x7a3b69];
  const count = Math.min(books.length, 14);
  const spacing = 1.15;
  for (let i = 0; i < count; i++) {
    const b = books[i];
    const height = 3.4 + (i % 4) * 0.25;
    const geo = new THREE.BoxGeometry(0.9, height, 2.6);
    const tex = b.cover_image_url ? loader.load(b.cover_image_url) : null;
    if (tex) tex.colorSpace = THREE.SRGBColorSpace;
    const spineMat = new THREE.MeshStandardMaterial({ color: colors[i % colors.length], roughness: 0.8 });
    const coverMat = new THREE.MeshStandardMaterial({ map: tex, color: tex ? 0xffffff : 0xcccccc, roughness: 0.6 });
    const mats = [spineMat, spineMat, spineMat, spineMat, coverMat, spineMat];
    const mesh = new THREE.Mesh(geo, mats);
    mesh.position.x = (i - count / 2) * spacing;
    mesh.position.y = (height - 3.4) / 2 - 1;
    mesh.rotation.y = Math.PI / 2; // tranche vers nous
    group.add(mesh);
  }
  scene.add(group);

  let tx = 0;
  container.addEventListener('mousemove', (e) => {
    const r = container.getBoundingClientRect();
    tx = ((e.clientX - r.left) / r.width - 0.5);
  });
  function animate() {
    group.rotation.y += (tx * 0.6 - group.rotation.y) * 0.05;
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }
  animate();
  addEventListener('resize', () => {
    const nw = container.clientWidth, nh = container.clientHeight || 520;
    camera.aspect = nw / nh; camera.updateProjectionMatrix(); renderer.setSize(nw, nh);
  });
}
