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
  bodyFontSizeInput: document.getElementById('body-font-size-input'),
  titleFontSizeInput: document.getElementById('title-font-size-input'),
  applyFontSizeBtn: document.getElementById('apply-font-size-btn'),
  fontSmallerBtn: document.getElementById('font-smaller-btn'),
  fontLargerBtn: document.getElementById('font-larger-btn'),
  autoFlowToggle: document.getElementById('auto-flow-toggle'),
  blockAutoFlowToggle: document.getElementById('block-auto-flow-toggle'),
  reflowNowBtn: document.getElementById('reflow-now-btn'),
  blockXInput: document.getElementById('block-x-input'),
  blockYInput: document.getElementById('block-y-input'),
  blockWInput: document.getElementById('block-w-input'),
  blockHInput: document.getElementById('block-h-input'),
  applyPositionBtn: document.getElementById('apply-position-btn'),
  bringForwardBtn: document.getElementById('bring-forward-btn'),
  sendBackwardBtn: document.getElementById('send-backward-btn'),
  snapGridToggle: document.getElementById('snap-grid-toggle'),
  lockBlockToggle: document.getElementById('lock-block-toggle'),
  autoMarkdownToggle: document.getElementById('auto-markdown-toggle'),
  applyMarkdownBtn: document.getElementById('apply-markdown-btn'),
  exportStatus: document.getElementById('export-status')
};

let activePage = null;
let activeBlock = null;
let activeGrid = null;
let imageTarget = null;
let draggedBlock = null;
let autosaveTimer = null;
let layoutMaintenanceTimer = null;
let isPaginating = false;
let lastFocusedEditable = null;
let freePointerState = null;

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
    const editable = event.target.closest('[contenteditable="true"]');
    if (editable) lastFocusedEditable = editable;
  });
  els.documentContainer.addEventListener('input', queueAutosave);
  els.documentContainer.addEventListener('paste', handlePlainTextPaste);
  els.documentContainer.addEventListener('focusout', handleEditableBlur);
  els.documentContainer.addEventListener('pointerdown', handleFreePointerDown);

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
  els.applyFontSizeBtn.addEventListener('click', applyFontSizeOptions);
  els.fontSmallerBtn.addEventListener('click', () => stepSelectedFontSize(-1));
  els.fontLargerBtn.addEventListener('click', () => stepSelectedFontSize(1));
  els.reflowNowBtn.addEventListener('click', () => runLayoutMaintenance({ forcePagination: true }));
  els.autoFlowToggle.addEventListener('change', () => queueAutosave());
  els.blockAutoFlowToggle?.addEventListener('change', applySelectedBlockAutoFlow);
  els.applyPositionBtn?.addEventListener('click', applyFreeLayoutInputs);
  els.bringForwardBtn?.addEventListener('click', () => stepBlockZIndex(1));
  els.sendBackwardBtn?.addEventListener('click', () => stepBlockZIndex(-1));
  els.lockBlockToggle?.addEventListener('change', applyLockState);
  els.applyMarkdownBtn?.addEventListener('click', applyMarkdownToSelection);

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
    syncFontControlsFromBlock(activeBlock);
    syncFreeControlsFromBlock(activeBlock);
    syncAutoFlowControlFromBlock(activeBlock);
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
  queueLayoutMaintenance();
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
  if (added && (isFreeLayoutContainer(target) || target.classList.contains('manual-canvas'))) placeBlockInFreeLayout(added, target);
  if (added) setActiveBlock(added);
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
    if (!block.querySelector('.block-resize')) {
      const resize = document.createElement('button');
      resize.className = 'block-resize control-only';
      resize.type = 'button';
      resize.title = 'Resize block';
      resize.setAttribute('aria-label', 'Resize block');
      resize.textContent = '◢';
      block.append(resize);
    }
  });
  page.querySelectorAll('.sheet-grid, .sheet-body').forEach(grid => {
    grid.classList.add('drop-container');
    if (grid.classList.contains('free-layout') || grid.querySelector(':scope > .block[data-free-w], :scope > .block.manual-positioned')) {
      enableManualPositioning(grid);
    }
  });
}

function getLayoutClass(el) {
  return Array.from(el.classList || []).find(cls => cls.startsWith('grid-') || cls === 'free-layout');
}

function setLayoutClass(el, layoutClass) {
  el.classList.remove('grid-1', 'grid-2', 'grid-3', 'grid-sidebar-left', 'grid-sidebar-right', 'grid-feature', 'grid-bottom-cards', 'grid-map', 'free-layout');
  el.classList.add('sheet-grid', layoutClass);
}

function applySelectedLayout() {
  if (!activePage) return;
  const target = activeGrid && activePage.contains(activeGrid) ? activeGrid : activePage.querySelector('.sheet-body');
  if (els.layoutSelect.value === 'free-layout') enableManualPositioning(target);
  setLayoutClass(target, els.layoutSelect.value);
  if (els.layoutSelect.value === 'free-layout') initializeFreeLayout(target);
  setActiveGrid(target);
  queueAutosave();
}

function addLayoutSection() {
  if (!activePage) createPage('blank');
  const section = document.createElement('section');
  section.className = `sheet-grid drop-container ${els.layoutSelect.value}`;
  section.innerHTML = createBlock(els.blockSelect.value || 'article');
  activePage.querySelector('.sheet-body').appendChild(section);
  hydratePage(activePage);
  if (section.classList.contains('free-layout')) initializeFreeLayout(section);
  setActiveGrid(section);
  setActiveBlock(section.querySelector('.block'));
  queueAutosave();
}

function applySelectedSpan() {
  if (!activeBlock) return;
  activeBlock.classList.remove('span-1', 'span-2', 'span-all', 'span-compact');
  activeBlock.classList.add(els.spanSelect.value);
  queueAutosave();
}

function moveActiveBlock(direction) {
  if (!activeBlock) return;
  const sibling = direction < 0 ? activeBlock.previousElementSibling : activeBlock.nextElementSibling;
  if (!sibling) return;
  if (direction < 0) activeBlock.parentElement.insertBefore(activeBlock, sibling);
  else activeBlock.parentElement.insertBefore(sibling, activeBlock);
  activeBlock.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  queueAutosave();
}

function duplicateActiveBlock() {
  if (!activeBlock) return;
  const clone = activeBlock.cloneNode(true);
  clone.classList.remove('selected-block', 'dragging', 'free-collision');
  activeBlock.after(clone);
  hydratePage(activePage || clone.closest('.sheet-page'));
  if (isFreeLayoutBlock(activeBlock) || activeBlock.parentElement?.classList.contains('manual-canvas')) {
    const box = readBlockBox(activeBlock);
    applyCandidateBox(clone, { ...box, x: box.x + 20, y: box.y + 20 }, { allowOverlap: false }) || placeBlockInFreeLayout(clone, clone.parentElement, { basis: box });
  }
  setActiveBlock(clone);
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
  queueAutosave();
}


function applyFontSizeOptions() {
  const target = activeBlock || lastFocusedEditable?.closest('.block');
  if (!target) return;
  const bodySize = clampNumber(Number(els.bodyFontSizeInput.value), 8, 32, 14);
  const titleSize = clampNumber(Number(els.titleFontSizeInput.value), 12, 88, 25);
  target.style.setProperty('--block-font-size', `${bodySize}px`);
  target.style.setProperty('--title-font-size', `${titleSize}px`);
  target.style.setProperty('--lead-title-font-size', `${Math.max(titleSize, Math.round(titleSize * 1.8))}px`);
  target.dataset.bodyFontSize = String(bodySize);
  target.dataset.titleFontSize = String(titleSize);
  queueAutosave();
}

function stepSelectedFontSize(delta) {
  const target = activeBlock || lastFocusedEditable?.closest('.block');
  if (!target) return;
  syncFontControlsFromBlock(target);
  els.bodyFontSizeInput.value = String(clampNumber(Number(els.bodyFontSizeInput.value) + delta, 8, 32, 14));
  els.titleFontSizeInput.value = String(clampNumber(Number(els.titleFontSizeInput.value) + delta * 2, 12, 88, 25));
  applyFontSizeOptions();
}

function syncFontControlsFromBlock(block) {
  if (!block || !els.bodyFontSizeInput || !els.titleFontSizeInput) return;
  const computed = getComputedStyle(block);
  const body = parseFloat(block.dataset.bodyFontSize || computed.getPropertyValue('--block-font-size')) || 14;
  const title = parseFloat(block.dataset.titleFontSize || computed.getPropertyValue('--title-font-size')) || (block.classList.contains('lead-block') ? 52 : 25);
  els.bodyFontSizeInput.value = String(Math.round(clampNumber(body, 8, 32, 14)));
  els.titleFontSizeInput.value = String(Math.round(clampNumber(title, 12, 88, 25)));
}

function clampNumber(value, min, max, fallback) {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}


function isFreeLayoutContainer(container) {
  return Boolean(container?.classList?.contains('free-layout'));
}

function isPositionableContainer(container) {
  return Boolean(container?.matches?.('.sheet-grid, .sheet-body'));
}

function isFreeLayoutBlock(block) {
  return Boolean(block?.classList?.contains('manual-positioned') || block?.parentElement?.classList?.contains('free-layout'));
}

function getSnapValue() {
  return els.snapGridToggle?.checked ? 10 : 1;
}

function snapNumber(value, snap = getSnapValue()) {
  return Math.round(value / snap) * snap;
}

function readVisualBox(block) {
  const container = block.parentElement;
  const parentRect = container?.getBoundingClientRect?.();
  const rect = block.getBoundingClientRect();
  if (!container || !parentRect || !rect.width || !rect.height) {
    return {
      x: parseFloat(block.dataset.freeX || block.style.getPropertyValue('--free-x')) || 0,
      y: parseFloat(block.dataset.freeY || block.style.getPropertyValue('--free-y')) || 0,
      w: parseFloat(block.dataset.freeW || block.style.getPropertyValue('--free-w')) || block.offsetWidth || 260,
      h: parseFloat(block.dataset.freeH || block.style.getPropertyValue('--free-h')) || block.offsetHeight || 170
    };
  }
  return {
    x: rect.left - parentRect.left + container.scrollLeft,
    y: rect.top - parentRect.top + container.scrollTop,
    w: rect.width,
    h: rect.height
  };
}

function readBlockBox(block) {
  const hasStoredBox = block.dataset.freeW || block.style.getPropertyValue('--free-w');
  if (hasStoredBox || block.classList.contains('manual-positioned') || isFreeLayoutContainer(block.parentElement)) {
    return {
      x: parseFloat(block.dataset.freeX || block.style.getPropertyValue('--free-x')) || 0,
      y: parseFloat(block.dataset.freeY || block.style.getPropertyValue('--free-y')) || 0,
      w: parseFloat(block.dataset.freeW || block.style.getPropertyValue('--free-w')) || block.offsetWidth || 260,
      h: parseFloat(block.dataset.freeH || block.style.getPropertyValue('--free-h')) || block.offsetHeight || 170
    };
  }
  return readVisualBox(block);
}

function updateContainerManualHeight(container) {
  if (!isPositionableContainer(container)) return;
  const blocks = Array.from(container.children).filter(el => el.classList?.contains('block') && (el.classList.contains('manual-positioned') || el.dataset.freeW));
  const bottom = blocks.reduce((max, block) => {
    const box = readBlockBox(block);
    return Math.max(max, box.y + box.h);
  }, 0);
  const current = container.clientHeight || 0;
  const min = Math.max(current, bottom + 24, isFreeLayoutContainer(container) ? 620 : 280);
  container.style.minHeight = `${Math.round(min)}px`;
}

function writeBlockBox(block, box) {
  const container = block.parentElement;
  if (isPositionableContainer(container)) container.classList.add('manual-canvas');
  block.classList.add('manual-positioned');
  delete block.dataset.pageOverflowLocked;
  const clean = {
    x: Math.round(box.x),
    y: Math.round(box.y),
    w: Math.round(box.w),
    h: Math.round(box.h)
  };
  block.dataset.freeX = String(clean.x);
  block.dataset.freeY = String(clean.y);
  block.dataset.freeW = String(clean.w);
  block.dataset.freeH = String(clean.h);
  block.style.setProperty('--free-x', `${clean.x}px`);
  block.style.setProperty('--free-y', `${clean.y}px`);
  block.style.setProperty('--free-w', `${clean.w}px`);
  block.style.setProperty('--free-h', `${clean.h}px`);
  updateContainerManualHeight(container);
}

function enableManualPositioning(container) {
  if (!isPositionableContainer(container)) return;
  const blocks = Array.from(container.children).filter(el => el.classList?.contains('block'));
  if (!blocks.length) {
    container.classList.add('manual-canvas');
    return;
  }
  const boxes = blocks.map(block => readBlockBox(block));
  container.classList.add('manual-canvas');
  blocks.forEach((block, index) => writeBlockBox(block, boxes[index]));
  updateContainerManualHeight(container);
}

function clampBoxToContainer(box, container) {
  const width = Math.max(80, container.clientWidth || 640);
  const height = Math.max(80, container.clientHeight || 740);
  const w = clampNumber(box.w, 80, width, 260);
  const h = clampNumber(box.h, 60, Math.max(60, height), 170);
  return {
    x: clampNumber(box.x, 0, Math.max(0, width - w), 0),
    y: clampNumber(box.y, 0, Math.max(0, height - h), 0),
    w,
    h
  };
}

function boxesOverlap(a, b) {
  return !(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y);
}

function wouldOverlap(block, candidate) {
  const container = block.parentElement;
  if (!isPositionableContainer(container)) return false;
  return Array.from(container.children).some(other => {
    if (other === block || !other.classList?.contains('block') || other.offsetParent === null) return false;
    return boxesOverlap(candidate, readBlockBox(other));
  });
}

function applyCandidateBox(block, candidate, { allowOverlap = false } = {}) {
  const container = block.parentElement;
  if (!isPositionableContainer(container)) return false;
  const box = clampBoxToContainer(candidate, container);
  if (!allowOverlap && wouldOverlap(block, box)) {
    block.classList.add('free-collision');
    return false;
  }
  block.classList.remove('free-collision');
  writeBlockBox(block, box);
  syncFreeControlsFromBlock(block);
  return true;
}

function initializeFreeLayout(container) {
  if (!container) return;
  enableManualPositioning(container);
}

function placeBlockInFreeLayout(block, container, options = {}) {
  if (!isPositionableContainer(container)) return false;
  if (!container.classList.contains('manual-canvas') && isFreeLayoutContainer(container)) enableManualPositioning(container);
  const basis = options.basis || readBlockBox(block);
  const baseW = Math.min(Math.max(180, basis.w || 260), Math.max(180, (container.clientWidth || 640) - 20));
  const baseH = Math.min(Math.max(80, basis.h || (block.classList.contains('lead-block') ? 230 : block.classList.contains('hero-image-block') ? 260 : 170)), Math.max(80, (container.clientHeight || 760) - 20));
  const snap = getSnapValue();
  const startY = Math.max(10, options.afterBox ? options.afterBox.y + options.afterBox.h + snap : 10);
  const yStops = [];
  for (let y = startY; y < (container.clientHeight || 760) - baseH; y += snap * 2) yStops.push(y);
  for (let y = 10; y < Math.min(startY, (container.clientHeight || 760) - baseH); y += snap * 2) yStops.push(y);
  for (const y of yStops) {
    for (let x = 10; x < (container.clientWidth || 640) - baseW; x += snap * 2) {
      const candidate = { x, y, w: baseW, h: baseH };
      if (!wouldOverlap(block, candidate)) {
        writeBlockBox(block, candidate);
        return true;
      }
    }
  }
  return false;
}

function syncFreeControlsFromBlock(block) {
  if (!block || !els.blockXInput) return;
  const box = readBlockBox(block);
  els.blockXInput.value = String(Math.round(box.x));
  els.blockYInput.value = String(Math.round(box.y));
  els.blockWInput.value = String(Math.round(box.w));
  els.blockHInput.value = String(Math.round(box.h));
  if (els.lockBlockToggle) els.lockBlockToggle.checked = block.classList.contains('block-locked');
}

function syncAutoFlowControlFromBlock(block) {
  if (!els.blockAutoFlowToggle) return;
  els.blockAutoFlowToggle.checked = block ? block.dataset.autoFlow !== 'off' : true;
}

function applySelectedBlockAutoFlow() {
  if (!activeBlock || !els.blockAutoFlowToggle) return;
  activeBlock.dataset.autoFlow = els.blockAutoFlowToggle.checked ? 'on' : 'off';
  queueAutosave();
}

function applyFreeLayoutInputs() {
  if (!activeBlock) {
    alert('Select a block first.');
    return;
  }
  const snap = getSnapValue();
  const container = activeBlock.parentElement;
  enableManualPositioning(container);
  const candidate = {
    x: snapNumber(Number(els.blockXInput.value), snap),
    y: snapNumber(Number(els.blockYInput.value), snap),
    w: snapNumber(Number(els.blockWInput.value), snap),
    h: snapNumber(Number(els.blockHInput.value), snap)
  };
  if (!applyCandidateBox(activeBlock, candidate)) alert('That box would overlap another block. Move or resize it differently.');
  queueAutosave();
}

function stepBlockZIndex(delta) {
  if (!activeBlock) return;
  enableManualPositioning(activeBlock.parentElement);
  const current = Number(activeBlock.style.zIndex || activeBlock.dataset.zIndex || 1);
  const next = clampNumber(current + delta, 1, 99, 1);
  activeBlock.style.zIndex = String(next);
  activeBlock.dataset.zIndex = String(next);
  queueAutosave();
}

function applyLockState() {
  if (!activeBlock) return;
  activeBlock.classList.toggle('block-locked', Boolean(els.lockBlockToggle?.checked));
  queueAutosave();
}

function handleFreePointerDown(event) {
  const dragHandle = event.target.closest('.block-drag');
  const resizeHandle = event.target.closest('.block-resize');
  const handle = dragHandle || resizeHandle;
  if (!handle) return;
  const block = handle.closest('.block');
  if (!block || !isPositionableContainer(block.parentElement)) return;
  event.preventDefault();
  if (block.classList.contains('block-locked')) return;
  setActiveBlock(block);
  enableManualPositioning(block.parentElement);
  const start = readBlockBox(block);
  freePointerState = {
    block,
    mode: resizeHandle ? 'resize' : 'move',
    startX: event.clientX,
    startY: event.clientY,
    startBox: start,
    lastGood: start
  };
  block.setPointerCapture?.(event.pointerId);
  window.addEventListener('pointermove', handleFreePointerMove);
  window.addEventListener('pointerup', handleFreePointerUp, { once: true });
}

function handleFreePointerMove(event) {
  if (!freePointerState) return;
  const { block, mode, startX, startY, startBox } = freePointerState;
  const snap = getSnapValue();
  const dx = event.clientX - startX;
  const dy = event.clientY - startY;
  const candidate = mode === 'move'
    ? { ...startBox, x: snapNumber(startBox.x + dx, snap), y: snapNumber(startBox.y + dy, snap) }
    : { ...startBox, w: snapNumber(startBox.w + dx, snap), h: snapNumber(startBox.h + dy, snap) };
  if (applyCandidateBox(block, candidate)) freePointerState.lastGood = readBlockBox(block);
}

function handleFreePointerUp() {
  if (freePointerState?.block) {
    freePointerState.block.classList.remove('free-collision');
    syncFreeControlsFromBlock(freePointerState.block);
  }
  freePointerState = null;
  window.removeEventListener('pointermove', handleFreePointerMove);
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
  if (!block || isFreeLayoutBlock(block)) {
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
  if (isFreeLayoutContainer(container)) placeBlockInFreeLayout(draggedBlock, container);
  setActiveGrid(container);
  setActiveBlock(draggedBlock);
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
  if (els.autoMarkdownToggle?.checked && looksLikeMarkdown(text)) insertHtmlAtCursor(markdownToHtml(text, { inlineOnly: isInlineEditable(editable) }));
  else insertTextAtCursor(text);
}

function handleEditableBlur(event) {
  const editable = event.target.closest('[contenteditable="true"]');
  if (!editable || !els.autoMarkdownToggle?.checked) return;
  applyMarkdownToEditable(editable);
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

function insertHtmlAtCursor(html) {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return;
  selection.deleteFromDocument();
  const template = document.createElement('template');
  template.innerHTML = sanitizeMarkdownHtml(html);
  selection.getRangeAt(0).insertNode(template.content);
  selection.collapseToEnd();
}

function isInlineEditable(editable) {
  return editable.matches('h1, h2, h3, .headline, .block-title, .kicker, .byline, .caption, .timestamp') || Boolean(editable.closest('.issue-bar, .sheet-footer'));
}

function applyMarkdownToSelection() {
  if (lastFocusedEditable) {
    applyMarkdownToEditable(lastFocusedEditable, { force: true });
    return;
  }
  const target = activeBlock || activePage;
  if (!target) return;
  target.querySelectorAll('[contenteditable="true"]').forEach(el => applyMarkdownToEditable(el, { force: true }));
}

function applyMarkdownToEditable(editable, { force = false } = {}) {
  if (!editable) return;
  const text = editable.innerText || editable.textContent || '';
  if (!force && !looksLikeMarkdown(text)) return;
  editable.innerHTML = markdownToHtml(text, { inlineOnly: isInlineEditable(editable) });
  editable.classList.add('markdown-applied');
  setTimeout(() => editable.classList.remove('markdown-applied'), 800);
  queueAutosave();
}

function looksLikeMarkdown(text) {
  return /(^|\s)(#{1,3}\s|[-*+]\s|\d+\.\s|>\s|\*\*[^*]+\*\*|__[^_]+__|\*[^*]+\*|_[^_]+_|~~[^~]+~~|`[^`]+`|\[[^\]]+\]\([^\)]+\))/m.test(text || '');
}

function markdownToHtml(text, { inlineOnly = false } = {}) {
  const normalized = String(text || '').replace(/\r\n/g, '\n').trim();
  if (!normalized) return '';
  if (inlineOnly) return inlineMarkdown(stripHeadingMarker(normalized).replace(/\n+/g, ' '));
  const lines = normalized.split('\n');
  const out = [];
  let listType = null;
  let listItems = [];
  const flushList = () => {
    if (!listType) return;
    out.push(`<${listType}>${listItems.map(item => `<li>${inlineMarkdown(item)}</li>`).join('')}</${listType}>`);
    listType = null;
    listItems = [];
  };
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) { flushList(); continue; }
    let match = line.match(/^(#{1,3})\s+(.+)$/);
    if (match) {
      flushList();
      const level = Math.min(4, match[1].length + 1);
      out.push(`<h${level}>${inlineMarkdown(match[2])}</h${level}>`);
      continue;
    }
    match = line.match(/^[-*+]\s+(.+)$/);
    if (match) {
      if (listType !== 'ul') flushList();
      listType = 'ul';
      listItems.push(match[1]);
      continue;
    }
    match = line.match(/^\d+\.\s+(.+)$/);
    if (match) {
      if (listType !== 'ol') flushList();
      listType = 'ol';
      listItems.push(match[1]);
      continue;
    }
    match = line.match(/^>\s+(.+)$/);
    if (match) {
      flushList();
      out.push(`<blockquote>${inlineMarkdown(match[1])}</blockquote>`);
      continue;
    }
    flushList();
    out.push(`<p>${inlineMarkdown(line)}</p>`);
  }
  flushList();
  return sanitizeMarkdownHtml(out.join(''));
}

function stripHeadingMarker(text) {
  return String(text || '').replace(/^#{1,6}\s+/, '');
}

function inlineMarkdown(text) {
  let html = escapeHtml(text);
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/__([^_]+)__/g, '<strong>$1</strong>');
  html = html.replace(/~~([^~]+)~~/g, '<s>$1</s>');
  html = html.replace(/(^|\s)\*([^*]+)\*/g, '$1<em>$2</em>');
  html = html.replace(/(^|\s)_([^_]+)_/g, '$1<em>$2</em>');
  html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+|mailto:[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  return html;
}

function escapeHtml(text) {
  return String(text || '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}

function sanitizeMarkdownHtml(html) {
  const template = document.createElement('template');
  template.innerHTML = html;
  const allowed = new Set(['P','BR','STRONG','EM','S','CODE','A','UL','OL','LI','H2','H3','H4','BLOCKQUOTE']);
  template.content.querySelectorAll('*').forEach(el => {
    if (!allowed.has(el.tagName)) {
      el.replaceWith(document.createTextNode(el.textContent || ''));
      return;
    }
    Array.from(el.attributes).forEach(attr => {
      const name = attr.name.toLowerCase();
      if (el.tagName === 'A' && ['href','target','rel'].includes(name)) {
        if (name === 'href' && !/^(https?:\/\/|mailto:)/i.test(attr.value)) el.removeAttribute(attr.name);
        return;
      }
      el.removeAttribute(attr.name);
    });
  });
  return template.innerHTML;
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
    version: 5,
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
  doc.querySelectorAll('.selected-block, .selected-grid, .dragging, .drag-over, .flow-warning').forEach(el => el.classList.remove('selected-block', 'selected-grid', 'dragging', 'drag-over', 'flow-warning'));
  doc.querySelectorAll('.flow-note').forEach(el => el.remove());
  return doc.querySelector('main').innerHTML;
}

function queueAutosave() {
  queueLayoutMaintenance();
  clearTimeout(autosaveTimer);
  autosaveTimer = setTimeout(() => saveAutosave(buildProjectData()), 900);
}

function queueLayoutMaintenance() {
  clearTimeout(layoutMaintenanceTimer);
  layoutMaintenanceTimer = setTimeout(() => runLayoutMaintenance(), 260);
}

function runLayoutMaintenance({ forcePagination = false } = {}) {
  fitHeadlines(els.documentContainer);
  if (forcePagination || els.autoFlowToggle?.checked) paginateOverflow();
  updatePageNumbers();
}

function fitHeadlines(root = document) {
  const titles = root.querySelectorAll('.lead-article h1, .article h2, .hero-overlay h2, .mission-cover h1');
  titles.forEach(title => {
    const block = title.closest('.block');
    const computedBlock = block ? getComputedStyle(block) : getComputedStyle(title);
    const base = parseFloat(block?.dataset.titleFontSize || computedBlock.getPropertyValue('--title-font-size')) || parseFloat(getComputedStyle(title).fontSize) || 25;
    const multiplier = title.matches('.lead-article h1, .mission-cover h1') ? 1.85 : title.matches('.hero-overlay h2') ? 1.35 : 1;
    const maxSize = clampNumber(base * multiplier, 14, title.matches('.lead-article h1, .mission-cover h1') ? 88 : 54, 25);
    const minSize = title.matches('.lead-article h1, .mission-cover h1') ? 24 : 14;
    title.style.fontSize = `${maxSize}px`;
    title.style.overflowWrap = 'anywhere';
    title.style.maxWidth = '100%';
    let size = maxSize;
    let guard = 0;
    while (guard < 40 && size > minSize && (title.scrollWidth > title.clientWidth + 1 || title.scrollHeight > Math.max(title.clientHeight + 1, title.getBoundingClientRect().height + 1))) {
      size -= 1.5;
      title.style.fontSize = `${size}px`;
      guard += 1;
    }
  });
}

function paginateOverflow() {
  if (isPaginating) return;
  isPaginating = true;
  try {
    let guard = 0;
    while (guard < 90) {
      guard += 1;
      const page = Array.from(els.documentContainer.querySelectorAll('.sheet-page')).find(pageOverflows);
      if (!page) break;
      const changed = pushOverflowFromPage(page);
      if (!changed) {
        markPageOverflow(page);
        break;
      }
    }
  } finally {
    isPaginating = false;
  }
}

function pageOverflows(page) {
  const body = page.querySelector('.sheet-body');
  if (!body) return false;
  if (findOverflowingBlock(page)) return true;

  // When any block has been manually positioned, the container may receive a
  // calculated min-height. Using scrollHeight in that state creates a false
  // page overflow signal and can repeatedly split the same block. Instead,
  // check the actual rendered block geometry against the page body boundary.
  if (pageHasManualGeometry(page)) return Boolean(findPageOverflowBlock(page));

  return body.scrollHeight > body.clientHeight + 6;
}

function pageHasManualGeometry(page) {
  const body = page.querySelector('.sheet-body');
  if (!body) return false;
  return Boolean(body.classList.contains('manual-canvas') ||
    body.classList.contains('free-layout') ||
    body.querySelector('.manual-canvas, .free-layout, .block.manual-positioned, .block[data-free-w]'));
}

function isVisibleBlock(block) {
  return Boolean(block && block.classList?.contains('block') && block.offsetParent !== null && !block.closest('.mission-cover'));
}

function findPageOverflowBlock(page) {
  const body = page.querySelector('.sheet-body');
  if (!body) return null;
  const bodyRect = body.getBoundingClientRect();
  const blocks = Array.from(body.querySelectorAll('.block')).filter(block => isVisibleBlock(block) && block.dataset.pageOverflowLocked !== 'true');
  return blocks.reverse().find(block => {
    const rect = block.getBoundingClientRect();
    return rect.bottom > bodyRect.bottom - 6 || rect.right > bodyRect.right + 2;
  }) || null;
}

function blockFitsWithinPageBody(block) {
  const page = block.closest('.sheet-page');
  const body = page?.querySelector('.sheet-body');
  if (!body) return true;
  const bodyRect = body.getBoundingClientRect();
  const rect = block.getBoundingClientRect();
  return rect.bottom <= bodyRect.bottom - 6 && rect.right <= bodyRect.right + 2;
}

function pushOverflowFromPage(page) {
  const overflowing = findOverflowingBlock(page);
  if (overflowing) return continueOverflowingBlock(overflowing);

  // Physical page overflow is different from text overflow. If a manually
  // positioned block sits beyond the printable body, move that whole block to
  // the next safe page instead of splitting its text. Splitting a block whose
  // content is not overflowing was the cause of runaway continuation copies.
  const geometricOverflow = findPageOverflowBlock(page);
  if (geometricOverflow) return moveOverflowingBlockToNextPage(geometricOverflow);

  const block = findLastMovableBlock(page);
  if (!block) return false;
  const parent = block.parentElement;
  const parentColumns = getGridColumnCount(parent);
  const canSplit = isSplittableBlock(block) && blockContentOverflows(block);

  if (canSplit && parentColumns > 1 && !isFreeLayoutBlock(block) && !block.classList.contains('flow-continuation') && !block.nextElementSibling) {
    const continuation = splitBlock(block, { samePage: true });
    if (continuation) {
      block.after(continuation);
      hydratePage(page);
      return true;
    }
  }

  if (canSplit) {
    const continuation = splitBlock(block, { samePage: false });
    if (continuation) return placeContinuation(block, continuation);
  }

  return false;
}

function moveOverflowingBlockToNextPage(block) {
  if (!block || block.classList.contains('block-locked')) return false;
  const page = block.closest('.sheet-page');
  const parent = block.parentElement;
  if (!page || !parent) return false;
  const target = getContinuationTarget(page, parent);
  const oldBox = readBlockBox(block);
  target.prepend(block);
  hydratePage(target.closest('.sheet-page'));

  if (isPositionableContainer(target)) {
    enableManualPositioning(target);
    let placed = placeBlockInFreeLayout(block, target, { basis: oldBox });
    if (!placed) {
      const fallback = { ...oldBox, x: 10, y: 10 };
      placed = applyCandidateBox(block, fallback);
    }
    if (!placed || !blockFitsWithinPageBody(block)) {
      block.dataset.pageOverflowLocked = 'true';
      markPageOverflow(target.closest('.sheet-page'));
    } else {
      delete block.dataset.pageOverflowLocked;
    }
  }
  return true;
}

function findOverflowingBlock(page) {
  const blocks = Array.from(page.querySelectorAll('.sheet-body .block')).filter(isVisibleBlock);
  return blocks.find(blockContentOverflows) || null;
}

function blockContentOverflows(block) {
  if (block.dataset.autoFlow === 'off' || !isSplittableBlock(block)) return false;
  const content = getSplittableContent(block);
  if (!content || !content.textContent.trim()) return false;
  const blockBox = block.getBoundingClientRect();
  const contentBox = content.getBoundingClientRect();
  if (!blockBox.height || !contentBox.height) return false;
  if (isFreeLayoutBlock(block) || block.style.height || block.dataset.freeH) {
    const overflowAmount = Math.max(contentBox.bottom - (blockBox.bottom - 12), block.scrollHeight - block.clientHeight);
    return overflowAmount > 8;
  }
  return false;
}

function continueOverflowingBlock(block) {
  const continuation = splitBlock(block, { samePage: true });
  if (!continuation) {
    block.classList.add('flow-warning');
    return false;
  }
  return placeContinuation(block, continuation);
}

function placeContinuation(sourceBlock, continuation) {
  const sourcePage = sourceBlock.closest('.sheet-page');
  const parent = sourceBlock.parentElement;
  const sourceBox = readBlockBox(sourceBlock);
  continuation.classList.add('flow-continuation');
  continuation.dataset.autoFlow = sourceBlock.dataset.autoFlow || 'on';

  if (isFreeLayoutContainer(parent) || parent.classList.contains('manual-canvas') || isFreeLayoutBlock(sourceBlock)) {
    sourceBlock.after(continuation);
    hydratePage(sourcePage);
    if (placeBlockInFreeLayout(continuation, parent, { basis: sourceBox, afterBox: sourceBox })) return true;
    continuation.remove();
    const target = getContinuationTarget(sourcePage, parent);
    target.prepend(continuation);
    hydratePage(target.closest('.sheet-page'));
    enableManualPositioning(target);
    if (!placeBlockInFreeLayout(continuation, target, { basis: sourceBox })) {
      markPageOverflow(target.closest('.sheet-page'));
    }
    return true;
  }

  const parentColumns = getGridColumnCount(parent);
  if (parentColumns > 1 && !sourceBlock.classList.contains('flow-continuation') && !sourceBlock.nextElementSibling) {
    sourceBlock.after(continuation);
    hydratePage(sourcePage);
    return true;
  }

  const target = getContinuationTarget(sourcePage, parent);
  target.prepend(continuation);
  hydratePage(target.closest('.sheet-page'));
  return true;
}

function findLastMovableBlock(page) {
  const blocks = Array.from(page.querySelectorAll('.sheet-body .block')).filter(block => !block.closest('.mission-cover') && !block.classList.contains('block-locked'));
  return blocks.reverse().find(block => block.offsetParent !== null) || null;
}

function isSplittableBlock(block) {
  return Boolean(getSplittableContent(block));
}

function getSplittableContent(block) {
  return block.querySelector('.article-body, .briefs-box .editable-block, .qa-box .editable-block, .timeline-box .editable-block, .gm-box .editable-block');
}

function splitBlock(block, { samePage }) {
  const content = getSplittableContent(block);
  if (!content) return null;
  const movableNodes = Array.from(content.childNodes).filter(node => node.nodeType === Node.ELEMENT_NODE || (node.nodeType === Node.TEXT_NODE && node.textContent.trim()));
  const clone = block.cloneNode(true);
  clone.classList.remove('selected-block', 'dragging', 'drag-over', 'free-collision');
  clone.classList.add('flow-continuation');
  clone.querySelectorAll('.block-drag, .block-resize').forEach(el => el.remove());
  clone.removeAttribute('data-free-x');
  clone.removeAttribute('data-free-y');
  clone.removeAttribute('data-free-w');
  clone.removeAttribute('data-free-h');
  clone.style.removeProperty('--free-x');
  clone.style.removeProperty('--free-y');
  clone.style.removeProperty('--free-w');
  clone.style.removeProperty('--free-h');
  clone.style.removeProperty('z-index');
  clone.classList.remove('manual-positioned');
  const cloneContent = getSplittableContent(clone);
  if (!cloneContent) return null;
  cloneContent.innerHTML = '';

  const title = clone.querySelector('.lead-article h1, .article h2, .block-title');
  if (title && !/continued/i.test(title.textContent)) title.textContent = `${title.textContent.trim()} — continued`;

  if (movableNodes.length > 1) {
    const moveCount = samePage ? Math.max(1, Math.floor(movableNodes.length / 2)) : Math.max(1, Math.ceil(movableNodes.length / 2));
    const toMove = movableNodes.slice(-moveCount);
    toMove.forEach(node => cloneContent.appendChild(node));
    if (!content.textContent.trim() || !cloneContent.textContent.trim()) return null;
    return clone;
  }

  const text = content.textContent.trim();
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length < 30) return null;
  const splitAt = Math.max(12, Math.floor(words.length * (samePage ? 0.55 : 0.5)));
  const first = words.slice(0, splitAt).join(' ');
  const second = words.slice(splitAt).join(' ');
  content.textContent = first;
  cloneContent.textContent = second;
  return clone;
}

function getContinuationTarget(sourcePage, sourceContainer) {
  const nextPage = getOrCreateNextPage(sourcePage);
  const nextBody = nextPage.querySelector('.sheet-body');
  const layout = getLayoutClass(sourceContainer) || 'grid-1';
  const manual = sourceContainer.classList.contains('manual-canvas') || sourceContainer.classList.contains('free-layout');
  if (sourceContainer.matches('.sheet-body')) {
    if (layout && layout !== getLayoutClass(nextBody)) setLayoutClass(nextBody, layout);
    if (manual) enableManualPositioning(nextBody);
    return nextBody;
  }
  let section = nextBody.querySelector(`.sheet-grid.${layout}.flow-target`);
  if (!section) {
    section = document.createElement('section');
    section.className = `sheet-grid drop-container flow-target ${layout}`;
    nextBody.prepend(section);
  }
  if (manual) enableManualPositioning(section);
  return section;
}

function getOrCreateNextPage(page) {
  const next = page.nextElementSibling;
  if (next?.classList?.contains('sheet-page')) return next;
  const created = els.pageTemplate.content.firstElementChild.cloneNode(true);
  created.dataset.theme = page.dataset.theme || els.themeSelect.value || 'nct';
  created.dataset.pageSize = page.dataset.pageSize || els.pageSizeSelect.value || 'cyberpunk';
  created.querySelector('.sheet-body').innerHTML = '';
  applyThemeMasthead(created, created.dataset.theme);
  page.after(created);
  hydratePage(created);
  updatePageNumbers();
  return created;
}

function getGridColumnCount(container) {
  const cls = getLayoutClass(container) || 'grid-1';
  if (cls === 'grid-3' || cls === 'grid-bottom-cards') return 3;
  if (cls === 'grid-2' || cls === 'grid-sidebar-left' || cls === 'grid-sidebar-right' || cls === 'grid-feature' || cls === 'grid-map') return 2;
  return 1;
}

function markPageOverflow(page) {
  page?.classList.add('flow-warning');
  if (page && !page.querySelector('.flow-note')) {
    const note = document.createElement('span');
    note.className = 'flow-note control-only';
    note.textContent = 'Overflow could not be fully resolved. Reduce font size, resize blocks, or add space for continuations.';
    page.querySelector('.sheet-body')?.appendChild(note);
  }
}



async function exportPdf() {
  const pages = Array.from(els.documentContainer.querySelectorAll('.sheet-page'));
  if (!pages.length) return;

  // Export must be read-only. It must never run auto-flow, create continuation
  // blocks, or update overlap/collision markers on the live editor document.
  // Keep a snapshot anyway so a browser-side rendering failure cannot leave the
  // editor in a corrupted intermediate state.
  if (layoutMaintenanceTimer) {
    clearTimeout(layoutMaintenanceTimer);
    layoutMaintenanceTimer = null;
  }
  const snapshot = captureEditorSnapshot();
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
    restoreEditorSnapshot(snapshot);
    hideStatus();
    alert(`${error.message || 'PDF export failed.'}\n\nThe editor state was restored. Use Print Fallback if this browser blocks direct PDF rendering.`);
  } finally {
    els.downloadPdfBtn.disabled = false;
    els.downloadPdfBtn.textContent = oldText;
  }
}

function captureEditorSnapshot() {
  return {
    html: els.documentContainer.innerHTML,
    pageSize: els.pageSizeSelect.value,
    activePageIndex: Math.max(0, Array.from(els.documentContainer.querySelectorAll('.sheet-page')).indexOf(activePage)),
    activeBlockIndex: activeBlock ? Math.max(0, Array.from(activeBlock.closest('.sheet-page')?.querySelectorAll('.block') || []).indexOf(activeBlock)) : -1
  };
}

function restoreEditorSnapshot(snapshot) {
  if (!snapshot || typeof snapshot.html !== 'string') return;
  els.documentContainer.innerHTML = snapshot.html;
  els.documentContainer.querySelectorAll('.sheet-page').forEach(hydratePage);
  updatePageSize(snapshot.pageSize || els.pageSizeSelect.value || 'cyberpunk');
  const pages = Array.from(els.documentContainer.querySelectorAll('.sheet-page'));
  const page = pages[Math.min(snapshot.activePageIndex || 0, Math.max(0, pages.length - 1))];
  if (page) {
    setActivePage(page);
    const blocks = Array.from(page.querySelectorAll('.block'));
    if (snapshot.activeBlockIndex >= 0 && blocks[snapshot.activeBlockIndex]) selectBlock(blocks[snapshot.activeBlockIndex]);
  }
  updatePageNumbers();
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
