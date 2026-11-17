/** The wheel's colours, shared with the confetti it throws. */
export const COLOURS = [
  "#f6c453",
  "#f28b66",
  "#8fc9a8",
  "#8eb8e8",
  "#c9a3e6",
  "#f2a3bf",
];

/**
 * Throws a burst of paper from a point on the page, on a canvas that covers
 * the window, takes no clicks and removes itself when the last piece lands.
 */
export function confetti(x: number, y: number) {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) return;
  const scale = window.devicePixelRatio || 1;
  const width = window.innerWidth;
  const height = window.innerHeight;
  canvas.width = width * scale;
  canvas.height = height * scale;
  canvas.style.cssText =
    "position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:50";
  canvas.setAttribute("aria-hidden", "true");
  document.body.appendChild(canvas);
  context.scale(scale, scale);

  const pieces = Array.from({ length: 160 }, (_, index) => {
    const angle = Math.random() * Math.PI * 2;
    const speed = 4 + Math.random() * 11;
    return {
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 7,
      size: 6 + Math.random() * 6,
      turn: Math.random() * Math.PI,
      spin: (Math.random() - 0.5) * 0.4,
      colour: COLOURS[index % COLOURS.length],
    };
  });

  const started = performance.now();
  const LIFE = 3200;
  let last = started;
  function frame(now: number) {
    // Paced by the clock, so it falls at the same speed on any display.
    const step = Math.min(3, (now - last) / 16.7);
    last = now;
    const age = now - started;
    context!.clearRect(0, 0, width, height);
    context!.globalAlpha = Math.max(0, 1 - Math.max(0, age - LIFE + 800) / 800);
    for (const piece of pieces) {
      piece.vy += 0.32 * step;
      piece.vx *= 0.99 ** step;
      piece.x += piece.vx * step;
      piece.y += piece.vy * step;
      piece.turn += piece.spin * step;
      context!.save();
      context!.translate(piece.x, piece.y);
      context!.rotate(piece.turn);
      context!.fillStyle = piece.colour;
      // Narrowing with the turn makes a flat piece look like it tumbles.
      context!.fillRect(
        -piece.size / 2,
        (-piece.size / 2) * Math.cos(piece.turn * 2),
        piece.size,
        piece.size * Math.cos(piece.turn * 2) * 0.6,
      );
      context!.restore();
    }
    if (age < LIFE) requestAnimationFrame(frame);
    else canvas.remove();
  }
  requestAnimationFrame(frame);
}
