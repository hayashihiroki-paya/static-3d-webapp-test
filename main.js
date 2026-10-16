import * as THREE from "three";

// スマホ判定（画面幅＋UA）
const isMobile = window.innerWidth < 900 || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

// Three.js セットアップ
const canvas = document.getElementById("canvas");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x222222);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);

// ライト
const light = new THREE.DirectionalLight(0xffffff, 1.5);
light.position.set(5, 10, 5);
scene.add(light);

// 床（縦長ステージ）
const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(20, 80),
  new THREE.MeshStandardMaterial({ color: 0x555555 })
);
floor.rotation.x = -Math.PI / 2;
scene.add(floor);

// プレイヤー
const player = new THREE.Mesh(
  new THREE.BoxGeometry(1, 1, 1),
  new THREE.MeshStandardMaterial({ color: 0x4f8cf7 })
);
player.position.set(0, 0.5, -35);
scene.add(player);

// 物理パラメータ
let velocityY = 0;
const MOVE_SPEED = 0.12;
const JUMP_POWER = 0.22;
const GRAVITY = -0.012;

// 障害物
const obstacles = [];
function addObstacle(x,y,z){
  const box = new THREE.Mesh(
    new THREE.BoxGeometry(1.5,1.5,1.5),
    new THREE.MeshStandardMaterial({ color: 0xff4444 })
  );
  box.position.set(x,y,z);
  scene.add(box);
  obstacles.push(box);
}
addObstacle(-3,0.75,-25);
addObstacle(4,0.75,-15);
addObstacle(-2,0.75,-5);
addObstacle(3,0.75,5);
addObstacle(0,0.75,15);

// ゴール
const goal = new THREE.Mesh(
  new THREE.BoxGeometry(2,2,2),
  new THREE.MeshStandardMaterial({ color: 0x44ff44 })
);
goal.position.set(0,1,30);
scene.add(goal);

// PCキー入力
const keys = {};
window.addEventListener("keydown", e => keys[e.key] = true);
window.addEventListener("keyup", e => keys[e.key] = false);

// 当たり判定
function isColliding(a,b){
  const boxA = new THREE.Box3().setFromObject(a);
  const boxB = new THREE.Box3().setFromObject(b);
  return boxA.intersectsBox(boxB);
}

// CLEAR 表示
let cleared = false;
function showClear(){
  if(cleared) return;
  cleared = true;
  const div = document.createElement("div");
  div.textContent = "CLEAR!";
  Object.assign(div.style, {
    position: "absolute",
    top: "40%",
    left: "50%",
    transform: "translate(-50%,-50%)",
    fontSize: "64px",
    color: "#00ff00",
    fontWeight: "bold",
    textShadow: "0 0 10px #00ff00",
    zIndex: 10000
  });
  document.body.appendChild(div);
}

// リセット
function resetGame(){
  player.position.set(0,0.5,-35);
  velocityY = 0;
  cleared = false;
}
window.addEventListener("keydown", e => { if(e.key === "r") resetGame(); });

// モバイルUI要素
const mobileControls = document.getElementById("mobile-controls");
if(isMobile) mobileControls.style.display = "flex"; else mobileControls.style.display = "none";

// ジャンプボタン（タッチ）
const jumpBtn = document.getElementById("jump-btn");
let jumpPressed = false;
if(jumpBtn){
  jumpBtn.addEventListener("touchstart", e => { e.preventDefault(); jumpPressed = true; }, { passive:false });
  jumpBtn.addEventListener("touchend", e => { e.preventDefault(); jumpPressed = false; }, { passive:false });
  jumpBtn.addEventListener("touchcancel", e => { e.preventDefault(); jumpPressed = false; }, { passive:false });
  // クリックでも動くように
  jumpBtn.addEventListener("mousedown", () => jumpPressed = true);
  window.addEventListener("mouseup", () => jumpPressed = false);
}

// 仮想スティック実装（左スティック）
const stickArea = document.getElementById("stick-area");
const stickKnob = document.getElementById("stick-knob");
const stickBase = document.getElementById("stick-base");

const joystick = { x: 0, z: 0 }; // x:左右（+右）, z:前後（+前）
let activeTouchId = null;
let stickCenter = { x:0, y:0 };
const MAX_RADIUS = 40; // ノブの最大移動半径(px)

// 初期センター計算（ページロード時）
function updateStickCenter(){
  if(!stickBase) return;
  const rect = stickBase.getBoundingClientRect();
  stickCenter.x = rect.left + rect.width/2;
  stickCenter.y = rect.top + rect.height/2;
}
updateStickCenter();
window.addEventListener("resize", updateStickCenter);

// タッチハンドラ
function onStickTouchStart(e){
  e.preventDefault();
  const t = e.changedTouches[0];
  activeTouchId = t.identifier;
  updateStickFromTouch(t);
}
function onStickTouchMove(e){
  e.preventDefault();
  if(activeTouchId === null) return;
  for(const t of e.changedTouches){
    if(t.identifier === activeTouchId){
      updateStickFromTouch(t);
      break;
    }
  }
}
function onStickTouchEnd(e){
  e.preventDefault();
  if(activeTouchId === null) return;
  for(const t of e.changedTouches){
    if(t.identifier === activeTouchId){
      activeTouchId = null;
      joystick.x = 0; joystick.z = 0;
      resetKnob();
      break;
    }
  }
}

function updateStickFromTouch(touch){
  const dx = touch.clientX - stickCenter.x;
  const dy = touch.clientY - stickCenter.y;
  // スクリーンYは下方向が増えるので、前方向（z+) は dy < 0
  // ここで z = -dy / MAX_RADIUS
  let nx = dx / MAX_RADIUS;
  let nz = -dy / MAX_RADIUS;
  // clamp
  const len = Math.hypot(nx, nz);
  if(len > 1){
    nx /= len; nz /= len;
  }
  joystick.x = nx; joystick.z = nz;
  // ノブ移動（ピクセル）
  const knobX = Math.max(-MAX_RADIUS, Math.min(MAX_RADIUS, dx));
  const knobY = Math.max(-MAX_RADIUS, Math.min(MAX_RADIUS, dy));
  stickKnob.style.transform = `translate(${knobX}px, ${knobY}px)`;
  stickKnob.style.background = "rgba(255,255,255,0.32)";
}

function resetKnob(){
  stickKnob.style.transform = `translate(-50%,-50%)`;
  stickKnob.style.background = "rgba(255,255,255,0.22)";
}

// バインド
if(stickArea){
  stickArea.addEventListener("touchstart", onStickTouchStart, { passive:false });
  window.addEventListener("touchmove", onStickTouchMove, { passive:false });
  window.addEventListener("touchend", onStickTouchEnd, { passive:false });
  window.addEventListener("touchcancel", onStickTouchEnd, { passive:false });

  // マウスでも試せるように（デバッグ用）
  let mouseDown = false;
  stickArea.addEventListener("mousedown", (e) => {
    mouseDown = true;
    activeTouchId = "mouse";
    updateStickFromMouse(e);
  });
  window.addEventListener("mousemove", (e) => { if(mouseDown) updateStickFromMouse(e); });
  window.addEventListener("mouseup", () => { if(mouseDown){ mouseDown=false; activeTouchId=null; joystick.x=0; joystick.z=0; resetKnob(); } });
  function updateStickFromMouse(e){
    const dx = e.clientX - stickCenter.x;
    const dy = e.clientY - stickCenter.y;
    let nx = dx / MAX_RADIUS;
    let nz = -dy / MAX_RADIUS;
    const len = Math.hypot(nx, nz);
    if(len > 1){ nx /= len; nz /= len; }
    joystick.x = nx; joystick.z = nz;
    const knobX = Math.max(-MAX_RADIUS, Math.min(MAX_RADIUS, dx));
    const knobY = Math.max(-MAX_RADIUS, Math.min(MAX_RADIUS, dy));
    stickKnob.style.transform = `translate(${knobX}px, ${knobY}px)`;
    stickKnob.style.background = "rgba(255,255,255,0.32)";
  }
}

// リサイズ対応
window.addEventListener("resize", () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  updateStickCenter();
});

// ゲームループ
function animate(){
  requestAnimationFrame(animate);

  // 入力統合（PCキー + スティック）
  const moveForward = keys["w"] || keys["ArrowUp"] || joystick.z > 0.15;
  const moveBackward = keys["s"] || keys["ArrowDown"] || joystick.z < -0.15;
  const moveLeft = keys["a"] || keys["ArrowLeft"] || joystick.x < -0.15;
  const moveRight = keys["d"] || keys["ArrowRight"] || joystick.x > 0.15;
  const jumpKey = keys[" "] || keys["Space"] || jumpPressed;

  // スティックの連続的な移動（滑らかに）
  // joystick.x は -1..1, joystick.z は -1..1
  player.position.x += joystick.x * MOVE_SPEED;
  player.position.z += joystick.z * MOVE_SPEED;

  // キーボード入力も加える（重複してもOK）
  if(moveForward && Math.abs(joystick.z) <= 0.15) player.position.z += MOVE_SPEED;
  if(moveBackward && Math.abs(joystick.z) <= 0.15) player.position.z -= MOVE_SPEED;
  if(moveLeft && Math.abs(joystick.x) <= 0.15) player.position.x -= MOVE_SPEED;
  if(moveRight && Math.abs(joystick.x) <= 0.15) player.position.x += MOVE_SPEED;

  // ジャンプ（地面にいるときのみ）
  if(jumpKey && player.position.y <= 0.51){
    velocityY = JUMP_POWER;
  }

  // 重力
  velocityY += GRAVITY;
  player.position.y += velocityY;

  // 着地
  if(player.position.y < 0.5){
    player.position.y = 0.5;
    velocityY = 0;
  }

  // 障害物判定
  for(const obs of obstacles){
    if(isColliding(player, obs)){
      resetGame();
      break;
    }
  }

  // ゴール
  goal.rotation.y += 0.02;
  if(isColliding(player, goal)) showClear();

  // カメラ追従（見下ろし）
  camera.position.x = player.position.x;
  camera.position.y = player.position.y + 10;
  camera.position.z = player.position.z - 15;
  camera.lookAt(player.position.x, player.position.y, player.position.z + 10);

  renderer.render(scene, camera);
}
animate();