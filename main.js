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

let velocityY = 0;
const MOVE_SPEED = 0.08;
const JUMP_POWER = 0.18;
const GRAVITY = -0.01;

// ================================
// 動く障害物
// ================================
const movingObstacles = [];

function addMovingObstacle(x, y, z) {
  const box = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshStandardMaterial({ color: 0xff4444 })
  );
  box.position.set(x, y, z);
  box.userData = { dir: 1 };
  scene.add(box);
  movingObstacles.push(box);
}

addMovingObstacle(6, 0.5, -2);
addMovingObstacle(12, 0.5, 1);

// ================================
// 落ちる床
// ================================
const fallingFloors = [];

function addFallingFloor(x, z) {
  const f = new THREE.Mesh(
    new THREE.BoxGeometry(3, 0.2, 3),
    new THREE.MeshStandardMaterial({ color: 0x5555ff })
  );
  f.position.set(x, 0.1, z);
  f.userData = { fall: false, vy: 0 };
  scene.add(f);
  fallingFloors.push(f);
}

addFallingFloor(8, -1);
addFallingFloor(14, 2);

// ================================
// ゴール（回転する）
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
// リスタート
// ================================
function resetGame() {
  player.position.set(0, 0.5, 0);
  velocityY = 0;

  fallingFloors.forEach((f) => {
    f.position.y = 0.1;
    f.userData.fall = false;
    f.userData.vy = 0;
  });
}

window.addEventListener("keydown", (e) => {
  if (e.key === "r") resetGame();
});

// ================================
// ゲームループ
// ================================
function animate() {
  requestAnimationFrame(animate);

  // プレイヤー移動
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

  // 動く障害物の移動
  movingObstacles.forEach((obs) => {
    obs.position.x += 0.05 * obs.userData.dir;
    if (obs.position.x > obs.position.x + 2) obs.userData.dir = -1;
    if (obs.position.x < obs.position.x - 2) obs.userData.dir = 1;

    if (isColliding(player, obs)) resetGame();
  });

  // 落ちる床
  fallingFloors.forEach((f) => {
    if (!f.userData.fall && isColliding(player, f)) {
      f.userData.fall = true;
    }
    if (f.userData.fall) {
      f.userData.vy -= 0.005;
      f.position.y += f.userData.vy;
    }
  });

  // ゴール回転
  goal.rotation.y += 0.02;

  // ゴール判定
  if (isColliding(player, goal)) {
    showClear();
  }

  // カメラ追従
  camera.position.x = player.position.x + 5;
  camera.position.y = player.position.y + 6;
  camera.position.z = player.position.z + 10;
  camera.lookAt(player.position);

  renderer.render(scene, camera);
}

animate();