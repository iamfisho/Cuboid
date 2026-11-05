import * as THREE from 'three';
import { PLAYER, bodyOverlaps, depenetrate, moveBody, type Body, type Box, type Held } from '@cuboid/shared';

export interface MoveContext {
  boxes: readonly Box[];
  alive: boolean;
  holding: Held | null;
  slide: { x: number; z: number };
  frozen: boolean;
}

/** Jugador local: entrada, movimiento con colisiones y cámara en primera persona. */
export class LocalPlayer {
  readonly body: Body = { pos: { x: 0, y: 0, z: 0 }, vel: { x: 0, y: 0, z: 0 }, height: PLAYER.standHeight, grounded: false };
  yaw = 0;
  pitch = 0;
  crouching = false;
  sprinting = false;
  moving = false;
  private eye: number = PLAYER.eyeStand;
  private readonly keys = new Set<string>();
  private readonly ext = new THREE.Vector3();
  private bob = 0;
  private roll = 0;
  sensitivity = 0.0022;

  constructor(private readonly camera: THREE.PerspectiveCamera) {
    camera.rotation.order = 'YXZ';
  }

  keyDown(code: string): void {
    this.keys.add(code);
  }

  keyUp(code: string): void {
    this.keys.delete(code);
  }

  clearKeys(): void {
    this.keys.clear();
  }

  look(dx: number, dy: number): void {
    this.yaw -= dx * this.sensitivity;
    this.pitch = Math.max(-1.5, Math.min(1.5, this.pitch - dy * this.sensitivity));
  }

  teleport(x: number, y: number, z: number, yaw?: number): void {
    this.body.pos = { x, y, z };
    this.body.vel = { x: 0, y: 0, z: 0 };
    this.ext.set(0, 0, 0);
    if (yaw !== undefined) {
      this.yaw = yaw;
      this.pitch = 0;
    }
  }

  impulse(x: number, y: number, z: number): void {
    this.ext.x += x;
    this.ext.z += z;
    this.body.vel.y = Math.max(this.body.vel.y, y);
  }

  update(dt: number, ctx: MoveContext): void {
    const k = this.keys;
    const fwd = (k.has('KeyW') || k.has('ArrowUp') ? 1 : 0) - (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0);
    const side = (k.has('KeyD') || k.has('ArrowRight') ? 1 : 0) - (k.has('KeyA') || k.has('ArrowLeft') ? 1 : 0);
    const sin = Math.sin(this.yaw);
    const cos = Math.cos(this.yaw);
    // Adelante = (-sin, -cos); derecha = (cos, -sin).
    let wx = -sin * fwd + cos * side;
    let wz = -cos * fwd - sin * side;
    const len = Math.hypot(wx, wz);
    if (len > 0) {
      wx /= len;
      wz /= len;
    }
    if (ctx.frozen) wx = wz = 0;

    if (!ctx.alive) {
      // Espectador: vuela sin colisiones.
      const up = (k.has('Space') ? 1 : 0) - (k.has('KeyC') || k.has('ControlLeft') ? 1 : 0);
      const speed = k.has('ShiftLeft') || k.has('ShiftRight') ? 11 : 6;
      this.body.pos.x += wx * speed * dt;
      this.body.pos.z += wz * speed * dt;
      this.body.pos.y = Math.max(-0.5, Math.min(12, this.body.pos.y + up * speed * dt));
      this.moving = len > 0;
      this.sprinting = false;
      this.applyCamera(dt, PLAYER.eyeStand);
      return;
    }

    const wantCrouch = k.has('KeyC') || k.has('ControlLeft') || k.has('ControlRight');
    const r = PLAYER.radius;
    if (!wantCrouch && this.crouching && !bodyOverlaps(this.body.pos, r, PLAYER.standHeight, ctx.boxes)) this.crouching = false;
    if (wantCrouch) this.crouching = true;
    // Un techo bajo obliga a agacharse.
    if (!this.crouching && bodyOverlaps(this.body.pos, r, PLAYER.standHeight, ctx.boxes)) this.crouching = true;
    this.body.height = this.crouching ? PLAYER.crouchHeight : PLAYER.standHeight;

    this.sprinting = !this.crouching && fwd > 0 && (k.has('ShiftLeft') || k.has('ShiftRight'));
    let speed = this.crouching ? PLAYER.crouchSpeed : this.sprinting ? PLAYER.sprintSpeed : PLAYER.walkSpeed;
    if (ctx.holding?.kind === 'weight') speed *= 1 - 0.06 * ctx.holding.value;
    if (ctx.holding?.kind === 'key') speed *= 0.92;

    depenetrate(this.body, r, ctx.boxes);
    const decay = Math.exp(-dt * (this.body.grounded ? 4 : 1));
    this.ext.multiplyScalar(decay);
    this.body.vel.x = wx * speed + ctx.slide.x + this.ext.x;
    this.body.vel.z = wz * speed + ctx.slide.z + this.ext.z;
    if (k.has('Space') && this.body.grounded && !this.crouching && !ctx.frozen) this.body.vel.y = PLAYER.jumpSpeed;
    this.body.vel.y -= PLAYER.gravity * dt;
    this.body.vel.y = Math.max(this.body.vel.y, -30);
    moveBody(this.body, dt, r, ctx.boxes);
    this.moving = len > 0;

    const eyeTarget = this.crouching ? PLAYER.eyeCrouch : PLAYER.eyeStand;
    this.roll += ((ctx.slide.x * Math.cos(this.yaw) - ctx.slide.z * Math.sin(this.yaw)) * -0.012 - this.roll) * (1 - Math.exp(-dt * 4));
    if (this.moving && this.body.grounded) this.bob += dt * speed * 2.2;
    this.applyCamera(dt, eyeTarget);
  }

  private applyCamera(dt: number, eyeTarget: number): void {
    this.eye += (eyeTarget - this.eye) * (1 - Math.exp(-dt * 12));
    const bobY = this.moving && this.body.grounded ? Math.sin(this.bob) * 0.035 : 0;
    this.camera.position.set(this.body.pos.x, this.body.pos.y + this.eye + bobY, this.body.pos.z);
    this.camera.rotation.set(this.pitch, this.yaw, this.roll);
  }
}
