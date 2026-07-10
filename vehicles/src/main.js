import * as THREE from "three";
import { Excavator } from "./Excavator.js";
import { Tractor } from "./Tractor.js";
import { Joystick } from "./Joystick.js";
import { Game } from "./Game.js";
import { TractorGame } from "./TractorGame.js";
import { Bulldozer } from "./Bulldozer.js";
import { BulldozerGame } from "./BulldozerGame.js";

class KidsGameApp {
  constructor() {
    this.canvas = document.getElementById("game-canvas");
    this.scoreEl = document.getElementById("score");
    this.totalEl = document.getElementById("total");
    this.scoreIconEl = document.querySelector(".score-icon");
    this.scoreTotalEl = document.querySelector(".score-total");
    this.messageEl = document.getElementById("message");
    this.startScreen = document.getElementById("start-screen");
    this.clearScreen = document.getElementById("clear-screen");
    this.clearMessageEl = document.getElementById("clear-message");
    this.tractorResetBtn = document.getElementById("tractor-restart-btn");
    this.joystickLeft = document.getElementById("joystick-left");
    this.joystickRight = document.getElementById("joystick-right");
    this.leftLabel = this.joystickLeft.querySelector(".joystick-label");
    this.rightLabel = this.joystickRight.querySelector(".joystick-label");

    this.leftStick = new Joystick(this.joystickLeft);
    this.rightStick = new Joystick(this.joystickRight);

    this.mode = null;
    this.vehicle = null;
    this.game = null;

    this._initThree();
    this.clock = new THREE.Clock();
    this.running = false;

    document.querySelectorAll("[data-mode]").forEach((btn) => {
      btn.addEventListener("click", () => this._startMode(btn.dataset.mode));
    });

    document.getElementById("restart-btn").addEventListener("click", () => {
      this.clearScreen.classList.add("hidden");
      this.game.reset();
      this.scoreEl.textContent = "0";
      this.running = true;
    });

    document.getElementById("tractor-restart-btn").addEventListener("click", () => {
      this.game.reset();
      this.scoreEl.textContent = "0";
      this.running = true;
    });

    this._animate();
  }

  _startMode(mode) {
    this.mode = mode;
    this.startScreen.classList.add("hidden");
    this.clearScreen.classList.add("hidden");
    this._setupMode(mode);
    this.running = true;
  }

  _setupMode(mode) {
    if (this.vehicle) {
      this.scene.remove(this.vehicle.group);
      this.vehicle = null;
    }
    this.game = null;

    while (this.scene.children.length > 0) {
      this.scene.remove(this.scene.children[0]);
    }

    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambient);

    const sun = new THREE.DirectionalLight(0xffffff, 0.9);
    sun.position.set(10, 15, 8);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 40;
    sun.shadow.camera.left = -15;
    sun.shadow.camera.right = 15;
    sun.shadow.camera.top = 15;
    sun.shadow.camera.bottom = -15;
    this.scene.add(sun);

    const fill = new THREE.DirectionalLight(0x88bbff, 0.3);
    fill.position.set(-5, 5, -5);
    this.scene.add(fill);

    if (mode === "tractor") {
      this.vehicle = new Tractor(this.scene);
      this.game = new TractorGame(this.scene, this.vehicle);

      this.scoreIconEl.textContent = "🌱";
      this.scoreTotalEl.style.display = "none";
      this.scoreEl.textContent = "0";
      this.tractorResetBtn.classList.remove("hidden");
      this.tractorResetBtn.textContent = "🌱 リセット";
      this.joystickRight.classList.add("hidden");
      this.joystickLeft.style.left = "50%";
      this.joystickLeft.style.transform = "translateX(-50%)";
      this.leftLabel.textContent = "ハンドル・前後";
    } else if (mode === "bulldozer") {
      this.vehicle = new Bulldozer(this.scene);
      this.game = new BulldozerGame(this.scene, this.vehicle);

      this.bulldozerCamYaw = Math.PI * 0.85;
      this.bulldozerCamPitch = 0.55;
      this.bulldozerCamDistance = 9;

      this.scoreIconEl.textContent = "🪨";
      this.scoreTotalEl.style.display = "";
      this.totalEl.textContent = this.game.totalRocks;
      this.scoreEl.textContent = "0";
      this.tractorResetBtn.classList.remove("hidden");
      this.tractorResetBtn.textContent = "🪨 リセット";
      this.joystickRight.classList.remove("hidden");
      this.joystickLeft.style.left = "";
      this.joystickLeft.style.transform = "";
      this.leftLabel.textContent = "カメラ";
      this.rightLabel.textContent = "ハンドル・前後";

      this.game.onClear = () => {
        this.clearMessageEl.textContent = "ぜんぶ岩を運べたよ！";
        this.clearScreen.classList.remove("hidden");
      };
    } else {
      this.vehicle = new Excavator(this.scene);
      this.game = new Game(this.scene, this.vehicle);

      this.scoreIconEl.textContent = "🪣";
      this.scoreTotalEl.style.display = "";
      this.totalEl.textContent = this.game.totalBalls;
      this.scoreEl.textContent = "0";
      this.tractorResetBtn.classList.add("hidden");
      this.joystickRight.classList.remove("hidden");
      this.joystickLeft.style.left = "";
      this.joystickLeft.style.transform = "";
      this.leftLabel.textContent = "アーム上下・旋回";
      this.rightLabel.textContent = "ブーム・バケット";

      this.game.onClear = () => {
        this.clearMessageEl.textContent = "ぜんぶ集められたよ！";
        this.clearScreen.classList.remove("hidden");
      };
    }

    this.game.onScore = (score, total) => {
      this.scoreEl.textContent = score;
      if (total !== undefined) this.totalEl.textContent = total;
    };
    this.game.onMessage = (msg) => {
      this.messageEl.textContent = msg;
      this.messageEl.style.opacity = msg ? "1" : "0";
    };
  }

  _initThree() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb);
    this.scene.fog = new THREE.Fog(0x87ceeb, 20, 50);

    const aspect = window.innerWidth / window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(50, aspect, 0.1, 100);
    this.camera.position.set(8, 7, 10);
    this.camera.lookAt(2, 1, 3);

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    window.addEventListener("resize", () => this._onResize());
  }

  _onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  _animate() {
    requestAnimationFrame(() => this._animate());

    const dt = Math.min(this.clock.getDelta(), 0.05);

    if (this.running && this.vehicle && this.game) {
      if (this.mode === "tractor") {
        this.vehicle.update(this.leftStick, dt);
      } else if (this.mode === "bulldozer") {
        this.vehicle.update(this.rightStick, dt);
      } else {
        this.vehicle.update(this.leftStick, this.rightStick, dt);
      }
      this.game.update(dt);
    }

    if (this.vehicle) this._updateCamera(dt);
    this.renderer.render(this.scene, this.camera);
  }

  _updateCamera(dt) {
    if (this.mode === "bulldozer") {
      const camInput = this.leftStick;
      if (Math.abs(camInput.x) > 0.05 || Math.abs(camInput.y) > 0.05) {
        this.bulldozerCamYaw -= camInput.x * 1.3 * dt;
        this.bulldozerCamPitch = THREE.MathUtils.clamp(
          this.bulldozerCamPitch + camInput.y * 0.85 * dt,
          0.25,
          1.1
        );
      }

      const pos = this.vehicle.getWorldPosition();
      const target = new THREE.Vector3(pos.x, 1.2, pos.z);
      const horizDist = this.bulldozerCamDistance * Math.cos(this.bulldozerCamPitch);
      const height = this.bulldozerCamDistance * Math.sin(this.bulldozerCamPitch) + 1.0;
      const desired = new THREE.Vector3(
        target.x + Math.sin(this.bulldozerCamYaw) * horizDist,
        height,
        target.z + Math.cos(this.bulldozerCamYaw) * horizDist
      );

      this.camera.position.lerp(desired, 0.06);
      this.camera.lookAt(target);
      return;
    }

    if (this.mode === "tractor") {
      const pos = this.vehicle.getWorldPosition();
      const target = new THREE.Vector3(pos.x, 1.2, pos.z);
      const camOffset = new THREE.Vector3(-5, 6, 7);
      camOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.vehicle.group.rotation.y);
      const desired = target.clone().add(camOffset);

      this.camera.position.lerp(desired, 0.04);
      this.camera.lookAt(target);
      return;
    }

    const bucketPos = this.vehicle.getBucketWorldPosition();
    const target = new THREE.Vector3(
      bucketPos.x * 0.3 + 2,
      1.5,
      bucketPos.z * 0.3 + 3
    );
    const camTarget = target.clone();
    camTarget.y += 1;

    this.camera.position.lerp(
      new THREE.Vector3(camTarget.x + 6, camTarget.y + 5, camTarget.z + 7),
      0.02
    );
    this.camera.lookAt(camTarget);
  }
}

new KidsGameApp();