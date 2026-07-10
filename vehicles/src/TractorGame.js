import * as THREE from "three";

const GRID_SIZE = 0.7;
const MESSAGES = ["いいね！", "もぐもぐ育てよう！", "やったね！", "すごい！"];

export class TractorGame {
  constructor(scene, tractor) {
    this.scene = scene;
    this.tractor = tractor;
    this.plantedCells = new Set();
    this.seedlings = [];
    this.plantedCount = 0;
    this.onScore = null;
    this.onMessage = null;
    this._messageTimer = 0;
    this._lastPlantPos = new THREE.Vector3();
    this._lastCenterPos = null;

    this._buildEnvironment();
    this._lastPlantPos.copy(this.tractor.getPlanterPosition());
    this._lastCenterPos = this.tractor.getWorldPosition().clone();
  }

  _buildEnvironment() {
    const groundGeo = new THREE.PlaneGeometry(40, 40);
    const groundMat = new THREE.MeshLambertMaterial({ color: 0x6aaa4a });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    const soilPatch = new THREE.Mesh(
      new THREE.PlaneGeometry(18, 18),
      new THREE.MeshLambertMaterial({ color: 0x8b6914 })
    );
    soilPatch.rotation.x = -Math.PI / 2;
    soilPatch.position.y = 0.01;
    this.scene.add(soilPatch);

    const fenceMat = new THREE.MeshLambertMaterial({ color: 0x8b6914 });
    for (let i = 0; i < 12; i++) {
      const post = new THREE.Mesh(
        new THREE.BoxGeometry(0.15, 1.0, 0.15),
        fenceMat
      );
      const angle = (i / 12) * Math.PI * 2;
      post.position.set(Math.cos(angle) * 11, 0.5, Math.sin(angle) * 11);
      this.scene.add(post);
    }
  }

  reset() {
    for (const seedling of this.seedlings) {
      this.scene.remove(seedling);
    }
    this.seedlings = [];
    this.plantedCells.clear();
    this.plantedCount = 0;
    this._lastPlantPos = new THREE.Vector3();
    this._lastCenterPos = null;
    this.tractor.group.position.set(0, 0.12, -4);
    this.tractor.group.rotation.y = 0;
    if (this.onScore) this.onScore(0);
  }

  update(dt) {
    const planterPos = this.tractor.getPlanterPosition();
    const centerPos = this.tractor.getWorldPosition();
    const dist = planterPos.distanceTo(this._lastPlantPos);

    if (dist > 0.01) {
      const steps = Math.max(1, Math.ceil(dist / (GRID_SIZE * 0.35)));
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const sample = new THREE.Vector3().lerpVectors(this._lastPlantPos, planterPos, t);
        this._tryPlant(sample);
        const prevCenter = this._lastCenterPos ?? centerPos;
        const centerSample = new THREE.Vector3().lerpVectors(prevCenter, centerPos, t);
        this._tryPlant(centerSample);
      }
    }

    this._lastPlantPos.copy(planterPos);
    this._lastCenterPos = centerPos.clone();

    for (const seedling of this.seedlings) {
      seedling.userData.growPhase += dt * 2;
      const scale = 0.6 + Math.sin(seedling.userData.growPhase) * 0.08;
      seedling.scale.setScalar(scale);
    }

    if (this._messageTimer > 0) {
      this._messageTimer -= dt;
      if (this._messageTimer <= 0 && this.onMessage) {
        this.onMessage("");
      }
    }
  }

  _tryPlant(pos) {
    const gx = Math.floor(pos.x / GRID_SIZE);
    const gz = Math.floor(pos.z / GRID_SIZE);
    const key = `${gx},${gz}`;

    if (this.plantedCells.has(key)) return;
    this.plantedCells.add(key);

    const seedling = this._createSeedling();
    seedling.position.set(
      gx * GRID_SIZE + GRID_SIZE * 0.5,
      0,
      gz * GRID_SIZE + GRID_SIZE * 0.5
    );
    seedling.rotation.y = Math.random() * Math.PI * 2;
    seedling.userData.growPhase = Math.random() * Math.PI * 2;
    this.scene.add(seedling);
    this.seedlings.push(seedling);

    this.plantedCount++;
    if (this.onScore) this.onScore(this.plantedCount);

    if (this.plantedCount % 5 === 0) {
      this._showMessage(MESSAGES[Math.floor(Math.random() * MESSAGES.length)]);
    } else if (this.plantedCount === 1) {
      this._showMessage("🌱 はじめての苗！");
    }
  }

  _createSeedling() {
    const group = new THREE.Group();
    const stemMat = new THREE.MeshLambertMaterial({ color: 0x4a8f3a });
    const leafMat = new THREE.MeshLambertMaterial({
      color: [0x5cb85c, 0x7ec850, 0x3d9e3d][Math.floor(Math.random() * 3)],
    });

    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.05, 0.25, 6), stemMat);
    stem.position.y = 0.12;
    group.add(stem);

    const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), leafMat);
    leaf.position.y = 0.28;
    leaf.scale.set(1, 0.7, 1);
    group.add(leaf);

    const leaf2 = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), leafMat);
    leaf2.position.set(0.08, 0.22, 0);
    leaf2.scale.set(0.8, 0.5, 0.8);
    group.add(leaf2);

    return group;
  }

  _showMessage(text) {
    this._messageTimer = 2;
    if (this.onMessage) this.onMessage(text);
  }
}