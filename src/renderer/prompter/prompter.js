const container = document.getElementById('prompter-container');
const scrollWrapper = document.getElementById('scroll-wrapper');
const scrollContent = document.getElementById('scroll-content');
const countdownOverlay = document.getElementById('countdown-overlay');
const countdownNumber = document.getElementById('countdown-number');
const iconPlay = document.getElementById('icon-play');
const iconPause = document.getElementById('icon-pause');

let lines = [];
let allWordSpans = [];
let scrollPos = 0;
let scrollSpeed = 1.0;
let isPlaying = false;
let animFrameId = null;
let lastTime = 0;
let settings = {};
let currentLineIndex = 0;
let voiceFollower = null;
let lastWordHighlightIdx = -1;

// ===== Helpers =====

function applyScrollTransform() {
  const mirror = container.classList.contains('mirror') ? ' scaleX(-1)' : '';
  scrollContent.style.transform = `translateY(${-scrollPos}px)${mirror}`;
}

// ===== Settings =====

function applySettings(s) {
  settings = s;
  container.style.background = `rgba(0, 0, 0, ${s.bgOpacity || 0.85})`;
  scrollContent.style.padding = `${s.padding || 20}px`;

  if (s.mirror) {
    container.classList.add('mirror');
  } else {
    container.classList.remove('mirror');
  }

  document.querySelectorAll('.line').forEach(el => {
    el.style.fontSize = (s.fontSize || 32) + 'px';
    el.style.color = s.textColor || '#FFFFFF';
    el.style.fontWeight = s.fontWeight || 'bold';
    el.style.lineHeight = s.lineSpacing || 1.6;
  });

  scrollSpeed = s.scrollSpeed || 1.0;
  applyScrollTransform();

  // Voice follow
  const voiceIndicator = document.getElementById('voice-indicator');
  if (s.voiceFollow && s.groqApiKey && !voiceFollower) {
    voiceFollower = new VoiceFollower(s.groqApiKey);
    if (lines.length > 0) voiceFollower.start();
    if (voiceIndicator) voiceIndicator.style.display = 'flex';
    container.classList.add('voice-active');
  } else if ((!s.voiceFollow || !s.groqApiKey) && voiceFollower) {
    voiceFollower.stop();
    voiceFollower = null;
    if (voiceIndicator) voiceIndicator.style.display = 'none';
    clearWordHighlight();
    updateLineStates();
    container.classList.remove('voice-active');
  }
}

// ===== Content Rendering (word-level spans) =====

function renderContent(content) {
  scrollContent.innerHTML = '';
  allWordSpans = [];
  lastWordHighlightIdx = -1;
  if (!content) return;

  const rawLines = content.split('\n');
  lines = [];

  rawLines.forEach((text) => {
    const div = document.createElement('div');
    div.className = 'line upcoming';
    div.style.fontSize = (settings.fontSize || 32) + 'px';
    div.style.color = settings.textColor || '#FFFFFF';
    div.style.fontWeight = settings.fontWeight || 'bold';
    div.style.lineHeight = settings.lineSpacing || 1.6;

    const trimmed = text.trim();
    if (!trimmed) {
      div.innerHTML = '\u00A0';
    } else {
      const words = trimmed.split(/\s+/);
      words.forEach((word, j) => {
        if (j > 0) div.appendChild(document.createTextNode(' '));
        const span = document.createElement('span');
        span.className = 'word';
        span.textContent = word;
        div.appendChild(span);
        allWordSpans.push(span);
      });
    }

    scrollContent.appendChild(div);
    lines.push(div);
  });

  // Spacer so last lines can scroll to top
  const spacer = document.createElement('div');
  spacer.style.height = scrollWrapper.offsetHeight + 'px';
  scrollContent.appendChild(spacer);

  scrollPos = 0;
  currentLineIndex = 0;
  applyScrollTransform();
  updateLineStates();

  if (voiceFollower) {
    voiceFollower.buildWordMap();
    if (!voiceFollower.isListening) voiceFollower.start();
  }
}

// ===== Line-level states (non-voice scroll mode) =====

function updateLineStates() {
  const wrapperRect = scrollWrapper.getBoundingClientRect();
  const midY = wrapperRect.top + wrapperRect.height * 0.5;

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
    if (i < closestIdx) el.classList.add('read');
    else if (i === closestIdx) el.classList.add('current');
    else el.classList.add('upcoming');
  });
}

// ===== Word-level highlighting (voice follow mode) =====

function updateWordHighlight(cursorIdx) {
  if (allWordSpans.length === 0) return;
  cursorIdx = Math.max(0, Math.min(cursorIdx, allWordSpans.length - 1));
  if (cursorIdx === lastWordHighlightIdx) return;

  const prevIdx = lastWordHighlightIdx;
  lastWordHighlightIdx = cursorIdx;

  if (prevIdx < 0) {
    // First call — initialize all words
    for (let i = 0; i < allWordSpans.length; i++) {
      const span = allWordSpans[i];
      if (i < cursorIdx) span.className = 'word word-read';
      else if (i === cursorIdx) span.className = 'word word-active';
      else span.className = 'word word-upcoming';
    }
  } else {
    // Incremental update — only changed range
    const lo = Math.max(0, Math.min(prevIdx, cursorIdx));
    const hi = Math.min(allWordSpans.length - 1, Math.max(prevIdx, cursorIdx));
    for (let i = lo; i <= hi; i++) {
      const span = allWordSpans[i];
      if (i < cursorIdx) span.className = 'word word-read';
      else if (i === cursorIdx) span.className = 'word word-active';
      else span.className = 'word word-upcoming';
    }
  }

  // Clear line-level opacity classes — words drive opacity in voice mode
  lines.forEach(el => el.classList.remove('read', 'current', 'upcoming'));
}

function clearWordHighlight() {
  lastWordHighlightIdx = -1;
  allWordSpans.forEach(span => { span.className = 'word'; });
}

// ===== Fixed-speed scroll (non-voice mode) =====

function scrollLoop(timestamp) {
  if (!isPlaying) return;

  if (!lastTime) lastTime = timestamp;
  const delta = timestamp - lastTime;
  lastTime = timestamp;

  const pixelsPerSecond = scrollSpeed * 40;
  const move = (pixelsPerSecond * delta) / 1000;
  scrollPos += move;

  const maxScroll = scrollContent.scrollHeight - scrollWrapper.offsetHeight;
  if (scrollPos >= maxScroll) {
    scrollPos = maxScroll;
    pause();
  }

  applyScrollTransform();
  updateLineStates();

  animFrameId = requestAnimationFrame(scrollLoop);
}

// ===== Playback Controls =====

function play() {
  if (isPlaying) return;
  isPlaying = true;
  lastTime = 0;
  iconPlay.style.display = 'none';
  iconPause.style.display = 'block';
  if (!voiceFollower || !voiceFollower.isListening) {
    animFrameId = requestAnimationFrame(scrollLoop);
  }
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
  if (voiceFollower && voiceFollower.isListening) {
    voiceFollower.followPaused = !voiceFollower.followPaused;
    if (voiceFollower.followPaused) {
      iconPlay.style.display = 'block';
      iconPause.style.display = 'none';
    } else {
      iconPlay.style.display = 'none';
      iconPause.style.display = 'block';
    }
    return;
  }
  if (isPlaying) pause();
  else play();
}

function reset() {
  pause();
  scrollPos = 0;
  applyScrollTransform();
  currentLineIndex = 0;
  lastWordHighlightIdx = -1;

  if (voiceFollower) {
    voiceFollower.reset();
    updateWordHighlight(0);
  } else {
    updateLineStates();
  }
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

// ===== Voice Follow Mode (Groq Whisper + Adaptive VAD + Word-level Tracking) =====

class VoiceFollower {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.stream = null;
    this.audioContext = null;
    this.analyser = null;
    this.isListening = false;
    this.isSpeaking = false;
    this.hadSpeechInChunk = false;
    this.followPaused = false;

    // Prompt matching
    this.promptWords = [];
    this.cursor = 0;
    this.estimatedCursor = 0;
    this.MATCH_WINDOW = 50;

    // Reading speed estimation
    this.wordsPerSecond = 2.5; // ~150 WPM initial
    this.lastCursorUpdate = 0;

    // Scroll following
    this.targetScrollPos = 0;
    this.scrollAnimId = null;
    this.lastAdvanceTimestamp = 0;

    // Timing
    this.lastMatchTime = 0;
    this.lastSpeechTime = 0;
    this.CHUNK_DURATION = 2000; // 2s chunks (was 3s) — faster feedback

    // Adaptive VAD
    this.vadTimer = null;
    this.noiseFloor = 0.005;
  }

  buildWordMap() {
    this.promptWords = [];
    let spanIdx = 0;
    lines.forEach((el, lineIdx) => {
      const text = el.textContent.trim();
      if (!text || text === '\u00A0') return;
      text.split(/\s+/).forEach(word => {
        this.promptWords.push({
          word: this.normalize(word),
          original: word,
          lineIndex: lineIdx,
          lineEl: el,
          spanEl: allWordSpans[spanIdx] || null
        });
        spanIdx++;
      });
    });
  }

  normalize(w) {
    return w.toLowerCase().replace(/[^\w']/g, '').replace(/^'+|'+$/g, '');
  }

  async start() {
    if (!this.apiKey) return;

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
    } catch (e) {
      console.warn('Microphone access denied:', e.message);
      this.updateIndicator('silent');
      return;
    }

    this.buildWordMap();
    this.isListening = true;
    this.targetScrollPos = scrollPos;
    this.lastMatchTime = Date.now();
    this.lastSpeechTime = Date.now();
    this.lastCursorUpdate = Date.now();

    iconPlay.style.display = 'none';
    iconPause.style.display = 'block';

    this.setupVAD();
    this.startFollowLoop();
    this.recordLoop();
    this.updateIndicator('matching');
  }

  stop() {
    this.isListening = false;

    if (this.scrollAnimId) {
      cancelAnimationFrame(this.scrollAnimId);
      this.scrollAnimId = null;
    }

    if (this.vadTimer) {
      clearInterval(this.vadTimer);
      this.vadTimer = null;
    }

    if (this.audioContext) {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }

    if (this.stream) {
      this.stream.getTracks().forEach(t => t.stop());
      this.stream = null;
    }

    iconPlay.style.display = 'block';
    iconPause.style.display = 'none';

    this.updateIndicator(null);
  }

  // ---- Adaptive VAD with noise floor tracking ----

  setupVAD() {
    this.audioContext = new AudioContext();
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 512;
    const source = this.audioContext.createMediaStreamSource(this.stream);
    source.connect(this.analyser);

    const dataArray = new Float32Array(this.analyser.fftSize);

    this.vadTimer = setInterval(() => {
      this.analyser.getFloatTimeDomainData(dataArray);
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i] * dataArray[i];
      }
      const rms = Math.sqrt(sum / dataArray.length);

      // Adaptive noise floor — only update when not speaking
      if (!this.isSpeaking && rms < this.noiseFloor * 3) {
        this.noiseFloor = this.noiseFloor * 0.95 + rms * 0.05;
      }

      // Speech threshold is 3x noise floor, with safety minimum
      const threshold = Math.max(0.005, this.noiseFloor * 3);

      if (rms > threshold) {
        this.lastSpeechTime = Date.now();
        this.isSpeaking = true;
      } else {
        this.isSpeaking = false;
      }

      if (!this.isSpeaking && Date.now() - this.lastSpeechTime > 2000) {
        this.updateIndicator('silent');
      }
    }, 100); // 100ms polling (was 200ms) — faster speech detection
  }

  // ---- Critically-damped spring scroll following ----

  startFollowLoop() {
    this.lastAdvanceTimestamp = performance.now();
    this.followLoop(performance.now());
  }

  followLoop(timestamp) {
    if (!this.isListening) return;

    const elapsed = (timestamp - this.lastAdvanceTimestamp) / 1000;
    this.lastAdvanceTimestamp = timestamp;

    if (!this.followPaused && this.promptWords.length > 0) {
      const timeSinceMatch = Date.now() - this.lastMatchTime;

      // Advance estimated cursor while speaking and recently matched
      const shouldAdvance = this.isSpeaking
        && this.wordsPerSecond > 0
        && timeSinceMatch < 6000;

      if (shouldAdvance) {
        this.estimatedCursor += elapsed * this.wordsPerSecond;
        // Cap drift: don't let estimation run more than ~3s ahead of confirmed
        const maxAhead = Math.max(8, this.wordsPerSecond * 3);
        this.estimatedCursor = Math.min(
          this.estimatedCursor,
          this.cursor + maxAhead,
          this.promptWords.length - 1
        );
        const wordIdx = Math.floor(this.estimatedCursor);
        this.updateTargetFromCursor(wordIdx);
        updateWordHighlight(wordIdx);
      }
    }

    // Critically-damped spring: smooth, no oscillation
    const diff = this.targetScrollPos - scrollPos;
    if (Math.abs(diff) > 0.3) {
      // Adaptive: slower approach for large jumps (paragraph transitions)
      const smoothTime = Math.abs(diff) > 80 ? 0.4 : 0.25;
      const omega = 2.0 / smoothTime;
      const x = omega * elapsed;
      const exp = 1.0 / (1.0 + x + 0.48 * x * x + 0.235 * x * x * x);
      scrollPos = this.targetScrollPos - diff * exp;
      scrollPos = Math.max(0, scrollPos);
      const maxScroll = scrollContent.scrollHeight - scrollWrapper.offsetHeight;
      scrollPos = Math.min(scrollPos, maxScroll);
      applyScrollTransform();
    }

    this.scrollAnimId = requestAnimationFrame((t) => this.followLoop(t));
  }

  updateTargetFromCursor(wordIdx) {
    if (wordIdx < 0 || wordIdx >= this.promptWords.length) return;
    const entry = this.promptWords[wordIdx];
    const wrapperH = scrollWrapper.offsetHeight;

    // Use the word span's actual visual position (not the line's)
    // This handles wrapped lines and gives precise word-level tracking
    let wordCenterInContent;
    if (entry.spanEl) {
      const spanRect = entry.spanEl.getBoundingClientRect();
      const contentRect = scrollContent.getBoundingClientRect();
      // spanRect relative to scrollContent = natural position in content
      wordCenterInContent = spanRect.top + spanRect.height / 2 - contentRect.top;
    } else {
      // Fallback to line center
      const lineEl = entry.lineEl;
      wordCenterInContent = lineEl.offsetTop + lineEl.offsetHeight / 2;
    }

    // Position this word at the vertical CENTER of the notch viewport
    this.targetScrollPos = wordCenterInContent - wrapperH * 0.5;
    this.targetScrollPos = Math.max(0, this.targetScrollPos);
    const maxScroll = scrollContent.scrollHeight - wrapperH;
    this.targetScrollPos = Math.min(this.targetScrollPos, maxScroll);
  }

  // ---- Audio recording & transcription ----

  async recordLoop() {
    while (this.isListening) {
      const audioBlob = await this.recordChunk(this.CHUNK_DURATION);
      if (!this.isListening) break;

      if (this.hadSpeechInChunk) {
        // Fire-and-forget: transcription overlaps with next recording
        this.transcribeAndProcess(audioBlob);
      }
    }
  }

  recordChunk(durationMs) {
    return new Promise((resolve) => {
      this.hadSpeechInChunk = false;
      const speechCheck = setInterval(() => {
        if (this.isSpeaking) this.hadSpeechInChunk = true;
      }, 80);

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';

      const recorder = new MediaRecorder(this.stream, { mimeType });
      const chunks = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = () => {
        clearInterval(speechCheck);
        resolve(new Blob(chunks, { type: mimeType }));
      };

      recorder.start();
      setTimeout(() => {
        if (recorder.state === 'recording') recorder.stop();
      }, durationMs);
    });
  }

  async transcribeAndProcess(blob) {
    const data = await this.transcribe(blob);
    if (this.isListening && data && data.text) {
      this.processTranscription(data);
    }
  }

  async transcribe(blob) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    try {
      const formData = new FormData();
      formData.append('file', blob, 'audio.webm');
      formData.append('model', 'whisper-large-v3-turbo');
      formData.append('response_format', 'verbose_json');
      formData.append('timestamp_granularities[]', 'word');
      formData.append('temperature', '0');

      const context = this.getContextHint();
      if (context) formData.append('prompt', context);

      const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${this.apiKey}` },
        body: formData,
        signal: controller.signal
      });

      clearTimeout(timeout);

      if (!res.ok) {
        console.warn('Groq API error:', res.status);
        return null;
      }

      const data = await res.json();
      return { text: data.text || '', words: data.words || [] };
    } catch (e) {
      clearTimeout(timeout);
      if (e.name !== 'AbortError') {
        console.warn('Groq transcription error:', e.message);
      }
      return null;
    }
  }

  getContextHint() {
    // Wider context window for better Whisper accuracy
    const start = Math.max(0, this.cursor - 5);
    const end = Math.min(this.promptWords.length, this.cursor + 50);
    const words = this.promptWords.slice(start, end).map(w => w.original);
    return words.length > 0 ? words.join(' ') : '';
  }

  // ---- Transcription matching (bi-directional seeking) ----

  processTranscription(data) {
    const text = (data.text || '').trim();
    const wordTimestamps = data.words || [];

    const spoken = text.split(/\s+/)
      .map(w => this.normalize(w))
      .filter(w => w.length > 0);

    // Ignore very short transcriptions — likely noise or Whisper hallucination
    if (spoken.length < 2) return;

    // WPS from word-level timestamps (most accurate source)
    let wpsFromTimestamps = false;
    if (wordTimestamps.length >= 2) {
      const first = wordTimestamps[0];
      const last = wordTimestamps[wordTimestamps.length - 1];
      const dur = (last.end || last.start) - first.start;
      if (dur > 0.3) {
        const measured = wordTimestamps.length / dur;
        this.wordsPerSecond = this.wordsPerSecond * 0.4 + measured * 0.6;
        this.wordsPerSecond = Math.max(1, Math.min(this.wordsPerSecond, 5));
        wpsFromTimestamps = true;
      }
    }

    const matchPos = this.findMatch(spoken);
    if (matchPos >= 0) {
      const newCursor = Math.min(matchPos + spoken.length, this.promptWords.length);

      // Allow both forward AND backward movement (re-reading a section)
      if (newCursor !== this.cursor) {
        const isForward = newCursor > this.cursor;

        // Only update WPS for forward movement
        if (isForward && !wpsFromTimestamps) {
          const now = Date.now();
          const elapsed = (now - this.lastCursorUpdate) / 1000;
          const wordsAdvanced = newCursor - this.cursor;
          if (elapsed > 0.5 && elapsed < 10) {
            const measured = wordsAdvanced / elapsed;
            this.wordsPerSecond = this.wordsPerSecond * 0.3 + measured * 0.7;
            this.wordsPerSecond = Math.max(1, Math.min(this.wordsPerSecond, 5));
          }
        }
        this.lastCursorUpdate = Date.now();

        this.cursor = newCursor;
        this.estimatedCursor = this.cursor;
        this.updateTargetFromCursor(this.cursor);
        updateWordHighlight(this.cursor);
      }

      this.lastMatchTime = Date.now();
      this.updateIndicator('matching');
    }
  }

  findMatch(spoken) {
    if (this.promptWords.length === 0 || spoken.length === 0) return -1;

    // Wide window: allows backward seeking (re-read) and forward jumping
    const searchStart = Math.max(0, this.cursor - 80);
    const searchEnd = Math.min(this.promptWords.length, this.cursor + 80);

    // Stricter minimum for short transcriptions (all words must match for 2-3 words)
    const minMatches = spoken.length <= 3
      ? spoken.length
      : Math.max(3, Math.ceil(spoken.length * 0.5));

    let bestPos = -1;
    let bestScore = 0;

    for (let pos = searchStart; pos <= searchEnd - 1; pos++) {
      let matches = 0;
      let consecutiveMatches = 0;
      let maxConsecutive = 0;
      const checkLen = Math.min(spoken.length, this.promptWords.length - pos);
      if (checkLen < 1) continue;

      for (let i = 0; i < checkLen; i++) {
        if (this.wordsMatch(spoken[i], this.promptWords[pos + i].word)) {
          matches++;
          consecutiveMatches++;
          maxConsecutive = Math.max(maxConsecutive, consecutiveMatches);
        } else {
          consecutiveMatches = 0;
        }
      }

      if (matches < minMatches) continue;

      const matchRatio = matches / checkLen;

      // Distance-aware confidence gates
      const distance = Math.abs(pos - this.cursor);
      const isBehind = pos + checkLen <= this.cursor;

      // Far from cursor (>5 words): require 3+ consecutive to prove intent
      if (distance > 5 && maxConsecutive < 3) continue;

      // Going backward: require higher confidence (60%+) to prevent accidental jumps
      if (isBehind && matchRatio < 0.6) continue;

      const consecutiveBonus = (maxConsecutive / checkLen) * 0.15;
      // Proximity bias: small preference for matches near current position
      const proximityBias = Math.max(0, 0.05 - distance * 0.0005);
      const score = matchRatio + consecutiveBonus + proximityBias;

      if (score > bestScore && matchRatio >= 0.5) {
        bestScore = score;
        bestPos = pos;
      }
    }

    return bestPos;
  }

  wordsMatch(a, b) {
    if (a === b) return true;
    if (!a || !b) return false;

    // Single-char words: exact match only (prevents "a"/"I"/"o" false positives)
    if (a.length <= 1 || b.length <= 1) return a === b;

    // Prefix match for longer words (handles suffix/conjugation differences)
    const minLen = Math.min(a.length, b.length);
    if (minLen >= 4) {
      const prefixLen = Math.ceil(minLen * 0.75);
      if (a.slice(0, prefixLen) === b.slice(0, prefixLen)) return true;
    }

    // Edit distance with tight thresholds
    const maxLen = Math.max(a.length, b.length);
    const maxDist = maxLen <= 3 ? 0 : maxLen <= 5 ? 1 : 2;
    return this.editDist(a, b) <= maxDist;
  }

  editDist(a, b) {
    if (Math.abs(a.length - b.length) > 3) return 999;
    const m = [];
    for (let i = 0; i <= a.length; i++) {
      m[i] = [i];
      for (let j = 1; j <= b.length; j++) {
        if (i === 0) m[i][j] = j;
        else {
          const cost = a[i - 1] === b[j - 1] ? 0 : 1;
          m[i][j] = Math.min(m[i - 1][j] + 1, m[i][j - 1] + 1, m[i - 1][j - 1] + cost);
        }
      }
    }
    return m[a.length][b.length];
  }

  updateIndicator(state) {
    const el = document.getElementById('voice-indicator');
    const label = document.getElementById('voice-label');
    if (!el) return;
    el.classList.remove('matching', 'silent');
    if (state) {
      el.classList.add(state);
      if (label) {
        label.textContent = state === 'matching' ? 'Following' : 'Waiting\u2026';
      }
    }
  }

  reset() {
    this.cursor = 0;
    this.estimatedCursor = 0;
    this.targetScrollPos = 0;
    this.wordsPerSecond = 2.5;
    this.noiseFloor = 0.005;
    this.buildWordMap();
    this.lastMatchTime = Date.now();
    this.lastSpeechTime = Date.now();
    this.lastCursorUpdate = Date.now();
  }
}

// ===== Cleanup =====

window.addEventListener('beforeunload', () => {
  if (voiceFollower) {
    voiceFollower.stop();
    voiceFollower = null;
  }
});

// ===== Controls =====

document.getElementById('btn-play-pause').addEventListener('click', toggle);
document.getElementById('btn-close').addEventListener('click', () => {
  window.api.notifyMain({ type: 'closed' });
  window.close();
});

// Manual scroll
scrollWrapper.addEventListener('wheel', (e) => {
  e.preventDefault();
  scrollPos += e.deltaY;
  scrollPos = Math.max(0, scrollPos);
  const maxScroll = scrollContent.scrollHeight - scrollWrapper.offsetHeight;
  scrollPos = Math.min(scrollPos, maxScroll);
  applyScrollTransform();

  // Only update line states in non-voice mode
  if (!voiceFollower || !voiceFollower.isListening) {
    updateLineStates();
  }
}, { passive: false });

// Keyboard shortcuts
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
  if ((e.metaKey || e.ctrlKey) && e.key === 'r') {
    e.preventDefault();
    reset();
  }
  if ((e.metaKey || e.ctrlKey) && e.key === 'p' && !e.shiftKey) {
    e.preventDefault();
    toggle();
  }
});

// ===== IPC =====

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

(async () => {
  settings = await window.api.getSettings();
  applySettings(settings);
})();
