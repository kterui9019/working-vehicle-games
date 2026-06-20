import * as THREE from "three";

const GROUND_Y = 0.12;

export class Bulldozer {
  constructor(scene) {
    this.group = new THREE.Group();
    this.maxSpeed = 1.85;
    this.turnSpeed = 1.05;
    this.steerAngle = 0;
    this.trackOffset = 0;
    this.throttleInput = 0;

    this._build();
    this.group.position.set(0, GROUND_Y, -5);
    this.group.rotation.y = 0;
    scene.add(this.group);
  }

  _build() {
    const yellow = new THREE.MeshLambertMaterial({ color: 0xffb300 });
    const darkYellow = new THREE.MeshLambertMaterial({ color: 0xcc8800 });
    const black = new THREE.MeshLambertMaterial({ color: 0x222222 });
    const metal = new THREE.MeshLambertMaterial({ color: 0x8899aa });
    const darkMetal = new THREE.MeshLambertMaterial({ color: 0x556677 });

    const chassis = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.8, 2.6), yellow);
    chassis.position.set(0, 0.6, 0);
    this.group.add(chassis);

    const engine = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.7, 1.4), darkYellow);
    engine.position.set(0, 1.0, -0.8);
    this.group.add(engine);

    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.1, 1.2), yellow);
    cabin.position.set(0, 1.45, 0.5);
    this.group.add(cabin);

    const windowMat = new THREE.MeshLambertMaterial({
      color: 0x88ccff,
      transparent: true,
      opacity: 0.7,
    });
    const win = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.55, 0.05), windowMat);
    win.position.set(0, 1.6, 0.92);
    this.group.add(win);

    const trackLength = 2.8;
    const trackHeight = 0.55;
    const trackWidth = 0.45;
    const segmentDepth = 0.18;
    const segmentCount = 7;
    this.trackHalfLength = trackLength / 2 - segmentDepth / 2;
    const segmentSpacing = (trackLength - segmentDepth) / (segmentCount - 1);
    this.trackLoop = segmentSpacing * segmentCount;

    this.trackGroups = [];
    this.trackSegments = [];
    for (const x of [-1.1, 1.1]) {
      const trackGroup = new THREE.Group();
      trackGroup.position.set(x, 0.35, 0);
      this.group.add(trackGroup);
      this.trackGroups.push(trackGroup);

      const trackBody = new THREE.Mesh(
        new THREE.BoxGeometry(trackWidth, trackHeight, trackLength),
        black
      );
      trackGroup.add(trackBody);

      const segmentY = -trackHeight / 2 + 0.05 + 0.01;
      for (let i = 0; i < segmentCount; i++) {
        const segment = new THREE.Mesh(
          new THREE.BoxGeometry(trackWidth + 0.02, 0.1, segmentDepth),
          darkMetal
        );
        const baseZ = -this.trackHalfLength + i * segmentSpacing;
        segment.position.set(0, segmentY, baseZ);
        segment.userData.baseZ = baseZ;
        trackGroup.add(segment);
        this.trackSegments.push(segment);
      }
    }

    const bladeGroup = new THREE.Group();
    bladeGroup.position.set(0, 0.5, 1.6);
    this.group.add(bladeGroup);
    this.bladeGroup = bladeGroup;

    const blade = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.0, 0.18), metal);
    blade.position.set(0, 0.35, 0.1);
    blade.castShadow = true;
    bladeGroup.add(blade);

    const bladeTop = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.12, 0.22), darkMetal);
    bladeTop.position.set(0, 0.88, 0.1);
    bladeGroup.add(bladeTop);

    for (const x of [-1.0, 1.0]) {
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.5, 0.8), darkMetal);
      arm.position.set(x, 0.15, -0.35);
      bladeGroup.add(arm);
    }

    const exhaust = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.6, 8), darkMetal);
    exhaust.position.set(0.55, 1.7, -0.6);
    this.group.add(exhaust);

    this.bladeProbe = new THREE.Object3D();
    this.bladeProbe.position.set(0, 0.5, 2.1);
    this.group.add(this.bladeProbe);
  }

  update(stick, dt) {
    const steerInput = stick.x;
    this.throttleInput = stick.y;

    this.steerAngle = THREE.MathUtils.lerp(this.steerAngle, steerInput * 0.45, 0.12);

    const moveSpeed = this.throttleInput * this.maxSpeed;
    const isMoving = Math.abs(this.throttleInput) > 0.05;

    if (isMoving) {
      const turnSign = this.throttleInput >= 0 ? 1 : -1;
      const turnAmount = steerInput * this.turnSpeed * dt * turnSign;
      this.group.rotation.y -= turnAmount;

      const forward = new THREE.Vector3(0, 0, 1);
      forward.applyQuaternion(this.group.quaternion);
      this.group.position.addScaledVector(forward, moveSpeed * dt);

      const spinDelta = (moveSpeed * dt) / 0.35;
      this.trackOffset = (this.trackOffset + spinDelta) % this.trackLoop;
      const minZ = -this.trackHalfLength;
      const maxZ = this.trackHalfLength;
      for (const segment of this.trackSegments) {
        let z = segment.userData.baseZ - this.trackOffset;
        while (z < minZ) z += this.trackLoop;
        while (z > maxZ) z -= this.trackLoop;
        segment.position.z = z;
      }
    }

    this._clampToField();
  }

  _clampToField() {
    const limit = 9;
    const pos = this.group.position;
    pos.x = THREE.MathUtils.clamp(pos.x, -limit, limit);
    pos.z = THREE.MathUtils.clamp(pos.z, -limit, limit);
  }

  getBladePosition() {
    const pos = new THREE.Vector3();
    this.bladeProbe.getWorldPosition(pos);
    return pos;
  }

  getForwardDirection() {
    const forward = new THREE.Vector3(0, 0, 1);
    forward.applyQuaternion(this.group.quaternion);
    return forward;
  }

  getWorldPosition() {
    const pos = new THREE.Vector3();
    this.group.getWorldPosition(pos);
    return pos;
  }

  isMovingForward() {
    return this.throttleInput > 0.05;
  }

  getPushStrength() {
    return Math.abs(this.throttleInput) * this.maxSpeed;
  }
}