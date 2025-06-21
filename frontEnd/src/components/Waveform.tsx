import React, { useEffect, useRef } from "react";
import WaveSurfer from "wavesurfer.js";

const PX_PER_SEC = 120;

interface Props {
  url: string;
  isPlaying: boolean;
  currentTime: () => number; // mixer clock
  onScrub: (absSeconds: number) => void;
}

const Waveform: React.FC<Props> = ({
  url,
  isPlaying,
  currentTime,
  onScrub,
}) => {
  const outerRef = useRef<HTMLDivElement>(null); // viewport
  const innerRef = useRef<HTMLDivElement>(null); // canvas
  const wsRef = useRef<WaveSurfer | null>(null);
  const rafId = useRef<number | null>(null);

  /* hold latest props in refs (no re-build needed) */
  const playRef = useRef(isPlaying);
  const timeRef = useRef(currentTime);
  const scrubRef = useRef(onScrub);
  useEffect(() => {
    playRef.current = isPlaying;
  }, [isPlaying]);
  useEffect(() => {
    timeRef.current = currentTime;
  }, [currentTime]);
  useEffect(() => {
    scrubRef.current = onScrub;
  }, [onScrub]);

  /* drag bookkeeping */
  const dragging = useRef(false);
  const dragStartX = useRef(0);
  const dragStartSec = useRef(0);

  /* ─── build WaveSurfer when URL changes ─── */
  useEffect(() => {
    const canvas = innerRef.current;
    if (!canvas) return;

    wsRef.current?.destroy();

    const ws = WaveSurfer.create({
      container: canvas,
      height: 120,
      barWidth: 2,
      barGap: 2,
      waveColor: "#666",
      progressColor: "#f60",
      cursorWidth: 0,
      hideScrollbar: true,
      minPxPerSec: PX_PER_SEC,
    });

    ws.load(url);
    ws.on("ready", () => {
      const totalPx = ws.getDuration() * PX_PER_SEC;
      (innerRef.current as HTMLElement).style.width = `${totalPx}px`;
    });

    /* pointer handlers (stable, they close over refs) */
    const down = (e: PointerEvent) => {
      if (playRef.current) return;
      dragging.current = true;
      dragStartX.current = e.clientX;
      dragStartSec.current = timeRef.current();
      outerRef.current?.setPointerCapture(e.pointerId);
    };
    const move = (e: PointerEvent) => {
      if (!dragging.current || playRef.current) return;
      const dx = e.clientX - dragStartX.current;
      const next = Math.max(dragStartSec.current - dx / PX_PER_SEC, 0);
      scrubRef.current(next);
    };
    const end = () => (dragging.current = false);

    outerRef.current?.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);

    wsRef.current = ws;
    return () => {
      ws.destroy();
      outerRef.current?.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
    };
  }, [url]); // ← only URL rebuilds WaveSurfer

  /* ─── animation-frame loop ─── */
  useEffect(() => {
    const step = () => {
      const ws = wsRef.current;
      const outer = outerRef.current;
      const inner = innerRef.current;
      if (ws && outer && inner && ws.getDuration()) {
        const t = timeRef.current();
        ws.seekTo(t / ws.getDuration());

        const offset = -t * PX_PER_SEC + outer.clientWidth / 2;
        const maxNeg = outer.clientWidth - inner.scrollWidth;
        inner.style.transform = `translateX(${Math.max(maxNeg, offset)}px)`;
      }
      rafId.current = requestAnimationFrame(step);
    };
    rafId.current = requestAnimationFrame(step);
    return () => {
      if (rafId.current !== null) cancelAnimationFrame(rafId.current);
    };
  }, []); // ← runs once

  /* ─── markup ─── */
  return (
    <div className="waveform-container" ref={outerRef}>
      <div className="waveform-inner" ref={innerRef} />
      <div className="playhead-line" />
    </div>
  );
};

export default Waveform;
