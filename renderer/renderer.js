function getTodayKey() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function loadCount() {
  const key = getTodayKey();
  const stored = localStorage.getItem('water-count');
  const storedDate = localStorage.getItem('water-date');
  if (stored && storedDate === key) {
    return parseInt(stored, 10) || 0;
  }
  localStorage.setItem('water-date', key);
  localStorage.setItem('water-count', '0');
  return 0;
}

function saveCount(value) {
  localStorage.setItem('water-count', String(value));
  localStorage.setItem('water-date', getTodayKey());
}

function scheduleMidnightReset(updateUi) {
  const now = new Date();
  const next = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
    0, 0, 0, 50 // slight delay to be safe
  );
  const ms = next.getTime() - now.getTime();
  setTimeout(() => {
    localStorage.setItem('water-date', getTodayKey());
    localStorage.setItem('water-count', '0');
    updateUi(0);
    scheduleMidnightReset(updateUi);
  }, ms);
}

window.addEventListener('DOMContentLoaded', () => {
  const counterEl = document.getElementById('counter');
  const cupBtn = document.getElementById('cup');

  function render(value) {
    counterEl.textContent = String(value);
  }

  let count = loadCount();
  render(count);

  // apply settings from main or preload
  function applySettings(s) {
    if (!s) return;
    if (typeof s.numberColor === 'string' && s.numberColor) {
      counterEl.style.color = s.numberColor;
    }
    if (typeof s.cupImageDataUrl === 'string' && s.cupImageDataUrl) {
      cupBtn.style.backgroundImage = `url('${s.cupImageDataUrl}')`;
      cupBtn.style.backgroundSize = 'contain';
      cupBtn.style.backgroundRepeat = 'no-repeat';
      cupBtn.style.backgroundPosition = 'center';
    }
  }
  if (window.waterApi && typeof window.waterApi.onApplySettings === 'function') {
    window.waterApi.onApplySettings(applySettings);
  }
  if (window.waterApi && typeof window.waterApi.getSettings === 'function') {
    window.waterApi.getSettings().then(applySettings).catch(() => {});
  }

  // click-to-increment with drag detection
  let isDragging = false;
  let dragStart = null;
  let lastSent = { x: 0, y: 0 };
  const DRAG_THRESHOLD = 3; // pixels

  function onMouseMove(e) {
    if (!dragStart) return;
    const dx = e.screenX - dragStart.x;
    const dy = e.screenY - dragStart.y;
    if (!isDragging && (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD)) {
      isDragging = true;
    }
    if (isDragging) {
      const deltaX = e.screenX - lastSent.x;
      const deltaY = e.screenY - lastSent.y;
      if (deltaX !== 0 || deltaY !== 0) {
        if (window.waterApi && typeof window.waterApi.dragWindowBy === 'function') {
          window.waterApi.dragWindowBy(deltaX, deltaY);
        }
        lastSent = { x: e.screenX, y: e.screenY };
      }
    }
  }

  function onMouseUp() {
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
    if (!isDragging) {
      count += 1;
      saveCount(count);
      render(count);
    }
    isDragging = false;
    dragStart = null;
  }

  cupBtn.addEventListener('mousedown', (e) => {
    // Only left button
    if (e.button !== 0) return;
    isDragging = false;
    dragStart = { x: e.screenX, y: e.screenY };
    lastSent = { x: e.screenX, y: e.screenY };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  });

  scheduleMidnightReset((v) => {
    count = v;
    render(count);
  });

  if (window.waterApi && typeof window.waterApi.onResetCount === 'function') {
    window.waterApi.onResetCount(() => {
      count = 0;
      saveCount(count);
      render(count);
    });
  }
});


