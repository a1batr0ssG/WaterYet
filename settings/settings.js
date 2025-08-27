function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

window.addEventListener('DOMContentLoaded', async () => {
  const cupImageInput = document.getElementById('cupImage');
  const colorInput = document.getElementById('numColor');
  const resetBtn = document.getElementById('resetBtn');
  const presetList = document.getElementById('presetList');
  const autoLaunchCb = document.getElementById('autoLaunch');

  try {
    const settings = await window.waterApi.getSettings();
    if (settings && typeof settings.numberColor === 'string') {
      colorInput.value = settings.numberColor;
    }
    // reflect auto-launch state (prefer system state)
    try {
      const sys = await window.waterApi.getAutoLaunch();
      autoLaunchCb.checked = !!sys;
    } catch (_) {
      if (settings && typeof settings.autoLaunch === 'boolean') {
        autoLaunchCb.checked = settings.autoLaunch;
      }
    }
  } catch (_) {}

  if (autoLaunchCb) {
    autoLaunchCb.addEventListener('change', async () => {
      const enabled = !!autoLaunchCb.checked;
      try {
        await window.waterApi.setAutoLaunch(enabled);
      } catch (_) {}
    });
  }

  colorInput.addEventListener('input', async () => {
    const val = colorInput.value;
    await window.waterApi.setSettings({ numberColor: val });
  });

  cupImageInput.addEventListener('change', async () => {
    const file = cupImageInput.files && cupImageInput.files[0];
    if (!file) return;
    try {
      const dataUrl = await readFileAsDataURL(file);
      await window.waterApi.setSettings({ cupImageDataUrl: dataUrl });
    } catch (_) {}
  });

  resetBtn.addEventListener('click', () => {
    window.waterApi.resetCounter();
  });

  // preset icons from images_default folder
  async function renderPresetsFromDisk() {
    try {
      const files = await window.waterApi.listPresets();
      if (!Array.isArray(files)) return;
      files.forEach((relPath) => {
        const btn = document.createElement('button');
        btn.className = 'preset';
        const img = document.createElement('img');
        img.src = relPath;
        btn.appendChild(img);
        btn.addEventListener('click', async () => {
          // use path as background-image URL
          await window.waterApi.setSettings({ cupImageDataUrl: relPath });
        });
        presetList.appendChild(btn);
      });
    } catch (_) {}
  }

  if (presetList) {
    renderPresetsFromDisk();
  }
});


