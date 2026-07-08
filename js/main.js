import { ASSET_LIBRARY, DEFAULT_ASSETS } from './assets.js';
import { createBlock, createPageBody } from './templates.js';
import { PAGE_SIZES, downloadPagesAsPdf } from './pdf-export.js';
import { readUserAssets, writeUserAssets, clearUserAssets, downloadJson, fileToDataUrl, saveAutosave, readAutosave } from './storage.js';
import { maintainReadableLayout, fitAllHeadlines } from './layout-flow.js';

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
  layoutSelect: document.getElementById('layout-select'),
  applyLayoutBtn: document.getElementById('apply-layout-btn'),
  addSectionBtn: document.getElementById('add-section-btn'),
  spanSelect: document.getElementById('span-select'),
  applySpanBtn: document.getElementById('apply-span-btn'),
  moveUpBtn: document.getElementById('move-up-btn'),
  moveDownBtn: document.getElementById('move-down-btn'),
  duplicateBlockBtn: document.getElementById('duplicate-block-btn'),
  imageFitSelect: document.getElementById('image-fit-select'),
  imagePositionSelect: document.getElementById('image-position-select'),
  addImageToBlockBtn: document.getElementById('add-image-to-block-btn'),
  applyImageFitBtn: document.getElementById('apply-image-fit-btn'),
  exportStatus: document.getElementById('export-status')
};

let activePage = null;
let activeBlock = null;
let activeGrid = null;
let imageTarget = null;
let draggedBlock = null;
let autosaveTimer = null;
let layoutTimer = null;

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
  queueLayoutMaintenance(0);
}


function bindEvents() {
  els.addTemplatePageBtn.addEventListener('click', () => createPage(els.templateSelect.value));
  els.addBlockBtn.addEventListener('click', addSelectedBlock);
  els.themeSelect.addEventListener('change', () => {
    if (!activePage) return;
    activePage.dataset.theme = els.themeSelect.value;
    applyThemeMasthead(activePage, els.themeSelect.value);
    queueLayoutMaintenance();
    queueAutosave();
  });
  els.pageSizeSelect.addEventListener('change', () => {
    updatePageSize(els.pageSizeSelect.value);
    queueLayoutMaintenance();
    queueAutosave();
  });

  els.documentContainer.addEventListener('click', handleDocumentClick);
  els.documentContainer.addEventListener('focusin', (event) => {
    const page = event.target.closest('.sheet-page');
    if (page) setActivePage(page);
  });
  els.documentContainer.addEventListener('input', () => { fitAllHeadlines(els.documentContainer); queueLayoutMaintenance(); queueAutosave(); });
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

  els.applyLayoutBtn.addEventListener('click', applySelectedLayout);
  els.addSectionBtn.addEventListener('click', addLayoutSection);
  els.applySpanBtn.addEventListener('click', applySelectedSpan);
  els.moveUpBtn.addEventListener('click', () => moveActiveBlock(-1));
  els.moveDownBtn.addEventListener('click', () => moveActiveBlock(1));
  els.duplicateBlockBtn.addEventListener('click', duplicateActiveBlock);
  els.addImageToBlockBtn.addEventListener('click', addImageSlotToActiveBlock);
  els.applyImageFitBtn.addEventListener('click', applyImageOptions);

  els.documentContainer.addEventListener('dragstart', handleDragStart);
  els.documentContainer.addEventListener('dragover', handleDragOver);
  els.documentContainer.addEventListener('drop', handleDrop);
  els.documentContainer.addEventListener('dragend', handleDragEnd);
}

function createPage(templateName) {
  const page = els.pageTemplate.content.firstElementChild.cloneNode(true);
  page.dataset.theme = els.themeSelect.value || 'nct';
  page.dataset.pageSize = els.pageSizeSelect.value || 'cyberpunk';
  page.querySelector('.sheet-body').innerHTML = createPageBody(templateName);
  hydratePage(page);
  applyTemplateClass(page, templateName);
  applyThemeMasthead(page, page.dataset.theme);
  els.documentContainer.appendChild(page);
  setActivePage(page);
  updatePageNumbers();
  queueLayoutMaintenance(0);
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
  if (!activeGrid || !activePage.contains(activeGrid)) setActiveGrid(activePage.querySelector('.sheet-body'));
}

function setActiveBlock(block) {
  if (activeBlock === block) return;
  els.documentContainer.querySelectorAll('.selected-block').forEach(el => el.classList.remove('selected-block'));
  activeBlock = block;
  if (activeBlock) {
    activeBlock.classList.add('selected-block');
    const parentGrid = activeBlock.parentElement?.closest('.sheet-grid, .sheet-body');
    if (parentGrid) setActiveGrid(parentGrid);
    const spanClass = Array.from(activeBlock.classList).find(cls => cls.startsWith('span-')) || 'span-1';
    els.spanSelect.value = ['span-1', 'span-2', 'span-all', 'span-compact'].includes(spanClass) ? spanClass : 'span-1';
  }
}

function setActiveGrid(grid) {
  if (!grid) return;
  els.documentContainer.querySelectorAll('.selected-grid').forEach(el => el.classList.remove('selected-grid'));
  activeGrid = grid;
  activeGrid.classList.add('selected-grid');
  const layoutClass = getLayoutClass(activeGrid) || 'grid-1';
  if (els.layoutSelect.querySelector(`[value="${layoutClass}"]`)) els.layoutSelect.value = layoutClass;
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
  const target = activeGrid && activePage.contains(activeGrid) ? activeGrid : activePage.querySelector('.sheet-body');
  target.insertAdjacentHTML('beforeend', createBlock(els.blockSelect.value));
  hydratePage(activePage);
  const added = target.querySelector('.block:last-of-type');
  if (added) setActiveBlock(added);
  queueLayoutMaintenance();
  queueAutosave();
}


function hydratePage(page) {
  page.querySelectorAll('.block').forEach(block => {
    block.setAttribute('draggable', 'false');
    if (!block.querySelector('.block-drag')) {
      const drag = document.createElement('button');
      drag.className = 'block-drag control-only';
      drag.type = 'button';
      drag.draggable = true;
      drag.title = 'Drag block';
      drag.setAttribute('aria-label', 'Drag block');
      drag.textContent = '☰';
      block.prepend(drag);
    }
  });
  page.querySelectorAll('.sheet-grid, .sheet-body').forEach(grid => grid.classList.add('drop-container'));
}

function getLayoutClass(el) {
  return Array.from(el.classList || []).find(cls => cls.startsWith('grid-'));
}

function setLayoutClass(el, layoutClass) {
  el.classList.remove('grid-1', 'grid-2', 'grid-3', 'grid-sidebar-left', 'grid-sidebar-right', 'grid-feature', 'grid-bottom-cards', 'grid-map');
  el.classList.add('sheet-grid', layoutClass);
}

function applySelectedLayout() {
  if (!activePage) return;
  const target = activeGrid && activePage.contains(activeGrid) ? activeGrid : activePage.querySelector('.sheet-body');
  setLayoutClass(target, els.layoutSelect.value);
  setActiveGrid(target);
  queueLayoutMaintenance();
  queueAutosave();
}

function addLayoutSection() {
  if (!activePage) createPage('blank');
  const section = document.createElement('section');
  section.className = `sheet-grid drop-container ${els.layoutSelect.value}`;
  section.innerHTML = createBlock(els.blockSelect.value || 'article');
  activePage.querySelector('.sheet-body').appendChild(section);
  hydratePage(activePage);
  setActiveGrid(section);
  setActiveBlock(section.querySelector('.block'));
  queueLayoutMaintenance();
  queueAutosave();
}

function applySelectedSpan() {
  if (!activeBlock) return;
  activeBlock.classList.remove('span-1', 'span-2', 'span-all', 'span-compact');
  activeBlock.classList.add(els.spanSelect.value);
  queueLayoutMaintenance();
  queueAutosave();
}

function moveActiveBlock(direction) {
  if (!activeBlock) return;
  const sibling = direction < 0 ? activeBlock.previousElementSibling : activeBlock.nextElementSibling;
  if (!sibling) return;
  if (direction < 0) activeBlock.parentElement.insertBefore(activeBlock, sibling);
  else activeBlock.parentElement.insertBefore(sibling, activeBlock);
  activeBlock.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  queueLayoutMaintenance();
  queueAutosave();
}

function duplicateActiveBlock() {
  if (!activeBlock) return;
  const clone = activeBlock.cloneNode(true);
  clone.classList.remove('selected-block', 'dragging');
  activeBlock.after(clone);
  hydratePage(activePage || clone.closest('.sheet-page'));
  setActiveBlock(clone);
  queueLayoutMaintenance();
  queueAutosave();
}

function addImageSlotToActiveBlock() {
  if (!activeBlock) return;
  const frame = document.createElement('div');
  frame.className = 'image-frame inline-image image-drop-target contain';
  frame.tabIndex = 0;
  frame.innerHTML = '<span class="empty-label">Click to add image</span><img class="image-slot" data-image-role="inline" alt="Inline image" hidden />';
  const articleBody = activeBlock.querySelector('.article-body');
  const caption = document.createElement('p');
  caption.className = 'caption editable';
  caption.contentEditable = 'true';
  caption.dataset.placeholder = 'Caption';
  caption.textContent = 'Image caption / source line.';
  if (articleBody) {
    articleBody.before(caption);
    caption.before(frame);
  } else {
    activeBlock.append(frame, caption);
  }
  activeBlock.classList.remove('image-pos-left', 'image-pos-right', 'image-pos-hero');
  activeBlock.classList.add('image-pos-top');
  imageTarget = frame;
  openAssetModal();
  queueLayoutMaintenance();
  queueAutosave();
}

function applyImageOptions() {
  const targetBlock = activeBlock || imageTarget?.closest('.block');
  if (!targetBlock && !imageTarget) return;
  const frames = imageTarget ? [imageTarget] : Array.from(targetBlock.querySelectorAll('.image-frame, .hero-card'));
  frames.forEach(frame => {
    frame.classList.remove('contain', 'cover', 'stretch');
    frame.classList.add(els.imageFitSelect.value);
  });
  if (targetBlock) {
    targetBlock.classList.remove('image-pos-top', 'image-pos-left', 'image-pos-right', 'image-pos-hero');
    targetBlock.classList.add(els.imagePositionSelect.value);
  }
  queueLayoutMaintenance();
  queueAutosave();
}

function handleDocumentClick(event) {
  const page = event.target.closest('.sheet-page');
  if (page) setActivePage(page);

  const block = event.target.closest('.block');
  if (block && !event.target.closest('.block-remove') && !event.target.closest('.image-drop-target')) setActiveBlock(block);

  const clickedGrid = event.target.closest('.sheet-grid, .sheet-body');
  if (clickedGrid && page && !event.target.closest('.block')) setActiveGrid(clickedGrid);

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
    const doomed = removeBlock.closest('.block');
    doomed?.remove();
    if (doomed === activeBlock) setActiveBlock(null);
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
    const targetBlock = target.closest('.block');
    if (targetBlock) setActiveBlock(targetBlock);
    imageTarget = target;
    document.querySelectorAll('.targeting').forEach(el => el.classList.remove('targeting'));
    imageTarget.classList.add('targeting');
    openAssetModal();
  }
}


function handleDragStart(event) {
  const handle = event.target.closest('.block-drag');
  const block = handle?.closest('.block');
  if (!block) {
    event.preventDefault();
    return;
  }
  draggedBlock = block;
  setActiveBlock(block);
  block.classList.add('dragging');
  event.dataTransfer.effectAllowed = 'move';
  event.dataTransfer.setData('text/plain', 'screamsheet-block');
}

function handleDragOver(event) {
  if (!draggedBlock) return;
  const container = getDropContainer(event.target);
  if (!container || draggedBlock.contains(container)) return;
  event.preventDefault();
  container.classList.add('drag-over');
}

function handleDrop(event) {
  if (!draggedBlock) return;
  const container = getDropContainer(event.target);
  els.documentContainer.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
  if (!container || draggedBlock.contains(container)) return;
  event.preventDefault();
  const after = getBlockAfterPointer(container, event.clientY);
  if (after) container.insertBefore(draggedBlock, after);
  else container.appendChild(draggedBlock);
  setActiveGrid(container);
  setActiveBlock(draggedBlock);
  queueLayoutMaintenance();
  queueAutosave();
}

function handleDragEnd() {
  if (draggedBlock) draggedBlock.classList.remove('dragging');
  draggedBlock = null;
  els.documentContainer.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
}

function getDropContainer(target) {
  const block = target.closest?.('.block');
  if (block && block.parentElement?.matches('.sheet-grid, .sheet-body')) return block.parentElement;
  return target.closest?.('.sheet-grid, .sheet-body') || null;
}

function getBlockAfterPointer(container, y) {
  const blocks = Array.from(container.children).filter(el => el.classList?.contains('block') && el !== draggedBlock);
  let closest = { offset: Number.NEGATIVE_INFINITY, element: null };
  blocks.forEach(block => {
    const box = block.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;
    if (offset < 0 && offset > closest.offset) closest = { offset, element: block };
  });
  return closest.element;
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
  queueLayoutMaintenance();
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
    version: 3,
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
  els.documentContainer.querySelectorAll('.sheet-page').forEach(hydratePage);
  els.pageSizeSelect.value = data.pageSize && PAGE_SIZES[data.pageSize] ? data.pageSize : 'cyberpunk';
  updatePageSize(els.pageSizeSelect.value);
  const firstPage = els.documentContainer.querySelector('.sheet-page');
  if (firstPage) setActivePage(firstPage);
  updatePageNumbers();
  queueLayoutMaintenance(0);
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
  doc.querySelectorAll('.selected-block, .selected-grid, .dragging, .drag-over').forEach(el => el.classList.remove('selected-block', 'selected-grid', 'dragging', 'drag-over'));
  return doc.querySelector('main').innerHTML;
}

function queueLayoutMaintenance(delay = 700) {
  clearTimeout(layoutTimer);
  layoutTimer = setTimeout(() => maintainReadableLayout(els.documentContainer), delay);
}

function queueAutosave() {
  clearTimeout(autosaveTimer);
  autosaveTimer = setTimeout(() => {
    maintainReadableLayout(els.documentContainer);
    saveAutosave(buildProjectData());
  }, 650);
}

async function exportPdf() {
  maintainReadableLayout(els.documentContainer);
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
