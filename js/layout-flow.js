const LAYOUT_CLASSES = ['grid-1', 'grid-2', 'grid-3', 'grid-sidebar-left', 'grid-sidebar-right', 'grid-feature', 'grid-bottom-cards', 'grid-map'];
const SPLITTABLE_SELECTORS = [
  '.article-body',
  '.briefs-box > .editable-block',
  '.qa-box > .editable-block',
  '.timeline-box > .editable-block',
  '.warning-box > .editable-block',
  '.gm-box > .editable-block'
];

export function maintainReadableLayout(root) {
  if (!root || root.dataset.flowing === 'true') return;
  root.dataset.flowing = 'true';
  try {
    normalizeGeneratedControls(root);
    fitAllHeadlines(root);
    autoPaginate(root);
    fitAllHeadlines(root);
    updateRenderedPageNumbers(root);
  } finally {
    root.dataset.flowing = 'false';
  }
}

export function fitAllHeadlines(root) {
  if (!root) return;
  const headings = root.querySelectorAll('.lead-article h1, .mission-cover h1, .article h2, .hero-overlay h2, .block-title');
  headings.forEach(fitHeadline);
}

function fitHeadline(heading) {
  if (!heading || !heading.isConnected) return;
  heading.style.removeProperty('--fit-font-size');
  heading.style.removeProperty('font-size');
  heading.style.overflowWrap = 'anywhere';
  heading.style.wordBreak = 'normal';
  heading.style.hyphens = 'auto';

  const box = heading.getBoundingClientRect();
  if (box.width < 20) return;

  const computed = getComputedStyle(heading);
  const base = parseFloat(computed.fontSize) || 24;
  const textLength = (heading.textContent || '').trim().replace(/\s+/g, ' ').length;
  const isLead = !!heading.closest('.lead-article, .mission-cover');
  const min = isLead ? 22 : 13;
  const max = isLead ? Math.min(base, 54) : Math.min(base, 30);
  const width = Math.max(heading.clientWidth || box.width, 1);

  // Heuristic first pass: long headlines in narrow columns get reduced before measuring.
  const density = textLength / Math.max(width / 28, 1);
  let size = max;
  if (density > 9) size = Math.max(min, max - (density - 9) * 1.65);
  if (density > 15) size = Math.max(min, size - (density - 15) * 1.1);
  heading.style.setProperty('--fit-font-size', `${Math.round(size * 10) / 10}px`);

  // Measurement pass: make sure no long token crosses the divider.
  let guard = 0;
  while (guard++ < 40 && size > min && heading.scrollWidth > heading.clientWidth + 1) {
    size -= 1;
    heading.style.setProperty('--fit-font-size', `${Math.round(size * 10) / 10}px`);
  }
}

function autoPaginate(root) {
  let guard = 0;
  let index = 0;
  while (index < root.querySelectorAll('.sheet-page').length && guard < 240) {
    const page = root.querySelectorAll('.sheet-page')[index];
    while (page && pageOverflows(page) && guard++ < 240) {
      if (trySplitLastSplittableBlock(page, root)) continue;
      if (moveLastMovableBlock(page, root)) continue;
      markOverflow(page);
      break;
    }
    index += 1;
  }
}

function pageOverflows(page) {
  const body = page.querySelector('.sheet-body');
  if (!body) return false;
  const tolerance = 7;
  return body.scrollHeight > body.clientHeight + tolerance;
}

function markOverflow(page) {
  page.classList.add('layout-overflow-warning');
}

function clearOverflow(page) {
  page.classList.remove('layout-overflow-warning');
}

function trySplitLastSplittableBlock(page, root) {
  clearOverflow(page);
  const candidates = Array.from(page.querySelectorAll('.sheet-body .block'))
    .filter(block => isVisible(block) && !isAtomicBlock(block) && getFlowBody(block));

  for (let i = candidates.length - 1; i >= 0; i -= 1) {
    const block = candidates[i];
    const originalBody = getFlowBody(block);
    if (!originalBody) continue;

    const continuation = makeContinuationBlock(block);
    const continuationBody = getFlowBody(continuation);
    if (!continuationBody) continue;

    block.after(continuation);
    let moved = moveSplittableContent(originalBody, continuationBody, () => pageOverflows(page));

    if (!moved) {
      continuation.remove();
      continue;
    }

    if (pageOverflows(page)) {
      const nextContainer = ensureNextContainer(page, block.parentElement, root, { preferStart: true });
      nextContainer.insertBefore(continuation, nextContainer.firstChild);
    }

    normalizeGeneratedControls(root);
    return true;
  }
  return false;
}

function moveSplittableContent(originalBody, continuationBody, stillOverflows) {
  let moved = false;
  continuationBody.innerHTML = '';

  // Move whole semantic chunks first: paragraphs, list items, Q&A rows, briefs.
  while (stillOverflows()) {
    const children = Array.from(originalBody.children).filter(hasTextContent);
    if (children.length <= 1) break;
    continuationBody.prepend(children[children.length - 1]);
    moved = true;
  }

  if (!stillOverflows()) return moved;

  // If a single paragraph is too large, split it by words.
  const lastChild = Array.from(originalBody.children).filter(hasTextContent).pop();
  if (lastChild && splittableTextElement(lastChild)) {
    while (stillOverflows()) {
      const words = (lastChild.textContent || '').trim().split(/\s+/);
      if (words.length < 24) break;
      const take = Math.max(12, Math.ceil(words.length * 0.28));
      const kept = words.slice(0, words.length - take).join(' ');
      const movedText = words.slice(words.length - take).join(' ');
      lastChild.textContent = kept;
      const movedNode = lastChild.cloneNode(false);
      movedNode.textContent = movedText;
      continuationBody.prepend(movedNode);
      moved = true;
    }
  }

  // If the body was plain text rather than paragraphs, normalize it into paragraphs.
  if (!moved && (originalBody.textContent || '').trim().split(/\s+/).length > 32) {
    const words = originalBody.textContent.trim().split(/\s+/);
    const take = Math.max(16, Math.ceil(words.length * 0.35));
    originalBody.innerHTML = `<p>${escapeHtml(words.slice(0, words.length - take).join(' '))}</p>`;
    continuationBody.innerHTML = `<p>${escapeHtml(words.slice(words.length - take).join(' '))}</p>`;
    moved = true;
  }

  return moved;
}

function makeContinuationBlock(block) {
  const clone = block.cloneNode(true);
  clone.classList.remove('selected-block', 'dragging', 'drag-over');
  clone.dataset.autoContinuation = 'true';
  clone.setAttribute('draggable', 'false');

  clone.querySelectorAll('.block-drag, .block-remove').forEach(el => el.remove());
  clone.querySelectorAll('.image-frame, .hero-card, .caption, .article-links').forEach(el => el.remove());
  clone.querySelectorAll('[id]').forEach(el => el.removeAttribute('id'));

  const title = (block.querySelector('h1, h2, h3, .block-title')?.textContent || 'Continued').trim();
  const shortTitle = title.length > 42 ? `${title.slice(0, 42).trim()}…` : title;
  const heading = clone.querySelector('h1, h2, h3, .block-title');
  if (heading) {
    heading.textContent = `Continued // ${shortTitle.replace(/^Continued\s*\/\/\s*/i, '')}`;
    heading.classList.add('continuation-heading');
  }

  const kicker = clone.querySelector('.kicker');
  if (kicker) kicker.textContent = 'CONTINUATION';
  const dek = clone.querySelector('.dek');
  if (dek) dek.remove();

  return clone;
}

function moveLastMovableBlock(page, root) {
  clearOverflow(page);
  const blocks = Array.from(page.querySelectorAll('.sheet-body .block')).filter(isVisible);
  if (blocks.length <= 1) return false;
  const block = blocks[blocks.length - 1];
  const parent = block.parentElement;
  if (!parent) return false;
  const nextContainer = ensureNextContainer(page, parent, root, { preferStart: true });
  nextContainer.insertBefore(block, nextContainer.firstChild);
  normalizeGeneratedControls(root);
  return true;
}

function ensureNextContainer(page, sourceContainer, root, { preferStart = false } = {}) {
  const nextPage = ensureNextPage(page, root);
  const nextBody = nextPage.querySelector('.sheet-body');
  if (!sourceContainer || sourceContainer.classList.contains('sheet-body')) return nextBody;

  const layoutClasses = Array.from(sourceContainer.classList).filter(cls => cls === 'sheet-grid' || cls === 'drop-container' || LAYOUT_CLASSES.includes(cls));
  const section = document.createElement('section');
  section.className = layoutClasses.length ? layoutClasses.join(' ') : 'sheet-grid drop-container grid-1';
  section.dataset.autoFlowSection = 'true';
  if (preferStart) nextBody.insertBefore(section, nextBody.firstChild);
  else nextBody.appendChild(section);
  return section;
}

function ensureNextPage(page, root) {
  const next = page.nextElementSibling;
  if (next?.classList?.contains('sheet-page')) return next;

  const clone = page.cloneNode(true);
  clone.classList.remove('active-page', 'layout-overflow-warning');
  clone.querySelectorAll('.selected-block, .selected-grid, .dragging, .drag-over').forEach(el => el.classList.remove('selected-block', 'selected-grid', 'dragging', 'drag-over'));
  const body = clone.querySelector('.sheet-body');
  if (body) body.innerHTML = '';
  const issue = clone.querySelector('.issue-bar span:last-child');
  if (issue && issue.isContentEditable) issue.textContent = 'Continued Edition';
  page.after(clone);
  updateRenderedPageNumbers(root);
  return clone;
}

function normalizeGeneratedControls(root) {
  root.querySelectorAll('.block').forEach(block => {
    block.setAttribute('draggable', 'false');
    if (!block.querySelector(':scope > .block-drag')) {
      const drag = document.createElement('button');
      drag.className = 'block-drag control-only';
      drag.type = 'button';
      drag.draggable = true;
      drag.title = 'Drag block';
      drag.setAttribute('aria-label', 'Drag block');
      drag.textContent = '☰';
      block.prepend(drag);
    }
    if (!block.querySelector(':scope > .block-remove')) {
      const remove = document.createElement('button');
      remove.className = 'block-remove control-only';
      remove.type = 'button';
      remove.title = 'Remove block';
      remove.textContent = '×';
      const drag = block.querySelector(':scope > .block-drag');
      if (drag) drag.after(remove);
      else block.prepend(remove);
    }
  });
  root.querySelectorAll('.sheet-grid, .sheet-body').forEach(grid => grid.classList.add('drop-container'));
}

function updateRenderedPageNumbers(root) {
  root.querySelectorAll('.sheet-page').forEach((page, index) => {
    const number = String(index + 1);
    page.dataset.pageNumber = number;
    const pageNumber = page.querySelector('.page-number');
    if (pageNumber) pageNumber.textContent = number;
  });
}

function getFlowBody(block) {
  for (const selector of SPLITTABLE_SELECTORS) {
    const match = block.querySelector(selector);
    if (match) return match;
  }
  return null;
}

function isAtomicBlock(block) {
  return block.matches('.ad-block, .image-block, .hero-image-block, .stat-block, .pullquote-block') || block.querySelector('.ad-card, .hero-card, .stat-box, .pullquote');
}

function isVisible(el) {
  return !!(el && el.isConnected && (el.offsetWidth || el.offsetHeight || el.getClientRects().length));
}

function hasTextContent(el) {
  return !!(el && (el.textContent || '').trim());
}

function splittableTextElement(el) {
  if (!el || !hasTextContent(el)) return false;
  const name = el.tagName?.toLowerCase();
  return ['p', 'div', 'li', 'span'].includes(name);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
}
