const { v4: uuidv4 } = (() => {
  // Simple UUID generator (no external dep needed in renderer)
  return {
    v4: () => 'xxxx-xxxx-xxxx'.replace(/x/g, () =>
      Math.floor(Math.random() * 16).toString(16)
    ) + '-' + Date.now().toString(36)
  };
})();

let scripts = [];
let activeScriptId = null;
let settings = {};
let prompterOpen = false;

// DOM elements
const scriptList = document.getElementById('script-list');
const scriptEditor = document.getElementById('script-editor');
const scriptTitle = document.getElementById('script-title');
const editorHeader = document.getElementById('editor-header');
const editorEmpty = document.getElementById('editor-empty');
const speedSlider = document.getElementById('speed-slider');
const speedLabel = document.getElementById('speed-label');
const fontSizeLabel = document.getElementById('font-size-label');
const settingsPanel = document.getElementById('settings-panel');
const bgOpacitySlider = document.getElementById('bg-opacity');
const opacityLabel = document.getElementById('opacity-label');
const lineSpacingSlider = document.getElementById('line-spacing');
const lineSpacingLabel = document.getElementById('line-spacing-label');
const paddingSlider = document.getElementById('padding-slider');
const paddingLabel = document.getElementById('padding-label');
const fontWeightSelect = document.getElementById('font-weight-select');
const countdownSelect = document.getElementById('countdown-select');
const customColor = document.getElementById('custom-color');

// Init
async function init() {
  scripts = await window.api.getScripts();
  activeScriptId = await window.api.getActiveScriptId();
  settings = await window.api.getSettings();

  applySettingsToUI();
  renderScriptList();
  if (activeScriptId) selectScript(activeScriptId);
}

function applySettingsToUI() {
  speedSlider.value = settings.scrollSpeed;
  speedLabel.textContent = settings.scrollSpeed.toFixed(1) + 'x';
  fontSizeLabel.textContent = settings.fontSize + 'px';
  bgOpacitySlider.value = settings.bgOpacity;
  opacityLabel.textContent = Math.round(settings.bgOpacity * 100) + '%';
  fontWeightSelect.value = settings.fontWeight;
  lineSpacingSlider.value = settings.lineSpacing;
  lineSpacingLabel.textContent = settings.lineSpacing.toFixed(1);
  paddingSlider.value = settings.padding;
  paddingLabel.textContent = settings.padding + 'px';
  countdownSelect.value = settings.countdownDuration;
  document.getElementById('btn-mirror').textContent = settings.mirror ? 'On' : 'Off';

  // Color swatches
  document.querySelectorAll('.color-swatch').forEach(s => {
    s.classList.toggle('active', s.dataset.color === settings.textColor);
  });
  customColor.value = settings.textColor;
}

function renderScriptList() {
  scriptList.innerHTML = '';
  scripts.forEach(s => {
    const li = document.createElement('li');
    li.textContent = s.title || 'Untitled';
    li.classList.toggle('active', s.id === activeScriptId);
    li.addEventListener('click', () => selectScript(s.id));
    scriptList.appendChild(li);
  });
}

function selectScript(id) {
  activeScriptId = id;
  window.api.setActiveScript(id);
  const script = scripts.find(s => s.id === id);
  if (script) {
    editorHeader.style.display = 'flex';
    editorEmpty.style.display = 'none';
    scriptEditor.style.display = 'block';
    scriptTitle.value = script.title;
    scriptEditor.value = script.content;
  }
  renderScriptList();
  sendScriptToPrompter();
}

function getActiveScript() {
  return scripts.find(s => s.id === activeScriptId);
}

function saveScripts() {
  window.api.saveScripts(scripts);
}

function sendScriptToPrompter() {
  const script = getActiveScript();
  if (script) {
    window.api.sendToPrompter({ type: 'script', content: script.content, settings });
  }
}

function saveAndSync() {
  saveScripts();
  window.api.saveSettings(settings);
  sendScriptToPrompter();
}

// New script
document.getElementById('btn-new-script').addEventListener('click', () => {
  const newScript = { id: uuidv4(), title: 'New Script', content: '' };
  scripts.push(newScript);
  saveScripts();
  selectScript(newScript.id);
});

// Delete script
document.getElementById('btn-delete').addEventListener('click', () => {
  if (!activeScriptId) return;
  scripts = scripts.filter(s => s.id !== activeScriptId);
  activeScriptId = scripts.length > 0 ? scripts[0].id : null;
  saveScripts();
  if (activeScriptId) {
    selectScript(activeScriptId);
  } else {
    editorHeader.style.display = 'none';
    scriptEditor.style.display = 'none';
    editorEmpty.style.display = 'flex';
    renderScriptList();
  }
});

// Duplicate script
document.getElementById('btn-duplicate').addEventListener('click', () => {
  const script = getActiveScript();
  if (!script) return;
  const dup = { id: uuidv4(), title: script.title + ' (copy)', content: script.content };
  scripts.push(dup);
  saveScripts();
  selectScript(dup.id);
});

// Title editing
scriptTitle.addEventListener('input', () => {
  const script = getActiveScript();
  if (script) {
    script.title = scriptTitle.value;
    saveScripts();
    renderScriptList();
  }
});

// Content editing (auto-save)
scriptEditor.addEventListener('input', () => {
  const script = getActiveScript();
  if (script) {
    script.content = scriptEditor.value;
    saveScripts();
    sendScriptToPrompter();
  }
});

// Speed slider
speedSlider.addEventListener('input', () => {
  settings.scrollSpeed = parseFloat(speedSlider.value);
  speedLabel.textContent = settings.scrollSpeed.toFixed(1) + 'x';
  window.api.saveSettings(settings);
  window.api.prompterControl({ type: 'speed', value: settings.scrollSpeed });
});

// Font size
document.getElementById('btn-font-up').addEventListener('click', () => {
  settings.fontSize = Math.min(72, settings.fontSize + 2);
  fontSizeLabel.textContent = settings.fontSize + 'px';
  saveAndSync();
});

document.getElementById('btn-font-down').addEventListener('click', () => {
  settings.fontSize = Math.max(16, settings.fontSize - 2);
  fontSizeLabel.textContent = settings.fontSize + 'px';
  saveAndSync();
});

// Countdown
countdownSelect.addEventListener('change', () => {
  settings.countdownDuration = parseInt(countdownSelect.value);
  window.api.saveSettings(settings);
});

// Reset to notch
document.getElementById('btn-reset-notch').addEventListener('click', () => {
  window.api.resetPrompterPosition();
});

// Start button — open prompter and start with countdown
document.getElementById('btn-start').addEventListener('click', () => {
  const script = getActiveScript();
  if (!script) return;
  window.api.openPrompter();
  prompterOpen = true;
  document.getElementById('btn-prompter').classList.add('active');
  setTimeout(() => {
    sendScriptToPrompter();
    window.api.prompterControl({ type: 'start-countdown', duration: settings.countdownDuration });
  }, 300);
});

// Toggle prompter
document.getElementById('btn-prompter').addEventListener('click', () => {
  if (prompterOpen) {
    window.api.closePrompter();
    prompterOpen = false;
    document.getElementById('btn-prompter').classList.remove('active');
  } else {
    window.api.openPrompter();
    prompterOpen = true;
    document.getElementById('btn-prompter').classList.add('active');
    setTimeout(() => sendScriptToPrompter(), 300);
  }
});

window.api.onPrompterClosed(() => {
  prompterOpen = false;
  document.getElementById('btn-prompter').classList.remove('active');
});

// Settings panel toggle
document.getElementById('btn-settings-toggle').addEventListener('click', () => {
  const panel = settingsPanel;
  const btn = document.getElementById('btn-settings-toggle');
  if (panel.style.display === 'none') {
    panel.style.display = 'block';
    btn.classList.add('active');
  } else {
    panel.style.display = 'none';
    btn.classList.remove('active');
  }
});

// Settings: colors
document.querySelectorAll('.color-swatch').forEach(swatch => {
  swatch.addEventListener('click', () => {
    settings.textColor = swatch.dataset.color;
    document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
    swatch.classList.add('active');
    customColor.value = settings.textColor;
    saveAndSync();
  });
});

customColor.addEventListener('input', () => {
  settings.textColor = customColor.value;
  document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
  saveAndSync();
});

// Settings: opacity
bgOpacitySlider.addEventListener('input', () => {
  settings.bgOpacity = parseFloat(bgOpacitySlider.value);
  opacityLabel.textContent = Math.round(settings.bgOpacity * 100) + '%';
  saveAndSync();
});

// Settings: font weight
fontWeightSelect.addEventListener('change', () => {
  settings.fontWeight = fontWeightSelect.value;
  saveAndSync();
});

// Settings: line spacing
lineSpacingSlider.addEventListener('input', () => {
  settings.lineSpacing = parseFloat(lineSpacingSlider.value);
  lineSpacingLabel.textContent = settings.lineSpacing.toFixed(1);
  saveAndSync();
});

// Settings: padding
paddingSlider.addEventListener('input', () => {
  settings.padding = parseInt(paddingSlider.value);
  paddingLabel.textContent = settings.padding + 'px';
  saveAndSync();
});

// Settings: mirror
document.getElementById('btn-mirror').addEventListener('click', () => {
  settings.mirror = !settings.mirror;
  document.getElementById('btn-mirror').textContent = settings.mirror ? 'On' : 'Off';
  saveAndSync();
});

// Keyboard shortcuts (local to main window)
document.addEventListener('keydown', (e) => {
  // Cmd+= / Cmd+- for font size
  if (e.metaKey && e.key === '=') {
    e.preventDefault();
    settings.fontSize = Math.min(72, settings.fontSize + 2);
    fontSizeLabel.textContent = settings.fontSize + 'px';
    saveAndSync();
  }
  if (e.metaKey && e.key === '-') {
    e.preventDefault();
    settings.fontSize = Math.max(16, settings.fontSize - 2);
    fontSizeLabel.textContent = settings.fontSize + 'px';
    saveAndSync();
  }
  // Cmd+M for mirror
  if (e.metaKey && e.key === 'm') {
    e.preventDefault();
    settings.mirror = !settings.mirror;
    document.getElementById('btn-mirror').textContent = settings.mirror ? 'On' : 'Off';
    saveAndSync();
  }
  // Cmd+Enter for start with countdown
  if (e.metaKey && e.key === 'Enter') {
    e.preventDefault();
    document.getElementById('btn-start').click();
  }
  // Cmd+R for reset
  if (e.metaKey && e.key === 'r') {
    e.preventDefault();
    window.api.prompterControl({ type: 'reset' });
  }
  // Cmd+P for play/pause
  if (e.metaKey && !e.shiftKey && e.key === 'p') {
    e.preventDefault();
    window.api.prompterControl({ type: 'toggle' });
  }
  // Cmd+] speed up, Cmd+[ speed down
  if (e.metaKey && e.key === ']') {
    e.preventDefault();
    settings.scrollSpeed = Math.min(5, +(settings.scrollSpeed + 0.1).toFixed(1));
    speedSlider.value = settings.scrollSpeed;
    speedLabel.textContent = settings.scrollSpeed.toFixed(1) + 'x';
    window.api.saveSettings(settings);
    window.api.prompterControl({ type: 'speed', value: settings.scrollSpeed });
  }
  if (e.metaKey && e.key === '[') {
    e.preventDefault();
    settings.scrollSpeed = Math.max(0.1, +(settings.scrollSpeed - 0.1).toFixed(1));
    speedSlider.value = settings.scrollSpeed;
    speedLabel.textContent = settings.scrollSpeed.toFixed(1) + 'x';
    window.api.saveSettings(settings);
    window.api.prompterControl({ type: 'speed', value: settings.scrollSpeed });
  }
});

// From prompter feedback
window.api.onFromPrompter((data) => {
  if (data.type === 'playing-state') {
    // Could update UI to reflect play/pause state
  }
});

init();
