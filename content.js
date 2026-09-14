// content.js - WITH COMPLETE ANALYTICS + UNCHANGED GOLDEN RATIO

// 🧹 SELF-CLEANING
const existingBubble = document.getElementById("smart-reader-bubble");
if (existingBubble) existingBubble.remove();

const existingTrigger = document.getElementById("smart-reader-trigger");
if (existingTrigger) existingTrigger.remove();

// Retry wrapper for chrome.runtime.sendMessage (handles service worker wake-up)
function sendMessageWithRetry(message, callback, retries = 1) {
    chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError && retries > 0) {
            setTimeout(() => sendMessageWithRetry(message, callback, retries - 1), 500);
        } else {
            if (callback) callback(response);
        }
    });
}

// 1. Elements
const bubble = document.createElement("div");
bubble.setAttribute("id", "smart-reader-bubble");
document.body.appendChild(bubble);

const triggerBtn = document.createElement("div");
triggerBtn.setAttribute("id", "smart-reader-trigger");
// The trigger's mark (Lit Line) is painted from CSS as a self-contained data
// URI, not an inline <svg>: fragment refs like url(#gradient) break on host
// pages that set a <base href>, and inline <defs> would leak ids into the
// host page's id namespace.
document.body.appendChild(triggerBtn);

// ========================================
// ✨ GOLDEN RATIO STYLES ✨
// (COMPLETELY UNCHANGED)
// ========================================
const styles = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

    /* ✨ NEW: Golden Ratio Design System */
    :root {
      --phi: 1.618;
      --pi: 3.14159;

      /* ✨ NEW: Fibonacci Spacing Scale */
      --space-xs: 3px;
      --space-sm: 5px;
      --space-md: 8px;
      --space-lg: 13px;
      --space-xl: 21px;
      --space-xxl: 34px;
      --space-2xl: 55px;

      /* ✨ NEW: φ-based animation timings */
      --timing-fast: 0.236s;    /* φ^-2 */
      --timing-normal: 0.382s;  /* φ^-1 */
      --timing-slow: 0.618s;    /* 1/φ */

      /* ═══ Liquid Glass ═══
         Namespaced --sr-* because these tokens land in the HOST page's :root
         (no shadow DOM) and a bare --glass-bg would collide with the site's own. */
      --sr-glass-blur: 55px;                      /* Fibonacci — deeper frost */
      --sr-glass-sat: 180%;
      /* ── Frosted glass ─────────────────────────────────────────────
         Retuned 2026-09-12 against a monochrome reference. The previous pass
         chased refraction — a near-transparent middle plus a saturated lens
         band at the edge — and read as coloured, busy, and hard to read over
         photos. This one is milky and calm: the backdrop is blurred and only
         barely re-saturated, and the edge is SHADING (a light top-left, a soft
         dark bottom-right) rather than a lens. Legibility first, calm second.  */
      --sr-fx-body: blur(20px) saturate(105%) brightness(1.06) contrast(0.97);
      --sr-fx-lens: none;   /* lens band retired — the milky surface carries the
                               edge on its own, and this removes the second
                               nested backdrop-filter from every glass surface */
      --sr-fx-sm:   blur(16px) saturate(105%) brightness(1.08) contrast(0.97);
      --sr-lens-w: var(--space-lg);                              /* edge thickness */

      /* Specular set, dual-tone. Light catches the top-left; a soft shadow sits
         at the bottom-right. That dark inset is what makes the surface read as
         a physical object rather than a flat white shape — the all-white set
         this replaces is why the old bubble looked pasted on. */
      --sr-spec:
        inset 0 1.5px 0 rgba(255,255,255,0.92),
        inset 1.5px 0 0 rgba(255,255,255,0.52),
        inset 0 18px 28px -20px rgba(255,255,255,0.75),
        inset -1.2px 0 0 rgba(17,24,39,0.05),
        inset 0 -1.2px 0 rgba(17,24,39,0.07),
        inset 0 -20px 26px -22px rgba(17,24,39,0.10);
      --sr-spec-sm:
        inset 0 1.2px 0 rgba(255,255,255,0.92),
        inset 1.2px 0 0 rgba(255,255,255,0.50),
        inset 0 9px 13px -10px rgba(255,255,255,0.70),
        inset -1px -1px 0 rgba(17,24,39,0.06),
        inset 0 -9px 12px -11px rgba(17,24,39,0.10);
      /* Milky, not clear. Also the fix for Sinhala over photo-heavy pages. */
      --sr-glass-top: rgba(255,255,255,0.66);
      --sr-glass-mid: rgba(255,255,255,0.54);
      --sr-glass-bot: rgba(255,255,255,0.58);
      /* accent glass, by role — see the panel comments below */
      --sr-teal-deep: #0e7490;
      --sr-teal-veil: rgba(8,145,178,0.09);
      --sr-teal-line: rgba(8,145,178,0.26);
      --sr-teal-glow: rgba(8,145,178,0.28);
      --sr-green: #047857;
      --sr-green-line: rgba(16,185,129,0.28);
      /* Neutral directional rim: one light source, top-left. Bright white where
         the light lands, fading to a faint dark at the far edge. The amber/teal
         iridescent version this replaces put coloured light in a scene that has
         none, which is the single loudest thing about the old pass. */
      --sr-rim: linear-gradient(140deg,
                  rgba(255,255,255,0.95) 0%,
                  rgba(255,255,255,0.42) 28%,
                  rgba(255,255,255,0.18) 54%,
                  rgba(17,24,39,0.05) 80%,
                  rgba(17,24,39,0.11) 100%);
      /* Gel: a bright top half over any fill, the way light sits on a lozenge. */
      --sr-gel: linear-gradient(180deg, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0.34) 52%, rgba(255,255,255,0.50) 100%);
      --sr-glass-soft: rgba(255,255,255,0.70);    /* chips, pills */
      --sr-glass-line: rgba(255,255,255,0.55);    /* borders */
      --sr-glass-spec: rgba(255,255,255,0.95);    /* top specular edge */

      --sr-amber: #fbbf24;                        /* brand primary — fills, glows */
      --sr-amber-hi: #fcd34d;                     /* hover */
      --sr-amber-deep: #a84e08;                   /* text-safe amber on glass:
                                                     #d97706 was ~3.0:1 on the new
                                                     milky surface and failed AA at
                                                     16px; this is ~4.6:1 */
      --sr-amber-ink: #78350f;                    /* dark text on amber fills (white fails contrast) */
      --sr-amber-glow: rgba(251,191,36,0.30);
      --sr-amber-veil: rgba(251,191,36,0.10);

      --sr-ink: #111827;
      --sr-ink-soft: #374151;
      --sr-ink-mute: #6b7280;
      --sr-shadow: rgba(17,24,39,0.18);
    }
    
    /* === VIDEO UNLOCKER === */
    .ytp-caption-segment, 
    .player-timedtext-text-container span,
    .we-hint,
    .caption-window {
        user-select: text !important;
        -webkit-user-select: text !important;
        cursor: text !important;
        pointer-events: auto !important;
    }
    
    #smart-reader-bubble {
        width: 400px;
        max-width: 90vw;
        min-height: 247px;            /* 400 / φ */
        max-height: 80vh;
        display: none; flex-direction: column;
        font-family: 'Inter', system-ui, sans-serif;

        /* Liquid glass: sample the page, then lay a scrim over it so text
           stays crisp no matter what is behind (white article, dark PDF, photo). */
        /* Scrim is a gradient, not a flat fill — brighter at the top reads as
           light landing on a pane. Grain on top of it kills gradient banding. */
        background:
          url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='140' height='140'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3'/></filter><rect width='140' height='140' filter='url(%23n)' opacity='0.035'/></svg>"),
          linear-gradient(180deg, var(--sr-glass-top) 0%, var(--sr-glass-mid) 46%, var(--sr-glass-bot) 100%);
        -webkit-backdrop-filter: var(--sr-fx-body);
        backdrop-filter: var(--sr-fx-body);
        border: none;                                  /* replaced by the ::after rim */
        border-radius: var(--space-xxl);               /* 34px — reference proportion */

        /* No ambient amber bloom. A pane of glass sitting above a page casts a
           neutral shadow; coloured light around it is what made the old bubble
           read as a decorated object rather than a surface. */
        box-shadow:
          0 var(--space-xl) 44px -16px rgba(17,24,39,0.26),
          0 var(--space-md) var(--space-lg) -9px rgba(17,24,39,0.13),
          var(--sr-spec);

        position: fixed; z-index: 2147483647;
        resize: both; overflow: hidden;
        animation: popIn var(--timing-normal) cubic-bezier(0.16, 1, 0.3, 1);
    }

    /* ── the lens ────────────────────────────────────────────────────────
       A band at the edge that filters the backdrop a SECOND time — sharper,
       brighter, more saturated than the panel's own filter. That differential
       is refraction: light bending as it passes through the thick rim of a
       slab. Masked to the band, so the flat middle stays clear and the 21px
       body padding keeps text well inside it. */
    #smart-reader-bubble::before {
        content: ''; position: absolute; inset: 0;
        border-radius: inherit; padding: var(--sr-lens-w);
        -webkit-backdrop-filter: var(--sr-fx-lens);
        backdrop-filter: var(--sr-fx-lens);
        -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
        -webkit-mask-composite: xor;
        mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
        mask-composite: exclude;
        pointer-events: none; z-index: 1;
    }
    /* content rides above the lens */
    #smart-reader-bubble > * { position: relative; z-index: 2; }

    /* the bright line right at the glass edge, over the lens */
    #smart-reader-bubble::after {
        content: ''; position: absolute; inset: 0;
        border-radius: inherit; padding: 1px;
        background: var(--sr-rim);
        -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
        -webkit-mask-composite: xor;
        mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
        mask-composite: exclude;
        pointer-events: none;
        z-index: 2;
    }
    
    #sr-general-modal {
        position: absolute; top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0, 0, 0, 0.5); backdrop-filter: blur(4px);
        display: none; align-items: center; justify-content: center;
        z-index: 10; 
        animation: fadeIn var(--timing-fast);
    }
    #sr-general-modal.active { display: flex; }
    
    .sr-general-card {
        background: linear-gradient(180deg, var(--sr-glass-top) 0%, var(--sr-glass-bot) 100%);
        -webkit-backdrop-filter: var(--sr-fx-body);
        backdrop-filter: var(--sr-fx-body);
        border: 1px solid var(--sr-glass-line);
        border-radius: var(--space-xl);
        padding: var(--space-xl);
        max-width: calc(400px / var(--phi));
        margin: var(--space-xl);
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
        animation: slideUp var(--timing-normal) cubic-bezier(0.16, 1, 0.3, 1);
    }
    
    @keyframes slideUp { 
        from { opacity: 0; transform: translateY(var(--space-xl)); } 
        to { opacity: 1; transform: translateY(0); } 
    }
    
    .sr-general-header { 
        display: flex; justify-content: space-between; align-items: center; 
        margin-bottom: var(--space-lg); 
        padding-bottom: var(--space-md);
        border-bottom: 2px solid #ecfeff; 
    }
    
    .sr-general-title { 
        font-size: 16px; font-weight: 700; color: #0891b2; 
        display: flex; align-items: center; 
        gap: var(--space-md); 
    }
    
    .sr-general-close { 
        width: 26px; height: 26px; border-radius: 50%; 
        background: var(--sr-gel), var(--sr-glass-soft);
        -webkit-backdrop-filter: blur(var(--space-lg));
        backdrop-filter: blur(var(--space-lg));
        border: 1px solid rgba(255,255,255,0.6); color: var(--sr-ink-mute); cursor: pointer; 
        display: flex; align-items: center; justify-content: center; 
        font-size: 18px; 
        transition: all var(--timing-fast); 
    }
    .sr-general-close:hover { background: #fee2e2; color: #ef4444; }
    
    .sr-general-content {
        color: #374151; font-size: 15px;
        line-height: var(--phi);
    }
    
    .sr-general-sinhala { 
        color: #0891b2; font-weight: 700; 
        font-family: var(--sr-lang-font, sans-serif); 
        margin-top: var(--space-md); 
        font-size: 13px; 
    }
    
    .sr-general-uses { 
        margin-top: var(--space-lg); 
        padding-top: var(--space-lg); 
        border-top: 1px solid #f3f4f6; 
    }
    
    .sr-general-uses-title { 
        font-size: 13px; font-weight: 700; color: #0e7490; 
        margin-bottom: var(--space-md); 
    }
    
    .sr-general-uses ul { 
        margin: 0; padding-left: 18px; font-size: 13px; color: #374151; 
    }
    
    .sr-general-uses li { 
        margin-bottom: var(--space-md); 
        line-height: 1.5; 
    }
    
    .sr-gen-trans { 
        color: #0891b2; font-weight: 700; 
        font-family: var(--sr-lang-font, sans-serif); 
    }
    
    /* ✨ ENHANCED STAR LOADING ANIMATION */
    .sr-neural-container { 
        display: flex; justify-content: center; 
        gap: var(--space-lg); 
        margin-bottom: var(--space-xxl);
        margin-top: var(--space-md); 
    }
    
    .sr-neural-node { 
        width: var(--space-md); 
        height: var(--space-md); 
        border-radius: 50%; 
        background: #e5e7eb; 
        animation: srConnect calc(var(--timing-slow) * 2.27) infinite ease-in-out both;
    }
    
    .sr-node-1 { animation-delay: -0.32s; } 
    .sr-node-2 { animation-delay: -0.16s; } 
    .sr-node-3 { animation-delay: 0s; }
    
    /* ✨ ENHANCED: Star-like pulsing effect */
    @keyframes srConnect { 
        0%, 80%, 100% { 
            transform: scale(0.8) rotate(0deg); 
            background: #e5e7eb; 
            opacity: 0.3; 
        } 
        40% { 
            transform: scale(1.4) rotate(90deg); 
            background: #fbbf24;
            opacity: 1; 
            box-shadow: 
              0 0 var(--space-lg) rgba(251, 191, 36, 0.6),
              0 0 var(--space-xl) rgba(251, 191, 36, 0.3);
        } 
    }
    
    .sr-imprint-word { 
        font-size: 24px; font-weight: 800; color: #111827; 
        text-transform: uppercase; letter-spacing: 4px; 
        margin-bottom: var(--space-md); 
        text-align: center; min-height: 30px; 
        display: flex; justify-content: center; 
    }
    
    .sr-char { 
        opacity: 0; 
        animation: typeReveal 0.1s forwards; 
    }
    
    @keyframes typeReveal { to { opacity: 1; transform: translateY(0); } }
    
    .sr-loading-container { 
        padding: 40px var(--space-xl); 
        text-align: center; 
    }
    
    .sr-loading-text { 
        font-size: 12px; font-weight: 500; color: #6b7280; 
        margin-bottom: var(--space-xxl); 
        letter-spacing: 0.5px; 
    }
    
    .sr-cancel-btn {
        padding: var(--space-md) var(--space-xl);
        font-size: 11px; font-weight: 700; color: #ef4444;
        border: 1px solid rgba(254,226,226,0.9); border-radius: 100px;
        background: var(--sr-glass-soft);
        -webkit-backdrop-filter: blur(var(--space-lg));
        backdrop-filter: blur(var(--space-lg));
        cursor: pointer;
        transition: all var(--timing-fast);
        text-transform: uppercase; letter-spacing: 1px;
        box-shadow: inset 0 1px 0 rgba(255,255,255,0.9);
    }
    .sr-cancel-btn:hover {
        background: rgba(254,226,226,0.85); border-color: #fecaca;
        transform: translateY(-1px);
    }
    
    .sr-header {
        padding: var(--space-lg) var(--space-xl);
        background: linear-gradient(180deg, rgba(255,255,255,0.22), rgba(255,255,255,0));
        border-bottom: 1px solid rgba(255,255,255,0.35);
        cursor: move; user-select: none; flex-shrink: 0; position: relative;
    }
    
    .sr-header-top { 
        display: flex; align-items: center; justify-content: space-between; 
        padding-right: 30px; 
    }
    
    .sr-word {
        margin:0; font-size: 22px; font-weight: 800;
        color: var(--sr-ink); letter-spacing: -0.5px;
        text-shadow: 0 1px 0 rgba(255,255,255,0.55);
    }
    
    /* The hero element, and now the only place amber appears at full strength.
       No glow: a text-shadow in the same hue softens the letterforms, and this
       line is the one thing on the surface that has to stay razor-sharp. */
    .sr-translation {
        font-size: 17px; color: var(--sr-amber-deep);
        font-family: var(--sr-lang-font, sans-serif);
        font-weight: 600; margin-top: var(--space-xs);
        line-height: 1.5;
    }
    
    .sr-close-btn {
        position: absolute; top: 12px; right: 12px;
        width: 26px; height: 26px; border-radius: 50%;
        background: var(--sr-glass-soft);
        -webkit-backdrop-filter: blur(var(--space-lg));
        backdrop-filter: blur(var(--space-lg));
        border: 1px solid rgba(255,255,255,0.6);
        box-shadow: inset 0 1px 0 rgba(255,255,255,0.9);
        color: var(--sr-ink-mute);
        font-size: 17px; cursor: pointer;
        display: flex; align-items: center; justify-content: center;
        transition: all var(--timing-fast);
    }
    .sr-close-btn:hover {
        background: rgba(254,226,226,0.85); color: #ef4444;
        border-color: rgba(252,165,165,0.7);
    }
    
    .sr-icons { 
        display: flex; 
        gap: var(--space-sm); 
        margin-top: var(--space-sm); 
    }
    
    /* Google search menu */
    .sr-g-wrap { position: relative; display: inline-flex; }
    .sr-g-menu {
        /* Right-anchored: the icons sit at the bubble's top-right and
           #smart-reader-bubble is overflow:hidden, so a left-anchored menu
           gets clipped. Opening leftward keeps it inside the 400px bubble. */
        position: absolute; top: calc(var(--space-xxl) + var(--space-sm)); right: 0; left: auto;
        width: 208px; max-width: 208px;
        background:
          linear-gradient(180deg, var(--sr-glass-top) 0%, var(--sr-glass-bot) 100%);
        -webkit-backdrop-filter: var(--sr-fx-body);
        backdrop-filter: var(--sr-fx-body);
        border: none;
        border-radius: var(--space-xl);
        box-shadow:
          0 var(--space-lg) var(--space-xxl) -8px rgba(17,24,39,0.24),
          var(--sr-spec-sm);
        padding: var(--space-sm);
        z-index: 2147483647; display: none;
        font-family: 'Inter', system-ui, sans-serif;
        transform-origin: top right;
    }
    .sr-g-menu.sr-open { animation: srMenuIn var(--timing-fast) cubic-bezier(0.16, 1, 0.3, 1); }
    @keyframes srMenuIn {
        from { opacity: 0; transform: scale(0.94) translateY(-4px); }
        to   { opacity: 1; transform: scale(1) translateY(0); }
    }
    .sr-g-menu.sr-open { display: block; }
    .sr-g-item {
        display: flex; align-items: center; gap: var(--space-md); width: 100%;
        background: none; border: none; text-align: left; cursor: pointer;
        padding: var(--space-md) var(--space-lg);
        border-radius: var(--space-md);
        font-size: 12.5px; color: var(--sr-ink-soft);
        line-height: 1.35; box-sizing: border-box; overflow-wrap: anywhere;
        transition: all var(--timing-fast);
    }
    .sr-g-item:hover {
        background: var(--sr-amber-veil);
        color: var(--sr-ink);
    }
    .sr-g-item:hover .sr-g-ico { color: var(--sr-amber-deep); }
    .sr-g-item .sr-g-ico {
        width: 15px; height: 15px; flex: 0 0 15px;
        display: flex; align-items: center; justify-content: center;
        color: var(--sr-ink-mute);
        transition: color var(--timing-fast);
    }
    .sr-g-item .sr-g-ico svg { display: block; }
    .sr-g-item .sr-g-q { flex: 1 1 auto; min-width: 0; font-weight: 500; }
    .sr-g-item .sr-g-q b { font-weight: 700; color: var(--sr-ink); }

    /* ── small-control lens ──────────────────────────────────────────────
       Chips and pills carry no body text, so they take Liquid Glass neat:
       almost no tint, and the edge doing all the work. position:relative is
       required — the ::before is absolutely positioned against it. */
    .sr-icon-btn, .sr-secondary-btn, .sr-close-btn, .sr-cancel-btn,
    .sr-view-btn, .sr-delete-btn, .sr-nav-btn { position: relative; }
    .sr-icon-btn::before, .sr-secondary-btn::before, .sr-close-btn::before,
    .sr-cancel-btn::before, .sr-view-btn::before, .sr-delete-btn::before,
    .sr-nav-btn::before {
        content: ''; position: absolute; inset: 0;
        border-radius: inherit; padding: var(--space-sm);
        -webkit-backdrop-filter: var(--sr-fx-lens);
        backdrop-filter: var(--sr-fx-lens);
        -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
        -webkit-mask-composite: xor;
        mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
        mask-composite: exclude;
        pointer-events: none;
    }
    .sr-secondary-btn > *, .sr-icon-btn > * { position: relative; z-index: 1; }

    .sr-icon-btn {
        width: var(--space-xxl); height: var(--space-xxl);   /* 34px, Fibonacci */
        border-radius: 50%;
        background: rgba(255,255,255,0.16);
        -webkit-backdrop-filter: var(--sr-fx-sm);
        backdrop-filter: var(--sr-fx-sm);
        border: none;
        box-shadow:
          0 var(--space-sm) var(--space-lg) -6px rgba(17,24,39,0.30),
          var(--sr-spec-sm);
        font-size: 14px; cursor: pointer;
        transition: all var(--timing-fast);
        display: flex; align-items: center; justify-content: center;
    }
    .sr-icon-btn:hover {
        background: rgba(255,255,255,0.78);
        transform: translateY(-1px);
        box-shadow:
          0 var(--space-sm) var(--space-lg) -2px rgba(17,24,39,0.14),
          inset 0 1px 0 var(--sr-glass-spec);
    }
    .sr-icon-btn:active { transform: translateY(0); }
    
    #sr-audio-btn { background: #eef2ff; color: #4f46e5; } 
    #sr-audio-btn:hover { background: #4f46e5; color: #fff; }
    #sr-google-btn.sr-open-ring {
        background: rgba(255,255,255,0.85);
        box-shadow:
          0 0 0 3px var(--sr-amber-veil),
          0 var(--space-sm) var(--space-lg) -2px rgba(17,24,39,0.14),
          inset 0 1px 0 var(--sr-glass-spec);
    }
    #sr-video-btn { background: #fff0f0; color: #e11d48; border: 1px solid #ffe4e6; } 
    #sr-video-btn:hover { background: #e11d48; color: #fff; }
    #sr-save-btn { background: #fff; border: 1px solid #e5e7eb; color: #9ca3af; } 
    #sr-save-btn:hover { background: #fef2f2; color: #ef4444; border-color: #fca5a5; }
    #sr-save-btn.sr-saved { background: #ef4444; color: #fff; border-color: #ef4444; }
    #sr-list-btn { background: #fff; border: 1px solid #e5e7eb; color: #6b7280; }
    #sr-list-btn:hover { background: #f3f4f6; color: #111827; }
    #sr-study-btn { background: #fef3c7; border: 1px solid #fbbf24; color: #92400e; }
    #sr-study-btn:hover { background: #fbbf24; color: #fff; }
    
    .sr-nav-btn { 
        background: #f3f4f6; border: 1px solid #e5e7eb; border-radius: 4px; 
        font-size: 12px; 
        padding: 4px var(--space-md); 
        cursor: pointer; color: #374151; font-weight: 600; 
    }
    .sr-nav-btn:hover { background: #e5e7eb; } 
    .sr-nav-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    
    .sr-body {
        padding: var(--space-xl);
        overflow-y: auto; flex-grow: 1;
        scrollbar-width: thin; scrollbar-color: #d1d5db transparent;
        height: 100%; position: relative;
        max-height: 60vh;
    }
    .sr-body::-webkit-scrollbar { width: 6px; } 
    .sr-body::-webkit-scrollbar-track { background: transparent; } 
    .sr-body::-webkit-scrollbar-thumb { 
        background-color: #d1d5db; 
        border-radius: calc(var(--pi) * 6.37px);
    }
    
    .sr-section { 
        margin-bottom: var(--space-xl); 
    } 
    .sr-section:last-child { margin-bottom: 0; }

    /* Right-to-left. The dir attribute is set from the language pack's rtl
       flag, so adding Urdu or Hebrew needs no change here. */
    #smart-reader-bubble[dir="rtl"] .sr-body { direction: rtl; text-align: right; }
    #smart-reader-bubble[dir="rtl"] .sr-word,
    #smart-reader-bubble[dir="rtl"] .sr-translation { text-align: right; }
    #smart-reader-bubble[dir="rtl"] .sr-header-top { flex-direction: row-reverse; }
    #smart-reader-bubble[dir="rtl"] .sr-icons { flex-direction: row-reverse; }

    /* Quota-fallback note. Deliberately a sibling of .sr-body, NOT a child:
       saveWord() reads '.sr-section:nth-of-type(2) .sr-sub-text', and
       :nth-of-type counts elements by TAG, not by class — so any div added
       inside .sr-body would shift which section gets saved. Neutral, because
       it is a footnote about plumbing, not information about the word. */
    .sr-fallback-note {
        display: flex; align-items: flex-start; gap: var(--space-sm);
        padding: 0 var(--space-xl) var(--space-lg);
        font-size: 11px; line-height: 1.5;
        color: var(--sr-ink-mute);
    }
    .sr-fallback-note code {
        font-family: ui-monospace, SFMono-Regular, monospace;
        font-size: 10.5px; color: var(--sr-ink-soft);
    }
    
    .sr-subtitle-overlay { 
        position: absolute; bottom: 0; left: 0; width: 100%; 
        background: linear-gradient(to top, rgba(0,0,0,0.9), rgba(0,0,0,0.6) 70%, rgba(0,0,0,0)); 
        padding: var(--space-xl) var(--space-lg) var(--space-lg) var(--space-lg); 
        color: #f3f4f6; text-align: center; font-size: 14px; 
        line-height: 1.4; font-weight: 500; box-sizing: border-box; 
        text-shadow: 0 1px 2px rgba(0,0,0,0.8); 
    }
    
    .sr-hl-video { 
        color: #fcd34d; font-weight: 800; 
        text-decoration: underline; text-underline-offset: 3px; 
    }
    
    .sr-def {
        font-size: 15px; color: var(--sr-ink); margin: 0;
        line-height: var(--phi);
        font-weight: 500;                       /* holds up on a thinner scrim */
        text-shadow: 0 1px 0 rgba(255,255,255,0.6);
    }
    
    .sr-def-label {
        display: inline-block;
        background: linear-gradient(135deg, var(--sr-amber-hi) 0%, #f59e0b 100%);
        color: var(--sr-amber-ink);
        padding: 2px var(--space-lg);
        border-radius: 100px; font-size: 11px; font-weight: 700;
        letter-spacing: 0.5px;
        margin-right: var(--space-sm);
        box-shadow:
          0 1px 3px rgba(217,119,6,0.30),
          inset 0 1px 0 rgba(255,255,255,0.55);
    }
    
    .sr-sub-text {
        font-size: 14px; color: var(--sr-ink-soft);
        font-family: var(--sr-lang-font, sans-serif);
        margin: var(--space-md) 0 0 0;
        padding: var(--space-lg);
        background: rgba(254,243,199,0.62);
        -webkit-backdrop-filter: blur(var(--space-lg));
        backdrop-filter: blur(var(--space-lg));
        border: 1px solid rgba(251,191,36,0.28);
        border-radius: var(--space-lg);
        line-height: var(--phi);
    }
    
    .sr-highlight { 
        background: #fde68a; padding: 1px 4px; 
        border-radius: var(--space-xs); 
        color: #92400e; font-weight: 700; 
    }
    
    .sr-sub-text b {
        color: var(--sr-amber-deep); font-weight: 800;
        background: rgba(253,230,138,0.75);
        padding: 1px var(--space-sm);
        border-radius: var(--space-sm);
    }
    
    /* ── follow-up panels ──────────────────────────────────────────────
       Context is amber: the product's core promise, the meaning HERE.
       General is teal: the zoom-out, dictionary view — the brand's second accent.
       Simple is green: the approachable register, for a younger reader.
       Gemini emits .sr-general-box / .sr-simple-box and they had no rules at all
       until now; the prompts' inline colours are removed so these win. */
    .sr-general-box, .sr-simple-box { position: relative; }
    .sr-general-box::before, .sr-simple-box::before {
        content: ''; position: absolute; inset: 0;
        border-radius: inherit; padding: var(--space-md);
        -webkit-backdrop-filter: var(--sr-fx-lens);
        backdrop-filter: var(--sr-fx-lens);
        -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
        -webkit-mask-composite: xor;
        mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
        mask-composite: exclude;
        pointer-events: none;
    }
    .sr-general-box > *, .sr-simple-box > * { position: relative; z-index: 1; }
    .sr-general-box, .sr-simple-box {
        padding: var(--space-lg);
        border-radius: var(--space-xl);
        margin-top: var(--space-lg);
        -webkit-backdrop-filter: var(--sr-fx-body);
        backdrop-filter: var(--sr-fx-body);
        box-shadow: inset 0 1px 0 rgba(255,255,255,0.85);
        animation: fadeIn var(--timing-normal) both;
    }
    .sr-general-box {
        background: linear-gradient(180deg, rgba(236,254,255,0.78) 0%, rgba(236,254,255,0.52) 100%);
        border: 1px solid var(--sr-teal-line);
    }
    .sr-general-box .sr-label { color: var(--sr-teal-deep); }
    .sr-general-box .sr-sub-text {
        background: rgba(8,145,178,0.08);
        border-color: var(--sr-teal-line);
        color: #0b4f5e;
    }
    .sr-general-box .sr-sub-text b { color: var(--sr-teal-deep); background: rgba(8,145,178,0.14); }

    .sr-simple-box {
        background: linear-gradient(180deg, rgba(240,253,244,0.80) 0%, rgba(240,253,244,0.54) 100%);
        border: 1px solid var(--sr-green-line);
    }
    .sr-simple-box .sr-label { color: var(--sr-green); }
    .sr-simple-box .sr-sub-text {
        background: rgba(16,185,129,0.08);
        border-color: var(--sr-green-line);
        color: #14532d;
    }
    .sr-simple-box .sr-sub-text b { color: var(--sr-green); background: rgba(16,185,129,0.14); }

    .sr-hook-box {
        background: rgba(255,251,235,0.70);
        -webkit-backdrop-filter: blur(var(--space-lg));
        backdrop-filter: blur(var(--space-lg));
        border: 1px solid rgba(251,191,36,0.22);
        border-left: 4px solid #f59e0b;
        padding: var(--space-lg);
        border-radius: var(--space-lg);
        margin-top: var(--space-lg);
        box-shadow:
          0 1px 3px rgba(17,24,39,0.05),
          inset 0 1px 0 rgba(255,255,255,0.7);
    }
    
    .sr-label { 
        font-size: 12px; font-weight: 700; color: #92400e; 
        display: inline-block; 
        margin-bottom: var(--space-sm); 
    }
    
    .sr-hook-text {
        font-size: 15px; color: #1f2937;
        margin: var(--space-sm) 0 0 0;
        font-weight: 500;
        line-height: var(--phi);
    }
    
    .sr-chat {
        display: flex; flex-direction: column;
        gap: var(--space-md);
        background: rgba(255,255,255,0.45);
        -webkit-backdrop-filter: blur(var(--space-lg));
        backdrop-filter: blur(var(--space-lg));
        padding: var(--space-lg);
        border-radius: var(--space-lg);
        margin-top: var(--space-md);
        border: 1px solid rgba(255,255,255,0.6);
        box-shadow: inset 0 1px 0 rgba(255,255,255,0.8);
    }
    
    .sr-chat-bubble {
        font-size: 14px; color: #374151;
        padding: var(--space-md) var(--space-lg); 
        border-radius: var(--space-md); 
        line-height: 1.5; 
    }
    
    .sr-chat-a { background: #fff; border: 1px solid #e5e7eb; color: #6b7280; } 
    .sr-chat-b { background: #eef2ff; border: 1px solid #e0e7ff; color: #111827; font-weight: 500; } 
    
    .sr-secondary-btn {
        display: inline-flex; align-items: center; justify-content: center;
        gap: var(--space-sm);
        /* 0.16 here was the old clear-glass value; against the milky surface
           these pills read as barely-there smudges. They also need a real
           border-style, or .sr-btn-primary's border-color has nothing to set. */
        background: var(--sr-glass-soft);
        -webkit-backdrop-filter: var(--sr-fx-sm);
        backdrop-filter: var(--sr-fx-sm);
        border: 1px solid var(--sr-glass-line);
        color: var(--sr-ink-soft);
        font-family: 'Inter', system-ui, sans-serif;
        font-size: 12px; font-weight: 600;
        padding: var(--space-md) var(--space-lg);
        border-radius: 100px;
        cursor: pointer;
        transition: all var(--timing-fast);
        text-shadow: 0 1px 0 rgba(255,255,255,0.5);
        box-shadow:
          0 var(--space-sm) var(--space-lg) -6px rgba(17,24,39,0.28),
          var(--sr-spec-sm);
    }
    .sr-secondary-btn:hover {
        background: rgba(255,255,255,0.86);
        border-color: rgba(255,255,255,0.9);
        color: var(--sr-ink);
        transform: translateY(-1px);
        box-shadow:
          0 var(--space-md) var(--space-xl) -6px rgba(17,24,39,0.30),
          var(--sr-spec-sm);
    }
    .sr-secondary-btn:focus-visible { outline: 2px solid var(--sr-amber-deep); outline-offset: 2px; }
    .sr-secondary-btn:active { transform: translateY(0); }
    .sr-secondary-btn svg { display: block; flex: 0 0 auto; }

    /* Primary by weight and hue, not by fill. A solid amber lozenge was the
       biggest block of colour on the surface and fought the Sinhala line for
       attention; the same glass as its siblings with amber text and a faint
       veil still reads as the primary action. */
    .sr-secondary-btn.sr-btn-primary {
        background: var(--sr-glass-soft);
        border-color: rgba(180,83,9,0.22);
        color: var(--sr-amber-deep);
        font-weight: 700;
        box-shadow: var(--sr-spec-sm);
    }
    /* A colour layer can only be the LAST value in a background shorthand, so
       the veil has to be a gradient or the whole declaration is dropped. */
    .sr-secondary-btn.sr-btn-primary:hover {
        background:
          linear-gradient(0deg, var(--sr-amber-veil), var(--sr-amber-veil)),
          var(--sr-glass-soft);
        border-color: rgba(180,83,9,0.38);
        color: var(--sr-amber-deep);
        box-shadow: var(--sr-spec-sm);
    }
    .sr-secondary-btn:disabled { opacity: 0.55; cursor: not-allowed; transform: none; }
    
    .sr-details { 
        margin-top: var(--space-lg); 
        border-top: 1px dashed #e5e7eb; 
        padding-top: var(--space-md); 
    }
    
    .sr-details summary { 
        font-size: 12px; color: #6366f1; cursor: pointer; 
        font-weight: 600; list-style: none; 
        display: flex; align-items: center; 
        gap: var(--space-sm); 
    }
    .sr-details summary:hover { color: #4f46e5; }
    
    .sr-full-story {
        background: rgba(255,255,255,0.45);
        -webkit-backdrop-filter: blur(var(--space-lg));
        backdrop-filter: blur(var(--space-lg));
        padding: var(--space-lg);
        border-radius: var(--space-lg);
        margin-top: var(--space-md);
        font-size: 13px; border: 1px solid rgba(255,255,255,0.6);
    }
    
    .sr-divider { 
        margin: var(--space-md) 0; 
        border: none; border-top: 1px dashed #e5e7eb; 
    }

    /* ── hover system ─────────────────────────────────────────────────
       One idea across every interactive surface: lift 1px, brighten the glass,
       ring it in the accent that owns that control. Elevation and light change;
       size and hue do not — so nothing shifts under the reader's eye. */
    .sr-list-item:hover {
        background: rgba(255,255,255,0.55);
        box-shadow: inset 0 1px 0 rgba(255,255,255,0.9);
    }
    .sr-view-btn, .sr-delete-btn {
        -webkit-backdrop-filter: blur(var(--space-lg));
        backdrop-filter: blur(var(--space-lg));
        background: var(--sr-gel), var(--sr-glass-soft);
        border: 1px solid var(--sr-glass-line);
        box-shadow: inset 0 1px 0 rgba(255,255,255,0.9);
        transition: all var(--timing-fast);
    }
    .sr-view-btn:hover {
        transform: translateY(-1px);
        border-color: var(--sr-teal-line);
        color: var(--sr-teal-deep);
        background: var(--sr-gel), var(--sr-teal-veil);
        box-shadow: 0 var(--space-sm) var(--space-lg) -3px var(--sr-teal-glow),
                    inset 0 1px 0 rgba(255,255,255,0.95);
    }
    .sr-delete-btn:hover {
        transform: translateY(-1px);
        background: rgba(254,226,226,0.85);
        box-shadow: 0 var(--space-sm) var(--space-lg) -3px rgba(239,68,68,0.28),
                    inset 0 1px 0 rgba(255,255,255,0.9);
    }
    .sr-nav-btn {
        background: var(--sr-gel), var(--sr-glass-soft);
        -webkit-backdrop-filter: blur(var(--space-lg));
        backdrop-filter: blur(var(--space-lg));
        border: 1px solid var(--sr-glass-line);
        border-radius: 100px;
        box-shadow: inset 0 1px 0 rgba(255,255,255,0.9);
        transition: all var(--timing-fast);
    }
    .sr-nav-btn:hover:not(:disabled) {
        transform: translateY(-1px);
        border-color: rgba(251,191,36,0.5);
        background: var(--sr-gel), rgba(255,255,255,0.8);
    }
    .sr-details summary { transition: color var(--timing-fast); }
    .sr-general-close:hover { transform: translateY(-1px); }
    .sr-simple-box .sr-sub-text, .sr-general-box .sr-sub-text { transition: background var(--timing-fast); }

    .sr-list-item {
        padding: var(--space-lg) var(--space-md);
        border-bottom: 1px solid rgba(255,255,255,0.5);
        border-radius: var(--space-lg);
        display:flex; justify-content:space-between;
        align-items:center;
        transition: background var(--timing-fast), box-shadow var(--timing-fast);
    }
    .sr-list-item:hover { background: #f9fafb; }
    .sr-list-item:last-child { border-bottom: none; }
    
    .sr-list-word { font-weight: 800; color: #111827; font-size: 15px; }
    .sr-list-trans { font-size: 13px; color: var(--sr-amber-deep); font-weight: 600; margin-top:2px; }
    
    .sr-action-group { 
        display: flex; 
        gap: var(--space-md); 
    }
    
    .sr-view-btn { 
        border: 1px solid #d1d5db; background: #fff; color: #374151; 
        width: 30px; height: 30px; border-radius: 50%; 
        display: flex; align-items: center; justify-content: center; 
        cursor: pointer; font-size: 14px; transition: 0.1s; 
    }
    .sr-view-btn:hover { border-color: #6366f1; color: #6366f1; background: #eef2ff; }
    
    .sr-delete-btn { 
        border: 1px solid #fee2e2; background: #fff; color: #ef4444; 
        width: 30px; height: 30px; border-radius: 50%; 
        display: flex; align-items: center; justify-content: center; 
        cursor: pointer; font-size: 16px; transition: 0.1s; 
    }
    .sr-delete-btn:hover { background: #fee2e2; }

    #smart-reader-trigger {
        position: absolute;
        width: var(--space-xxl);
        height: var(--space-xxl);
        /* The MOST opaque surface in the extension, deliberately. The previous
           pass made this clear glass with ink rods, and it disappeared against
           any busy background — it is the one element that has to be findable
           before you have found it. Frosted and near-solid, with a dark mark. */
        background:
          url("data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none'%3E%3Cdefs%3E%3ClinearGradient id='l' x1='3' y1='10' x2='13' y2='13.6' gradientUnits='userSpaceOnUse'%3E%3Cstop offset='0' stop-color='%23FDE68A'/%3E%3Cstop offset='0.4' stop-color='%23F59E0B'/%3E%3Cstop offset='1' stop-color='%23D97706'/%3E%3C/linearGradient%3E%3ClinearGradient id='f' x1='12' y1='4' x2='12' y2='20' gradientUnits='userSpaceOnUse'%3E%3Cstop offset='0' stop-color='%23111827' stop-opacity='0.46'/%3E%3Cstop offset='1' stop-color='%23111827' stop-opacity='0.28'/%3E%3C/linearGradient%3E%3Cfilter id='g' x='-0.7' y='-1.8' width='2.4' height='4.6'%3E%3CfeGaussianBlur stdDeviation='1.4' result='b'/%3E%3CfeMerge%3E%3CfeMergeNode in='b'/%3E%3CfeMergeNode in='SourceGraphic'/%3E%3C/feMerge%3E%3C/filter%3E%3C/defs%3E%3Crect x='3.2' y='4.8' width='17.6' height='2.8' rx='1.4' fill='url(%23f)'/%3E%3Crect x='15.4' y='10.6' width='5.4' height='2.8' rx='1.4' fill='url(%23f)'/%3E%3Crect x='3.2' y='16.4' width='13.4' height='2.8' rx='1.4' fill='url(%23f)'/%3E%3Cg filter='url(%23g)'%3E%3Crect x='3.2' y='10.6' width='10.2' height='2.8' rx='1.4' fill='url(%23l)'/%3E%3C/g%3E%3Crect x='4.3' y='11.1' width='8.0' height='0.8' rx='0.4' fill='%23FFFBEB' opacity='0.6'/%3E%3C/svg%3E") no-repeat center / 18px 18px,
          linear-gradient(180deg, rgba(255,255,255,0.80) 0%, rgba(255,255,255,0.68) 52%, rgba(255,255,255,0.72) 100%);
        -webkit-backdrop-filter: var(--sr-fx-sm);
        backdrop-filter: var(--sr-fx-sm);
        border: none;
        border-radius: 50%;
        display: none; align-items: center; justify-content: center;
        cursor: pointer; z-index: 2147483647;
        box-shadow:
          0 var(--space-md) var(--space-xl) -8px rgba(17,24,39,0.34),
          0 1px 3px rgba(17,24,39,0.18),
          var(--sr-spec-sm);
        transition: transform var(--timing-fast) cubic-bezier(0.16, 1, 0.3, 1),
                    box-shadow var(--timing-fast),
                    background-size var(--timing-normal) cubic-bezier(0.16, 1, 0.3, 1);
    }
    /* declared after the background shorthand, which resets background-size */
    /* after the background shorthand, which resets background-size. Two layers:
       the mark, then the glass gradient. */
    #smart-reader-trigger { background-size: 18px 18px, auto; }
    #smart-reader-trigger::before {
        content: ''; position: absolute; inset: 0;
        border-radius: 50%; padding: var(--space-sm);
        -webkit-backdrop-filter: var(--sr-fx-lens);
        backdrop-filter: var(--sr-fx-lens);
        -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
        -webkit-mask-composite: xor;
        mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
        mask-composite: exclude;
        pointer-events: none;
    }
    #smart-reader-trigger:hover {
        transform: scale(1.1);
        box-shadow:
          0 var(--space-lg) var(--space-xxl) -8px rgba(17,24,39,0.40),
          0 0 0 3px rgba(180,83,9,0.16),
          var(--sr-spec-sm);
    }
    #smart-reader-trigger:focus-visible {
        outline: 2px solid var(--sr-amber-deep); outline-offset: 3px;
    }
    #smart-reader-trigger:hover { background-size: 19.5px 19.5px, auto; }
    #smart-reader-trigger:active { transform: scale(1.02); }
    
    @keyframes popIn {
        from { opacity:0; transform:scale(0.95); }
        to { opacity:1; transform:scale(1); }
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }

    /* Highlight mode: marked words */
    .sr-highlight-mark {
        background: #fef08a !important;
        color: inherit !important;
        border-radius: 2px !important;
        cursor: pointer !important;
        transition: background 0.15s !important;
        padding: 0 1px !important;
    }
    .sr-highlight-mark:hover {
        background: #fde047 !important;
    }

    /* Highlight mode: floating action bar */
    #sr-highlight-bar {
        position: fixed;
        bottom: var(--space-xl, 21px);
        left: 50%;
        transform: translateX(-50%);
        z-index: 2147483647;
        background: var(--sr-glass-soft, rgba(255,255,255,0.70));
        -webkit-backdrop-filter: var(--sr-fx-body);
        backdrop-filter: var(--sr-fx-body);
        border: 1px solid var(--sr-glass-line, rgba(255,255,255,0.55));
        border-radius: 100px;
        padding: var(--space-lg, 13px) var(--space-xl, 21px);
        display: flex;
        align-items: center;
        gap: var(--space-lg, 13px);
        box-shadow:
          0 var(--space-lg, 13px) var(--space-xxl, 34px) -8px rgba(17,24,39,0.22),
          inset 0 1px 0 rgba(255,255,255,0.9);
        font-family: 'Inter', system-ui, sans-serif;
        animation: popIn var(--timing-normal, 0.382s) cubic-bezier(0.16, 1, 0.3, 1);
    }
    #sr-highlight-bar .sr-hb-count {
        font-size: 13px;
        font-weight: 700;
        color: #92400e;
        white-space: nowrap;
    }
    #sr-highlight-bar .sr-hb-hint {
        font-size: 11px;
        color: #a84e08;
        white-space: nowrap;
    }
    #sr-highlight-bar button {
        padding: var(--space-md, 8px) var(--space-lg, 13px);
        border-radius: 100px;
        font-size: 12px;
        font-weight: 700;
        cursor: pointer;
        transition: all var(--timing-fast, 0.236s);
        border: none;
    }
    #sr-highlight-bar .sr-hb-done {
        background: var(--sr-glass-soft, rgba(255,255,255,0.70));
        border: 1px solid rgba(180,83,9,0.22);
        color: var(--sr-amber-deep, #a84e08);
        box-shadow: var(--sr-spec-sm);
    }
    #sr-highlight-bar .sr-hb-done:hover:not(:disabled) {
        background: #a84e08;
    }
    #sr-highlight-bar .sr-hb-done:disabled {
        opacity: 0.4;
        cursor: not-allowed;
    }
    #sr-highlight-bar .sr-hb-cancel {
        background: rgba(255,255,255,0.6);
        color: #6b7280;
        border: 1px solid rgba(255,255,255,0.8);
        box-shadow: inset 0 1px 0 rgba(255,255,255,0.9);
    }
    #sr-highlight-bar .sr-hb-cancel:hover {
        background: rgba(255,255,255,0.85);
        color: #111827;
    }
    body.sr-highlight-mode {
        cursor: crosshair !important;
    }
`;

// Premium monoline icon set — 14x14, 1.5 stroke, currentColor so they inherit
// hover state. Replaces emoji, which render differently per OS and read unfinished.
const SR_ICONS = {
    speaker: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H2v6h4l5 4V5Z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M19 5a9 9 0 0 1 0 14"/></svg>`,
    question: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9.5"/><path d="M9.2 9.2a2.9 2.9 0 0 1 5.6 1c0 1.9-2.8 2.4-2.8 4"/><path d="M12 17.2h.01"/></svg>`,
    flow: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="5" cy="12" r="2.4"/><circle cx="19" cy="6" r="2.4"/><circle cx="19" cy="18" r="2.4"/><path d="M7.2 10.9 16.8 6.9"/><path d="M7.2 13.1 16.8 17.1"/></svg>`,
    bolt: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2 4.5 13.5H11l-1 8.5 8.5-11.5H12l1-8.5Z"/></svg>`,
    globe: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9.5"/><path d="M2.5 12h19"/><path d="M12 2.5a15 15 0 0 1 0 19a15 15 0 0 1 0-19Z"/></svg>`,
    sparkle: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3.5 13.9 9 19.5 11l-5.6 2L12 18.5 10.1 13 4.5 11l5.6-2L12 3.5Z"/><path d="M18.5 3.5v3M20 5h-3"/></svg>`
};

const styleSheet = document.createElement("style"); 
styleSheet.innerText = styles; 
document.head.appendChild(styleSheet);

// ========================================
// JAVASCRIPT LOGIC (Analytics Added)
// ========================================

let currentSelection = "";
let currentContext = "";
let savedBodyContent = "";

function escapeHTML(str) {
    const el = document.createElement('span');
    el.textContent = str;
    return el.innerHTML;
}

function buildLookupHTML(word, json) {
    const data = typeof json === 'string' ? JSON.parse(json) : json;
    const safeWord = escapeHTML(word.length > 18 ? word.substring(0, 18) + '...' : word);
    const safeT = escapeHTML(data.t || '');
    const dHTML = data.d
        ? `<span class="sr-def-label">CONTEXT</span>${escapeHTML(data.d)}`
        : `<span class="sr-def-label">CONTEXT</span><span id="sr-d-loading" style="color:var(--sr-ink-mute);font-style:italic;font-size:12px;">Loading explanation...</span>`;
    return `<div class="sr-header">
    <div class="sr-header-top"><h2 class="sr-word">${safeWord}</h2></div>
    <div class="sr-translation">${safeT}</div>
</div>
<div class="sr-body">
    <div class="sr-section">
        <p class="sr-def" id="sr-def-area">${dHTML}</p>
        <div id="sr-general-btn-area" style="margin-top:var(--space-lg); display:flex; gap:var(--space-md); flex-wrap:wrap;">
            <button id="sr-load-more" class="sr-secondary-btn sr-btn-primary" style="flex:1; min-width:90px;">${SR_ICONS.bolt} More</button>
            <button id="sr-load-general" class="sr-secondary-btn" style="flex:1; min-width:80px;">${SR_ICONS.globe} General</button>
            <button id="sr-load-simple" class="sr-secondary-btn" style="flex:1; min-width:80px;">${SR_ICONS.sparkle} Simple</button>
        </div>
    </div>
    <div id="sr-details-placeholder"></div>
</div>${fallbackNoteHTML(data._m)}`;
}

// Rendered only when a lookup did not come from the configured model, so the
// tester is not silently comparing one model's output while reading another's
// name in Settings.
function fallbackNoteHTML(m) {
    if (!m || !m.from || !m.model) return '';
    const short = (id) => String(id).replace(/^models\//, '').replace(/^gemini-/, '');
    return `<div class="sr-fallback-note">\u21b3 <span><code>${escapeHTML(short(m.from))}</code> `
         + `quota reached &middot; answered by <code>${escapeHTML(short(m.model))}</code></span></div>`;
}
// ============================================
// LANGUAGE
// ============================================
//
// CRLanguages is loaded by the manifest ahead of this file. The pack decides
// the font, the text direction and — in the service worker — the prompt.

let srLang = CRLanguages.getLang(CRLanguages.DEFAULT_LANG);

// The script font is loaded on demand rather than baked into the stylesheet:
// a Sinhala reader should not pay for Devanagari, and vice versa. Languages
// covered by Inter (Latin, Cyrillic) load nothing extra.
function applyLangFont(lang) {
    document.documentElement.style.setProperty('--sr-lang-font', lang.font);

    if (!lang.family) return;
    const href = `https://fonts.googleapis.com/css2?family=${lang.family}&display=swap`;
    let link = document.getElementById('sr-lang-font');
    if (!link) {
        link = document.createElement('link');
        link.id = 'sr-lang-font';
        link.rel = 'stylesheet';
        document.head.appendChild(link);
    }
    if (link.href !== href) link.href = href;
}

// Direction comes from the pack, not from a hardcoded language check — adding
// Urdu or Hebrew should be one entry in lib/languages.js, not a code change.
function applyRTL(lang) {
    if (!bubble) return;
    if (lang.rtl) bubble.setAttribute('dir', 'rtl');
    else bubble.removeAttribute('dir');
}

function setLang(code) {
    srLang = CRLanguages.getLang(code);
    applyLangFont(srLang);
    applyRTL(srLang);
}

chrome.storage.local.get('targetLanguage', ({ targetLanguage }) => setLang(targetLanguage));

// Settings and the welcome page write the same key; pick the change up without
// needing a reload of every open tab.
chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.targetLanguage) setLang(changes.targetLanguage.newValue);
});

let currentVideoRequestId = 0;
let currentVideoList = [];
let currentVideoIndex = 0;

// Highlight mode state (for Study Sheet calibration)
let highlightModeActive = false;
let markedWords = [];
let highlightClickHandler = null;

// ============================================
// HIGHLIGHT MODE FUNCTIONS (Study Sheet Calibration)
// ============================================

function getWordAtPoint(x, y) {
    if (!document.caretRangeFromPoint) return null;

    let range = document.caretRangeFromPoint(x, y);

    // Fallback: adjust for CSS zoom on body/html
    if (!range || range.startContainer.nodeType !== Node.TEXT_NODE) {
        const bodyZoom = parseFloat(getComputedStyle(document.body).zoom) || 1;
        const htmlZoom = parseFloat(getComputedStyle(document.documentElement).zoom) || 1;
        const totalZoom = bodyZoom * htmlZoom;
        if (totalZoom !== 1) {
            range = document.caretRangeFromPoint(x / totalZoom, y / totalZoom);
        }
    }

    // Fallback: walk text nodes under the element at point
    if (!range || range.startContainer.nodeType !== Node.TEXT_NODE) {
        const el = document.elementFromPoint(x, y);
        if (el) {
            // Try shadow DOM if available
            if (el.shadowRoot) {
                const shadowEl = el.shadowRoot.elementFromPoint(x, y);
                if (shadowEl) {
                    const result = getWordFromElementAtPoint(shadowEl, x, y);
                    if (result) return result;
                }
            }
            return getWordFromElementAtPoint(el, x, y);
        }
        return null;
    }

    const textNode = range.startContainer;
    const text = textNode.textContent;
    const offset = range.startOffset;

    // Find word boundaries (Latin + Sinhala)
    const wordRegex = /[\w\u0080-\uFFFF]+/g;   // every script, not just Latin + Sinhala
    let match;
    while ((match = wordRegex.exec(text)) !== null) {
        const start = match.index;
        const end = start + match[0].length;
        if (offset >= start && offset <= end) {
            return { word: match[0], textNode, startOffset: start, endOffset: end };
        }
    }
    return null;
}

// Fallback: walk text nodes, create ranges for each word, check if point is inside bounding rect
function getWordFromElementAtPoint(el, x, y) {
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
    const wordRegex = /[\w\u0080-\uFFFF]+/g;   // every script, not just Latin + Sinhala
    let node;

    while ((node = walker.nextNode())) {
        const text = node.textContent;
        let match;
        wordRegex.lastIndex = 0;
        while ((match = wordRegex.exec(text)) !== null) {
            const range = document.createRange();
            range.setStart(node, match.index);
            range.setEnd(node, match.index + match[0].length);
            const rect = range.getBoundingClientRect();
            if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
                return { word: match[0], textNode: node, startOffset: match.index, endOffset: match.index + match[0].length };
            }
        }
    }
    return null;
}

function getWordAtPointPDF(event) {
    const span = event.target.closest('.textLayer span');
    if (!span) return null;

    const text = span.textContent.trim();
    const words = text.split(/\s+/);

    if (words.length <= 1) {
        // Single word span — return it directly
        const textNode = span.firstChild;
        if (!textNode || textNode.nodeType !== Node.TEXT_NODE) return null;
        return { word: text, textNode, startOffset: 0, endOffset: text.length };
    }

    // Multi-word span: estimate which word was clicked using x position
    const spanRect = span.getBoundingClientRect();
    const clickX = event.clientX - spanRect.left;
    const spanWidth = spanRect.width;
    const ratio = clickX / spanWidth;
    const charIndex = Math.floor(ratio * text.length);

    // Find which word contains charIndex
    let pos = 0;
    for (const word of words) {
        const wordStart = text.indexOf(word, pos);
        const wordEnd = wordStart + word.length;
        if (charIndex >= wordStart && charIndex < wordEnd) {
            const textNode = span.firstChild;
            if (!textNode || textNode.nodeType !== Node.TEXT_NODE) return null;
            return { word, textNode, startOffset: wordStart, endOffset: wordEnd };
        }
        pos = wordEnd;
    }

    // Fallback: use the word nearest to the click ratio
    const wordIndex = Math.min(Math.floor(ratio * words.length), words.length - 1);
    const fallbackWord = words[wordIndex];
    const fbStart = text.indexOf(fallbackWord);
    const textNode = span.firstChild;
    if (!textNode || textNode.nodeType !== Node.TEXT_NODE) return null;
    return { word: fallbackWord, textNode, startOffset: fbStart, endOffset: fbStart + fallbackWord.length };
}

function highlightWord(wordInfo) {
    const { textNode, startOffset, endOffset } = wordInfo;
    const range = document.createRange();
    range.setStart(textNode, startOffset);
    range.setEnd(textNode, endOffset);

    const mark = document.createElement('mark');
    mark.className = 'sr-highlight-mark';
    mark.setAttribute('data-sr-marked', 'true');
    range.surroundContents(mark);
    return mark;
}

function unhighlightWord(markElement) {
    const parent = markElement.parentNode;
    while (markElement.firstChild) {
        parent.insertBefore(markElement.firstChild, markElement);
    }
    parent.removeChild(markElement);
    parent.normalize();
}

function getContextForElement(element) {
    let container = element.parentElement;
    let contextText = container ? container.textContent || '' : '';

    if (contextText.length < 200 && container && container.parentElement) {
        container = container.parentElement;
        contextText = container.textContent || contextText;
    }
    if (contextText.length < 200 && container && container.parentElement) {
        container = container.parentElement;
        contextText = container.textContent || contextText;
    }

    if (contextText.length > 500) {
        const word = element.textContent.trim();
        const idx = contextText.indexOf(word);
        if (idx !== -1) {
            const start = Math.max(0, idx - 250);
            const end = Math.min(contextText.length, idx + word.length + 250);
            contextText = contextText.substring(start, end);
        } else {
            contextText = contextText.substring(0, 500);
        }
    }
    return contextText.trim();
}

function handleHighlightClick(event) {
    // Ignore clicks on action bar or bubble
    if (event.target.closest('#sr-highlight-bar') || event.target.closest('#smart-reader-bubble')) return;

    event.preventDefault();
    event.stopPropagation();

    // Temporarily disable contenteditable elements to prevent cursor placement
    const editableEl = event.target.closest('[contenteditable="true"], [contenteditable=""]');
    if (editableEl) {
        editableEl.setAttribute('contenteditable', 'false');
        editableEl.setAttribute('data-sr-was-editable', 'true');
    }

    // Toggle off: clicking an existing mark
    const existingMark = event.target.closest('.sr-highlight-mark');
    if (existingMark) {
        const word = existingMark.textContent.trim();
        markedWords = markedWords.filter(m => m.element !== existingMark);
        unhighlightWord(existingMark);
        updateActionBar();
        return;
    }

    // Detect PDF text layer vs webpage
    const isPdfTextLayer = !!event.target.closest('.textLayer');
    const wordInfo = isPdfTextLayer ? getWordAtPointPDF(event) : getWordAtPoint(event.clientX, event.clientY);

    if (!wordInfo || !wordInfo.word || wordInfo.word.length < 2) return;

    const markEl = highlightWord(wordInfo);
    const context = getContextForElement(markEl);
    markedWords.push({ word: wordInfo.word, context, element: markEl });
    updateActionBar();
}

function createHighlightBar() {
    const existing = document.getElementById('sr-highlight-bar');
    if (existing) existing.remove();

    const bar = document.createElement('div');
    bar.id = 'sr-highlight-bar';
    bar.innerHTML = `
        <span style="font-size:16px;">✏️</span>
        <span class="sr-hb-count">0 words marked</span>
        <span class="sr-hb-hint">Click words you don't know</span>
        <button class="sr-hb-done" disabled title="Need at least 3 words">Done</button>
        <button class="sr-hb-cancel">Cancel</button>
    `;
    document.body.appendChild(bar);

    bar.querySelector('.sr-hb-done').onclick = (e) => { e.stopPropagation(); finishHighlightMode(); };
    bar.querySelector('.sr-hb-cancel').onclick = (e) => { e.stopPropagation(); cancelHighlightMode(); };
}

function updateActionBar() {
    const bar = document.getElementById('sr-highlight-bar');
    if (!bar) return;
    const count = markedWords.length;
    bar.querySelector('.sr-hb-count').textContent = `${count} word${count !== 1 ? 's' : ''} marked`;
    const doneBtn = bar.querySelector('.sr-hb-done');
    if (count >= 3) {
        doneBtn.disabled = false;
        doneBtn.title = 'Generate study sheet with calibration';
    } else {
        doneBtn.disabled = true;
        doneBtn.title = `Need ${3 - count} more word${3 - count !== 1 ? 's' : ''}`;
    }
}

function enterHighlightMode() {
    highlightModeActive = true;
    markedWords = [];

    // Hide bubble and trigger
    bubble.style.display = 'none';
    triggerBtn.style.display = 'none';

    document.body.classList.add('sr-highlight-mode');
    createHighlightBar();

    // Attach click handler on capture phase
    highlightClickHandler = handleHighlightClick;
    document.addEventListener('click', highlightClickHandler, true);
}

function finishHighlightMode() {
    if (markedWords.length < 3) return;

    highlightModeActive = false;
    document.removeEventListener('click', highlightClickHandler, true);
    document.body.classList.remove('sr-highlight-mode');

    // Remove action bar
    const bar = document.getElementById('sr-highlight-bar');
    if (bar) bar.remove();

    // Extract calibration data
    const calibrationWords = markedWords.map(m => ({ word: m.word, context: m.context }));

    // Show bubble with CEFR picker, passing calibration data
    showStudySheetModalStandalone(false, calibrationWords);
}

function cancelHighlightMode() {
    cleanupHighlights();
}

function cleanupHighlights() {
    // Unhighlight all marked words
    const marks = document.querySelectorAll('.sr-highlight-mark');
    marks.forEach(mark => unhighlightWord(mark));
    markedWords = [];

    // Restore contenteditable elements disabled during highlight mode
    const editables = document.querySelectorAll('[data-sr-was-editable="true"]');
    editables.forEach(el => {
        el.setAttribute('contenteditable', 'true');
        el.removeAttribute('data-sr-was-editable');
    });

    // Remove action bar
    const bar = document.getElementById('sr-highlight-bar');
    if (bar) bar.remove();

    // Restore state
    document.body.classList.remove('sr-highlight-mode');
    if (highlightClickHandler) {
        document.removeEventListener('click', highlightClickHandler, true);
    }
    highlightModeActive = false;
}

// Sinhala-to-Sinhala: Auto-detect language via Unicode range
function detectLanguage(text) {
    const sinhalaRegex = /[\u0D80-\u0DFF]/g;
    const alphaRegex = /[a-zA-Z\u0D80-\u0DFF]/g;
    const sinhalaChars = (text.match(sinhalaRegex) || []).length;
    const totalAlpha = (text.match(alphaRegex) || []).length;
    if (totalAlpha === 0) return 'en';
    return (sinhalaChars / totalAlpha) > 0.5 ? 'si' : 'en';
}

// Extract full page text for Study Sheet feature
// Extract clean text from webpage using Readability.js with semantic fallback
function extractWebpageText() {
    // Try Readability.js first (if available)
    if (typeof Readability !== 'undefined') {
        try {
            const clone = document.cloneNode(true);
            const reader = new Readability(clone);
            const article = reader.parse();
            if (article && article.textContent && article.textContent.trim().length > 100) {
                return article.textContent;
            }
        } catch (e) {
            console.warn('Readability.js failed, falling back to semantic extraction:', e.message);
        }
    }

    // Fallback: semantic element selection
    const selectors = ['article', 'main', '[role="main"]', '.post-content', '.article-body', '.entry-content', '.content', '#content'];
    for (const sel of selectors) {
        const el = document.querySelector(sel);
        if (el && el.innerText && el.innerText.trim().length > 100) {
            return el.innerText;
        }
    }

    // Last resort: body text minus nav/footer/aside
    const bodyClone = document.body.cloneNode(true);
    const noiseSelectors = ['nav', 'header', 'footer', 'aside', '[role="banner"]', '[role="navigation"]', '[role="contentinfo"]', '.sidebar', '.menu', '.nav', '.footer', '.header'];
    noiseSelectors.forEach(sel => {
        bodyClone.querySelectorAll(sel).forEach(el => el.remove());
    });
    return bodyClone.innerText || document.body.innerText || '';
}

function extractPageText() {
    const MAX_WORDS = 3500;
    let text = '';

    // PDF viewer: read from exposed textContentCache
    if (window._pdfTextCache && Object.keys(window._pdfTextCache).length > 0) {
        const pages = Object.keys(window._pdfTextCache).map(Number).sort((a, b) => a - b);
        for (const pageNum of pages) {
            const tc = window._pdfTextCache[pageNum];
            if (tc && tc.items) {
                text += tc.items.map(item => item.str).join(' ') + '\n';
            }
        }
    } else {
        // Webpage: use Readability.js for clean text extraction
        text = extractWebpageText();
    }

    // Clean whitespace
    text = text.replace(/\s+/g, ' ').trim();

    const words = text.split(/\s+/);
    const truncated = words.length > MAX_WORDS;
    if (truncated) {
        text = words.slice(0, MAX_WORDS).join(' ');
    }

    return { text, truncated, wordCount: Math.min(words.length, MAX_WORDS) };
}

// Extract page text V2: supports PDF page ranges, no truncation (chunking handles length)
function extractPageTextV2(pageRange) {
    let text = '';

    if (window._pdfTextCache && Object.keys(window._pdfTextCache).length > 0) {
        let pages = Object.keys(window._pdfTextCache).map(Number).sort((a, b) => a - b);
        if (pageRange && pageRange.length > 0) {
            pages = pages.filter(p => pageRange.includes(p));
        }
        for (const pageNum of pages) {
            const tc = window._pdfTextCache[pageNum];
            if (tc && tc.items) {
                text += tc.items.map(item => item.str).join(' ') + '\n';
            }
        }
    } else {
        text = extractWebpageText();
    }

    text = text.replace(/\s+/g, ' ').trim();
    const wordCount = text.split(/\s+/).length;
    return { text, wordCount };
}

// Split text into chunks at paragraph > sentence > word boundaries
function chunkText(text, maxChars = 15000) {
    if (text.length <= maxChars) return [text];

    const chunks = [];
    let remaining = text;

    while (remaining.length > 0) {
        if (remaining.length <= maxChars) {
            chunks.push(remaining);
            break;
        }

        let splitAt = -1;
        const searchRegion = remaining.substring(Math.floor(maxChars * 0.8), maxChars);

        // Try paragraph boundary
        const paraBreak = searchRegion.lastIndexOf('\n\n');
        if (paraBreak !== -1) {
            splitAt = Math.floor(maxChars * 0.8) + paraBreak + 2;
        }

        // Try sentence boundary
        if (splitAt === -1) {
            const sentenceMatch = searchRegion.match(/[.!?]\s+/g);
            if (sentenceMatch) {
                const lastSentEnd = searchRegion.lastIndexOf(sentenceMatch[sentenceMatch.length - 1]);
                splitAt = Math.floor(maxChars * 0.8) + lastSentEnd + sentenceMatch[sentenceMatch.length - 1].length;
            }
        }

        // Try word boundary
        if (splitAt === -1) {
            const lastSpace = remaining.lastIndexOf(' ', maxChars);
            splitAt = lastSpace > 0 ? lastSpace + 1 : maxChars;
        }

        chunks.push(remaining.substring(0, splitAt).trim());
        remaining = remaining.substring(splitAt).trim();
    }

    return chunks;
}

// Semantic chunking: split by paragraphs into ~350-word chunks
function chunkTextSemantic(text, targetWords = 350) {
    const words = text.split(/\s+/);
    if (words.length <= targetWords * 1.3) return [text];

    const paragraphs = text.split(/\n\n+/);
    const chunks = [];
    let currentChunk = [];
    let currentWordCount = 0;
    const maxWords = Math.floor(targetWords * 1.3); // 30% overflow allowed

    for (const para of paragraphs) {
        const paraWords = para.trim().split(/\s+/).filter(w => w.length > 0);
        if (paraWords.length === 0) continue;

        // If adding this paragraph would exceed max and we have content, start new chunk
        if (currentWordCount > 0 && currentWordCount + paraWords.length > maxWords) {
            chunks.push(currentChunk.join('\n\n'));
            currentChunk = [];
            currentWordCount = 0;
        }

        // If a single paragraph exceeds max, split by sentences
        if (paraWords.length > maxWords) {
            // Flush current chunk first
            if (currentWordCount > 0) {
                chunks.push(currentChunk.join('\n\n'));
                currentChunk = [];
                currentWordCount = 0;
            }
            const sentenceChunks = chunkBySentences(para, targetWords);
            chunks.push(...sentenceChunks);
            continue;
        }

        currentChunk.push(para.trim());
        currentWordCount += paraWords.length;
    }

    // Flush remaining
    if (currentChunk.length > 0) {
        chunks.push(currentChunk.join('\n\n'));
    }

    return chunks.length > 0 ? chunks : [text];
}

// Helper: split text into chunks at sentence boundaries
function chunkBySentences(text, targetWords = 350) {
    // Split on sentence-ending punctuation followed by space
    const sentences = text.match(/[^.!?]+[.!?]+[\s]*/g) || [text];
    const chunks = [];
    let current = '';
    let currentWordCount = 0;

    for (const sentence of sentences) {
        const sentWords = sentence.trim().split(/\s+/).length;
        if (currentWordCount > 0 && currentWordCount + sentWords > targetWords * 1.3) {
            chunks.push(current.trim());
            current = '';
            currentWordCount = 0;
        }
        current += sentence;
        currentWordCount += sentWords;
    }

    if (current.trim()) {
        chunks.push(current.trim());
    }

    return chunks;
}

// Parse page range string like "1-5, 8, 12-15" into array of page numbers
function parsePageRange(rangeStr, maxPage) {
    if (!rangeStr || !rangeStr.trim()) return null;
    const pages = new Set();
    const parts = rangeStr.split(',');
    for (const part of parts) {
        const trimmed = part.trim();
        if (trimmed.includes('-')) {
            const [startStr, endStr] = trimmed.split('-').map(s => s.trim());
            const start = Math.max(1, parseInt(startStr) || 1);
            const end = Math.min(maxPage, parseInt(endStr) || maxPage);
            for (let i = start; i <= end; i++) pages.add(i);
        } else {
            const num = parseInt(trimmed);
            if (num >= 1 && num <= maxPage) pages.add(num);
        }
    }
    return pages.size > 0 ? [...pages].sort((a, b) => a - b) : null;
}

// UNCHANGED: Expanded context capture
function getExpandedContext(selection) {
    if (!selection || !selection.rangeCount) return "";
    
    const range = selection.getRangeAt(0);
    let container = range.commonAncestorContainer;
    
    while (container && container.nodeType === Node.TEXT_NODE) {
        container = container.parentElement;
    }
    
    if (!container) return selection.toString().trim();
    
    let contextText = container.textContent || "";
    
    if (contextText.length < 200 && container.parentElement) {
        contextText = container.parentElement.textContent || contextText;
    }
    
    if (contextText.length < 200 && container.parentElement?.parentElement) {
        contextText = container.parentElement.parentElement.textContent || contextText;
    }
    
    if (contextText.length > 500) {
        const selectedText = selection.toString().trim();
        const selectedIndex = contextText.indexOf(selectedText);
        
        if (selectedIndex !== -1) {
            const start = Math.max(0, selectedIndex - 250);
            const end = Math.min(contextText.length, selectedIndex + selectedText.length + 250);
            contextText = contextText.substring(start, end);
        } else {
            contextText = contextText.substring(0, 500);
        }
    }
    
    return contextText.trim();
}

// UNCHANGED
document.addEventListener('mouseup', function(event) {
    if (highlightModeActive) return;
    if (bubble.contains(event.target)) return;
    const selection = window.getSelection();
    const text = selection.toString().trim();
    if (text.length > 0 && text.length < 50) { 
        currentSelection = text;
        currentContext = getExpandedContext(selection);
        triggerBtn.style.display = "flex";
        triggerBtn.style.left = (event.pageX + 10) + "px";
        triggerBtn.style.top = (event.pageY - 45) + "px";
    } else { triggerBtn.style.display = "none"; }
});

// 📊 NEW: Track bubble close
function closeBubble() {
    bubble.style.display = "none";
    if (highlightModeActive) cleanupHighlights();
}

// UNCHANGED: Smart Positioning
function showBubble(clientX, clientY, content) {
    bubble.style.display = "flex"; 
    bubble.style.opacity = "0";
    bubble.innerHTML = content;
    
    const rect = bubble.getBoundingClientRect();
    const winW = window.innerWidth;
    const winH = window.innerHeight;
    const padding = 15;
    
    let finalLeft = clientX;
    
    if (finalLeft + rect.width + padding > winW) {
        finalLeft = winW - rect.width - padding;
    }
    if (finalLeft < padding) {
        finalLeft = padding;
    }

    let finalTop = clientY + 20;
    
    if (finalTop + rect.height + padding > winH) {
        let potentialTop = clientY - rect.height - 20;
        
        if (potentialTop < padding) {
            finalTop = winH - rect.height - padding;
        } else {
            finalTop = potentialTop;
        }
    }

    bubble.style.left = finalLeft + "px";
    bubble.style.top = finalTop + "px";
    
    requestAnimationFrame(() => {
        bubble.style.opacity = "1";
    });
}

// UNCHANGED: Reposition helper
function repositionBubble() {
    const rect = bubble.getBoundingClientRect();
    const winH = window.innerHeight;
    const padding = 20;

    if (rect.bottom > winH - padding) {
        const overflowAmount = rect.bottom - (winH - padding);
        const currentTop = parseInt(bubble.style.top) || rect.top;
        
        let newTop = currentTop - overflowAmount;
        if (newTop < padding) newTop = padding;
        
        bubble.style.top = `${newTop}px`;
    }
}

// UNCHANGED
function forceHighlightWord(container) {
    if (!container) return;
    const walk = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null, false);
    let node; const nodesToReplace = [];
    const safeSelection = currentSelection.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    while(node = walk.nextNode()) {
        if (node.nodeValue && new RegExp(`\\b${safeSelection}\\b`, 'i').test(node.nodeValue)) {
            if (node.parentElement && !node.parentElement.classList.contains('sr-highlight')) {
                nodesToReplace.push(node);
            }
        }
    }
    nodesToReplace.forEach(node => {
        const span = document.createElement('span');
        const regex = new RegExp(`(\\b${safeSelection}\\b)`, 'gi');
        span.innerHTML = node.nodeValue.replace(regex, '<span class="sr-highlight">$1</span>');
        node.replaceWith(span);
    });
}

// Typewriter animation. Segmenting by grapheme keeps combining marks attached
// to their base character — essential for Sinhala and Devanagari, harmless for
// Latin. No locale: the word being animated is whatever the reader highlighted,
// which need not be in their chosen language.
function generateTypewriterHtml(word) {
    let chars;
    if (typeof Intl !== 'undefined' && Intl.Segmenter) {
        const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
        chars = [...segmenter.segment(word)].map(s => s.segment);
    } else {
        chars = Array.from(word);
    }
    // --sr-lang-font is the TARGET language's font. The highlighted word is
    // source text, so it only applies when the two share a script — otherwise
    // we would paint, say, Sinhala text in Devanagari.
    const sameScript = CRLanguages.isScript(word, srLang.code);
    const fontStyle = sameScript ? "font-family:var(--sr-lang-font, sans-serif); text-transform:none; letter-spacing:1px;" : "";
    return chars.map((char, i) => {
        const displayChar = char === ' ' ? '&nbsp;' : char;
        return `<span class="sr-char" style="animation-delay: ${i * 0.05}s; ${fontStyle}">${displayChar}</span>`;
    }).join('');
}

// 📊 MODIFIED: Track session start
triggerBtn.addEventListener('mousedown', function(e) {
    e.preventDefault(); e.stopPropagation(); triggerBtn.style.display = "none";
    
    const x = e.clientX; 
    const y = e.clientY;
    
    let displayWord = currentSelection;
    if (displayWord.length > 18) {
        displayWord = displayWord.substring(0, 18) + "...";
    }
    const imprintStyle = CRLanguages.isScript(currentSelection, srLang.code)
        ? "font-family:var(--sr-lang-font, sans-serif); text-transform:none; letter-spacing:1px; font-size:20px;"
        : "";
    showBubble(x, y, `
        <div style="position:relative;">
            <button id="sr-stop-icon" class="sr-close-btn" style="top:10px; right:10px;">×</button>
            <div class="sr-loading-container">
                <div class="sr-neural-container">
                    <div class="sr-neural-node sr-node-1"></div>
                    <div class="sr-neural-node sr-node-2"></div>
                </div>
                <div class="sr-imprint-word" style="${imprintStyle}">${generateTypewriterHtml(displayWord)}</div>
                <div class="sr-loading-text">
                    <div style="font-weight:700; color:#4b5563;">Analyzing Context...</div>
                    <div style="font-size:11px; color:#9ca3af; margin-top:4px;">
                        Getting definition...
                    </div>
                </div>
                <button id="sr-cancel-main" class="sr-cancel-btn">Stop Request</button>
            </div>
        </div>
    `);
    const stopIcon = document.getElementById('sr-stop-icon');
    const stopBtn = document.getElementById('sr-cancel-main');
    if (stopIcon) stopIcon.onclick = closeBubble;
    if (stopBtn) stopBtn.onclick = closeBubble;
    
    // Offline detection
    if (!navigator.onLine) {
        bubble.innerHTML = `<div style="padding:30px; text-align:center;">
            <div style="font-size:32px; margin-bottom:12px;">📡</div>
            <div style="font-size:14px; font-weight:600; color:#374151; margin-bottom:8px;">You appear to be offline</div>
            <div style="font-size:12px; color:#6b7280; margin-bottom:16px;">Connect to the internet and try again.</div>
            <button onclick="this.closest('[id]').style.display='none'" class="sr-secondary-btn" style="width:100%;">Close</button>
        </div>`;
        return;
    }

    sendMessageWithRetry({ action: "lookup", text: currentSelection, context: currentContext, lang: detectLanguage(currentSelection) }, response => {
        if (bubble.style.display === 'none') return;
        const isEmptyResponse = !response || response.trim() === '' || response.trim() === '<div></div>' || response.replace(/<[^>]*>/g, '').trim().length === 0;
        if (isEmptyResponse) {
            response = "<div class='sr-body' style='padding:20px; text-align:center;'><div style='font-size:24px; margin-bottom:8px;'>🤷</div><div style='font-size:13px; color:#6b7280;'>No definition found for this word. Try selecting a different word.</div></div>";
        }
        // JSON response from fast lookup — build HTML client-side
        // Note: response data comes from our own Gemini API via signed HMAC Worker proxy, not user input
        let finalHTML = response;
        if (typeof response === 'string' && response.trim().startsWith('{')) {
            try {
                finalHTML = buildLookupHTML(currentSelection, response);
            } catch(e) { /* fall through to raw HTML for backward compat */ }
        }
        bubble.innerHTML = finalHTML;
        forceHighlightWord(bubble.querySelector('.sr-body'));
        injectControls(currentSelection);

        setupMoreBtn(currentSelection);
        setupGeneralBtn(currentSelection);
        setupSimpleBtn(currentSelection);

        // Show warning when approaching daily limit
        chrome.runtime.sendMessage({ action: "getUsage" }, (usage) => {
            if (usage && !usage.unlimited && usage.remaining <= 5 && usage.remaining > 0) {
                const body = bubble.querySelector('.sr-body');
                if (body) {
                    const warn = document.createElement('div');
                    warn.style.cssText = 'text-align:center; font-size:11px; color:#92400e; background:#fffbeb; border:1px solid #fde68a; border-radius:6px; padding:5px 10px; margin-top:8px;';
                    warn.textContent = `${usage.remaining} lookup${usage.remaining !== 1 ? 's' : ''} remaining today`;
                    body.appendChild(warn);
                }
            }
        });

        setTimeout(repositionBubble, 50);
    });
});

// UNCHANGED
const SAVED_WORDS_LIMIT = 500;

function saveWord(word) {
    const trans = bubble.querySelector('.sr-translation')?.innerText || "";
    const def = bubble.querySelector('.sr-def')?.innerHTML || "";
    const defSinhala = bubble.querySelector('.sr-section .sr-sub-text')?.innerHTML || "";
    const hookText = bubble.querySelector('.sr-hook-text')?.innerText || "";
    const hookSinhala = bubble.querySelector('.sr-hook-box .sr-sub-text')?.innerHTML || "";
    const chatHTML = bubble.querySelector('.sr-chat')?.outerHTML || "";
    const chatSinhala = bubble.querySelector('.sr-section:nth-of-type(2) .sr-sub-text')?.innerHTML || "";
    const entry = { word, trans, def, defSinhala, hookText, hookSinhala, chatHTML, chatSinhala, date: Date.now() };
    chrome.storage.local.get(['savedWords'], (result) => {
        const list = result.savedWords || [];
        const newList = list.filter(w => w.word !== word);
        if (newList.length >= SAVED_WORDS_LIMIT) {
            const body = bubble.querySelector('.sr-body');
            if (body) {
                const msg = document.createElement('div');
                msg.style.cssText = 'background:#fff7ed; border:1px solid #fdba74; border-radius:8px; padding:10px; margin-top:10px; text-align:center; font-size:12px; color:#9a3412;';
                msg.innerHTML = `Word list full (${SAVED_WORDS_LIMIT}/${SAVED_WORDS_LIMIT}). Open your saved words list to export and clear space.`;
                body.appendChild(msg);
                setTimeout(() => msg.remove(), 5000);
            }
            return;
        }
        newList.unshift(entry);
        chrome.storage.local.set({ savedWords: newList }, () => {
            const btn = document.getElementById('sr-save-btn');
            if (btn) btn.classList.add('sr-saved');
        });
    });
}

function exportWordsToCSV(words) {
    const header = 'Word,Translation,Date\n';
    const rows = words.map(w => {
        const word = (w.word || '').replace(/"/g, '""');
        const trans = (w.trans || '').replace(/"/g, '""');
        const date = w.date ? new Date(w.date).toLocaleDateString() : '';
        return `"${word}","${trans}","${date}"`;
    }).join('\n');
    const csv = header + rows;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'context-reader-words.csv';
    a.click();
    URL.revokeObjectURL(url);
}

// UNCHANGED
function showSavedList() {
    savedBodyContent = bubble.querySelector('.sr-body').innerHTML; 
    const body = bubble.querySelector('.sr-body');
    chrome.storage.local.get(['savedWords'], (result) => {
        const list = result.savedWords || [];
        if (list.length === 0) {
            body.innerHTML = `<div style="padding:40px 20px; text-align:center; color:#6b7280;"><div style="font-size:30px; margin-bottom:10px;">🔭</div>No words saved yet.<br>Click the ❤️ to start building your library!</div><div style="text-align:center; padding-bottom:10px;"><button id="sr-back-list" class="sr-secondary-btn">⬅ Back</button></div>`;
        } else {
            let html = `<div style="padding:10px;"><h3 style="margin:0 0 15px 5px; font-size:16px; color:#111827; display:flex; justify-content:space-between; align-items:center;">My Library <span style="font-size:12px; font-weight:400; color:#6b7280; background:#f3f4f6; padding:2px 8px; border-radius:10px;">${list.length} / ${SAVED_WORDS_LIMIT}</span></h3>
            <div style="text-align:right; margin-bottom:10px;"><button id="sr-export-csv" style="font-size:11px; color:#0369a1; background:none; border:none; cursor:pointer; text-decoration:underline;">📥 Export CSV</button></div>`;
            list.forEach(item => {
                html += `<div class="sr-list-item"><div><div class="sr-list-word">${item.word}</div><div class="sr-list-trans">${item.trans}</div></div><div class="sr-action-group"><button class="sr-view-btn" title="View Details" data-word="${item.word}">👁️</button><button class="sr-delete-btn" title="Delete" data-word="${item.word}">×</button></div></div>`;
            });
            html += `<div style="text-align:center; margin-top:15px;"><button id="sr-back-list" class="sr-secondary-btn">⬅ Back</button></div></div>`;
            body.innerHTML = html;
            
            // 📊 NEW: Track word deletions
            document.querySelectorAll('.sr-delete-btn').forEach(btn => {
                btn.onclick = (e) => {
                    const w = e.target.getAttribute('data-word');
                    const filtered = list.filter(i => i.word !== w);
                    chrome.storage.local.set({ savedWords: filtered }, showSavedList);
                };
            });
            document.querySelectorAll('.sr-view-btn').forEach(btn => {
                btn.onclick = (e) => {
                    const w = e.target.getAttribute('data-word');
                    const item = list.find(i => i.word === w);
                    if (item) restoreWordView(item);
                };
            });
            const exportBtn = document.getElementById('sr-export-csv');
            if (exportBtn) exportBtn.onclick = () => exportWordsToCSV(list);
        }
        const backBtn = document.getElementById('sr-back-list');
        if (backBtn) backBtn.onclick = () => {
            body.innerHTML = savedBodyContent;
            injectControls(currentSelection); 
            setupMoreBtn(currentSelection);
            setupGeneralBtn(currentSelection);
            setupSimpleBtn(currentSelection);
        };
    });
}

// UNCHANGED
function restoreWordView(item) {
    const header = bubble.querySelector('.sr-header');
    header.querySelector('.sr-word').innerText = item.word;
    header.querySelector('.sr-translation').innerText = item.trans;
    const body = bubble.querySelector('.sr-body');
    body.innerHTML = `<div class="sr-section"><div style="display:flex; justify-content:space-between; align-items:center;"><p class="sr-def">${item.def}</p></div><p class="sr-sub-text">${item.defSinhala}</p></div><div class="sr-hook-box"><span class="sr-label">⚡️ Scenario</span><p class="sr-hook-text">${item.hookText}</p><p class="sr-sub-text">${item.hookSinhala}</p></div><div class="sr-section" style="margin-top: 15px;"><span class="sr-label">💬 Dialogue</span>${item.chatHTML}<p class="sr-sub-text" style="margin-top:5px;">${item.chatSinhala}</p></div><div style="margin-top:20px; text-align:center;"><button id="sr-restore-back" class="sr-secondary-btn" style="width:100%;">📂 Back to List</button></div>`;
    injectControls(item.word);
    document.getElementById('sr-restore-back').onclick = showSavedList;
}

// UNCHANGED: Inject Controls
function injectControls(word) {
    const header = bubble.querySelector('.sr-header');
    if (!header) return;
    const oldIcons = header.querySelector('.sr-icons'); if (oldIcons) oldIcons.remove();
    const oldClose = header.querySelector('.sr-close-btn'); if (oldClose) oldClose.remove();
    
    const closeBtn = document.createElement('button'); closeBtn.className = 'sr-close-btn'; closeBtn.innerHTML = '×'; closeBtn.onclick = closeBubble; header.appendChild(closeBtn);
    
    const iconContainer = document.createElement('div'); iconContainer.className = 'sr-icons';
    
    const audioBtn = document.createElement('button'); audioBtn.id = 'sr-audio-btn'; audioBtn.className = 'sr-icon-btn'; audioBtn.innerHTML = '🔊'; 
    audioBtn.onclick = (e) => { 
        e.stopPropagation(); 
        playSmartAudio(word);
    };
    
    const googleBtn = document.createElement('button'); googleBtn.id = 'sr-google-btn'; googleBtn.className = 'sr-icon-btn'; googleBtn.title = "Google Pronunciation"; googleBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>`; 
    // Google button opens a small menu instead of searching immediately.
    const gWrap = document.createElement('div'); gWrap.className = 'sr-g-wrap';
    const gMenu = document.createElement('div'); gMenu.className = 'sr-g-menu';

    // `word` is page-selected text — escape before it touches innerHTML.
    const gShort = word.length > 16 ? word.slice(0, 16) + '\u2026' : word;
    const gSafe = escapeHTML(gShort);
    const G_QUERIES = [
        { ico: SR_ICONS.speaker,  html: 'Pronounce',                 q: `pronounce ${word}` },
        { ico: SR_ICONS.question, html: `What is <b>${gSafe}</b>`,    q: `what is ${word}` },
        { ico: SR_ICONS.flow,     html: `How <b>${gSafe}</b> works`,  q: `how ${word} works` }
    ];
    G_QUERIES.forEach(({ ico, html, q }) => {
        const item = document.createElement('button');
        item.className = 'sr-g-item'; item.type = 'button';
        item.innerHTML = `<span class="sr-g-ico">${ico}</span><span class="sr-g-q">${html}</span>`;
        item.title = q;
        item.onclick = (ev) => {
            ev.stopPropagation();
            closeGMenu();
            window.open(`https://www.google.com/search?q=${encodeURIComponent(q)}`, '_blank');
        };
        gMenu.appendChild(item);
    });

    function closeGMenu() {
        gMenu.classList.remove('sr-open');
        googleBtn.classList.remove('sr-open-ring');
        document.removeEventListener('mousedown', onOutside, true);
        document.removeEventListener('keydown', onEsc, true);
    }
    function onOutside(ev) { if (!gWrap.contains(ev.target)) closeGMenu(); }
    function onEsc(ev) { if (ev.key === 'Escape') closeGMenu(); }

    googleBtn.onclick = (e) => {
        e.stopPropagation();
        const opening = !gMenu.classList.contains('sr-open');
        closeGMenu();
        if (opening) {
            gMenu.classList.add('sr-open');
            googleBtn.classList.add('sr-open-ring');
            document.addEventListener('mousedown', onOutside, true);
            document.addEventListener('keydown', onEsc, true);
        }
    };
    
    const saveBtn = document.createElement('button'); saveBtn.id = 'sr-save-btn'; saveBtn.className = 'sr-icon-btn'; saveBtn.title = "Save Word"; saveBtn.innerHTML = '❤️';
    saveBtn.onclick = (e) => { 
        e.stopPropagation(); 
        saveWord(word); 
    };
    
    const listBtn = document.createElement('button'); listBtn.id = 'sr-list-btn'; listBtn.className = 'sr-icon-btn'; listBtn.title = "My Words"; listBtn.innerHTML = '📂';
    listBtn.onclick = (e) => { 
        e.stopPropagation(); 
        showSavedList(); 
    };
    
    const videoBtn = document.createElement('button'); videoBtn.id = 'sr-video-btn'; videoBtn.className = 'sr-icon-btn'; videoBtn.title = "Movie Clip (Yarn)"; videoBtn.innerHTML = '🎬'; 
    videoBtn.onclick = (e) => {
        e.stopPropagation();
        const searchData = bubble.querySelector('#sr-video-data');
        const query = searchData ? searchData.getAttribute('data-query') : word;
        showVideoPlayer(query);
    };
    
    const studyBtn = document.createElement('button'); studyBtn.id = 'sr-study-btn'; studyBtn.className = 'sr-icon-btn'; studyBtn.title = "Study Sheet"; studyBtn.innerHTML = '📋';
    studyBtn.onclick = (e) => {
        e.stopPropagation();
        chrome.runtime.sendMessage({ action: "getAccessInfo" }, (access) => {
            if (access && access.studySheet) {
                enterHighlightMode();
            } else {
                showStudySheetDemoUI();
            }
        });
    };

    // Google is the only control shown. Audio, video, save, my-words and study
    // sheet are still constructed — other code holds references to saveBtn /
    // #sr-save-btn — they are simply not attached.
    // It used to be hidden whenever the source looked Sinhala, which made no
    // sense once there are thirteen languages: searching the web for the word
    // you just highlighted is useful whatever script it is in.
    gWrap.appendChild(googleBtn);
    gWrap.appendChild(gMenu);
    iconContainer.appendChild(gWrap);
    const headerTop = bubble.querySelector('.sr-header-top'); if(headerTop) headerTop.appendChild(iconContainer);

    chrome.storage.local.get(['savedWords'], (result) => {
        if (result.savedWords && result.savedWords.some(w => w.word === word)) { saveBtn.classList.add('sr-saved'); }
    });
}

// UNCHANGED: Setup More Button
// Gemini emits its own copy of the action-pill row (background.js prompt
// templates). The model can't reliably reproduce inline SVG, so it emits emoji;
// this upgrades whatever landed to the canonical markup.
function normalizeActionPills() {
    const spec = [
        ['sr-load-more', SR_ICONS.bolt, 'More', true],
        ['sr-load-general', SR_ICONS.globe, 'General', false],
        ['sr-load-simple', SR_ICONS.sparkle, 'Simple', false]
    ];
    for (const [id, ico, label, primary] of spec) {
        const btn = document.getElementById(id);
        if (!btn || btn.dataset.srNormalized) continue;
        btn.classList.add('sr-secondary-btn');
        if (primary) btn.classList.add('sr-btn-primary');
        // strip colour declarations the model may have emitted; keep layout
        btn.style.background = '';
        btn.style.borderColor = '';
        btn.style.color = '';
        btn.innerHTML = `${ico} ${label}`;
        btn.dataset.srNormalized = '1';
    }
}

function setupMoreBtn(word) {
    normalizeActionPills();
    const btn = document.getElementById('sr-load-more');
    if (btn) {
        btn.onclick = (e) => {
            e.stopPropagation();
            
            
            btn.disabled = true;
            btn.innerHTML = `<span style="display:inline-flex; animation: spin 1s linear infinite;">${SR_ICONS.bolt}</span> Loading...`;
            
            const placeholder = document.getElementById('sr-details-placeholder');
            if (!placeholder) {
                btn.disabled = false;
                btn.innerHTML = '⚡ More';
                return;
            }
            
            chrome.runtime.sendMessage({
                action: "lookupDetails",
                text: word,
                context: currentContext,
                lang: detectLanguage(currentSelection)
            }, response => {
                if (response) {
                    placeholder.innerHTML = response;
                    forceHighlightWord(placeholder);
                    btn.style.display = 'none';
                    setTimeout(repositionBubble, 50);
                } else {
                    placeholder.innerHTML = '<div style="color:#ef4444; font-size:12px; padding:10px; text-align:center;">Failed to load. Try again?</div>';
                    btn.disabled = false;
                    btn.innerHTML = '⚡ Retry';
                }
            });
        };
    }
}

// UNCHANGED: Setup General Button
function setupGeneralBtn(word) {
    const btn = document.getElementById('sr-load-general');
    if (btn) {
        btn.onclick = (e) => {
            e.stopPropagation();
            
            
            btn.disabled = true;
            btn.innerText = "Loading...";
            // Show spinner in body
            const body = bubble.querySelector('.sr-body');
            const spinnerEl = document.createElement('div');
            spinnerEl.id = 'sr-mode-spinner';
            spinnerEl.style.cssText = 'text-align:center; padding:20px; color:#6b7280; font-size:13px;';
            spinnerEl.innerHTML = '⏳ Loading general definition...';
            if (body) body.appendChild(spinnerEl);
            chrome.runtime.sendMessage({ action: "lookupGeneral", text: word, lang: detectLanguage(currentSelection) }, response => {
                const spinner = document.getElementById('sr-mode-spinner');
                if (spinner) spinner.remove();
                showGeneralModal(response);
                btn.disabled = false;
                btn.innerText = "🌐 General";
            });
        };
    }
}

// UNCHANGED: Setup Simple Button
function setupSimpleBtn(word) {
    const btn = document.getElementById('sr-load-simple');
    if (btn) {
        btn.onclick = (e) => {
            e.stopPropagation();
            
            
            btn.disabled = true;
            btn.innerText = "Wait...";
            const body = bubble.querySelector('.sr-body');
            const spinnerEl = document.createElement('div');
            spinnerEl.id = 'sr-mode-spinner';
            spinnerEl.style.cssText = 'text-align:center; padding:20px; color:#6b7280; font-size:13px;';
            spinnerEl.innerHTML = '⏳ Loading simple explanation...';
            if (body) body.appendChild(spinnerEl);
            chrome.runtime.sendMessage({ action: "lookupSimple", text: word, context: currentContext, lang: detectLanguage(currentSelection) }, response => {
                const spinner = document.getElementById('sr-mode-spinner');
                if (spinner) spinner.remove();
                showGeneralModal(response);
                btn.disabled = false;
                btn.innerText = "👶 Simple";
            });
        };
    }
}

// UNCHANGED: Show General Modal
function showGeneralModal(htmlContent) {
    const oldModal = bubble.querySelector('#sr-general-modal');
    if (oldModal) oldModal.remove();

    const body = bubble.querySelector('.sr-body');
    
    const existingChildren = Array.from(body.children);
    existingChildren.forEach(child => child.style.display = 'none');

    const modal = document.createElement('div');
    modal.id = 'sr-general-modal';
    modal.className = 'active';
    
    modal.style.position = 'relative'; 
    modal.style.height = 'auto';
    modal.style.width = '100%';
    modal.style.display = 'flex';
    modal.style.justifyContent = 'center';

    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlContent;
    const defText = tempDiv.querySelector('.sr-def')?.innerHTML;
    const simpleBox = tempDiv.querySelector('.sr-simple-box')?.innerHTML;
    let contentHTML = "";
    if (simpleBox) {
        contentHTML = simpleBox;
    } else if (defText) {
        const sinhalaText = tempDiv.querySelector('.sr-sub-text')?.innerHTML || "";
        const usesList = tempDiv.querySelector('ul')?.innerHTML || "";
        contentHTML = `
            <div class="sr-general-content">${defText}</div>
            <div class="sr-general-sinhala">${sinhalaText}</div>
            ${usesList ? `<div class="sr-general-uses"><div class="sr-general-uses-title">Other Uses:</div><ul>${usesList}</ul></div>` : ''}
        `;
    } else {
        contentHTML = htmlContent;
    }
    
    modal.innerHTML = `
        <div class="sr-general-card" style="margin: 0; width: 100%;">
            <div class="sr-general-header">
                <div class="sr-general-title">✨ Explanation</div>
                <button class="sr-general-close">×</button>
            </div>
            ${contentHTML}
        </div>
    `;
    
    body.appendChild(modal);

    const closeFunc = () => {
        modal.remove();
        existingChildren.forEach(child => child.style.display = ''); 
        setTimeout(repositionBubble, 50);
    };

    modal.querySelector('.sr-general-close').onclick = closeFunc;
    
    setTimeout(repositionBubble, 50);
}

// 📊 MODIFIED: Track video navigation
function showVideoPlayer(query) {
    const body = bubble.querySelector('.sr-body');
    savedBodyContent = body.innerHTML; 
    const thisRequestId = Date.now(); 
    currentVideoRequestId = thisRequestId;
    
    body.innerHTML = `
        <div class="sr-loading-container">
            <div class="sr-neural-container">
                <div class="sr-neural-node sr-node-1"></div>
                <div class="sr-neural-node sr-node-2"></div>
                <div class="sr-neural-node sr-node-3"></div>
            </div>
            <div class="sr-imprint-word">${generateTypewriterHtml(query)}</div>
            <div class="sr-loading-text">Scanning Movie Archives...</div>
            <button id="sr-cancel-video" class="sr-cancel-btn">Cancel Request</button>
        </div>
    `;
    
    document.getElementById('sr-cancel-video').onclick = () => { 
        currentVideoRequestId = 0; 
        body.innerHTML = savedBodyContent; 
        setupMoreBtn(currentSelection);
        setupGeneralBtn(currentSelection); 
        setupSimpleBtn(currentSelection); 
    };
    
    chrome.runtime.sendMessage({ action: "fetchVideo", query: query }, response => {
        if (currentVideoRequestId !== thisRequestId) return;
        
        if (response && response.success && response.videos && response.videos.length > 0) {
            currentVideoList = response.videos; 
            currentVideoIndex = 0; 
            renderVideoUI(body, response.text);
        } else {
            // Silently return to the definition view when no clips found
            body.innerHTML = savedBodyContent;
            setupMoreBtn(currentSelection);
            setupGeneralBtn(currentSelection);
            setupSimpleBtn(currentSelection);
        }
    });
}

// 📊 MODIFIED: Track video navigation
function renderVideoUI(body, query) {
    const videoData = currentVideoList[currentVideoIndex];
    const displayText = videoData.text || query;
    const escapedWord = currentSelection.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const highlightedSubtitle = displayText.replace(new RegExp(`(${escapedWord})`, 'gi'), '<span class="sr-hl-video">$1</span>');
    
    body.innerHTML = `
        <div style="height:100%; display:flex; flex-direction:column; padding-top:10px;">
            <div style="position:relative; background:#000; border-radius:8px; overflow:hidden; box-shadow:0 4px 6px rgba(0,0,0,0.1);">
                <video src="${videoData.url}" poster="${videoData.poster}" controls autoplay name="media" style="width:100%; display:block; aspect-ratio: 16/9;"></video>
                <div class="sr-subtitle-overlay">"${highlightedSubtitle}"</div>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:12px; padding:0 5px;">
                <button id="sr-vid-prev" class="sr-nav-btn" ${currentVideoIndex === 0 ? 'disabled' : ''}>⬅ Prev</button>
                <span style="font-size:12px; color:#6b7280; font-weight:600;">${currentVideoIndex + 1} / ${currentVideoList.length}</span>
                <button id="sr-vid-next" class="sr-nav-btn" ${currentVideoIndex === currentVideoList.length - 1 ? 'disabled' : ''}>Next ➡</button>
            </div>
            <div style="margin-top:10px; text-align:center;">
                <button id="sr-back-btn" class="sr-secondary-btn" style="width:100%; padding:8px;">⬅ Back to Definition</button>
            </div>
        </div>
    `;
    
    document.getElementById('sr-back-btn').onclick = () => { 
        body.innerHTML = savedBodyContent; 
        setupMoreBtn(currentSelection);
        setupGeneralBtn(currentSelection); 
        setupSimpleBtn(currentSelection); 
    };
    
    document.getElementById('sr-vid-prev').onclick = () => { 
        if (currentVideoIndex > 0) { 
            currentVideoIndex--; 
            renderVideoUI(body, query); 
        } 
    };
    
    document.getElementById('sr-vid-next').onclick = () => { 
        if (currentVideoIndex < currentVideoList.length - 1) { 
            currentVideoIndex++; 
            renderVideoUI(body, query); 
        } 
    };
}

// Pronunciation is spoken by the browser, locally. This used to fetch a
// recording from api.dictionaryapi.dev first, which meant every play sent the
// word the user was reading to a third party — the one call in this extension
// that leaked what someone was looking at. speechSynthesis needs no network.
function playSmartAudio(word) {
    speakFallback(word);
}

function speakFallback(text) { 
    const utterance = new SpeechSynthesisUtterance(text); 
    utterance.lang = 'en-US'; 
    const voices = window.speechSynthesis.getVoices(); 
    const googleVoice = voices.find(v => v.name.includes("Google US English")); 
    if (googleVoice) utterance.voice = googleVoice; 
    window.speechSynthesis.speak(utterance); 
}

// ============================================
// 📋 STUDY SHEET GATING
// ============================================

function showStudySheetDemoUI() {
    const body = bubble.querySelector('.sr-body');
    if (!body) return;

    if (bubble.style.display !== 'flex') {
        bubble.style.display = 'flex';
        bubble.style.left = Math.max(20, (window.innerWidth - 400) / 2) + 'px';
        bubble.style.top = Math.max(20, (window.innerHeight - 350) / 2) + 'px';
        bubble.innerHTML = `
            <div class="sr-header" style="cursor:move;">
                <div class="sr-header-top">
                    <h2 class="sr-word" style="font-size:18px;">Study Sheet</h2>
                </div>
                <button class="sr-close-btn" style="position:absolute; top:12px; right:12px;">×</button>
            </div>
            <div class="sr-body"></div>
        `;
        bubble.querySelector('.sr-close-btn').onclick = closeBubble;
    }

    const bodyEl = bubble.querySelector('.sr-body');
    bodyEl.innerHTML = `
        <div style="padding:20px; text-align:center;">
            <div style="position:relative; background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; padding:20px; margin-bottom:15px; overflow:hidden;">
                <div style="position:absolute; inset:0; background:linear-gradient(135deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.9) 100%); z-index:1;"></div>
                <div style="opacity:0.5;">
                    <div style="font-size:14px; font-weight:700; color:#111827; margin-bottom:8px;">📋 Word List Preview</div>
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; text-align:left; font-size:11px;">
                        <div style="background:white; border:1px solid #e5e7eb; border-radius:6px; padding:8px;">
                            <div style="font-weight:700;">implement</div>
                            <div style="color:#6b7280;">ක්‍රියාත්මක කරනව</div>
                        </div>
                        <div style="background:white; border:1px solid #e5e7eb; border-radius:6px; padding:8px;">
                            <div style="font-weight:700;">consequence</div>
                            <div style="color:#6b7280;">ප්‍රතිඵලය</div>
                        </div>
                        <div style="background:white; border:1px solid #e5e7eb; border-radius:6px; padding:8px;">
                            <div style="font-weight:700;">perspective</div>
                            <div style="color:#6b7280;">දෘෂ්ටිකෝණය</div>
                        </div>
                        <div style="background:white; border:1px solid #e5e7eb; border-radius:6px; padding:8px;">
                            <div style="font-weight:700;">hierarchy</div>
                            <div style="color:#6b7280;">ධුරාවලිය</div>
                        </div>
                    </div>
                </div>
                <div style="position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); z-index:2; background:white; border-radius:12px; padding:12px 20px; box-shadow:0 4px 20px rgba(0,0,0,0.15);">
                    <div style="font-size:18px; margin-bottom:4px;">🚀</div>
                    <div style="font-weight:700; font-size:13px; color:#111827;">Coming Soon</div>
                </div>
            </div>

            <p style="font-size:13px; color:#4b5563; line-height:1.5; margin-bottom:12px;">
                The Study Sheet feature generates printable vocabulary lists from any page. It's currently in development.
            </p>

            <button id="sr-demo-back" class="sr-secondary-btn" style="margin-top:12px; width:100%;">⬅ Back</button>
        </div>
    `;

    const backBtn = document.getElementById('sr-demo-back');
    if (backBtn) backBtn.onclick = () => {
        bodyEl.innerHTML = savedBodyContent;
        setupMoreBtn(currentSelection);
        setupGeneralBtn(currentSelection);
        setupSimpleBtn(currentSelection);
    };
}

// 📋 STUDY SHEET FEATURE (V2 — Redesigned)
// ============================================

let studyCancelled = false;

function showStudySheetModal() {
    const body = bubble.querySelector('.sr-body');
    if (!body) return;
    savedBodyContent = body.innerHTML;
    renderStudyLevelPicker(body, false);
}

function showStudySheetModalStandalone(hasSelection, calibrationWords) {
    // Show bubble at viewport center if not visible
    if (bubble.style.display !== 'flex') {
        bubble.style.display = 'flex';
        bubble.style.left = Math.max(20, (window.innerWidth - 400) / 2) + 'px';
        bubble.style.top = Math.max(20, (window.innerHeight - 350) / 2) + 'px';
        bubble.innerHTML = `
            <div class="sr-header" style="cursor:move;">
                <div class="sr-header-top">
                    <h2 class="sr-word" style="font-size:18px;">Study Sheet</h2>
                </div>
                <button class="sr-close-btn" style="position:absolute; top:12px; right:12px;">×</button>
            </div>
            <div class="sr-body"></div>
        `;
        bubble.querySelector('.sr-close-btn').onclick = closeBubble;
    }
    const body = bubble.querySelector('.sr-body');
    if (!body) return;
    savedBodyContent = body.innerHTML;
    renderStudyLevelPicker(body, hasSelection, calibrationWords);
}

function renderStudyLevelPicker(body, hasSelection, calibrationWords) {
    const sel = window.getSelection();
    const selectedText = sel ? sel.toString().trim() : '';
    const hasSelectedText = hasSelection || selectedText.length > 50;
    const isPdf = !!(window._pdfTextCache && Object.keys(window._pdfTextCache).length > 0);
    const maxPage = isPdf ? Math.max(...Object.keys(window._pdfTextCache).map(Number)) : 0;
    const hasCalibration = calibrationWords && calibrationWords.length >= 3;

    let calibrationHTML = '';
    if (hasCalibration) {
        const wordChips = calibrationWords.map(w =>
            `<span style="display:inline-block; background:#fef08a; color:#92400e; padding:2px 8px; border-radius:4px; font-size:11px; font-weight:600; margin:2px;">${escapeHTML(w.word)}</span>`
        ).join('');
        calibrationHTML = `
            <div style="background:#fffbeb; border:1px solid #fde68a; border-radius:8px; padding:10px; margin-bottom:10px; text-align:left;">
                <div style="font-size:12px; font-weight:700; color:#92400e; margin-bottom:4px;">Calibrated with ${calibrationWords.length} marked words</div>
                <div style="display:flex; flex-wrap:wrap; gap:2px;">${wordChips}</div>
                <div style="font-size:10px; color:#a84e08; margin-top:4px;">AI will find words at a similar difficulty level</div>
            </div>
        `;
    }

    body.innerHTML = `
        <div style="padding:15px; text-align:center;">
            <div style="font-size:20px; margin-bottom:5px;">📋</div>
            <div style="font-weight:700; color:#111827; font-size:16px; margin-bottom:3px;">Study Sheet</div>
            <div style="font-size:12px; color:#6b7280; margin-bottom:8px;">
                ${hasSelectedText ? 'Generating from your selected text' : 'Uses full page text (or highlight text first)'}
            </div>
            ${calibrationHTML}
            ${isPdf ? `
            <div style="margin-bottom:10px; text-align:left;">
                <label style="font-size:11px; font-weight:600; color:#4b5563; display:block; margin-bottom:3px;">PDF Page Range (optional)</label>
                <input id="sr-page-range" type="text" placeholder="e.g. 1-5, 8, 12-15" style="width:100%; padding:7px 10px; border:1px solid #d1d5db; border-radius:6px; font-size:12px; color:#374151;">
                <div style="font-size:10px; color:#9ca3af; margin-top:2px;">Leave empty for all ${maxPage} pages</div>
            </div>` : ''}
            ${!hasSelectedText && !hasCalibration ? '<div style="font-size:11px; color:#a84e08; margin-bottom:10px; padding:6px 10px; background:#fffbeb; border-radius:6px; border:1px solid #fde68a;">Tip: highlight text on the page first for more targeted results</div>' : ''}
            <div style="display:flex; flex-direction:column; gap:8px;">
                <button class="sr-study-level-btn" data-level="basic_all" style="padding:12px; border:1px solid #bbf7d0; background:#f0fdf4; border-radius:8px; cursor:pointer; text-align:left; transition:all 0.15s;">
                    <div style="font-weight:700; color:#166534; font-size:14px;">🌱 Basic</div>
                    <div style="font-size:11px; color:#166534; margin-top:2px;">Includes all levels (A1-C2)</div>
                </button>
                <button class="sr-study-level-btn" data-level="intermediate_up" style="padding:12px; border:1px solid #fde68a; background:#fffbeb; border-radius:8px; cursor:pointer; text-align:left; transition:all 0.15s;">
                    <div style="font-weight:700; color:#92400e; font-size:14px;">📚 Intermediate</div>
                    <div style="font-size:11px; color:#a84e08; margin-top:2px;">Includes Intermediate + Advanced (B1-C2)</div>
                </button>
                <button class="sr-study-level-btn" data-level="advanced" style="padding:12px; border:1px solid #c4b5fd; background:#f5f3ff; border-radius:8px; cursor:pointer; text-align:left; transition:all 0.15s;">
                    <div style="font-weight:700; color:#5b21b6; font-size:14px;">🎓 Advanced</div>
                    <div style="font-size:11px; color:#6d28d9; margin-top:2px;">Advanced only (C1-C2)</div>
                </button>
            </div>
            <button id="sr-study-back" class="sr-secondary-btn" style="margin-top:12px; width:100%;">⬅ Back</button>
        </div>
    `;

    document.querySelectorAll('.sr-study-level-btn').forEach(btn => {
        btn.onmouseenter = () => { btn.style.transform = 'translateY(-1px)'; btn.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)'; };
        btn.onmouseleave = () => { btn.style.transform = ''; btn.style.boxShadow = ''; };
        btn.onclick = (e) => {
            e.stopPropagation();
            const pageRangeInput = document.getElementById('sr-page-range');
            const pageRangeStr = pageRangeInput ? pageRangeInput.value : '';
            generateStudySheetNew(btn.dataset.level, pageRangeStr, calibrationWords);
        };
    });

    document.getElementById('sr-study-back').onclick = () => {
        cleanupHighlights();
        body.innerHTML = savedBodyContent;
        setupMoreBtn(currentSelection);
        setupGeneralBtn(currentSelection);
        setupSimpleBtn(currentSelection);
    };
}

function generateStudySheetNew(level, pageRangeStr, calibrationWords) {
    const body = bubble.querySelector('.sr-body');
    if (!body) return;
    studyCancelled = false;

    // Get text: prefer user selection, else extract from page
    const sel = window.getSelection();
    const selectedText = sel ? sel.toString().trim() : '';
    let text, wordCount;

    if (selectedText.length > 50) {
        text = selectedText;
        wordCount = text.split(/\s+/).length;
    } else {
        const isPdf = !!(window._pdfTextCache && Object.keys(window._pdfTextCache).length > 0);
        let pageRange = null;
        if (isPdf && pageRangeStr) {
            const maxPage = Math.max(...Object.keys(window._pdfTextCache).map(Number));
            pageRange = parsePageRange(pageRangeStr, maxPage);
        }
        const extracted = extractPageTextV2(pageRange);
        text = extracted.text;
        wordCount = extracted.wordCount;
    }

    if (wordCount < 50) {
        body.innerHTML = `
            <div style="padding:40px 20px; text-align:center;">
                <div style="font-size:30px; margin-bottom:10px;">📄</div>
                <div style="font-weight:700; color:#111827; margin-bottom:5px;">Not Enough Text</div>
                <div style="font-size:13px; color:#6b7280; margin-bottom:15px;">Only ${wordCount} words found. Need at least 50.</div>
                <button id="sr-study-back2" class="sr-secondary-btn" style="width:100%;">⬅ Back</button>
            </div>
        `;
        document.getElementById('sr-study-back2').onclick = () => showStudySheetModal();
        return;
    }

    const lang = detectLanguage(text);
    // CEFR-based chunk sizes: basic=100, intermediate=135, advanced=170
    // Smaller chunks = more focus per word, less overload on model
    const chunkSizeByLevel = { basic_all: 100, intermediate_up: 135, advanced: 170 };
    const extractionChunkSize = chunkSizeByLevel[level] || 200;
    const contextWindowSize = 500; // Always 500-word context for translation accuracy

    // Create small extraction chunks
    const extractionChunks = chunkTextSemantic(text, extractionChunkSize);
    // Create 500-word context windows around each extraction chunk
    const fullWords = text.split(/\s+/);
    const chunks = extractionChunks.map(ec => {
        // Find where this chunk starts in the full text
        const chunkStart = text.indexOf(ec);
        const wordsBefore = chunkStart > 0 ? text.substring(0, chunkStart).split(/\s+/).length : 0;
        const chunkWordCount = ec.split(/\s+/).length;
        // Build context: center a 500-word window around this chunk
        const contextPadding = Math.floor((contextWindowSize - chunkWordCount) / 2);
        const contextStart = Math.max(0, wordsBefore - contextPadding);
        const contextEnd = Math.min(fullWords.length, wordsBefore + chunkWordCount + contextPadding);
        const context = fullWords.slice(contextStart, contextEnd).join(' ');
        return { chunk: ec, context: context };
    });
    const levelLabels = { basic_all: 'Basic (all levels)', intermediate_up: 'Intermediate+', advanced: 'Advanced (C1-C2)' };

    // Show progress UI
    body.innerHTML = `
        <div class="sr-loading-container">
            <div class="sr-neural-container">
                <div class="sr-neural-node sr-node-1"></div>
                <div class="sr-neural-node sr-node-2"></div>
                <div class="sr-neural-node sr-node-3"></div>
            </div>
            <div style="font-weight:700; color:#4b5563; font-size:14px;" id="sr-study-phase">Extracting words...</div>
            <div style="font-size:12px; color:#9ca3af; margin-top:4px;" id="sr-study-chunk">
                Section 1 of ${chunks.length} · ${levelLabels[level] || level}
            </div>
            <div style="font-size:13px; color:#a84e08; font-weight:600; margin-top:8px;" id="sr-study-count">0 words found</div>
            <div style="font-size:11px; color:#9ca3af; margin-top:4px;">${wordCount.toLocaleString()} words · ${chunks.length} section${chunks.length > 1 ? 's' : ''}</div>
            <button id="sr-cancel-study" class="sr-cancel-btn" style="margin-top:15px;">Cancel</button>
        </div>
    `;

    document.getElementById('sr-cancel-study').onclick = () => {
        studyCancelled = true;
        body.innerHTML = savedBodyContent;
        setupMoreBtn(currentSelection);
        setupGeneralBtn(currentSelection);
        setupSimpleBtn(currentSelection);
    };

    chrome.runtime.sendMessage({
        action: "generateStudySheetV2",
        chunks: chunks, // Array of { chunk, context } objects
        level: level,
        lang: lang,
        calibrationWords: calibrationWords || null
    }, response => {
        cleanupHighlights();
        if (studyCancelled || bubble.style.display === 'none') return;

        if (!response || !response.words || response.words.length === 0) {
            body.innerHTML = `
                <div style="padding:40px 20px; text-align:center;">
                    <div style="font-size:30px; margin-bottom:10px;">⚠️</div>
                    <div style="font-weight:700; color:#ef4444; margin-bottom:5px;">Generation Failed</div>
                    <div style="font-size:13px; color:#6b7280; margin-bottom:15px;">No words could be extracted. Please try again.</div>
                    <button id="sr-study-retry" class="sr-secondary-btn" style="width:100%; margin-bottom:8px;">🔄 Retry</button>
                    <button id="sr-study-back3" class="sr-secondary-btn" style="width:100%;">⬅ Back</button>
                </div>
            `;
            document.getElementById('sr-study-retry').onclick = () => generateStudySheetNew(level, pageRangeStr);
            document.getElementById('sr-study-back3').onclick = () => showStudySheetModal();
            return;
        }

        showStudySheetResultsNew(response, level, lang, chunks, pageRangeStr);
    });
}

function updateStudyProgress(data) {
    const phaseEl = document.getElementById('sr-study-phase');
    const chunkEl = document.getElementById('sr-study-chunk');
    const countEl = document.getElementById('sr-study-count');
    if (phaseEl) {
        phaseEl.textContent = data.phase === 'contextual' ? 'Extracting words...' : 'Getting simple explanations...';
    }
    if (chunkEl) {
        chunkEl.textContent = `Section ${data.current} of ${data.total}`;
    }
    if (countEl && data.wordsFound !== undefined) {
        countEl.textContent = `${data.wordsFound} words found`;
    }
}

function showStudySheetResultsNew(data, level, lang, chunks, pageRangeStr) {
    const body = bubble.querySelector('.sr-body');
    if (!body) return;

    const wordCount = data.words.length;
    const levelLabels = { basic_all: 'Basic (all levels)', intermediate_up: 'Intermediate+', advanced: 'Advanced (C1-C2)' };
    const hasFailed = data.failedChunks && data.failedChunks.length > 0;

    body.innerHTML = `
        <div style="padding:15px; text-align:center;">
            <div style="font-size:30px; margin-bottom:5px;">✅</div>
            <div style="font-weight:700; color:#111827; font-size:16px;">Study Sheet Ready!</div>
            <div style="font-size:13px; color:#6b7280; margin-top:3px; margin-bottom:12px;">${wordCount} words · ${levelLabels[level] || level}</div>
            ${hasFailed ? `
            <div style="background:#fff7ed; border:1px solid #fdba74; border-radius:8px; padding:10px; margin-bottom:12px; text-align:left;">
                <div style="font-size:12px; font-weight:600; color:#c2410c;">${data.failedChunks.length} of ${data.totalChunks} sections failed</div>
                <div style="font-size:11px; color:#9a3412; margin-top:3px;">Partial results shown. Click retry to process failed sections.</div>
                <button id="sr-study-retry-failed" class="sr-secondary-btn" style="margin-top:8px; width:100%; border-color:#fdba74; color:#c2410c;">🔄 Retry failed sections</button>
            </div>` : ''}
            <button id="sr-view-study" style="width:100%; padding:14px; border:1px solid #fde68a; background:#fffbeb; border-radius:8px; cursor:pointer; transition:all 0.15s;">
                <div style="font-weight:700; color:#92400e; font-size:14px;">📖 View Study Sheet</div>
                <div style="font-size:11px; color:#a84e08; margin-top:2px;">Dense 2-column dictionary with contextual + simple translations</div>
            </button>
            <button id="sr-study-back4" class="sr-secondary-btn" style="margin-top:10px; width:100%;">⬅ Back</button>
        </div>
    `;

    document.getElementById('sr-view-study').onclick = (e) => {
        e.stopPropagation();
        const html = generateStudySheetDocNew(data, level, lang);
        openPrintableDoc(html);
    };

    if (hasFailed) {
        const retryBtn = document.getElementById('sr-study-retry-failed');
        if (retryBtn) {
            retryBtn.onclick = (e) => {
                e.stopPropagation();
                // Retry only failed chunks
                const failedChunkTexts = data.failedChunks.map(i => chunks[i]).filter(Boolean);
                if (failedChunkTexts.length === 0) return;

                retryBtn.disabled = true;
                retryBtn.textContent = 'Retrying...';

                chrome.runtime.sendMessage({
                    action: "generateStudySheetV2",
                    chunks: failedChunkTexts,
                    level: level,
                    lang: lang
                }, retryResponse => {
                    if (retryResponse && retryResponse.words && retryResponse.words.length > 0) {
                        data.words = data.words.concat(retryResponse.words);
                        data.failedChunks = retryResponse.failedChunks.map(i => data.failedChunks[i]);
                    }
                    showStudySheetResultsNew(data, level, lang, chunks, pageRangeStr);
                });
            };
        }
    }

    document.getElementById('sr-study-back4').onclick = () => {
        body.innerHTML = savedBodyContent;
        setupMoreBtn(currentSelection);
        setupGeneralBtn(currentSelection);
        setupSimpleBtn(currentSelection);
    };

    // Hover effect
    const viewBtn = document.getElementById('sr-view-study');
    viewBtn.onmouseenter = () => { viewBtn.style.transform = 'translateY(-1px)'; viewBtn.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)'; };
    viewBtn.onmouseleave = () => { viewBtn.style.transform = ''; viewBtn.style.boxShadow = ''; };
}

function generateStudySheetDocNew(data, level, lang) {
    const levelLabels = { basic_all: 'Basic (all levels)', intermediate_up: 'Intermediate + Advanced', advanced: 'Advanced (C1-C2)', basic: 'Basic (A1-A2)', intermediate: 'Intermediate (B1-B2)' };
    const isEN = lang === 'en';
    const title = isEN ? 'Study Sheet' : 'අධ්‍යයන පත්‍රය';
    const sourceTitle = document.title || 'Untitled';
    const sourceUrl = window.location.href;

    let entries = '';
    data.words.forEach((w, i) => {
        const hasSimple = w.simple && w.simple.trim();
        entries += `<div class="entry">
            <span class="e-word">${escapeHTML(w.word)}</span>
            <span class="e-ctx">${escapeHTML(w.translation)} — ${escapeHTML(w.definition)}</span>
            ${hasSimple ? `<span class="e-simple">${escapeHTML(w.simple)}</span>` : ''}
        </div>`;
    });

    return `<!DOCTYPE html>
<html lang="${lang}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <link href="https://fonts.googleapis.com/css2?family=${srLang.family || 'Inter:wght@400;600;700;800'}&family=Inter:wght@400;600;700;800&display=swap" rel="stylesheet">
    <style>
        @page { size: A4; margin: 12mm 15mm; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        /* The sheet is paper and stays white and flat — it exists to be printed.
           Only the surround joins the neutral family the other surfaces use. */
        body { font-family: 'Inter', system-ui, sans-serif; color: #111827; background: #aeb4be; padding: 0; margin: 0; font-size: 9pt; line-height: 1.4; }
        .sticky-toolbar { position: sticky; top: 0; z-index: 100; padding: 8px 20px; background: #1f2937; display: flex; gap: 8px; align-items: center; box-shadow: 0 2px 8px rgba(0,0,0,0.3); }
        .sticky-toolbar button { padding: 7px 16px; border: 1px solid rgba(255,255,255,0.2); background: rgba(255,255,255,0.1); border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 12px; color: #fff; transition: all 0.15s; }
        .sticky-toolbar button:hover { background: rgba(255,255,255,0.2); border-color: rgba(255,255,255,0.4); }
        .sticky-toolbar .download-btn { background: #a84e08; border-color: #a84e08; }
        .sticky-toolbar .download-btn:hover { background: #92400e; border-color: #92400e; }
        .sticky-toolbar .hint { font-size: 11px; color: rgba(255,255,255,0.5); margin-left: auto; }
        .page-container { width: 210mm; margin: 15px auto; background: #fff; box-shadow: 0 4px 20px rgba(0,0,0,0.3); padding: 12mm 15mm; }
        .doc-header { border-bottom: 1px solid #d1d5db; padding-bottom: 8px; margin-bottom: 10px; }
        .doc-header h1 { font-size: 14pt; font-weight: 800; color: #111827; margin-bottom: 2px; }
        .doc-header .meta { font-size: 8pt; color: #6b7280; }
        .doc-header .meta a { color: #2563eb; text-decoration: none; }
        .columns { column-count: 2; column-gap: 20px; column-rule: 1px solid #d1d5db; }
        .entry { break-inside: avoid; border-bottom: 1px dotted #e5e7eb; padding: 3px 0; }
        .entry:last-child { border-bottom: none; }
        .e-word { font-weight: 700; font-size: 10pt; color: #111827; display: inline; margin-right: 4px; }
        .e-ctx { font-family: ${srLang.font}, 'Inter', sans-serif; font-size: 9pt; color: #92400e; display: inline; }
        .e-simple { font-family: ${srLang.font}, 'Inter', sans-serif; font-size: 9pt; color: #047857; font-style: italic; display: block; margin-top: 1px; padding-left: 8px; }
        @media print {
            body { background: #fff; }
            .sticky-toolbar { display: none; }
            .page-container { width: auto; margin: 0; box-shadow: none; padding: 0; }
        }
    </style>
</head>
<body>
    <div class="sticky-toolbar">
        <button class="download-btn" id="sr-download-btn">📥 Save PDF</button>
        <button id="sr-print-btn">🖨️ Print</button>
        <button id="sr-close-btn">✕ Close</button>
        <span class="hint">Tip: Use "Save as PDF" in print dialog</span>
    </div>
    <div class="page-container">
        <div class="doc-header">
            <h1>${escapeHTML(title)}</h1>
            <div class="meta">
                ${escapeHTML(sourceTitle)} · <a href="${escapeHTML(sourceUrl)}">${escapeHTML(sourceUrl).substring(0, 60)}</a><br>
                ${levelLabels[level] || level} · ${data.words.length} words · ${new Date().toLocaleDateString()}
            </div>
        </div>
        <div class="columns">
            ${entries}
        </div>
    </div>
</body>
</html>`;
}

function openPrintableDoc(html) {
    const win = window.open('', '_blank');
    if (win) {
        win.document.write(html);
        win.document.close();

        const printBtn = win.document.getElementById('sr-print-btn');
        const downloadBtn = win.document.getElementById('sr-download-btn');
        const closeBtn = win.document.getElementById('sr-close-btn');
        if (printBtn) printBtn.addEventListener('click', () => win.print());
        if (downloadBtn) downloadBtn.addEventListener('click', () => win.print());
        if (closeBtn) closeBtn.addEventListener('click', () => win.close());
    }
}

function escapeHTML(str) {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
}

// === DRAGGING LOGIC (UPDATED - WORKS DURING LOADING) ===
let isDragging = false, startX, startY, initialLeft, initialTop;

bubble.addEventListener('mousedown', (e) => {
    // 🛠 FIX: Allow dragging on Header OR Loading Screen
    const isDraggableArea = e.target.closest('.sr-header') || e.target.closest('.sr-loading-container');
    
    // Don't drag if they clicked a button (like Close or Stop)
    if (isDraggableArea && !e.target.closest('button')) {
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        const rect = bubble.getBoundingClientRect();
        initialLeft = rect.left;
        initialTop = rect.top;
        e.preventDefault();
        
        // Visual feedback: show we're dragging
        bubble.style.cursor = 'grabbing';
    }
});

document.addEventListener('mousemove', (e) => {
    if (isDragging) {
        let newX = initialLeft + (e.clientX - startX);
        let newY = initialTop + (e.clientY - startY);
        if(newY < 0) newY = 0;
        bubble.style.left = `${newX}px`;
        bubble.style.top = `${newY}px`;
    }
});

document.addEventListener('mouseup', () => {
    isDragging = false;
    bubble.style.cursor = 'default'; // Reset cursor
});

document.addEventListener('keydown', (e) => {
    if (bubble.style.display === 'flex' && !['INPUT','TEXTAREA'].includes(e.target.tagName)) {
        if (e.key === 'Escape') closeBubble();
        if (e.key.toLowerCase() === 'c' && !e.ctrlKey && !e.metaKey) closeBubble();
    }
});

// ============================================
// 📩 INCOMING MESSAGE LISTENER
// ============================================
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "lookupUpdate" && request.d) {
        const defEl = document.getElementById('sr-def-area');
        if (defEl) {
            const label = document.createElement('span');
            label.className = 'sr-def-label';
            label.textContent = 'CONTEXT';
            defEl.textContent = '';
            defEl.appendChild(label);
            defEl.appendChild(document.createTextNode(request.d));
        }
        if (request.timing) {
            console.log(`⏱️ UPDATE d arrived — mode:${request.timing.mode} tOnly:${request.timing.tTime}ms total:${request.timing.totalTime}ms`);
        }
    }
    if (request.action === "lookupPartialT" && request.t) {
        const transEl = document.querySelector('.sr-translation');
        if (transEl) transEl.textContent = request.t;
    }
    if (request.action === "studyProgress") {
        updateStudyProgress(request);
    }
    if (request.action === "triggerStudySheet") {
        chrome.runtime.sendMessage({ action: "getAccessInfo" }, (access) => {
            if (access && access.studySheet) {
                showStudySheetModalStandalone(request.hasSelection, null);
            } else {
                showStudySheetDemoUI();
            }
        });
    }
});