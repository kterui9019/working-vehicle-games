import * as THREE from "three";

const ROCK_COUNT = 4;
const GOAL_CENTER = new THREE.Vector3(0, 0, 7);
const GOAL_RADIUS = 2.8;

const MESSAGES = ["すごい！", "やったね！", "いいね！", "つぎもがんばろう！", "ナイス！"];

const ROCK_POSITIONS = [
  [-4, 0.9, -2],
  [3.5, 0.85, -1],
  [-2, 0.95, 1.5],
  [4, 0.8, 2],
];

export class BulldozerGame {
  constructor(scene, bulldozer) {
    this.scene = scene;
    this.bulldozer = bulldozer;
    this.rocks = [];
    this.deliveredCount = 0;
    this.totalRocks = ROCK_COUNT;
    this.onScore = null;
    this.onClear = null;
    this.onMessage = null;
    this._messageTimer = 0;
    this.goalMarker = null;

    this._buildEnvironment();
    this._spawnRocks();
  }

  _buildEnvironment() {
    const groundGeo = new THREE.PlaneGeometry(40, 40);
    const groundMat = new THREE.MeshLambertMaterial({ color: 0x9a7b4f });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    const workArea = new THREE.Mesh(
      new THREE.PlaneGeometry(18, 18),
      new THREE.MeshLambertMaterial({ color: 0x7a6340 })
    );
    workArea.rotation.x = -Math.PI / 2;
    workArea.position.y = 0.01;
    this.scene.add(workArea);

    const goalMat = new THREE.MeshLambertMaterial({
      color: 0xff6b35,
      transparent: true,
      opacity: 0.45,
    });
    const goalZone = new THREE.Mesh(
      new THREE.CircleGeometry(GOAL_RADIUS, 24),
      goalMat
    );
    goalZone.rotation.x = -Math.PI / 2;
    goalZone.position.copy(GOAL_CENTER);
    goalZone.position.y = 0.02;
    this.scene.add(goalZone);
    this.goalMarker = goalZone;

    const flagMat = new THREE.MeshLambertMaterial({ color: 0xff4444 });
    const poleMat = new THREE.MeshLambertMaterial({ color: 0xdddddd });
    for (const x of [-2.2, 2.2]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.8, 8), poleMat);
      pole.position.set(x, 0.9, GOAL_CENTER.z + 1.5);
      this.scene.add(pole);

      const flag = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.35, 0.05), flagMat);
      flag.position.set(x + 0.3, 1.5, GOAL_CENTER.z + 1.5);
      this.scene.add(flag);
    }

    const signBoard = new THREE.Mesh(
      new THREE.BoxGeometry(2.4, 0.8, 0.1),
      new THREE.MeshLambertMaterial({ color: 0xffcc00 })
    );
    signBoard.position.set(0, 1.2, GOAL_CENTER.z + 2.2);
    this.scene.add(signBoard);

    const fenceMat = new THREE.MeshLambertMaterial({ color: 0x666655 });
    for (let i = 0; i < 10; i++) {
      const post = new THREE.Mesh(
        new THREE.BoxGeometry(0.15, 1.0, 0.15),
        fenceMat
      );
      const angle = (i / 10) * Math.PI * 2;
      post.position.set(Math.cos(angle) * 11, 0.5, Math.sin(angle) * 11);
      this.scene.add(post);
    }

    for (let i = 0; i < 6; i++) {
      const rubble = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.25 + Math.random() * 0.15, 0),
        new THREE.MeshLambertMaterial({ color: 0x888877 })
      );
      rubble.position.set(
        (Math.random() - 0.5) * 14,
        0.15,
        (Math.random() - 0.5) * 10 - 2
      );
      rubble.rotation.set(Math.random(), Math.random(), Math.random());
      this.scene.add(rubble);
    }
  }

  _spawnRocks() {
    this.rocks.forEach((r) => this.scene.remove(r.mesh));
    this.rocks = [];
    this.deliveredCount = 0;

    ROCK_POSITIONS.forEach((pos, i) => {
      const radius = 0.75 + (i % 2) * 0.15;
      const geo = new THREE.DodecahedronGeometry(radius, 1);
      const mat = new THREE.MeshLambertMaterial({ color: 0x888899 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(pos[0], pos[1], pos[2]);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.scene.add(mesh);

      this.rocks.push({
        mesh,
        radius,
        delivered: false,
        velocity: new THREE.Vector3(),
      });
    });

    if (this.onScore) this.onScore(0, this.totalRocks);
  }

  reset() {
    this._spawnRocks();
    this.bulldozer.group.position.set(0, 0.12, -5);
    this.bulldozer.group.rotation.y = 0;
    this.bulldozer.throttleInput = 0;
    if (this.onScore) this.onScore(0, this.totalRocks);
  }

  update(dt) {
    this._updateRockPush(dt);
    this._updateRockPhysics(dt);
    this._checkGoal();

    if (this._messageTimer > 0) {
      this._messageTimer -= dt;
      if (this._messageTimer <= 0 && this.onMessage) {
        this.onMessage("");
      }
    }
  }

  _updateRockPush(dt) {
    const bladePos = this.bulldozer.getBladePosition();
    const forward = this.bulldozer.getForwardDirection();
    const bulldozerPos = this.bulldozer.getWorldPosition();
    const pushStrength = this.bulldozer.getPushStrength();

    if (pushStrength < 0.1) return;

    for (const rock of this.rocks) {
      if (rock.delivered) continue;

      const rockPos = rock.mesh.position;
      const toRock = new THREE.Vector3().subVectors(rockPos, bladePos);
      toRock.y = 0;
      const dist = toRock.length();
      const pushRange = rock.radius + 1.4;

      if (dist < pushRange && dist > 0.01) {
        toRock.normalize();
        const facingDot = toRock.dot(forward);

        if (facingDot > 0.2) {
          const pushAmount = pushStrength * dt * 1.1;
          rock.velocity.addScaledVector(forward, pushAmount / dt);
        }
      }

      const toRockFromBody = new THREE.Vector3().subVectors(rockPos, bulldozerPos);
      toRockFromBody.y = 0;
      const bodyDist = toRockFromBody.length();
      if (bodyDist < rock.radius + 1.5 && bodyDist > 0.01) {
        toRockFromBody.normalize();
        const bodyDot = toRockFromBody.dot(forward);
        if (bodyDot > 0.1 && this.bulldozer.isMovingForward()) {
          rock.velocity.addScaledVector(forward, pushStrength * 0.6);
        }
      }
    }
  }

  _updateRockPhysics(dt) {
    const limit = 8.5;

    for (const rock of this.rocks) {
      if (rock.delivered) continue;

      rock.velocity.multiplyScalar(0.88);

      if (rock.velocity.length() > 0.01) {
        rock.mesh.position.addScaledVector(rock.velocity, dt);
      }

      rock.mesh.position.x = THREE.MathUtils.clamp(rock.mesh.position.x, -limit, limit);
      rock.mesh.position.z = THREE.MathUtils.clamp(rock.mesh.position.z, -limit, limit);
      rock.mesh.position.y = rock.radius * 0.85;
    }

    for (let i = 0; i < this.rocks.length; i++) {
      for (let j = i + 1; j < this.rocks.length; j++) {
        const a = this.rocks[i];
        const b = this.rocks[j];
        if (a.delivered || b.delivered) continue;

        const diff = new THREE.Vector3().subVectors(b.mesh.position, a.mesh.position);
        diff.y = 0;
        const dist = diff.length();
        const minDist = a.radius + b.radius + 0.1;

        if (dist < minDist && dist > 0.01) {
          diff.normalize();
          const overlap = (minDist - dist) * 0.5;
          a.mesh.position.addScaledVector(diff, -overlap);
          b.mesh.position.addScaledVector(diff, overlap);
        }
      }
    }
  }

  _checkGoal() {
    for (const rock of this.rocks) {
      if (rock.delivered) continue;

      const dist = new THREE.Vector2(
        rock.mesh.position.x - GOAL_CENTER.x,
        rock.mesh.position.z - GOAL_CENTER.z
      ).length();

      if (dist < GOAL_RADIUS - rock.radius * 0.3) {
        rock.delivered = true;
        rock.velocity.set(0, 0, 0);
        rock.mesh.material.color.setHex(0x66cc66);

        this.deliveredCount++;
        if (this.onScore) this.onScore(this.deliveredCount, this.totalRocks);

        if (this.deliveredCount === 1) {
          this._showMessage("🪨 ゴールに届いた！");
        } else if (this.deliveredCount < this.totalRocks) {
          this._showMessage(MESSAGES[Math.floor(Math.random() * MESSAGES.length)]);
        }

        if (this.deliveredCount >= this.totalRocks) {
          this._showMessage("🎉 ぜんぶ運べた！");
          if (this.onClear) this.onClear();
        }
      }
    }
  }

  _showMessage(text) {
    this._messageTimer = 2.5;
    if (this.onMessage) this.onMessage(text);
  }
}