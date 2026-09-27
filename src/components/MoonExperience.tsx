"use client";

import dynamic from "next/dynamic";
import { Component, useCallback, useEffect, useState, type ReactNode } from "react";
import { useMoonInteraction } from "@/hooks/useMoonInteraction";
import { MOONCAKES } from "@/lib/mooncakes";
import { isAudioMuted, toggleAudioMuted, playSquishSound } from "@/lib/sound";
import {
  IconHandPointer,
  IconVolumeOn,
  IconVolumeMute,
  IconConcentricMoon,
  IconArrowUpRight,
  IconHelp,
  IconClose,
  IconRotate3D,
  IconZoomIn,
  IconTouchSpring,
} from "./Icons";

const MoonScene = dynamic(() => import("./MoonScene"), { ssr: false });

class SceneBoundary extends Component<{ children: ReactNode; onError: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onError(); }
  render() { return this.state.failed ? null : this.props.children; }
}

export default function MoonExperience() {
  const moon = useMoonInteraction();
  const [reducedMotion, setReducedMotion] = useState(false);
  const [failed, setFailed] = useState(false);
  const [supported, setSupported] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [hintExpired, setHintExpired] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const fail = useCallback(() => setFailed(true), []);
  const done = moon.phase === "mooncake";
  const transforming = moon.phase === "transforming";
  const currentCake = MOONCAKES.find((cake) => cake.id === moon.currentCake) || MOONCAKES[0];

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(query.matches);
    update();
    query.addEventListener("change", update);
    const canvas = document.createElement("canvas");
    try {
      const context = canvas.getContext("webgl2");
      if (context) { setSupported(true); context.getExtension("WEBGL_lose_context")?.loseContext(); }
      else setFailed(true);
    } catch { setFailed(true); }
    return () => query.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!moon.ready) return;
    setHintExpired(false);
    const timeout = setTimeout(() => setHintExpired(true), 3500);
    return () => clearTimeout(timeout);
  }, [moon.ready, moon.engaged]);

  const toggleSound = () => {
    const nextMuted = toggleAudioMuted();
    setSoundEnabled(!nextMuted);
  };

  const hintVisible = !moon.engaged;

  return (
    <main className={`experience ${moon.engaged ? "is-engaged" : ""} ${transforming ? "is-transforming" : ""} ${done ? "is-done" : ""}`}>
      <div className="starfield" aria-hidden="true" />
      {/* Top-Left Box: Chinese & English Calligraphy Title Card */}
      <aside className="festival-seal-box" aria-label="将月亮变成一块月饼 TURN THE MOON INTO A MOONCAKE">
        <div className="seal-chinese">
          <span className="seal-cn-line">将月亮</span>
          <span className="seal-cn-line">变成一块月饼</span>
        </div>
        <div className="seal-english">
          <span>TURN</span>
          <span>THE MOON</span>
          <span>INTO A</span>
          <span>MOONCAKE</span>
        </div>
      </aside>

      {/* Top-Center Box: Mid-Autumn Festival Banner */}
      <header className="festival-header-badge" aria-label="MID-AUTUMN FESTIVAL 中秋快乐">
        <div className="festival-title">MID-AUTUMN FESTIVAL</div>
        <div className="festival-subtitle-wrap">
          <span className="festive-line festive-line-left" aria-hidden="true" />
          <span className="festival-subtitle-text">中秋快乐</span>
          <span className="festive-line festive-line-right" aria-hidden="true" />
        </div>
        <div className="festival-mobile-motto">将月亮变成一块月饼</div>
      </header>

      {/* Top-Right Poetic Tagline */}
      <div className="festival-tagline" aria-hidden="true">
        <span>A SMALL</span>
        <span>INTERACTION</span>
        <span>A WARMER</span>
        <span>WORLD</span>
      </div>

      <div
        ref={moon.surface}
        className={`moon-stage ${moon.ready ? "is-ready" : ""} ${["touching", "stretching", "charging", "compressing"].includes(moon.phase) ? "is-grabbing" : ""}`}
        role="button"
        tabIndex={failed || !moon.ready || transforming ? -1 : 0}
        aria-label={done ? "3D mooncake. Drag or use arrow keys to rotate, scroll to resize, and tap to squish." : "Interactive moon. Drag downward to make a mooncake, or pinch, tap five times, hold for three seconds, or press Enter."}
        aria-disabled={!moon.ready || transforming}
        aria-describedby="moon-instructions"
        onKeyDown={(event) => {
          if (!moon.ready || transforming) return;
          if (done && ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) {
            event.preventDefault();
            if (event.key === "ArrowLeft") moon.input.current.cakeDragDeltaX -= 36;
            if (event.key === "ArrowRight") moon.input.current.cakeDragDeltaX += 36;
            if (event.key === "ArrowUp") moon.input.current.cakeDragDeltaY -= 36;
            if (event.key === "ArrowDown") moon.input.current.cakeDragDeltaY += 36;
            return;
          }
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            if (done) {
              moon.input.current.cakeSquish = 0.35;
              moon.input.current.cakePulse = performance.now();
              playSquishSound();
            } else {
              moon.transform();
            }
          }
        }}
        onContextMenu={(event) => event.preventDefault()}
      >
        {!failed && supported && (
          <SceneBoundary onError={fail}>
            <MoonScene input={moon.input} variant={moon.currentCake} reducedMotion={reducedMotion} onReady={moon.markReady} onError={fail} />
          </SceneBoundary>
        )}
      </div>

      {!failed && !moon.ready && (
        <p className="loading" role="status">
          BRINGING THE MOON CLOSER<span aria-hidden="true">...</span>
        </p>
      )}

      {failed && (
        <section className="fallback" aria-label="Static mooncake preview">
          <img src="/images/mooncake.png" width="1254" height="1254" alt="Golden mooncake with NoBug embossed on its surface" />
          <h2>The moon is hiding from this browser.</h2>
          <p>But we saved you a mooncake. 中秋快乐。</p>
          <button onClick={() => window.location.reload()}>Try again</button>
        </section>
      )}

      {!failed && moon.ready && (
        <div className={`scene-caption ${done ? "has-result" : ""}`}>
          {done ? (
            <section className="result" aria-label="Your mooncake">
              <div className="cake-poem" key={currentCake.id}>
                <div className="cake-headline">
                  {currentCake.english}
                  {moon.newDiscovery && <span className="new-discovery">新发现</span>}
                </div>
                <div className="poem-lines" aria-label={`${currentCake.name}。${currentCake.flavor}。${currentCake.wish}`}>
                  {[
                    { className: "cake-subheadline", text: currentCake.name, offset: 0 },
                    { className: "cake-flavor", text: currentCake.flavor, offset: currentCake.name.length },
                    { className: "blessing", text: currentCake.wish, offset: currentCake.name.length + currentCake.flavor.length },
                  ].map((line) => (
                    <p className={line.className} aria-hidden="true" key={line.className}>
                      {Array.from(line.text).map((char, index) => (
                        <span className="poem-char" style={{ animationDelay: `${(line.offset + index) * 0.15}s` }} key={index}>{char}</span>
                      ))}
                    </p>
                  ))}
                </div>
              </div>
              <div className="result-controls">
                <div className="collection" aria-label={`已收集 ${moon.discovered.length} / ${MOONCAKES.length} 款月饼`}>
                  <span className="collection-label">月饼图鉴 {moon.discovered.length}/{MOONCAKES.length}</span>
                  <div className="collection-stamps">
                    {MOONCAKES.map((cake) => (
                      <button
                        key={cake.id}
                        type="button"
                        className={`collection-stamp ${moon.discovered.includes(cake.id) ? "is-found" : ""} ${cake.id === moon.currentCake ? "is-current" : ""}`}
                        disabled={!moon.discovered.includes(cake.id)}
                        aria-label={moon.discovered.includes(cake.id) ? `查看${cake.name}` : `${cake.name}未解锁`}
                        aria-pressed={cake.id === moon.currentCake}
                        onClick={() => moon.selectCake(cake.id)}
                        title={cake.name}
                      >
                        {moon.discovered.includes(cake.id) ? cake.name : "未解锁"}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="cake-inspect-tips">
                  <span className="tip-badge">
                    <IconRotate3D size={12} className="badge-icon" />
                    <span>360° 自由旋转</span>
                  </span>
                  <span className="tip-badge">
                    <IconZoomIn size={12} className="badge-icon" />
                    <span>滚轮缩放</span>
                  </span>
                  <span className="tip-badge">
                    <IconTouchSpring size={12} className="badge-icon" />
                    <span>轻触回弹</span>
                  </span>
                </div>
                <button
                  className="reset"
                  onClick={() => {
                    moon.reset();
                    setHintExpired(false);
                    requestAnimationFrame(() => moon.surface.current?.focus({ preventScroll: true }));
                  }}
                >
                  <span>再抓一轮 · 解锁下一款</span>
                  <IconArrowUpRight size={13} className="reset-icon" />
                </button>
              </div>
            </section>
          ) : transforming ? (
            <div className="transformation-box">
              <p className="transformation-label">ALCHIMIA LUNAE • 月华凝饼</p>
              <p className="transformation-sub">TURNING THE MOON INTO A MOONCAKE...</p>
            </div>
          ) : (
            <div className={`hero-banner ${moon.engaged ? "is-faded" : ""}`}>
              <h1 className="hero-title">
                THE MOON IS TOO FAR.<br />
                SO I MADE ONE.
              </h1>
              <button
                className={`grab-pill ${hintVisible ? "is-visible" : ""}`}
                onClick={() => moon.transform()}
                aria-label="Grab the moon and make a mooncake"
              >
                <span className="grab-icon" aria-hidden="true">
                  <IconHandPointer size={16} />
                </span>
                <span className="grab-label">
                  <span className="desktop-copy">GRAB THE MOON</span>
                  <span className="touch-copy">TOUCH THE MOON</span>
                </span>
              </button>
              <p className="hint-desc">
                <span className="desktop-copy">向下拖拽月亮 • 捏合或滚轮压缩 • 长按 3 秒蓄力</span>
                <span className="touch-copy">单指下拉 • 双指捏合 • 触碰月华</span>
              </p>
              <p className="blindbox-hint">六款月饼盲盒 · 每轮不重复</p>
            </div>
          )}
        </div>
      )}

      <footer className="footer">
        <div className="footer-left">
          <button className="sound-toggle" aria-label={soundEnabled ? "Mute audio" : "Enable audio"} onClick={toggleSound}>
            <span className="toggle-icon" aria-hidden="true">
              {soundEnabled ? <IconVolumeOn size={14} /> : <IconVolumeMute size={14} />}
            </span>
            <span>{soundEnabled ? "Sound On" : "Sound Off"}</span>
          </button>
        </div>

        <div className="festival-bottom-bar" aria-label="Same moon, different ways, brighter together">
          <span className="slogan-segment">SAME MOON</span>
          <span className="slogan-dot" aria-hidden="true">•</span>
          <span className="slogan-segment">DIFFERENT WAYS</span>
          <span className="slogan-icon" aria-hidden="true">
            <IconConcentricMoon size={14} />
          </span>
          <span className="slogan-segment">BRIGHTER TOGETHER</span>
        </div>

        <div className="footer-right">
          {!failed && (
            <button className="help-toggle" aria-expanded={showHelp} aria-controls="help-panel" onClick={() => setShowHelp(!showHelp)}>
              <span className="toggle-icon" aria-hidden="true">
                {showHelp ? <IconClose size={13} /> : <IconHelp size={13} />}
              </span>
              <span>{showHelp ? "Close" : "How to play"}</span>
            </button>
          )}
        </div>
      </footer>

      {showHelp && (
        <aside id="help-panel" className="help-panel">
          <h2>A moon with a softer side.</h2>
          <p>Pull the moon downward to turn it into a mooncake. Release early to let it bounce back.</p>
          <p>You can also pinch with two fingers, tap five times, hold for 3 seconds, or scroll up.</p>
          <p>Keyboard: focus the moon, then press Enter or Space.</p>
          <p>After transformation: Drag or use arrow keys to rotate the mooncake. Scroll over it to resize. Tap to squish.</p>
          <p className="credits">Moon texture: <a href="https://www.solarsystemscope.com/textures/" target="_blank" rel="noreferrer">Solar System Scope</a>, <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">CC BY 4.0</a>. Mooncake crafted with 3D procedural relief.</p>
        </aside>
      )}

      <p id="moon-instructions" className="sr-only">Pull the moon downward to transform it. You can also pinch, tap five times, hold for three seconds, or press Enter. After transformation, drag or use arrow keys to rotate, or scroll to resize the mooncake. Use One more moon to restart.</p>
      <p className="sr-only" role="status" aria-live="polite">
        {done ? "Your 3D mooncake is ready. Happy Mid-Autumn Festival!" : transforming ? "Turning the moon into a mooncake." : ""}
      </p>
      <noscript>This experiment needs JavaScript. Happy Mid-Autumn Festival!</noscript>
    </main>
  );
}
