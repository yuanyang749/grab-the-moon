"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { angleDelta, clamp, initialInteraction, isLocked, type Phase } from "@/lib/interaction";
import { drawMooncake, isMooncakeId, MOONCAKES, type MooncakeId } from "@/lib/mooncakes";
import { playGrabSound, playTapSound, playTransformSound, playSquishSound } from "@/lib/sound";

type Contact = { x: number; y: number; originX: number; originY: number; lastTime: number; velocityY: number; moved: number; began: number };

export function useMoonInteraction() {
  const surface = useRef<HTMLDivElement>(null);
  const input = useRef(initialInteraction());
  const [phase, setPhase] = useState<Phase>("idle");
  const [engaged, setEngaged] = useState(false);
  const [ready, setReady] = useState(false);
  const [currentCake, setCurrentCake] = useState<MooncakeId>("classic");
  const [newDiscovery, setNewDiscovery] = useState(false);
  const [discovered, setDiscovered] = useState<MooncakeId[]>([]);
  const seen = useRef(new Set<MooncakeId>());
  const bag = useRef<MooncakeId[]>([]);
  const previous = useRef<MooncakeId | null>(null);
  const contacts = useRef(new Map<number, Contact>());
  const pair = useRef<{ distance: number; angle: number; rotation: number } | null>(null);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chargeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const finishTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const multiTouch = useRef(false);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("nobug-mooncakes-v1") || "null");
      if (!saved || typeof saved !== "object") return;
      if (Array.isArray(saved.seen)) {
        seen.current = new Set(saved.seen.filter(isMooncakeId));
        setDiscovered([...seen.current]);
      }
      if (Array.isArray(saved.remaining)) {
        bag.current = [...new Set<MooncakeId>([
          ...saved.remaining.filter(isMooncakeId),
          ...MOONCAKES.filter((cake) => !seen.current.has(cake.id)).map((cake) => cake.id),
        ])];
      }
      if (isMooncakeId(saved.last)) previous.current = saved.last;
    } catch {
      // Local storage is optional; the blind box still works without it.
    }
  }, []);

  const changePhase = useCallback((next: Phase) => {
    if (input.current.phase !== next) {
      input.current.phase = next;
      setPhase(next);
    }
  }, []);

  const clearHold = useCallback(() => {
    if (holdTimer.current) clearTimeout(holdTimer.current);
    if (chargeTimer.current) clearTimeout(chargeTimer.current);
    holdTimer.current = chargeTimer.current = null;
  }, []);

  const clearContacts = useCallback(() => {
    for (const id of contacts.current.keys()) {
      try {
        if (surface.current?.hasPointerCapture(id)) surface.current.releasePointerCapture(id);
      } catch {
        // Safe fallback
      }
    }
    contacts.current.clear();
    pair.current = null;
    multiTouch.current = false;
  }, []);

  const transform = useCallback(() => {
    if (isLocked(input.current.phase)) return;
    const draw = drawMooncake(bag.current, previous.current);
    bag.current = draw.remaining;
    previous.current = draw.id;
    input.current.cakeVariant = draw.id;
    setCurrentCake(draw.id);
    setNewDiscovery(!seen.current.has(draw.id));
    seen.current.add(draw.id);
    setDiscovered([...seen.current]);
    try {
      localStorage.setItem("nobug-mooncakes-v1", JSON.stringify({
        seen: [...seen.current], remaining: bag.current, last: draw.id,
      }));
    } catch {
      // Keep the session playable when storage is unavailable.
    }
    clearHold();
    clearContacts();
    input.current.pressed = false;
    input.current.startedAt = performance.now();
    setEngaged(true);
    changePhase("transforming");
    playTransformSound();
    finishTimer.current = setTimeout(() => changePhase("mooncake"), 1550);
  }, [changePhase, clearContacts, clearHold]);

  const reset = useCallback(() => {
    clearHold();
    clearContacts();
    if (finishTimer.current) clearTimeout(finishTimer.current);
    input.current = initialInteraction();
    input.current.pulse = performance.now();
    setPhase("idle");
    setEngaged(false);
  }, [clearContacts, clearHold]);

  const selectCake = useCallback((id: MooncakeId) => {
    if (input.current.phase !== "mooncake" || !seen.current.has(id)) return;
    input.current.cakeVariant = id;
    setCurrentCake(id);
    setNewDiscovery(false);
  }, []);

  const markReady = useCallback(() => setReady(true), []);

  useEffect(() => {
    const el = surface.current;
    if (!el || !ready) return;
    const release = () => {
      clearHold();
      input.current.pressed = false;
      input.current.x = input.current.y = input.current.pressure = 0;
      input.current.pinch = 1;
      if (!isLocked(input.current.phase) && input.current.phase !== "mooncake") {
        changePhase("idle");
      }
    };
    const pairStart = () => {
      const [a, b] = [...contacts.current.values()];
      if (a && b) pair.current = {
        distance: Math.max(16, Math.hypot(b.x - a.x, b.y - a.y)),
        angle: Math.atan2(b.y - a.y, b.x - a.x), rotation: input.current.rotation,
      };
    };
    const down = (event: PointerEvent) => {
      if (isLocked(input.current.phase) || (event.pointerType === "mouse" && event.button !== 0) || contacts.current.size >= 2) return;
      event.preventDefault();
      el.focus({ preventScroll: true });
      try {
        el.setPointerCapture(event.pointerId);
      } catch {
        // Fallback for synthetic/unregistered pointers
      }
      const now = performance.now();
      contacts.current.set(event.pointerId, { x: event.clientX, y: event.clientY, originX: event.clientX, originY: event.clientY, lastTime: now, velocityY: 0, moved: 0, began: now });
      setEngaged(true);
      clearHold();
      input.current.pressed = true;
      input.current.pulse = now;

      if (input.current.phase === "mooncake") {
        input.current.cakeVelocityX = 0;
        input.current.cakeVelocityY = 0;
        return;
      }

      playGrabSound();
      changePhase("touching");
      if (contacts.current.size === 2) {
        multiTouch.current = true;
        pairStart();
      } else {
        multiTouch.current = false;
        chargeTimer.current = setTimeout(() => { input.current.pressure = 0.38; changePhase("charging"); }, 700);
        holdTimer.current = setTimeout(transform, 3000);
      }
    };
    const move = (event: PointerEvent) => {
      if (isLocked(input.current.phase)) return;
      const rect = el.getBoundingClientRect();
      input.current.hoverX = clamp((event.clientX - rect.left) / rect.width - 0.5, -0.5, 0.5);
      input.current.hoverY = clamp((event.clientY - rect.top) / rect.height - 0.5, -0.5, 0.5);
      const p = contacts.current.get(event.pointerId);
      if (!p) return;
      const now = performance.now();
      const deltaX = event.clientX - p.x;
      const deltaY = event.clientY - p.y;
      const elapsed = Math.max(now - p.lastTime, 4);
      p.velocityY = (event.clientY - p.y) / Math.max(now - p.lastTime, 4);
      p.x = event.clientX; p.y = event.clientY; p.lastTime = now;
      p.moved = Math.max(p.moved, Math.hypot(p.x - p.originX, p.y - p.originY));

      if (input.current.phase === "mooncake") {
        if (contacts.current.size === 1) {
          input.current.cakeDragDeltaX += deltaX;
          input.current.cakeDragDeltaY += deltaY;
          input.current.cakeVelocityY = clamp((deltaX / elapsed) * 0.08, -6, 6);
          input.current.cakeVelocityX = clamp((deltaY / elapsed) * 0.08, -6, 6);
        }
        return;
      }

      if (p.moved > 10) clearHold();
      if (contacts.current.size === 2 && pair.current) {
        const [a, b] = [...contacts.current.values()];
        const ratio = Math.hypot(b.x - a.x, b.y - a.y) / pair.current.distance;
        input.current.pinch = clamp(ratio, 0.45, 1.5);
        input.current.pressure = clamp(1 - ratio, 0, 1);
        input.current.rotation = pair.current.rotation + angleDelta(Math.atan2(b.y - a.y, b.x - a.x), pair.current.angle);
        changePhase("compressing");
        if (ratio < 0.58) transform();
      } else {
        input.current.x = clamp((p.x - p.originX) / rect.width, -0.7, 0.7);
        input.current.y = clamp((p.y - p.originY) / rect.height, -0.7, 0.7);
        if (p.moved > 10) changePhase("stretching");
        if (!multiTouch.current && (input.current.y >= 0.24 || (p.velocityY > 1.25 && p.y - p.originY > 65))) transform();
      }
    };
    const up = (event: PointerEvent) => {
      const p = contacts.current.get(event.pointerId);
      if (!p) return;
      contacts.current.delete(event.pointerId);
      try {
        if (el.hasPointerCapture(event.pointerId)) el.releasePointerCapture(event.pointerId);
      } catch {
        // Fallback
      }
      clearHold();
      pair.current = null;

      if (input.current.phase === "mooncake") {
        if (event.type === "pointerup" && p.moved < 12 && performance.now() - p.began < 400) {
          input.current.cakeSquish = 0.38;
          input.current.cakePulse = performance.now();
          playSquishSound();
        }
        if (performance.now() - p.lastTime > 80 || event.type !== "pointerup") {
          input.current.cakeVelocityX = input.current.cakeVelocityY = 0;
        }
        input.current.pressed = contacts.current.size > 0;
        return;
      }

      if (event.type === "pointerup" && !multiTouch.current && p.moved < 10 && performance.now() - p.began < 600 && !isLocked(input.current.phase)) {
        input.current.taps += 1;
        input.current.pulse = performance.now();
        playTapSound();
        if (input.current.taps >= 5) transform();
      }
      if (!contacts.current.size) release();
      else {
        const remaining = [...contacts.current.values()][0];
        remaining.originX = remaining.x; remaining.originY = remaining.y;
        input.current.x = input.current.y = 0;
        input.current.pinch = 1;
      }
    };
    const wheel = (event: WheelEvent) => {
      if (isLocked(input.current.phase)) return;
      event.preventDefault();
      setEngaged(true);
      const pixels = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? el.clientHeight : 1);
      if (input.current.phase === "mooncake") {
        input.current.cakeZoom = clamp(input.current.cakeZoom - pixels * 0.001, 0.65, 1.75);
        return;
      }
      input.current.pressure = clamp(input.current.pressure - pixels * 0.0015, -0.35, 1);
      changePhase("compressing");
      if (input.current.pressure >= 0.8) transform();
    };
    const cancel = () => { clearContacts(); release(); };
    const visibility = () => { if (document.hidden) cancel(); };
    const leave = () => { input.current.hoverX = input.current.hoverY = 0; };
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    el.addEventListener("lostpointercapture", up);
    el.addEventListener("pointerleave", leave);
    el.addEventListener("wheel", wheel, { passive: false });
    window.addEventListener("blur", cancel);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
      el.removeEventListener("lostpointercapture", up);
      el.removeEventListener("pointerleave", leave);
      el.removeEventListener("wheel", wheel);
      window.removeEventListener("blur", cancel);
      document.removeEventListener("visibilitychange", visibility);
      cancel();
    };
  }, [ready, changePhase, clearHold, clearContacts, transform]);

  useEffect(() => () => {
    clearHold();
    if (finishTimer.current) clearTimeout(finishTimer.current);
  }, [clearHold]);

  return { surface, input, phase, engaged, ready, currentCake, newDiscovery, discovered, markReady, transform, reset, selectCake };
}
