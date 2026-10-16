import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

// ================================
// 基本セットアップ
// ================================
const canvas = document.getElementById("canvas");
const renderer = new THREE.WebGLRenderer({ canvas });
renderer.setSize(window.innerWidth, window.innerHeight);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xcccccc);

const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(0, 10, 15);
camera.lookAt(0, 0, 0);

// ================================
// ライト
// ================================
const light = new THREE.DirectionalLight(0xffffff, 1.5);
light.position.set(5, 10, 5);
scene.add(light);

// ================================
// 床
// ================================
const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(50, 50),
  new THREE.MeshStandardMaterial({ color: 0x888888 })
);
floor.rotation.x = -Math.PI / 2;
scene.add(floor);

// ================================
// プレイヤー
// ================================
const player = new THREE.Mesh(
  new THREE.BoxGeometry(1, 1, 1),
  new THREE.MeshStandardMaterial({ color: 0x4f8cf7 })
);
player.position.set(0, 0.5, 0);
scene.add(player);

// プレイヤー物理パラメータ
let velocityY = 0;
const MOVE_SPEED = 0.08;
const JUMP_POWER = 0.18;
const GRAVITY = -0.01;

// ================================
// 障害物
// ================================
const obstacles = [];

function addObstacle(x, y, z) {
  const box = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshStandardMaterial({ color: 0xff4444 })
  );
  box.position.set(x, y, z);
  scene.add(box);
  obstacles.push(box);
}

addObstacle(5, 0.5, -2);
addObstacle(10, 0.5, 1);
addObstacle(15, 0.5, -3);

// ================================
// ゴール
// ================================
const goal = new THREE.Mesh(
  new THREE.BoxGeometry(2, 2, 2),
  new THREE.MeshStandardMaterial({ color: 0x44ff44 })
);
goal.position.set(20, 1, 0);
scene.add(goal);

// ================================
// キー入力
// ================================
const keys = {};
window.addEventListener("keydown", (e) => (keys[e.key] = true));
window.addEventListener("keyup", (e) => (keys[e.key] = false));

// ================================
// 当たり判定
// ================================
function isColliding(a, b) {
  const boxA = new THREE.Box3().setFromObject(a);
  const boxB = new THREE.Box3().setFromObject(b);
  return boxA.intersectsBox(boxB);
}

// ================================
// CLEAR 表示
// ================================
function showClear() {
  const div = document.createElement("div");
  div.textContent = "CLEAR!";
  div.style.position = "absolute";
  div.style.top = "40%";
  div.style.left = "50%";
  div.style.transform = "translate(-50%, -50%)";
  div.style.fontSize = "80px";
  div.style.color = "#00ff00";
  div.style.fontWeight = "bold";
  document.body.appendChild(div);
}

// ================================
// ゲームループ
// ================================
function animate() {
  requestAnimationFrame(animate);

  // 移動処理
  if (keys["w"]) player.position.z -= MOVE_SPEED;
  if (keys["s"]) player.position.z += MOVE_SPEED;
  if (keys["a"]) player.position.x -= MOVE_SPEED;
  if (keys["d"]) player.position.x += MOVE_SPEED;

  // ジャンプ
  if (keys[" "] && player.position.y <= 0.51) {
    velocityY = JUMP_POWER;
  }

  // 重力
  velocityY += GRAVITY;
  player.position.y += velocityY;

  // 地面に着地
  if (player.position.y < 0.5) {
    player.position.y = 0.5;
    velocityY = 0;
  }

  // 障害物衝突
  for (const obs of obstacles) {
    if (isColliding(player, obs)) {
      player.position.set(0, 0.5, 0); // リセット
      velocityY = 0;
    }
  }

  // ゴール判定
  if (isColliding(player, goal)) {
    showClear();
  }

  renderer.render(scene, camera);
}

animate();