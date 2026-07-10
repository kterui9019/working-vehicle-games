import * as THREE from "three";

const BALL_COLORS = [
  0xff4444, 0x44bbff, 0x44dd66, 0xffaa22, 0xff66cc, 0xaa66ff, 0x44dddd, 0xffff44,
  0xff8855, 0x55ff88, 0x8855ff, 0xff55aa,
];

const BALL_COUNT = 28;

const MESSAGES = [
  "すごい！",
  "やったね！",
  "いいね！",
  "もうひとつ！",
  "がんばって！",
  "ナイス！",
];

export class Game {
  constructor(scene, excavator) {
    this.scene = scene;
    this.excavator = excavator;
    this.balls = [];
    this.collected = 0;
    this.totalBalls = BALL_COUNT;
    this.onScore = null;
    this.onClear = null;
    this.onMessage = null;
    this._messageTimer = 0;

    this._buildEnvironment();
    this._spawnBalls();
  }

  _buildEnvironment() {
    const groundGeo = new THREE.PlaneGeometry(40, 40);
    const groundMat = new THREE.MeshLambertMaterial({ color: 0xc2a060 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0;
    ground.receiveShadow = true;
    this.scene.add(ground);

    const sandPile = new THREE.Mesh(
      new THREE.ConeGeometry(3, 1.2, 16),
      new THREE.MeshLambertMaterial({ color: 0xd4b878 })
    );
    sandPile.position.set(4, 0.6, 3);
    this.scene.add(sandPile);

    const sandPile2 = new THREE.Mesh(
      new THREE.ConeGeometry(2, 0.8, 12),
      new THREE.MeshLambertMaterial({ color: 0xc9ad6e })
    );
    sandPile2.position.set(-3, 0.4, 5);
    this.scene.add(sandPile2);

    const fenceMat = new THREE.MeshLambertMaterial({ color: 0x8b6914 });
    for (let i = 0; i < 8; i++) {
      const post = new THREE.Mesh(
        new THREE.BoxGeometry(0.15, 1.2, 0.15),
        fenceMat
      );
      const angle = (i / 8) * Math.PI * 2;
      post.position.set(Math.cos(angle) * 12, 0.6, Math.sin(angle) * 12);
      this.scene.add(post);
    }
  }

  _spawnBalls() {
    this.balls.forEach((b) => this.scene.remove(b.mesh));
    this.balls = [];
    this.collected = 0;

    const positions = this._generateBallPositions(BALL_COUNT);

    positions.forEach((pos, i) => {
      const radius = 0.35;
      const geo = new THREE.SphereGeometry(radius, 16, 16);
      const mat = new THREE.MeshLambertMaterial({
        color: BALL_COLORS[i % BALL_COLORS.length],
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(pos[0], pos[1], pos[2]);
      mesh.castShadow = true;
      this.scene.add(mesh);

      this.balls.push({
        mesh,
        radius,
        collected: false,
        inBucket: false,
        scoopTimer: 0,
        velocity: new THREE.Vector3(),
        bobPhase: Math.random() * Math.PI * 2,
      });
    });
  }

  _generateBallPositions(count) {
    const positions = [];
    const minDist = 0.9;
    const maxAttempts = count * 30;

    for (let attempt = 0; attempt < maxAttempts && positions.length < count; attempt++) {
      const x = (Math.random() - 0.5) * 12;
      const z = 1.5 + Math.random() * 7;
      const candidate = [x, 0.35, z];

      const tooClose = positions.some((p) => {
        const dx = p[0] - candidate[0];
        const dz = p[2] - candidate[2];
        return Math.sqrt(dx * dx + dz * dz) < minDist;
      });

      if (!tooClose) positions.push(candidate);
    }

    while (positions.length < count) {
      const ring = positions.length;
      const angle = (ring / count) * Math.PI * 1.4 - Math.PI * 0.7;
      const radius = 2.5 + (ring % 4) * 1.2;
      positions.push([
        Math.sin(angle) * radius,
        0.35,
        2 + Math.cos(angle) * radius * 0.6 + 1.5,
      ]);
    }

    return positions;
  }

  reset() {
    this._spawnBalls();
  }

  update(dt) {
    const bucketTip = this.excavator.getBucketTipPosition();
    const bucketCavity = this.excavator.getBucketCavityPosition();
    const scooping = this.excavator.isBucketScooping();
    const bucketOpen = this.excavator.isBucketOpen();

    for (const ball of this.balls) {
      if (ball.collected) continue;

      if (ball.inBucket) {
        ball.mesh.position.copy(bucketCavity);
        ball.mesh.position.y += Math.sin(ball.bobPhase) * 0.02;
        ball.bobPhase += dt * 3;
        ball.scoopTimer += dt;

        if (ball.scoopTimer > 0.4) {
          this._collectBall(ball);
        } else if (bucketOpen) {
          ball.inBucket = false;
          ball.scoopTimer = 0;
          ball.velocity.set(
            (Math.random() - 0.5) * 2,
            1,
            (Math.random() - 0.5) * 2
          );
        }
        continue;
      }

      ball.mesh.position.y =
        ball.radius + Math.sin(ball.bobPhase + Date.now() * 0.002) * 0.03;
      ball.bobPhase += dt * 2;

      if (ball.velocity.lengthSq() > 0.001) {
        ball.mesh.position.addScaledVector(ball.velocity, dt);
        ball.velocity.y -= 9.8 * dt;
        if (ball.mesh.position.y < ball.radius) {
          ball.mesh.position.y = ball.radius;
          ball.velocity.y *= -0.4;
          ball.velocity.x *= 0.7;
          ball.velocity.z *= 0.7;
        }
      }

      const dist = ball.mesh.position.distanceTo(bucketTip);
      if (scooping && dist < 1.2 && ball.mesh.position.y < bucketTip.y + 0.5) {
        ball.inBucket = true;
        ball.scoopTimer = 0;
        ball.velocity.set(0, 0, 0);
        this._showMessage(MESSAGES[Math.floor(Math.random() * MESSAGES.length)]);
      }
    }

    if (this._messageTimer > 0) {
      this._messageTimer -= dt;
      if (this._messageTimer <= 0 && this.onMessage) {
        this.onMessage("");
      }
    }
  }

  _collectBall(ball) {
    ball.collected = true;
    ball.inBucket = false;
    this.scene.remove(ball.mesh);

    this.collected++;
    if (this.onScore) this.onScore(this.collected, this.totalBalls);
    this._showMessage("ボールゲット！🎉");

    if (this.collected >= this.totalBalls && this.onClear) {
      setTimeout(() => this.onClear(), 800);
    }
  }

  _showMessage(text) {
    this._messageTimer = 2;
    if (this.onMessage) this.onMessage(text);
  }
}