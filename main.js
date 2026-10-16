import * as THREE from "three";

// ================================
// 基本セットアップ
// ================================
const canvas = document.getElementById("canvas");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
resizeRenderer();

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x222222);

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);

// スマホ判定（画面幅ベース）
const isMobile = window.innerWidth < 768;

// ================================
// ライト
// ================================
const light = new THREE.DirectionalLight(0xffffff, 1.5);
light.position.set(5, 10, 5);
scene.add(light);

// ================================
// 床（縦長ステージ）
// ================================
const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(20, 80),
  new THREE.MeshStandardMaterial({ color: 0x555555 })
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
player.position.set(0, 0.5, -35);
scene.add(player);

let velocityY = 0;
const MOVE_SPEED = 0.12;
const JUMP_POWER = 0.22;
const GRAVITY = -0.012;

// ================================
// 障害物（縦長に配置）
// ================================
const obstacles = [];

function addObstacle(x, y, z) {
  const box = new THREE.Mesh(
    new THREE.BoxGeometry(1.5, 1.5, 1.5),
    new THREE.MeshStandardMaterial({ color: 0xff4444 })
  );
  box.position.set(x, y, z);
  scene.add(box);
  obstacles.push(box);
}

addObstacle(-3, 0.75, -25);
addObstacle(4, 0.75, -15);
addObstacle(-2, 0.75, -5);
addObstacle(3, 0.75, 5);
addObstacle(0, 0.75, 15);

// ================================
// ゴール
// ================================
const goal = new THREE.Mesh(
  new THREE.BoxGeometry(2, 2, 2),
  new THREE.MeshStandardMaterial({ color: 0x44ff44 })
);
goal.position.set(0, 1, 30);
scene.add(goal);

// ================================
// キー入力（PC用）
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
let cleared = false;

function showClear() {
  if (cleared) return;
  cleared = true;

  const div = document.createElement("div");
  div.textContent = "CLEAR!";
  div.style.position = "absolute";
  div.style.top = "40%";
  div.style.left = "50%";
  div.style.transform = "translate(-50%, -50%)";
  div.style.fontSize = "64px";
  div.style.color = "#00ff00";
  div.style.fontWeight = "bold";
  div.style.textShadow = "0 0 10px #00ff00";
  document.body.appendChild(div);
}

// ================================
// リスタート
// ================================
function resetGame() {
  player.position.set(0, 0.5, -35);
  velocityY = 0;
  cleared = false;
}

window.addEventListener("keydown", (e) => {
  if (e.key === "r") resetGame();
});

// ================================
// スマホUIのセットアップ
// ================================
const mobileControls = document.getElementById("mobile-controls");

if (!isMobile) {
  // PCならUIを非表示
  mobileControls.style.display = "none";
}

const touchState = {
  up: false,
  down: false,
  left: false,
  right: false,
  jump: false,
};

function bindTouchButton(id, key) {
  const btn = document.getElementById(id);
  if (!btn) return;

  btn.addEventListener("touchstart", (e) => {
    e.preventDefault();
    touchState[key] = true;
  });

  btn.addEventListener("touchend", (e) => {
    e.preventDefault();
    touchState[key] = false;
  });

  btn.addEventListener("touchcancel", (e) => {
    e.preventDefault();
    touchState[key] = false;
  });
}

if (isMobile) {
  bindTouchButton("btn-up", "up");
  bindTouchButton("btn-down", "down");
  bindTouchButton("btn-left", "left");
  bindTouchButton("btn-right", "right");
  bindTouchButton("jump-btn", "jump");
}

// ================================
// リサイズ対応
// ================================
window.addEventListener("resize", () => {
  resizeRenderer();
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
});

function resizeRenderer() {
  renderer.setSize(window.innerWidth, window.innerHeight);
}

// ================================
// ゲームループ
// ================================
function animate() {
  requestAnimationFrame(animate);

  // 入力（PC＋スマホ統合）
  const moveForward =
    keys["w"] || keys["ArrowUp"] || (isMobile && touchState.up);
  const moveBackward =
    keys["s"] || keys["ArrowDown"] || (isMobile && touchState.down);
  const moveLeft =
    keys["a"] || keys["ArrowLeft"] || (isMobile && touchState.left);
  const moveRight =
    keys["d"] || keys["ArrowRight"] || (isMobile && touchState.right);
  const jumpKey =
    keys[" "] || keys["Space"] || (isMobile && touchState.jump);

  if (moveForward) player.position.z += MOVE_SPEED;
  if (moveBackward) player.position.z -= MOVE_SPEED;
  if (moveLeft) player.position.x -= MOVE_SPEED;
  if (moveRight) player.position.x += MOVE_SPEED;

  // ジャンプ
  if (jumpKey && player.position.y <= 0.51) {
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
      resetGame();
      break;
    }
  }

  // ゴール回転＋判定
  goal.rotation.y += 0.02;
  if (isColliding(player, goal)) {
    showClear();
  }

  // カメラ（スマホ向け見下ろし＋追従）
  camera.position.x = player.position.x;
  camera.position.y = player.position.y + 10;
  camera.position.z = player.position.z - 15;
  camera.lookAt(player.position.x, player.position.y, player.position.z + 10);

  renderer.render(scene, camera);
}

animate();