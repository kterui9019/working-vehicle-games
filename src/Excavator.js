import * as THREE from "three";

const GROUND_Y = 0.12;

export class Excavator {
  constructor(scene) {
    this.group = new THREE.Group();

    this.boomAngle = 0.35;
    this.armAngle = 0.85;
    this.bucketAngle = -0.3;
    this.swingAngle = 0;

    this.boomSpeed = 0.8;
    this.armSpeed = 0.9;
    this.bucketSpeed = 1.0;
    this.swingSpeed = 0.7;

    this.groundProbes = [];

    this._build();
    scene.add(this.group);
  }

  _build() {
    const yellow = new THREE.MeshLambertMaterial({ color: 0xffcc00 });
    const darkYellow = new THREE.MeshLambertMaterial({ color: 0xddaa00 });
    const black = new THREE.MeshLambertMaterial({ color: 0x222222 });
    const metal = new THREE.MeshLambertMaterial({ color: 0x888899 });
    const trackMat = new THREE.MeshLambertMaterial({ color: 0x333333 });

    const trackGeo = new THREE.BoxGeometry(1.6, 0.5, 3.2);
    const leftTrack = new THREE.Mesh(trackGeo, trackMat);
    leftTrack.position.set(-1.1, 0.25, 0);
    this.group.add(leftTrack);

    const rightTrack = new THREE.Mesh(trackGeo, trackMat);
    rightTrack.position.set(1.1, 0.25, 0);
    this.group.add(rightTrack);

    const bodyGeo = new THREE.BoxGeometry(2.4, 1.0, 2.8);
    const body = new THREE.Mesh(bodyGeo, yellow);
    body.position.set(0, 1.0, 0);
    this.group.add(body);

    const cabinGeo = new THREE.BoxGeometry(1.6, 1.2, 1.6);
    const cabin = new THREE.Mesh(cabinGeo, darkYellow);
    cabin.position.set(0, 2.0, -0.3);
    this.group.add(cabin);

    const windowGeo = new THREE.BoxGeometry(1.3, 0.6, 0.05);
    const windowMat = new THREE.MeshLambertMaterial({
      color: 0x88ccff,
      transparent: true,
      opacity: 0.7,
    });
    const win = new THREE.Mesh(windowGeo, windowMat);
    win.position.set(0, 2.2, 0.52);
    this.group.add(win);

    this.upper = new THREE.Group();
    this.upper.position.set(0, 1.5, 0.5);
    this.group.add(this.upper);

    const counterweight = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 0.8, 1.0),
      darkYellow
    );
    counterweight.position.set(0, 0.4, -1.2);
    this.upper.add(counterweight);

    this.boomPivot = new THREE.Group();
    this.boomPivot.position.set(0, 0.5, 1.0);
    this.upper.add(this.boomPivot);

    const boomGeo = new THREE.BoxGeometry(0.5, 0.4, 3.0);
    const boom = new THREE.Mesh(boomGeo, yellow);
    boom.position.set(0, 0, 1.5);
    this.boomPivot.add(boom);

    const cylGeo = new THREE.CylinderGeometry(0.08, 0.08, 1.5, 8);
    const boomCyl = new THREE.Mesh(cylGeo, metal);
    boomCyl.rotation.x = Math.PI / 2;
    boomCyl.position.set(0.3, 0.2, 0.8);
    this.boomPivot.add(boomCyl);

    this.armPivot = new THREE.Group();
    this.armPivot.position.set(0, 0, 3.0);
    this.boomPivot.add(this.armPivot);

    const armGeo = new THREE.BoxGeometry(0.4, 0.35, 2.2);
    const arm = new THREE.Mesh(armGeo, yellow);
    arm.position.set(0, 0, 1.1);
    this.armPivot.add(arm);

    const armCyl = new THREE.Mesh(cylGeo, metal);
    armCyl.rotation.x = Math.PI / 2;
    armCyl.position.set(0.25, 0.1, 0.5);
    this.armPivot.add(armCyl);

    this._addProbe(this.armPivot, new THREE.Vector3(0, -0.2, 2.2));

    // アーム先端 = バケットのピン（支点）。バケット本体は先端側（+Z）に伸びる
    this.bucketPivot = new THREE.Group();
    this.bucketPivot.position.set(0, 0.12, 2.2);
    this.armPivot.add(this.bucketPivot);

    this.bucket = new THREE.Group();
    // 裏返し → バックホー向き（開口部が車体側、外板が現場側）
    this.bucket.rotation.x = Math.PI;
    this.bucketPivot.add(this.bucket);

    const bucketLen = 0.9;

    const pinLug = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.18, 0.18), metal);
    pinLug.position.set(0, -0.04, 0);
    this.bucket.add(pinLug);

    // 外板（裏返し前は -Z 側に置き、PI後に +Z 先端＝現場側へ）
    const bucketBack = new THREE.Mesh(
      new THREE.BoxGeometry(0.82, 0.48, 0.12),
      metal
    );
    bucketBack.position.set(0, -0.05, -(bucketLen - 0.08));
    this.bucket.add(bucketBack);

    const bucketBottom = new THREE.Mesh(
      new THREE.BoxGeometry(0.82, 0.1, bucketLen),
      metal
    );
    bucketBottom.position.set(0, 0.28, -bucketLen * 0.45);
    this.bucket.add(bucketBottom);

    const bucketSideGeo = new THREE.BoxGeometry(0.08, 0.36, bucketLen);
    const leftSide = new THREE.Mesh(bucketSideGeo, metal);
    leftSide.position.set(-0.37, 0.14, -bucketLen * 0.45);
    this.bucket.add(leftSide);

    const rightSide = new THREE.Mesh(bucketSideGeo, metal);
    rightSide.position.set(0.37, 0.14, -bucketLen * 0.45);
    this.bucket.add(rightSide);

    const toothZ = -(bucketLen - 0.02);
    for (let i = 0; i < 4; i++) {
      const tx = -0.27 + i * 0.18;
      const tooth = new THREE.Mesh(
        new THREE.BoxGeometry(0.14, 0.08, 0.16),
        black
      );
      tooth.position.set(tx, 0.34, toothZ);
      this.bucket.add(tooth);
      this._addProbe(this.bucket, new THREE.Vector3(tx, 0.38, toothZ - 0.04));
    }

    // 開口部側（PI後は -Z ＝ 車体向き）
    this.bucketCavityProbe = this._addProbe(
      this.bucket,
      new THREE.Vector3(0, 0.12, -bucketLen * 0.32)
    );
    this.bucketTipProbe = this._addProbe(
      this.bucket,
      new THREE.Vector3(0, 0.34, toothZ)
    );

    this._applyAngles();
  }

  _addProbe(parent, localPos) {
    const probe = new THREE.Object3D();
    probe.position.copy(localPos);
    parent.add(probe);
    this.groundProbes.push(probe);
    return probe;
  }

  _applyAngles() {
    this.upper.rotation.y = this.swingAngle;
    this.boomPivot.rotation.x = this.boomAngle;
    this.armPivot.rotation.x = this.armAngle;
    this.bucketPivot.rotation.x = -this.bucketAngle;
  }

  _getLowestProbeY() {
    const pos = new THREE.Vector3();
    let lowest = Infinity;
    for (const probe of this.groundProbes) {
      probe.getWorldPosition(pos);
      if (pos.y < lowest) lowest = pos.y;
    }
    return lowest;
  }

  _enforceGroundLimit(prev, prevLowestY) {
    const newLowestY = this._getLowestProbeY();
    if (newLowestY >= GROUND_Y) return;
    // 上方向への動きは許可（地面に埋まった状態から脱出できる）
    if (newLowestY > prevLowestY + 0.001) return;

    this.boomAngle = prev.boom;
    this.armAngle = prev.arm;
    this.bucketAngle = prev.bucket;
    this._applyAngles();
  }

  update(leftStick, rightStick, dt) {
    const prev = {
      boom: this.boomAngle,
      arm: this.armAngle,
      bucket: this.bucketAngle,
    };
    const prevLowestY = this._getLowestProbeY();

    const boomMin = -0.85;
    const boomMax = 1.1;
    // 小さい値 = アーム上げ / 大きい値 = 前に伸ばす
    const armMin = -1.0;
    const armMax = 1.55;
    const bucketMin = -1.2;
    const bucketMax = 1.0;
    const swingMin = -1.2;
    const swingMax = 1.2;

    this.swingAngle = THREE.MathUtils.clamp(
      this.swingAngle + leftStick.x * this.swingSpeed * dt,
      swingMin,
      swingMax
    );

    // 左スティック上 = アーム上げ / 下 = 前に伸ばす
    this.armAngle = THREE.MathUtils.clamp(
      this.armAngle - leftStick.y * this.armSpeed * dt,
      armMin,
      armMax
    );

    // スティック上 = ブーム上げ / 下 = ブーム下げ
    this.boomAngle = THREE.MathUtils.clamp(
      this.boomAngle - rightStick.y * this.boomSpeed * dt,
      boomMin,
      boomMax
    );

    // バックホー：右 = かき込み（車体側に閉じる）/ 左 = 開く
    this.bucketAngle = THREE.MathUtils.clamp(
      this.bucketAngle + rightStick.x * this.bucketSpeed * dt,
      bucketMin,
      bucketMax
    );

    this._applyAngles();
    this._enforceGroundLimit(prev, prevLowestY);
  }

  getBucketWorldPosition() {
    const pos = new THREE.Vector3();
    this.bucket.getWorldPosition(pos);
    return pos;
  }

  getBucketWorldQuaternion() {
    const quat = new THREE.Quaternion();
    this.bucket.getWorldQuaternion(quat);
    return quat;
  }

  getBucketTipPosition() {
    const pos = new THREE.Vector3();
    this.bucketTipProbe.getWorldPosition(pos);
    return pos;
  }

  getBucketCavityPosition() {
    const pos = new THREE.Vector3();
    this.bucketCavityProbe.getWorldPosition(pos);
    return pos;
  }

  isBucketOpen() {
    return this.bucketAngle < -0.15;
  }

  isBucketScooping() {
    return this.bucketAngle > 0.25;
  }
}