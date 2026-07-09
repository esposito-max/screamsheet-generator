export function blockShell(innerHtml, className = '') {
  return `<article class="block ${className}" draggable="false">
    <button class="block-drag control-only" type="button" draggable="false" title="Move block" aria-label="Move block">✥</button>
    <button class="block-reorder control-only" type="button" draggable="true" title="Reorder block" aria-label="Reorder block">↕</button>
    <button class="block-remove control-only" type="button" title="Remove block">×</button>
    ${innerHtml}
  </article>`;
}

export function createBlock(type = 'article') {
  const blocks = {
    article: () => blockShell(`
      <div class="article">
        <h2 class="editable" contenteditable="true" data-placeholder="Headline">Reference Forests: Controversy?</h2>
        <p class="byline editable" contenteditable="true" data-placeholder="Byline">by Jackie McGee</p>
        <div class="article-body editable-block" contenteditable="true" data-placeholder="Article text"><p>Biotechnica is no stranger to cutting edge genetic engineering. Their latest crops and Orchard projects are helping curb food crisis across America.</p><p>Organizations like the Food Investor’s Corp fully endorsed these endeavors. Environmental groups remain less convinced.</p></div>
        <div class="article-links editable-block" contenteditable="true" data-placeholder="Links"><div>Link: Reference Forests</div><div>Link: Green Fist</div></div>
      </div>`, 'article-block'),
    lead: () => blockShell(`
      <div class="article lead-article">
        <span class="kicker editable" contenteditable="true" data-placeholder="Kicker">BREAKING</span>
        <h1 class="editable" contenteditable="true" data-placeholder="Lead headline">Biotechnica Researcher Found Alive</h1>
        <p class="dek editable" contenteditable="true" data-placeholder="Deck">A missing project lead resurfaces after a month inside the BosWash woods.</p>
        <div class="image-frame image-drop-target contain" tabindex="0"><span class="empty-label">Click to add image</span><img class="image-slot" data-image-role="body" alt="Lead story image" hidden /></div>
        <p class="byline editable" contenteditable="true" data-placeholder="Byline">by Jackie McGee</p>
        <div class="article-body editable-block" contenteditable="true" data-placeholder="Article text"><p>Professor Kōgan Akigo, head of Biotechnica’s Project Orchard, was found alive last week in the northeast woods. His current condition is unknown.</p><p>The researcher had been missing for over a month, leaving investors and local authorities trading accusations in public.</p></div>
      </div>`, 'article-block'),
    briefs: () => blockShell(`
      <div class="briefs-box">
        <h3 class="block-title editable" contenteditable="true" data-placeholder="Briefs title">Street Briefs</h3>
        <div class="editable-block" contenteditable="true" data-placeholder="Briefs">
          <div class="brief"><strong>Weng Fang Tong Blowout:</strong> Officials deny a larger gang war despite three confirmed attacks.</div>
          <div class="brief"><strong>Transport Hit:</strong> Biotechnica cargo remains missing after a late-night convoy disruption.</div>
          <div class="brief"><strong>MAX-TAC Watch:</strong> Calls increase after multiple “cyberpsycho” incidents.</div>
        </div>
      </div>`, 'briefs-block'),
    ad: () => blockShell(`
      <div class="ad-card">
        <div class="image-frame small image-drop-target contain" tabindex="0"><span class="empty-label">Logo / product image</span><img class="image-slot" data-image-role="ad" alt="Advertisement image" hidden /></div>
        <h2 class="editable" contenteditable="true" data-placeholder="Ad headline">Kibble Kirkle</h2>
        <p class="editable" contenteditable="true" data-placeholder="Ad copy">Hot protein. Cold price. Real flavor legally adjacent to meat.</p>
        <span class="price editable" contenteditable="true" data-placeholder="Price">5eb</span>
        <p class="fineprint editable" contenteditable="true" data-placeholder="Fine print">Availability varies by district. Side effects not reimbursed.</p>
      </div>`, 'ad-block'),
    warning: () => blockShell(`
      <div class="warning-box">
        <h3 class="block-title editable" contenteditable="true" data-placeholder="Warning title">Public Safety Advisory</h3>
        <div class="editable-block" contenteditable="true" data-placeholder="Warning text"><p><strong>Threat Level:</strong> Elevated.</p><p>Residents are advised to avoid unsecured alleys, abandoned clinics, and cargo exchanges in South Night City until further notice.</p><ul><li>Do not approach wounded strangers without backup.</li><li>Report combat-drug intoxication to your local security provider.</li></ul></div>
      </div>`, 'warning-block'),
    pullquote: () => blockShell(`
      <blockquote class="pullquote editable-block" contenteditable="true" data-placeholder="Pull quote">“Someone paid for silence. Someone else paid louder.”<cite>— anonymous source</cite></blockquote>`, 'pullquote-block'),
    links: () => blockShell(`
      <div class="links-box">
        <h3 class="block-title editable" contenteditable="true" data-placeholder="Links title">Related Data Pool Threads</h3>
        <div class="editable-block" contenteditable="true" data-placeholder="Links"><span class="fake-link">Link: NCPD Incident Map</span><span class="fake-link">Link: Local Bodega Cam Feed</span><span class="fake-link">Link: Net54 Counterclaim</span></div>
      </div>`, 'links-block'),
    image: () => blockShell(`
      <div class="image-frame tall image-drop-target contain" tabindex="0"><span class="empty-label">Click to add image / map / diagram</span><img class="image-slot" data-image-role="map" alt="Map or diagram" hidden /></div>
      <p class="caption editable" contenteditable="true" data-placeholder="Caption">Diagram compiled from Agent telemetry and disputed CitiNet pings.</p>`, 'image-block span-all'),
    'photo-article': () => blockShell(`
      <div class="article photo-article">
        <span class="kicker editable" contenteditable="true" data-placeholder="Kicker">STREET PHOTO</span>
        <h2 class="editable" contenteditable="true" data-placeholder="Headline">Security Cam Still Raises Questions</h2>
        <div class="image-frame inline-image image-drop-target cover" tabindex="0"><span class="empty-label">Click to add photo</span><img class="image-slot" data-image-role="photo" alt="Article photo" hidden /></div>
        <p class="caption editable" contenteditable="true" data-placeholder="Caption">Recovered frame from an edited CitiNet feed.</p>
        <p class="byline editable" contenteditable="true" data-placeholder="Byline">by Mira Vox</p>
        <div class="article-body editable-block" contenteditable="true" data-placeholder="Article text"><p>The image circulating through local patches appears to show a masked crew near the transport minutes before the official emergency call.</p><p>Corporate spokespeople called the still “unauthenticated,” which in Night City usually means someone paid to keep it that way.</p></div>
      </div>`, 'article-block image-pos-top'),
    'hero-image': () => blockShell(`
      <div class="hero-card image-drop-target cover" tabindex="0">
        <span class="empty-label">Click to add full-width image</span>
        <img class="image-slot" data-image-role="hero" alt="Hero image" hidden />
        <div class="hero-overlay">
          <span class="kicker editable" contenteditable="true" data-placeholder="Kicker">EXCLUSIVE</span>
          <h2 class="editable" contenteditable="true" data-placeholder="Headline">Cargo Route Blackout</h2>
          <p class="editable" contenteditable="true" data-placeholder="Caption">A full-width visual panel for photos, product shots, contact screenshots, maps, or advisory graphics.</p>
        </div>
      </div>`, 'hero-image-block span-all'),
    qa: () => blockShell(`
      <div class="qa-box">
        <h3 class="block-title editable" contenteditable="true" data-placeholder="Interview title">Interview Transcript</h3>
        <div class="editable-block" contenteditable="true" data-placeholder="Q&A text">
          <div class="qa-row"><strong class="qa-mark">Q:</strong><p>Did you authorize the raid?</p></div>
          <div class="qa-row"><strong class="qa-mark">A:</strong><p>No. I authorized a recovery action. The difference is legal, expensive, and very important.</p></div>
          <div class="qa-row"><strong class="qa-mark">Q:</strong><p>Were there civilian casualties?</p></div>
          <div class="qa-row"><strong class="qa-mark">A:</strong><p>Define civilian.</p></div>
        </div>
      </div>`, 'qa-block'),
    stat: () => blockShell(`
      <div class="stat-box">
        <h3 class="block-title editable" contenteditable="true" data-placeholder="Stat title">Opposition Snapshot</h3>
        <div class="editable-block" contenteditable="true" data-placeholder="Stat content">
          <div class="stat-line"><strong>Type</strong><span>Hardened Light security team</span></div>
          <div class="stat-line"><strong>Goal</strong><span>Protect cargo, suppress witnesses</span></div>
          <div class="stat-line"><strong>Gear</strong><span>Kevlar, heavy pistols, flashbangs</span></div>
          <div class="stat-line"><strong>Twist</strong><span>One member is feeding intel to a rival Fixer</span></div>
        </div>
      </div>`, 'stat-block'),
    timeline: () => blockShell(`
      <div class="timeline-box">
        <h3 class="block-title editable" contenteditable="true" data-placeholder="Timeline title">Event Timeline</h3>
        <ol class="editable-block" contenteditable="true" data-placeholder="Timeline items">
          <li><strong>22:10</strong> — Convoy drops from regular grid.</li>
          <li><strong>22:16</strong> — Local cameras return static.</li>
          <li><strong>22:23</strong> — First responder pings scrubbed from Data Pool.</li>
          <li><strong>22:41</strong> — Unmarked van seen leaving district.</li>
        </ol>
      </div>`, 'timeline-block')
  };
  return (blocks[type] || blocks.article)();
}

export function createPageBody(templateName = 'nct-multi') {
  // V9: templates are truly blank. They do not insert real layout
  // sections, block placeholders, or predetermined drop zones. The
  // selected template only chooses the page's initial guide/layout class
  // in main.js; the user adds all blocks explicitly.
  return '';
}

function gmScenarioBlocks() {
  return `${blockShell(`
    <div class="gm-box">
      <h3 class="block-title editable" contenteditable="true">Background</h3>
      <div class="editable-block" contenteditable="true"><p>A small organization hits a weakened gang base, earns a morale boost, then uses the momentum to strike a Biotechnica transport. The stolen pharmaceuticals destabilize several users and trigger public violence.</p></div>
    </div>`, 'gm-block')}
    ${blockShell(`
    <div class="gm-box">
      <h3 class="block-title editable" contenteditable="true">Hooks</h3>
      <ul class="editable-block" contenteditable="true"><li>A Fixer wants the transport manifest recovered.</li><li>A Media wants the covert hit connected to the later killings.</li><li>A gang survivor wants extraction before cleanup crews arrive.</li></ul>
    </div>`, 'gm-block')}
    ${blockShell(`
    <div class="gm-box">
      <h3 class="block-title editable" contenteditable="true">Complications</h3>
      <ul class="editable-block" contenteditable="true"><li>One witness is chemically euphoric and unreliable.</li><li>Security footage was edited, not deleted.</li><li>The “small org” has a corporate investor.</li></ul>
    </div>`, 'gm-block')}
    ${createBlock('stat')}`;
}
