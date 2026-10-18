export const DOOR = Object.freeze({ CLOSED: 0, OPEN: 1, ANIMATING: 2 });
export class Door {
  constructor({ id, x, y, state = DOOR.CLOSED, duration = 0.28, blocksDuringAnimation = true } = {}) {
    Object.assign(this, { id, x, y, state, duration, blocksDuringAnimation });
    this.target = state === DOOR.OPEN ? DOOR.OPEN : DOOR.CLOSED;
    this.elapsed = 0;
  }
  get blocks() { return this.state === DOOR.CLOSED || (this.state === DOOR.ANIMATING && this.blocksDuringAnimation); }
  interact() {
    if (this.state === DOOR.ANIMATING) return false;
    this.target = this.state === DOOR.CLOSED ? DOOR.OPEN : DOOR.CLOSED;
    this.state = DOOR.ANIMATING; this.elapsed = 0; return true;
  }
  update(dt) {
    if (this.state !== DOOR.ANIMATING) return;
    this.elapsed += dt;
    if (this.elapsed >= this.duration) { this.state = this.target; this.elapsed = 0; }
  }
  serialize() { return { id: this.id, x: this.x, y: this.y, state: this.state === DOOR.ANIMATING ? this.target : this.state }; }
}
