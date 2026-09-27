import type { MooncakeId } from "./mooncakes";

export type Phase = "idle" | "touching" | "stretching" | "compressing" | "charging" | "transforming" | "mooncake";

export type Interaction = {
  phase: Phase;
  x: number;
  y: number;
  rotation: number;
  pressure: number;
  pinch: number;
  hoverX: number;
  hoverY: number;
  pressed: boolean;
  taps: number;
  pulse: number;
  startedAt: number;
  cakeVariant: MooncakeId;
  cakeSquish: number;
  cakePulse: number;
  cakeZoom: number;
  cakeRotationX: number;
  cakeRotationY: number;
  cakeVelocityX: number;
  cakeVelocityY: number;
  cakeDragDeltaX: number;
  cakeDragDeltaY: number;
};

export const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));
export const angleDelta = (a: number, b: number) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
export const initialInteraction = (): Interaction => ({
  phase: "idle", x: 0, y: 0, rotation: 0, pressure: 0, pinch: 1,
  hoverX: 0, hoverY: 0, pressed: false, taps: 0, pulse: 0, startedAt: 0, cakeVariant: "classic",
  cakeSquish: 0, cakePulse: 0, cakeZoom: 1,
  cakeRotationX: 0, cakeRotationY: 0, cakeVelocityX: 0, cakeVelocityY: 0,
  cakeDragDeltaX: 0, cakeDragDeltaY: 0,
});

export const isLocked = (phase: Phase) => phase === "transforming";

// Semi-implicit spring integration. Delta is clamped by the caller after tab suspension.
export function spring(position: number, velocity: number, target: number, dt: number) {
  const nextVelocity = velocity + ((target - position) * 150 - velocity * 18) * dt;
  return [position + nextVelocity * dt, nextVelocity] as const;
}
