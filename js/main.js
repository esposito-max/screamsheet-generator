import { ASSET_LIBRARY, DEFAULT_ASSETS } from './assets.js';
import { createBlock, createPageBody } from './templates.js';
import { PAGE_SIZES, downloadPagesAsPdf } from './pdf-export.js';
import { readUserAssets, writeUserAssets, clearUserAssets, downloadJson, fileToDataUrl, saveAutosave, readAutosave } from './storage.js';

const els = {
  documentContainer: document.getElementById('document-container'),
  pageTemplate: document.getElementById('page-template'),
  themeSelect: document.getElementById('theme-select'),
  templateSelect: document.getElementById('template-select'),
  addTemplatePageBtn: document.getElementById('add-template-page-btn'),
  pageSizeSelect: document.getElementById('page-size-select'),
  blockSelect: document.getElementById('block-select'),
  addBlockBtn: document.getElementById('add-block-btn'),
  assetLibraryBtn: document.getElementById('asset-library-btn'),
  assetModal: document.getElementById('asset-modal'),
  assetModalClose: document.getElementById('asset-modal-close'),
  assetLibraryGrid: document.getElementById('asset-library-grid'),
  assetUploadInput: document.getElementById('asset-upload-input'),
  clearUploadedAssetsBtn: document.getElementById('clear-uploaded-assets-btn'),
  saveProjectBtn: document.getElementById('save-project-btn'),
  loadProjectInput: document.getElementById('load-project-input'),
  downloadPdfBtn: document.getElementById('download-pdf-btn'),
  printBtn: document.getElementById('print-btn'),
  exportStatus: document.getElementById('export-status')
};

let activePage = null;
let imageTarget = null;
let autosaveTimer = null;

init();

function init() {
  const draft = readAutosave();
  if (draft && draft.html && confirm('Restore the autosaved screamsheet draft from this browser?')) {
    loadProjectData(draft, { silent: true });
  } else {
    createPage('nct-multi');
  }

  bindEvents();
  renderAssetLibrary();
  updatePageSize(els.pageSizeSelect.value);
}

function bindEvents() {
  els.addTemplatePageBtn.addEventListener('click', () => createPage(els.templateSelect.value));
  els.addBlockBtn.addEventListener('click', addSelectedBlock);
  els.themeSelect.addEventListener('change', () => {
    if (!activePage) return;
    activePage.dataset.theme = els.themeSelect.value;
    applyThemeMasthead(activePage, els.themeSelect.value);
    queueAutosave();
  });
  els.pageSizeSelect.addEventListener('change', () => {
    updatePageSize(els.pageSizeSelect.value);
    queueAutosave();
  });

  els.documentContainer.addEventListener('click', handleDocumentClick);
  els.documentContainer.addEventListener('focusin', (event) => {
    const page = event.target.closest('.sheet-page');
    if (page) setActivePage(page);
  });
  els.documentContainer.addEventListener('input', queueAutosave);
  els.documentContainer.addEventListener('paste', handlePlainTextPaste);

  els.assetLibraryBtn.addEventListener('click', () => openAssetModal());
  els.assetModalClose.addEventListener('click', closeAssetModal);
  els.assetModal.addEventListener('click', (event) => {
    if (event.target === els.assetModal) closeAssetModal();
    const tile = event.target.closest('.asset-tile');
    if (tile) selectAsset(tile.dataset.src, tile.dataset.name);
  });
  els.assetUploadInput.addEventListener('change', handleAssetUpload);
  els.clearUploadedAssetsBtn.addEventListener('click', () => {
    if (!confirm('Delete all uploaded assets stored in this browser?')) return;
    clearUserAssets();
    renderAssetLibrary();
  });

  els.saveProjectBtn.addEventListener('click', saveProject);
  els.loadProjectInput.addEventListener('change', loadProjectFile);
  els.downloadPdfBtn.addEventListener('click', exportPdf);
  els.printBtn.addEventListener('click', () => window.print());
}

function createPage(templateName) {
  const page = els.pageTemplate.content.firstElementChild.cloneNode(true);
  page.dataset.theme = els.themeSelect.value || 'nct';
  page.dataset.pageSize = els.pageSizeSelect.value || 'cyberpunk';
  page.querySelector('.sheet-body').innerHTML = createPageBody(templateName);
  applyTemplateClass(page, templateName);
  applyThemeMasthead(page, page.dataset.theme);
  els.documentContainer.appendChild(page);
  setActivePage(page);
  updatePageNumbers();
  queueAutosave();
  return page;
}

function applyTemplateClass(page, templateName) {
  page.classList.remove('gm-page-mode');
  if (templateName === 'gm-scenario' || templateName === 'stat-encounter') page.classList.add('gm-page-mode');
}

function applyThemeMasthead(page, themeName) {
  const img = page.querySelector('.masthead-logo');
  if (!img) return;
  const map = {
    nct: DEFAULT_ASSETS.nctLogo,
    'augmented-optic': DEFAULT_ASSETS.augmentedOpticLogo,
    network54: DEFAULT_ASSETS.network54Logo,
    ncpd: DEFAULT_ASSETS.ncpd,
    'trauma-team': DEFAULT_ASSETS.traumaTeam,
    arasaka: DEFAULT_ASSETS.arasaka,
    militech: DEFAULT_ASSETS.militech,
    biotechnica: DEFAULT_ASSETS.biotechnica,
    mono: DEFAULT_ASSETS.nctLogoBlack
  };
  img.src = map[themeName] || DEFAULT_ASSETS.nctLogo;
}

function setActivePage(page) {
  if (!page || activePage === page) return;
  els.documentContainer.querySelectorAll('.sheet-page').forEach(p => p.classList.remove('active-page'));
  activePage = page;
  activePage.classList.add('active-page');
  if (activePage.dataset.theme) els.themeSelect.value = activePage.dataset.theme;
}

function updatePageNumbers() {
  const pages = Array.from(els.documentContainer.querySelectorAll('.sheet-page'));
  pages.forEach((page, index) => {
    const number = String(index + 1);
    page.dataset.pageNumber = number;
    const pageNumber = page.querySelector('.page-number');
    if (pageNumber) pageNumber.textContent = number;
  });
}

function updatePageSize(sizeName) {
  const size = PAGE_SIZES[sizeName] || PAGE_SIZES.cyberpunk;
  document.documentElement.style.setProperty('--page-w', `${size.cssWidth}px`);
  document.documentElement.style.setProperty('--page-h', `${size.cssHeight}px`);
  els.documentContainer.querySelectorAll('.sheet-page').forEach(page => page.dataset.pageSize = sizeName);
  updatePrintPageSize(size);
}

function updatePrintPageSize(size) {
  let style = document.getElementById('dynamic-print-page-size');
  if (!style) {
    style = document.createElement('style');
    style.id = 'dynamic-print-page-size';
    document.head.appendChild(style);
  }
  style.textContent = `@page { size: ${size.pdfWidth}pt ${size.pdfHeight}pt; margin: 0; }`;
}

function addSelectedBlock() {
  if (!activePage) createPage('blank');
  const body = activePage.querySelector('.sheet-body');
  body.insertAdjacentHTML('beforeend', createBlock(els.blockSelect.value));
  queueAutosave();
}

function handleDocumentClick(event) {
  const page = event.target.closest('.sheet-page');
  if (page) setActivePage(page);

  const removePage = event.target.closest('.page-remove');
  if (removePage) {
    const pages = Array.from(els.documentContainer.querySelectorAll('.sheet-page'));
    if (pages.length === 1) {
      alert('The document must keep at least one page.');
      return;
    }
    const removed = removePage.closest('.sheet-page');
    const nextActive = pages.find(p => p !== removed) || null;
    removed.remove();
    updatePageNumbers();
    setActivePage(nextActive);
    queueAutosave();
    return;
  }

  const removeBlock = event.target.closest('.block-remove');
  if (removeBlock) {
    removeBlock.closest('.block')?.remove();
    queueAutosave();
    return;
  }

  const chip = event.target.closest('.category-chip');
  if (chip) {
    const grid = chip.closest('.category-grid');
    grid.querySelectorAll('.category-chip').forEach(btn => btn.classList.remove('active'));
    chip.classList.add('active');
    queueAutosave();
    return;
  }

  const target = event.target.closest('.image-drop-target');
  if (target) {
    imageTarget = target;
    document.querySelectorAll('.targeting').forEach(el => el.classList.remove('targeting'));
    imageTarget.classList.add('targeting');
    openAssetModal();
  }
}

function handlePlainTextPaste(event) {
  const editable = event.target.closest('[contenteditable="true"]');
  if (!editable) return;
  event.preventDefault();
  const text = (event.clipboardData || window.clipboardData).getData('text/plain');
  insertTextAtCursor(text);
}

function insertTextAtCursor(text) {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return;
  selection.deleteFromDocument();
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const fragment = document.createDocumentFragment();
  lines.forEach((line, index) => {
    if (index > 0) fragment.appendChild(document.createElement('br'));
    fragment.appendChild(document.createTextNode(line));
  });
  selection.getRangeAt(0).insertNode(fragment);
  selection.collapseToEnd();
}

function openAssetModal() {
  renderAssetLibrary();
  els.assetModal.classList.add('open');
  els.assetModal.setAttribute('aria-hidden', 'false');
}

function closeAssetModal() {
  els.assetModal.classList.remove('open');
  els.assetModal.setAttribute('aria-hidden', 'true');
  if (imageTarget) imageTarget.classList.remove('targeting');
  imageTarget = null;
}

function renderAssetLibrary() {
  els.assetLibraryGrid.innerHTML = '';
  appendAssetSections(ASSET_LIBRARY, 'Standard Assets');
  const uploads = readUserAssets();
  if (Object.keys(uploads).length) appendAssetSections(uploads, 'Uploaded Assets');
}

function appendAssetSections(library, titlePrefix) {
  for (const [category, assets] of Object.entries(library)) {
    if (!Array.isArray(assets) || !assets.length) continue;
    const section = document.createElement('section');
    section.className = 'asset-section';
    const heading = document.createElement('h3');
    heading.textContent = `${titlePrefix}: ${category}`;
    section.appendChild(heading);

    const list = document.createElement('div');
    list.className = 'asset-list';
    assets.forEach(asset => {
      const tile = document.createElement('button');
      tile.type = 'button';
      tile.className = 'asset-tile';
      tile.dataset.src = asset.src;
      tile.dataset.name = asset.name || 'Asset';
      const img = document.createElement('img');
      img.src = asset.src;
      img.alt = asset.name || 'Asset';
      img.loading = 'lazy';
      img.onerror = () => { img.alt = `Missing asset: ${asset.name || asset.src}`; };
      const label = document.createElement('span');
      label.textContent = asset.name || asset.src.split('/').pop();
      tile.append(img, label);
      list.appendChild(tile);
    });
    section.appendChild(list);
    els.assetLibraryGrid.appendChild(section);
  }
}

function selectAsset(src, name) {
  if (!imageTarget) {
    alert('Select an image slot on the page first.');
    return;
  }
  let img = imageTarget.querySelector('img.image-slot');
  if (!img && imageTarget.matches('img.image-slot')) img = imageTarget;
  if (!img) return;
  img.src = src;
  img.alt = name || 'Selected asset';
  img.hidden = false;
  const empty = imageTarget.querySelector('.empty-label');
  if (empty) empty.style.display = 'none';
  closeAssetModal();
  queueAutosave();
}

async function handleAssetUpload(event) {
  const files = Array.from(event.target.files || []);
  if (!files.length) return;
  try {
    const uploaded = await Promise.all(files.map(fileToDataUrl));
    const assets = readUserAssets();
    assets.Uploads = [...(assets.Uploads || []), ...uploaded];
    writeUserAssets(assets);
    renderAssetLibrary();
  } catch (error) {
    alert(error.message || 'Could not upload the selected assets.');
  } finally {
    event.target.value = '';
  }
}

function buildProjectData() {
  return {
    app: 'cyberpunk-red-screamsheet-generator',
    version: 2,
    savedAt: new Date().toISOString(),
    pageSize: els.pageSizeSelect.value,
    activeTheme: els.themeSelect.value,
    html: els.documentContainer.innerHTML
  };
}

function saveProject() {
  const date = new Date().toISOString().slice(0, 10);
  downloadJson(`screamsheet-project-${date}.json`, buildProjectData());
}

async function loadProjectFile(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    const text = await file.text();
    const data = JSON.parse(text);
    loadProjectData(data);
  } catch (error) {
    alert('The selected file is not a valid Screamsheet project JSON.');
  } finally {
    event.target.value = '';
  }
}

function loadProjectData(data, { silent = false } = {}) {
  if (!data || typeof data.html !== 'string') {
    if (!silent) alert('Project file does not contain valid page data.');
    return;
  }
  els.documentContainer.innerHTML = sanitizeProjectHtml(data.html);
  els.pageSizeSelect.value = data.pageSize && PAGE_SIZES[data.pageSize] ? data.pageSize : 'cyberpunk';
  updatePageSize(els.pageSizeSelect.value);
  const firstPage = els.documentContainer.querySelector('.sheet-page');
  if (firstPage) setActivePage(firstPage);
  updatePageNumbers();
  queueAutosave();
}

function sanitizeProjectHtml(html) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(`<main>${html}</main>`, 'text/html');
  doc.querySelectorAll('script, iframe, object, embed, link, meta, style, form').forEach(el => el.remove());
  doc.querySelectorAll('*').forEach(el => {
    Array.from(el.attributes).forEach(attr => {
      const name = attr.name.toLowerCase();
      const value = attr.value || '';
      if (name.startsWith('on')) el.removeAttribute(attr.name);
      if ((name === 'href' || name === 'src') && /^javascript:/i.test(value)) el.removeAttribute(attr.name);
    });
  });
  return doc.querySelector('main').innerHTML;
}

function queueAutosave() {
  clearTimeout(autosaveTimer);
  autosaveTimer = setTimeout(() => saveAutosave(buildProjectData()), 450);
}

async function exportPdf() {
  const pages = Array.from(els.documentContainer.querySelectorAll('.sheet-page'));
  if (!pages.length) return;
  const oldText = els.downloadPdfBtn.textContent;
  els.downloadPdfBtn.disabled = true;
  showStatus('Preparing export...');
  try {
    await downloadPagesAsPdf(pages, {
      pageSize: els.pageSizeSelect.value,
      filename: makePdfFilename(),
      onProgress: showStatus
    });
    showStatus('PDF download started.');
    setTimeout(hideStatus, 2200);
  } catch (error) {
    hideStatus();
    alert(`${error.message || 'PDF export failed.'}\n\nUse Print Fallback if your browser is blocking local file rendering.`);
  } finally {
    els.downloadPdfBtn.disabled = false;
    els.downloadPdfBtn.textContent = oldText;
  }
}

function makePdfFilename() {
  const title = activePage?.querySelector('.lead-article h1, .mission-cover h1, .article h2')?.textContent || 'screamsheet';
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50) || 'screamsheet';
  return `${slug}.pdf`;
}

function showStatus(message) {
  els.exportStatus.textContent = message;
  els.exportStatus.classList.add('active');
}

function hideStatus() {
  els.exportStatus.classList.remove('active');
}
