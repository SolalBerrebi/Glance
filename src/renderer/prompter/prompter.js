const container = document.getElementById('prompter-container');
const scrollWrapper = document.getElementById('scroll-wrapper');
const scrollContent = document.getElementById('scroll-content');
const countdownOverlay = document.getElementById('countdown-overlay');
const countdownNumber = document.getElementById('countdown-number');
const iconPlay = document.getElementById('icon-play');
const iconPause = document.getElementById('icon-pause');

let lines = [];
let scrollPos = 0;
let scrollSpeed = 1.0;
let isPlaying = false;
let animFrameId = null;
let lastTime = 0;
let settings = {};
let currentLineIndex = 0;

function applySettings(s) {
  settings = s;
  container.style.background = `rgba(0, 0, 0, ${s.bgOpacity || 0.85})`;
  scrollContent.style.padding = `${s.padding || 20}px`;

  if (s.mirror) {
    container.classList.add('mirror');
  } else {
    container.classList.remove('mirror');
  }

  // Update all lines
  document.querySelectorAll('.line').forEach(el => {
    el.style.fontSize = (s.fontSize || 32) + 'px';
    el.style.color = s.textColor || '#FFFFFF';
    el.style.fontWeight = s.fontWeight || 'bold';
    el.style.lineHeight = s.lineSpacing || 1.6;
  });

  scrollSpeed = s.scrollSpeed || 1.0;
}

function renderContent(content) {
  scrollContent.innerHTML = '';
  if (!content) return;

  // Split by paragraphs/lines
  const rawLines = content.split('\n');
  lines = [];

  rawLines.forEach((text, i) => {
    const div = document.createElement('div');
    div.className = 'line upcoming';
    div.textContent = text || '\u00A0'; // Non-breaking space for empty lines
    div.style.fontSize = (settings.fontSize || 32) + 'px';
    div.style.color = settings.textColor || '#FFFFFF';
    div.style.fontWeight = settings.fontWeight || 'bold';
    div.style.lineHeight = settings.lineSpacing || 1.6;
    scrollContent.appendChild(div);
    lines.push(div);
  });

  // Add spacer at end so last lines can scroll to top
  const spacer = document.createElement('div');
  spacer.style.height = scrollWrapper.offsetHeight + 'px';
  scrollContent.appendChild(spacer);

  scrollPos = 0;
  currentLineIndex = 0;
  scrollContent.style.transform = `translateY(0px)`;
  updateLineStates();
}

function updateLineStates() {
  const wrapperRect = scrollWrapper.getBoundingClientRect();
  const midY = wrapperRect.top + wrapperRect.height * 0.35;

  let closestIdx = 0;
  let closestDist = Infinity;

  lines.forEach((el, i) => {
    const rect = el.getBoundingClientRect();
    const elMid = rect.top + rect.height / 2;
    const dist = Math.abs(elMid - midY);
    if (dist < closestDist) {
      closestDist = dist;
      closestIdx = i;
    }
  });

  currentLineIndex = closestIdx;

  lines.forEach((el, i) => {
    el.classList.remove('read', 'current', 'upcoming');
    if (i < closestIdx) {
      el.classList.add('read');
    } else if (i === closestIdx) {
      el.classList.add('current');
    } else {
      el.classList.add('upcoming');
    }
  });
}

function scrollLoop(timestamp) {
  if (!isPlaying) return;

  if (!lastTime) lastTime = timestamp;
  const delta = timestamp - lastTime;
  lastTime = timestamp;

  // Pixels per frame: speed * base rate * delta
  const pixelsPerSecond = scrollSpeed * 40;
  const move = (pixelsPerSecond * delta) / 1000;
  scrollPos += move;

  // Max scroll
  const maxScroll = scrollContent.scrollHeight - scrollWrapper.offsetHeight;
  if (scrollPos >= maxScroll) {
    scrollPos = maxScroll;
    pause();
  }

  scrollContent.style.transform = `translateY(${-scrollPos}px)`;
  updateLineStates();

  animFrameId = requestAnimationFrame(scrollLoop);
}

function play() {
  if (isPlaying) return;
  isPlaying = true;
  lastTime = 0;
  iconPlay.style.display = 'none';
  iconPause.style.display = 'block';
  animFrameId = requestAnimationFrame(scrollLoop);
  window.api.notifyMain({ type: 'playing-state', playing: true });
}

function pause() {
  isPlaying = false;
  if (animFrameId) cancelAnimationFrame(animFrameId);
  animFrameId = null;
  iconPlay.style.display = 'block';
  iconPause.style.display = 'none';
  window.api.notifyMain({ type: 'playing-state', playing: false });
}

function toggle() {
  if (isPlaying) pause();
  else play();
}

function reset() {
  pause();
  scrollPos = 0;
  scrollContent.style.transform = `translateY(0px)`;
  currentLineIndex = 0;
  updateLineStates();
}

function startCountdown(duration) {
  reset();
  countdownOverlay.style.display = 'flex';
  let count = duration;
  countdownNumber.textContent = count;

  const interval = setInterval(() => {
    count--;
    if (count <= 0) {
      clearInterval(interval);
      countdownOverlay.style.display = 'none';
      play();
    } else {
      countdownNumber.textContent = count;
    }
  }, 1000);
}

// Controls
document.getElementById('btn-play-pause').addEventListener('click', toggle);
document.getElementById('btn-close').addEventListener('click', () => {
  window.api.notifyMain({ type: 'closed' });
  window.close();
});

// Manual scroll with mouse wheel
scrollWrapper.addEventListener('wheel', (e) => {
  e.preventDefault();
  scrollPos += e.deltaY;
  scrollPos = Math.max(0, scrollPos);
  const maxScroll = scrollContent.scrollHeight - scrollWrapper.offsetHeight;
  scrollPos = Math.min(scrollPos, maxScroll);
  scrollContent.style.transform = `translateY(${-scrollPos}px)`;
  updateLineStates();
}, { passive: false });

// Keyboard shortcuts in prompter window
document.addEventListener('keydown', (e) => {
  if (e.code === 'Space') {
    e.preventDefault();
    toggle();
  }
  if (e.key === 'ArrowUp') {
    e.preventDefault();
    scrollSpeed = Math.min(5, +(scrollSpeed + 0.1).toFixed(1));
  }
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    scrollSpeed = Math.max(0.1, +(scrollSpeed - 0.1).toFixed(1));
  }
  if (e.metaKey && e.key === 'r') {
    e.preventDefault();
    reset();
  }
  if (e.metaKey && e.key === 'p' && !e.shiftKey) {
    e.preventDefault();
    toggle();
  }
});

// IPC listeners
window.api.onPrompterData((data) => {
  if (data.type === 'script') {
    if (data.settings) applySettings(data.settings);
    renderContent(data.content);
  }
});

window.api.onPrompterControl((action) => {
  switch (action.type) {
    case 'toggle': toggle(); break;
    case 'play': play(); break;
    case 'pause': pause(); break;
    case 'reset': reset(); break;
    case 'speed': scrollSpeed = action.value; break;
    case 'start-countdown': startCountdown(action.duration || 3); break;
  }
});

window.api.onSettingsUpdated((s) => {
  applySettings(s);
});

// Load initial settings
(async () => {
  settings = await window.api.getSettings();
  applySettings(settings);
})();
