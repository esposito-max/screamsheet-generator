const USER_ASSET_KEY = 'screamsheetUserAssetsV1';
const AUTOSAVE_KEY = 'screamsheetAutosaveV2';

export function readUserAssets() {
  try {
    const parsed = JSON.parse(localStorage.getItem(USER_ASSET_KEY) || '{}');
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

export function writeUserAssets(value) {
  localStorage.setItem(USER_ASSET_KEY, JSON.stringify(value || {}));
}

export function clearUserAssets() {
  localStorage.removeItem(USER_ASSET_KEY);
}

export function downloadJson(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function saveAutosave(data) {
  try {
    localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(data));
  } catch {
    // Local storage may be full because uploaded assets can be large. Ignore autosave failure.
  }
}

export function readAutosave() {
  try {
    const raw = localStorage.getItem(AUTOSAVE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearAutosave() {
  localStorage.removeItem(AUTOSAVE_KEY);
}

export function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error(`Could not read ${file.name}`));
    reader.onload = () => resolve({ name: file.name, src: reader.result });
    reader.readAsDataURL(file);
  });
}
