'use strict';

// ── PARTICLE SYSTEM ──────────────────────────
const Particles = (() => {
  let canvas, ctx, particles = [], raf;

  function init() {
    canvas = document.getElementById('particle-canvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    resize();
    spawnParticles(40);
    loop();
    window.addEventListener('resize', resize);
  }

  function resize() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  function spawnParticles(n) {
    for (let i = 0; i < n; i++) {
      particles.push(createParticle(true));
    }
  }

  function createParticle(random = false) {
    const size = Math.random() * 2.5 + 0.5;
    const blueVariants = ['rgba(59,158,255,', 'rgba(0,112,209,', 'rgba(255,255,255,'];
    const color = blueVariants[Math.floor(Math.random() * blueVariants.length)];
    return {
      x: Math.random() * canvas.width,
      y: random ? Math.random() * canvas.height : canvas.height + 10,
      size,
      speedX: (Math.random() - 0.5) * 0.4,
      speedY: -(Math.random() * 0.5 + 0.2),
      opacity: Math.random() * 0.6 + 0.1,
      maxOpacity: Math.random() * 0.6 + 0.1,
      color,
      life: 0,
      maxLife: Math.random() * 300 + 200,
      pulse: Math.random() * Math.PI * 2,
    };
  }

  function loop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    particles.forEach((p, i) => {
      p.life++;
      p.x += p.speedX;
      p.y += p.speedY;
      p.pulse += 0.02;

      const lifeRatio = p.life / p.maxLife;
      const fade = lifeRatio < 0.1 ? lifeRatio * 10 : lifeRatio > 0.8 ? (1 - lifeRatio) * 5 : 1;
      const currentOpacity = p.maxOpacity * fade * (0.8 + 0.2 * Math.sin(p.pulse));

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = p.color + currentOpacity + ')';
      ctx.fill();

      // Glow
      if (p.size > 1.5) {
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 4);
        grad.addColorStop(0, p.color + (currentOpacity * 0.4) + ')');
        grad.addColorStop(1, p.color + '0)');
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 4, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
      }

      if (p.life >= p.maxLife) particles[i] = createParticle();
    });

    raf = requestAnimationFrame(loop);
  }

  return { init };
})();

// ── RIPPLE EFFECT on tile click ──────────────
function addRipple(tile) {
  const ripple = document.createElement('span');
  ripple.className = 'ripple';
  const size = tile.offsetWidth;
  ripple.style.cssText = `width:${size}px;height:${size}px;left:0;top:0;margin-left:0;margin-top:0`;
  tile.appendChild(ripple);
  setTimeout(() => ripple.remove(), 500);
}

// ── TILE FLASH with glow ─────────────────────
function flashTileVFX(id) {
  const t = document.getElementById('tile-' + id);
  if (!t) return;
  t.classList.add('tile-glow');
  addRipple(t);
  setTimeout(() => t.classList.remove('tile-glow'), 350);
}

// ── SCREEN TRANSITION ────────────────────────
function showWithTransition(id) {
  const current = document.querySelector('.screen.active');
  const next = document.getElementById(id);
  if (current === next) return;
  if (current) current.classList.remove('active');
  next.classList.add('active');
}

// ── COIN BURST animation ─────────────────────
function coinBurst(x, y, amount) {
  const el = document.createElement('div');
  el.textContent = '+' + amount + ' ◈';
  el.style.cssText = `
    position:fixed;left:${x}px;top:${y}px;
    font-family:'Rajdhani',sans-serif;font-size:16px;font-weight:700;
    color:var(--ps-coin);pointer-events:none;z-index:9999;
    text-shadow:0 0 10px rgba(59,158,255,0.8);
    animation:coinFloat .8s ease forwards;
  `;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 800);
}
// Inject keyframe once
const coinKF = document.createElement('style');
coinKF.textContent = '@keyframes coinFloat{0%{transform:translateY(0);opacity:1}100%{transform:translateY(-60px);opacity:0}}';
document.head.appendChild(coinKF);

// ── TOAST ────────────────────────────────────
function showToast(msg) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => {
    t.style.animation = 'toastIn .3s reverse ease forwards';
    setTimeout(() => t.remove(), 300);
  }, 2200);
}

// Init on load
document.addEventListener('DOMContentLoaded', () => Particles.init());

window.Particles = Particles;
window.addRipple = addRipple;
window.flashTileVFX = flashTileVFX;
window.showWithTransition = showWithTransition;
window.coinBurst = coinBurst;
window.showToast = showToast;
