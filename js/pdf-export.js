export const PAGE_SIZES = {
  cyberpunk: { label: 'Cyberpunk trim', cssWidth: 804, cssHeight: 1044, pdfWidth: 603, pdfHeight: 783 },
  letter: { label: 'US Letter', cssWidth: 816, cssHeight: 1056, pdfWidth: 612, pdfHeight: 792 },
  a4: { label: 'A4', cssWidth: 794, cssHeight: 1123, pdfWidth: 595.28, pdfHeight: 841.89 }
};

const enc = new TextEncoder();

export async function downloadPagesAsPdf(pages, { filename = 'screamsheet.pdf', pageSize = 'cyberpunk', onProgress = null } = {}) {
  if (!pages || pages.length === 0) throw new Error('No pages to export.');
  const size = PAGE_SIZES[pageSize] || PAGE_SIZES.cyberpunk;
  const cssText = await collectCssText();
  const images = [];

  for (let i = 0; i < pages.length; i += 1) {
    if (onProgress) onProgress(`Rendering page ${i + 1} of ${pages.length}...`);
    let jpeg;
    try {
      jpeg = await renderPageToJpeg(pages[i], cssText, size);
    } catch (error) {
      if (onProgress) onProgress(`Raster export blocked on page ${i + 1}; using safe PDF renderer...`);
      jpeg = renderPageToSafeCanvas(pages[i], size, error);
    }
    images.push(jpeg);
  }

  if (onProgress) onProgress('Building PDF...');
  const pdfBytes = buildPdf(images, size);
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

async function collectCssText() {
  const parts = [];
  for (const link of document.querySelectorAll('link[rel="stylesheet"]')) {
    try {
      const href = new URL(link.getAttribute('href'), document.baseURI).href;
      const response = await fetch(href);
      if (response.ok) parts.push(await response.text());
    } catch {
      // Ignore. Inline fallback below covers the essentials.
    }
  }
  for (const style of document.querySelectorAll('style')) parts.push(style.textContent || '');
  parts.push(`
    body { margin: 0; background: #fff; }
    .sheet-page { box-shadow: none !important; outline: 0 !important; margin: 0 !important; }
    .control-only, .block-remove, .block-drag, .page-remove, .drop-label, .empty-label { display: none !important; }
    [contenteditable="true"] { outline: 0 !important; }
    .selected-block, .selected-grid, .drag-over, .free-collision, .flow-warning { outline: 0 !important; }
    .image-frame, .image-drop-target { border-color: transparent !important; }
  `);
  return parts.join('\n');
}

async function renderPageToJpeg(page, cssText, size) {
  const clone = page.cloneNode(true);
  clone.classList.remove('active-page');
  clone.querySelectorAll('.selected-block, .selected-grid, .dragging, .drag-over, .free-collision, .flow-warning').forEach(el => el.classList.remove('selected-block', 'selected-grid', 'dragging', 'drag-over', 'free-collision', 'flow-warning'));
  clone.style.width = `${size.cssWidth}px`;
  clone.style.height = `${size.cssHeight}px`;
  clone.style.minHeight = `${size.cssHeight}px`;
  clone.setAttribute('data-exporting', 'true');
  clone.querySelectorAll('.control-only, .block-remove, .page-remove').forEach(el => el.remove());
  clone.querySelectorAll('[contenteditable]').forEach(el => el.removeAttribute('contenteditable'));
  clone.querySelectorAll('.drop-label, .empty-label').forEach(el => { el.style.display = 'none'; });
  await inlineImages(clone);

  const foreignBody = `<div xmlns="http://www.w3.org/1999/xhtml"><style>${cssText}</style>${clone.outerHTML}</div>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size.cssWidth}" height="${size.cssHeight}" viewBox="0 0 ${size.cssWidth} ${size.cssHeight}"><foreignObject width="100%" height="100%">${foreignBody}</foreignObject></svg>`;
  const svgBlob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);
  try {
    const img = await loadImage(url);
    const scale = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(size.cssWidth * scale);
    canvas.height = Math.round(size.cssHeight * scale);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    return {
      data: dataUrlToBytes(dataUrl),
      width: canvas.width,
      height: canvas.height
    };
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function inlineImages(root) {
  const images = Array.from(root.querySelectorAll('img'));
  await Promise.all(images.map(async (img) => {
    const rawSrc = img.getAttribute('src');
    if (!rawSrc || rawSrc.startsWith('data:')) return;
    try {
      const absolute = new URL(rawSrc, document.baseURI).href;
      const response = await fetch(absolute);
      if (!response.ok) throw new Error('image fetch failed');
      const blob = await response.blob();
      img.setAttribute('src', await blobToDataUrl(blob));
    } catch {
      try {
        img.setAttribute('src', await imageSourceToDataUrl(rawSrc));
      } catch {
        // Do not leave a blocked or cross-origin source in the export clone.
        // A single non-inlined image can taint the canvas and make the whole
        // PDF fail. Use an embedded placeholder instead.
        img.setAttribute('src', placeholderImageDataUrl(img.getAttribute('alt') || 'image'));
      }
    }
  }));
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not inline image.'));
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('The browser could not render the page for PDF export. Use Print Fallback if this browser blocks local SVG rendering.'));
    image.src = src;
  });
}

async function imageSourceToDataUrl(src) {
  const image = await loadImage(new URL(src, document.baseURI).href);
  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth || image.width || 1;
  canvas.height = image.naturalHeight || image.height || 1;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(image, 0, 0);
  return canvas.toDataURL('image/png');
}

function placeholderImageDataUrl(label = 'image') {
  const safe = String(label).slice(0, 60).replace(/[&<>"']/g, '');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360"><rect width="640" height="360" fill="#f2eee5"/><rect x="18" y="18" width="604" height="324" fill="none" stroke="#9a7b49" stroke-width="6" stroke-dasharray="16 12"/><text x="320" y="180" text-anchor="middle" dominant-baseline="middle" font-family="serif" font-size="28" fill="#5a4a39">${safe || 'image'}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function renderPageToSafeCanvas(page, size, error) {
  const scale = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(size.cssWidth * scale);
  canvas.height = Math.round(size.cssHeight * scale);
  const ctx = canvas.getContext('2d');
  ctx.scale(scale, scale);
  ctx.fillStyle = '#f7f1e3';
  ctx.fillRect(0, 0, size.cssWidth, size.cssHeight);
  ctx.strokeStyle = '#8a6a3a';
  ctx.lineWidth = 2;
  ctx.strokeRect(18, 18, size.cssWidth - 36, size.cssHeight - 36);

  const pageRect = page.getBoundingClientRect();
  const masthead = textFrom(page.querySelector('.masthead-logo')) || textFrom(page.querySelector('.issue-bar')) || 'SCREAMSHEET';
  ctx.fillStyle = '#2f241b';
  ctx.font = 'bold 26px serif';
  drawWrappedText(ctx, masthead.toUpperCase(), 36, 42, size.cssWidth - 72, 30, 2);

  const issue = textFrom(page.querySelector('.issue-bar'));
  if (issue) {
    ctx.font = '12px serif';
    ctx.fillStyle = '#5a4a39';
    drawWrappedText(ctx, issue, 36, 78, size.cssWidth - 72, 16, 2);
  }

  const blocks = Array.from(page.querySelectorAll('.sheet-body .block')).filter(block => block.offsetParent !== null || block.getClientRects().length);
  blocks.forEach(block => drawBlockSummary(ctx, block, pageRect, size));

  ctx.font = '10px serif';
  ctx.fillStyle = '#7a6a56';
  const reason = error?.message ? `Safe renderer used because browser blocked direct raster export: ${error.message}` : 'Safe renderer used.';
  drawWrappedText(ctx, reason, 36, size.cssHeight - 44, size.cssWidth - 72, 12, 2);

  const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
  return { data: dataUrlToBytes(dataUrl), width: canvas.width, height: canvas.height };
}

function drawBlockSummary(ctx, block, pageRect, size) {
  const rect = block.getBoundingClientRect();
  let x = rect.left - pageRect.left;
  let y = rect.top - pageRect.top;
  let w = rect.width;
  let h = rect.height;

  if (!Number.isFinite(x) || !Number.isFinite(y) || w < 20 || h < 20) {
    const index = Array.from(block.parentElement?.querySelectorAll('.block') || []).indexOf(block);
    x = 36 + ((index % 2) * ((size.cssWidth - 90) / 2));
    y = 120 + Math.floor(index / 2) * 180;
    w = (size.cssWidth - 108) / 2;
    h = 150;
  }

  x = Math.max(30, Math.min(x, size.cssWidth - 60));
  y = Math.max(105, Math.min(y, size.cssHeight - 90));
  w = Math.max(100, Math.min(w, size.cssWidth - x - 30));
  h = Math.max(70, Math.min(h, size.cssHeight - y - 60));

  ctx.fillStyle = '#fffaf0';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = '#8a6a3a';
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, w, h);

  const title = textFrom(block.querySelector('h1, h2, h3, .block-title, .warning-title')) || block.dataset.blockType || 'Block';
  const body = textFrom(block.querySelector('.article-body, .editable-block, p')) || textFrom(block);
  ctx.fillStyle = '#2f241b';
  ctx.font = 'bold 16px serif';
  const used = drawWrappedText(ctx, title, x + 10, y + 20, w - 20, 18, 3);
  ctx.font = '12px serif';
  ctx.fillStyle = '#3f352a';
  drawWrappedText(ctx, body, x + 10, y + 26 + used, w - 20, 15, Math.max(1, Math.floor((h - 40 - used) / 15)));
}

function textFrom(el) {
  if (!el) return '';
  if (el.tagName === 'IMG') return el.getAttribute('alt') || el.getAttribute('src')?.split('/').pop()?.replace(/\.[a-z0-9]+$/i, '') || '';
  return (el.textContent || '').replace(/\s+/g, ' ').trim();
}

function drawWrappedText(ctx, text, x, y, maxWidth, lineHeight, maxLines = 6) {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  let line = '';
  let lines = 0;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, y + lines * lineHeight);
      lines += 1;
      if (lines >= maxLines) return lines * lineHeight;
      line = word;
    } else {
      line = test;
    }
  }
  if (line && lines < maxLines) {
    ctx.fillText(line, x, y + lines * lineHeight);
    lines += 1;
  }
  return lines * lineHeight;
}

function dataUrlToBytes(dataUrl) {
  const base64 = dataUrl.split(',')[1] || '';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function buildPdf(jpegs, size) {
  const objects = [];
  const addObject = (bytesOrString) => {
    const bytes = typeof bytesOrString === 'string' ? enc.encode(bytesOrString) : bytesOrString;
    objects.push(bytes);
    return objects.length;
  };

  addObject(''); // 1 catalog placeholder
  addObject(''); // 2 pages placeholder

  const pageObjectIds = [];
  jpegs.forEach((jpeg, index) => {
    const imageName = `Im${index + 1}`;
    const content = `q\n${fmt(size.pdfWidth)} 0 0 ${fmt(size.pdfHeight)} 0 0 cm\n/${imageName} Do\nQ\n`;
    const contentId = addObject(`<< /Length ${enc.encode(content).length} >>\nstream\n${content}endstream`);
    const imageId = addObject(concatBytes(
      enc.encode(`<< /Type /XObject /Subtype /Image /Width ${jpeg.width} /Height ${jpeg.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.data.length} >>\nstream\n`),
      jpeg.data,
      enc.encode('\nendstream')
    ));
    const pageId = addObject(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${fmt(size.pdfWidth)} ${fmt(size.pdfHeight)}] /Resources << /XObject << /${imageName} ${imageId} 0 R >> >> /Contents ${contentId} 0 R >>`);
    pageObjectIds.push(pageId);
  });

  objects[0] = enc.encode('<< /Type /Catalog /Pages 2 0 R >>');
  objects[1] = enc.encode(`<< /Type /Pages /Count ${pageObjectIds.length} /Kids [${pageObjectIds.map(id => `${id} 0 R`).join(' ')}] >>`);

  const chunks = [];
  const offsets = [0];
  let cursor = 0;
  const push = (bytes) => { chunks.push(bytes); cursor += bytes.length; };

  const header = enc.encode('%PDF-1.4\n%\xFF\xFF\xFF\xFF\n');
  push(header);

  objects.forEach((obj, i) => {
    offsets[i + 1] = cursor;
    push(enc.encode(`${i + 1} 0 obj\n`));
    push(obj);
    push(enc.encode('\nendobj\n'));
  });

  const xrefOffset = cursor;
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i += 1) {
    xref += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  xref += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  push(enc.encode(xref));

  return concatBytes(...chunks);
}

function concatBytes(...arrays) {
  const total = arrays.reduce((sum, arr) => sum + arr.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  arrays.forEach(arr => {
    out.set(arr, offset);
    offset += arr.length;
  });
  return out;
}

function fmt(number) {
  return Number(number).toFixed(2).replace(/\.00$/, '');
}
