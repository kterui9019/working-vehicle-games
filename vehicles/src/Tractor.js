import * as THREE from "three";

const GROUND_Y = 0.12;

export class Tractor {
  constructor(scene) {
    this.group = new THREE.Group();
    this.maxSpeed = 2.1;
    this.turnSpeed = 1.2;
    this.steerAngle = 0;
    this.wheelSpin = 0;

    this._build();
    this.group.position.set(0, GROUND_Y, -4);
    this.group.rotation.y = 0;
    scene.add(this.group);
  }

  _build() {
    const green = new THREE.MeshLambertMaterial({ color: 0x3d8b37 });
    const darkGreen = new THREE.MeshLambertMaterial({ color: 0x2a6b28 });
    const yellow = new THREE.MeshLambertMaterial({ color: 0xffcc00 });
    const black = new THREE.MeshLambertMaterial({ color: 0x222222 });
    const metal = new THREE.MeshLambertMaterial({ color: 0x666677 });

    const chassis = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.7, 2.4), green);
    chassis.position.set(0, 0.55, 0);
    this.group.add(chassis);

    const engine = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.9, 1.2), darkGreen);
    engine.position.set(0, 0.95, -0.9);
    this.group.add(engine);

    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.0, 1.0), green);
    cabin.position.set(0, 1.35, 0.5);
    this.group.add(cabin);

    const windowMat = new THREE.MeshLambertMaterial({
      color: 0x88ccff,
      transparent: true,
      opacity: 0.7,
    });
    const win = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.5, 0.05), windowMat);
    win.position.set(0, 1.5, 1.02);
    this.group.add(win);

    const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.35, 16);
    this.rearWheels = [];
    for (const x of [-0.85, 0.85]) {
      const wheel = new THREE.Mesh(wheelGeo, black);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(x, 0.42, -0.6);
      this.group.add(wheel);
      this.rearWheels.push(wheel);
    }

    this.frontWheelPivots = [];
    this.frontWheels = [];
    for (const x of [-0.7, 0.7]) {
      const pivot = new THREE.Group();
      pivot.position.set(x, 0.35, 1.0);
      this.group.add(pivot);
      this.frontWheelPivots.push(pivot);

      const wheel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.32, 0.32, 0.28, 16),
        black
      );
      wheel.rotation.z = Math.PI / 2;
      pivot.add(wheel);
      this.frontWheels.push(wheel);
    }

    const exhaust = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.5, 8), metal);
    exhaust.position.set(0.5, 1.5, -0.5);
    this.group.add(exhaust);

    const steeringWheel = new THREE.Mesh(
      new THREE.TorusGeometry(0.18, 0.04, 8, 16),
      yellow
    );
    steeringWheel.rotation.x = Math.PI / 2;
    steeringWheel.position.set(0, 1.15, 0.85);
    this.steeringWheel = steeringWheel;
    this.group.add(steeringWheel);

    this.planterProbe = new THREE.Object3D();
    this.planterProbe.position.set(0, 0.1, -1.1);
    this.group.add(this.planterProbe);
  }

  update(stick, dt) {
    const steerInput = stick.x;
    const throttleInput = stick.y;

    this.steerAngle = THREE.MathUtils.lerp(this.steerAngle, steerInput * 0.55, 0.12);
    for (const pivot of this.frontWheelPivots) {
      pivot.rotation.y = this.steerAngle;
    }
    this.steeringWheel.rotation.z = -this.steerAngle * 2;

    const moveSpeed = throttleInput * this.maxSpeed;
    const isMoving = Math.abs(throttleInput) > 0.05;

    if (isMoving) {
      const turnSign = throttleInput >= 0 ? 1 : -1;
      const turnAmount = steerInput * this.turnSpeed * dt * turnSign;
      this.group.rotation.y -= turnAmount;

      const forward = new THREE.Vector3(0, 0, 1);
      forward.applyQuaternion(this.group.quaternion);
      this.group.position.addScaledVector(forward, moveSpeed * dt);

      const spinDelta = (moveSpeed * dt) / 0.42;
      this.wheelSpin += spinDelta;
      for (const wheel of [...this.rearWheels, ...this.frontWheels]) {
        wheel.rotation.x = this.wheelSpin;
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

  getPlanterPosition() {
    const pos = new THREE.Vector3();
    this.planterProbe.getWorldPosition(pos);
    return pos;
  }

  getWorldPosition() {
    const pos = new THREE.Vector3();
    this.group.getWorldPosition(pos);
    return pos;
  }
}