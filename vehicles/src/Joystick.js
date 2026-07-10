export class Joystick {
  constructor(zoneEl) {
    this.zone = zoneEl;
    this.base = zoneEl.querySelector(".joystick-base");
    this.knob = zoneEl.querySelector(".joystick-knob");
    this.x = 0;
    this.y = 0;
    this.active = false;

    this.maxRadius = 0;
    this._recalcRadius();

    this._onStart = this._onStart.bind(this);
    this._onMove = this._onMove.bind(this);
    this._onEnd = this._onEnd.bind(this);

    this.base.addEventListener("pointerdown", this._onStart);
    window.addEventListener("pointermove", this._onMove);
    window.addEventListener("pointerup", this._onEnd);
    window.addEventListener("pointercancel", this._onEnd);
    window.addEventListener("resize", () => this._recalcRadius());
  }

  _recalcRadius() {
    const rect = this.base.getBoundingClientRect();
    this.maxRadius = rect.width / 2 - 28;
  }

  _onStart(e) {
    e.preventDefault();
    this.active = true;
    this.zone.classList.add("active");
    this.base.setPointerCapture(e.pointerId);
    this._updateFromEvent(e);
  }

  _onMove(e) {
    if (!this.active) return;
    this._updateFromEvent(e);
  }

  _onEnd() {
    if (!this.active) return;
    this.active = false;
    this.zone.classList.remove("active");
    this.x = 0;
    this.y = 0;
    this.knob.style.transform = "translate(-50%, -50%)";
  }

  _updateFromEvent(e) {
    const rect = this.base.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    let dx = e.clientX - cx;
    let dy = e.clientY - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > this.maxRadius) {
      dx = (dx / dist) * this.maxRadius;
      dy = (dy / dist) * this.maxRadius;
    }

    this.x = dx / this.maxRadius;
    this.y = -dy / this.maxRadius;

    this.knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${-dy}px))`;
  }
}