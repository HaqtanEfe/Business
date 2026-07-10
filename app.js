/* ============================================================================
   app.js — vanilla controller for the business.haktanefe.com page.
   Ports every interaction from the Claude Design mockup (which ran on React):
   terminal cycler + Luau highlighter, Hue chat cycler, live visits count-up,
   accent theme switcher, FAQ accordion, project show-more, copy-Discord,
   easter eggs, and the contact form (posts to /api/contact — never the webhook).
   ========================================================================== */
(function () {
  "use strict";

  var C = window.CONTENT || {};
  var $ = function (id) { return document.getElementById(id); };
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var avatarMap = {};      // robloxUserId -> headshot URL (for named reviews)
  var hueAvatarOk = false; // becomes true once the Hue image loads

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  /* ---- config + age -------------------------------------------------------- */
  var config = {};
  function computeAge(birthDate) {
    // "years since birthDate, minus one if this year's birthday hasn't happened".
    var b = new Date(birthDate + "T00:00:00");
    var now = new Date();
    var age = now.getFullYear() - b.getFullYear();
    var m = now.getMonth() - b.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--;
    return age;
  }
  function applyAge() {
    if (!config.birthDate) return;
    var age = computeAge(config.birthDate);
    if (age > 0 && age < 120) {
      var nodes = document.querySelectorAll("[data-age]");
      for (var i = 0; i < nodes.length; i++) nodes[i].textContent = age;
    }
  }

  /* ---- accent theme switcher ---------------------------------------------- */
  var STORE_KEY = "pf-accent";
  function setAccent(color, glow) {
    document.documentElement.style.setProperty("--accent", color);
    document.documentElement.style.setProperty("--glow", glow);
    try { localStorage.setItem(STORE_KEY, color); } catch (e) {}
    // update swatch rings
    var btns = document.querySelectorAll("#pf-swatches button");
    for (var i = 0; i < btns.length; i++) {
      var on = btns[i].getAttribute("data-color") === color;
      btns[i].style.borderColor = on ? "#FFFFFF" : "rgba(255,255,255,0.18)";
    }
    // recolor already-rendered terminal keywords
    renderTerminal();
  }
  function renderSwatches() {
    var wrap = $("pf-swatches");
    if (!wrap) return;
    var saved = null;
    try { saved = localStorage.getItem(STORE_KEY); } catch (e) {}
    var swatches = C.swatches || [];
    var active = swatches[0];
    wrap.innerHTML = swatches.map(function (s) {
      return '<button data-color="' + s.color + '" title="' + esc(s.name) + '" ' +
        'style="width:16px;height:16px;padding:0;border-radius:50%;cursor:pointer;background:' + s.color +
        ';border:2px solid rgba(255,255,255,0.18);box-shadow:0 0 0 1px rgba(0,0,0,0.4);"></button>';
    }).join("");
    var btns = wrap.querySelectorAll("button");
    swatches.forEach(function (s, i) {
      if (saved && s.color === saved) active = s;
      btns[i].addEventListener("click", function () { setAccent(s.color, s.glow); });
    });
    setAccent(active.color, active.glow);
  }

  /* ---- Luau syntax highlighter (ported from the mockup) -------------------- */
  var KW = { "local":1,"function":1,"end":1,"for":1,"if":1,"then":1,"return":1,"do":1,
    "while":1,"else":1,"elseif":1,"and":1,"or":1,"not":1,"in":1,"true":1,"false":1,
    "nil":1,"repeat":1,"until":1,"break":1 };
  function highlightLine(line) {
    var ci = line.indexOf("--");
    var code = line, comment = "";
    if (ci !== -1) { code = line.slice(0, ci); comment = line.slice(ci); }
    var out = "";
    var re = /("(?:[^"\\]|\\.)*"|\d+\.?\d*|[A-Za-z_]\w*|\s+|[^\sA-Za-z_"]+)/g;
    var m;
    while ((m = re.exec(code)) !== null) {
      var tok = m[0], color = "#C9C9D2";
      if (/^"/.test(tok)) color = "#FFCA5E";
      else if (/^\d/.test(tok)) color = "#7FC7FF";
      else if (KW[tok]) color = "var(--accent)";
      else if (/^\s+$/.test(tok)) color = "inherit";
      else if (/^[^\sA-Za-z_"]/.test(tok)) color = "#8A8A93";
      out += '<span style="color:' + color + '">' + esc(tok) + "</span>";
    }
    if (comment) out += '<span style="color:#5F5F68;font-style:italic">' + esc(comment) + "</span>";
    return out;
  }
  var snipIdx = 0;
  function renderTerminal() {
    var snips = C.snippets || [];
    if (!snips.length) return;
    var snip = snips[snipIdx % snips.length];
    if ($("pf-terminal-file")) $("pf-terminal-file").textContent = snip.file;
    if ($("pf-terminal-counter")) $("pf-terminal-counter").textContent = (snipIdx % snips.length + 1) + " / " + snips.length;
    var pre = $("pf-terminal-code");
    if (!pre) return;
    var lines = snip.code.split("\n");
    pre.innerHTML = lines.map(function (ln) {
      return '<div style="min-height:1.62em">' + (ln.trim() === "" ? "&nbsp;" : highlightLine(ln)) + "</div>";
    }).join("");
  }
  function startTerminal() {
    renderTerminal();
    var pre = $("pf-terminal-code");
    var card = $("pf-terminal");
    var paused = false;
    if (card) {
      card.addEventListener("mouseenter", function () { paused = true; });
      card.addEventListener("mouseleave", function () { paused = false; });
    }
    if (reduceMotion) return;
    setInterval(function () {
      if (paused) return;
      if (pre) pre.style.opacity = "0";
      setTimeout(function () {
        snipIdx = (snipIdx + 1) % (C.snippets || [1]).length;
        renderTerminal();
        if (pre) pre.style.opacity = "1";
      }, 220);
    }, 5500);
  }

  /* ---- Hue chat cycler ----------------------------------------------------- */
  var chatIdx = 0;
  function renderChat() {
    var chats = C.chats || [];
    if (!chats.length) return;
    var box = $("pf-chat");
    if (!box) return; // Hue section hidden
    var c = chats[chatIdx % chats.length];
    var hueAv = hueAvatarOk
      ? '<img src="' + esc(C.hueAvatar) + '" alt="Hue" style="width:36px;height:36px;border-radius:50%;flex:none;object-fit:cover;background:var(--accent);">'
      : '<div style="width:36px;height:36px;border-radius:50%;flex:none;background:var(--accent);display:flex;align-items:center;justify-content:center;font-family:\'Space Grotesk\',sans-serif;font-weight:700;font-size:15px;color:#0B0B0D;">H</div>';
    var pagedHtml = "";
    if (c.paged) {
      pagedHtml =
        '<div style="display:flex;align-items:center;gap:12px;padding-top:2px;">' +
          '<div style="width:36px;height:36px;flex:none;"></div>' +
          '<div style="display:flex;align-items:center;gap:8px;font-family:\'JetBrains Mono\',monospace;font-size:12px;color:#6D6D77;">' +
            '<span style="width:6px;height:6px;border-radius:50%;background:#6D6D77;animation:pulse 1.4s ease-in-out infinite;"></span>' +
            esc(c.ping || "") +
          '</div>' +
        '</div>';
    }
    box.innerHTML =
      '<div style="display:flex;gap:12px;">' +
        '<div style="width:36px;height:36px;border-radius:50%;flex:none;background:#2C2C31;display:flex;align-items:center;justify-content:center;font-family:\'Space Grotesk\',sans-serif;font-weight:600;font-size:14px;color:#B4B4BD;">Y</div>' +
        '<div><div style="display:flex;align-items:baseline;gap:8px;margin-bottom:4px;"><span style="font-family:\'Space Grotesk\',sans-serif;font-weight:600;font-size:14px;color:#EDEDEF;">You</span><span style="font-family:\'JetBrains Mono\',monospace;font-size:10.5px;color:#6D6D77;">' + esc(c.time) + '</span></div>' +
        '<div style="font-size:14.5px;color:#C9C9D2;line-height:1.5;">' + esc(c.client) + '</div></div>' +
      '</div>' +
      '<div style="display:flex;gap:12px;">' +
        hueAv +
        '<div><div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">' +
          '<span style="font-family:\'Space Grotesk\',sans-serif;font-weight:600;font-size:14px;color:var(--accent);">Hue</span>' +
          '<span style="font-family:\'JetBrains Mono\',monospace;font-size:9px;letter-spacing:0.06em;color:#0B0B0D;background:var(--accent);border-radius:4px;padding:2px 5px;">BOT</span>' +
          '<span style="font-family:\'JetBrains Mono\',monospace;font-size:10.5px;color:#6D6D77;">' + esc(c.time) + '</span></div>' +
        '<div style="font-size:14.5px;color:#C9C9D2;line-height:1.55;">' + esc(c.hue) + '</div></div>' +
      '</div>' +
      pagedHtml;
  }
  function startChat() {
    if (!$("pf-chat")) return; // Hue section hidden
    renderChat();
    if (reduceMotion) return;
    var box = $("pf-chat");
    setInterval(function () {
      if (box) box.style.opacity = "0";
      setTimeout(function () {
        chatIdx = (chatIdx + 1) % (C.chats || [1]).length;
        renderChat();
        if (box) box.style.opacity = "1";
      }, 240);
    }, 5200);
  }

  /* ---- static content lists ----------------------------------------------- */
  // Review avatar: override image > Roblox headshot > anon "verified" badge > initial.
  function reviewAvatar(r) {
    var base = "width:38px;height:38px;border-radius:50%;flex:none;";
    var src = r.avatar || (r.robloxUserId && avatarMap[r.robloxUserId]);
    if (src) return '<img src="' + esc(src) + '" alt="' + esc(r.name || "client") + '" style="' + base + 'object-fit:cover;background:#2C2C31;">';
    if (r.anon) return '<div style="' + base + 'background:#2C2C31;display:flex;align-items:center;justify-content:center;overflow:hidden;"><img src="assets/rodevs.png" alt="RoDevs verified" style="width:26px;height:26px;object-fit:contain;"></div>';
    return '<div style="' + base + 'background:#2C2C31;display:flex;align-items:center;justify-content:center;font-family:\'Space Grotesk\',sans-serif;font-weight:600;font-size:14px;color:#B4B4BD;">' + esc(r.initial || "?") + '</div>';
  }
  function renderReviews() {
    $("pf-reviews").innerHTML = (C.reviews || []).map(function (r) {
      return '<div style="border:1px solid rgba(255,255,255,0.09);border-radius:16px;padding:26px;background:#111114;display:flex;flex-direction:column;">' +
        '<div style="display:flex;align-items:center;gap:8px;margin-bottom:16px;">' +
          '<span style="font-family:\'JetBrains Mono\',monospace;font-size:11.5px;color:var(--accent);">' + esc(r.tag) + '</span>' +
          '<span style="margin-left:auto;letter-spacing:1.5px;color:var(--accent);font-size:12px;">' + esc(r.stars) + '</span>' +
        '</div>' +
        (r.quote
          ? '<p style="font-size:15.5px;line-height:1.62;color:#C9C9D2;margin:0 0 22px;text-wrap:pretty;">' + esc(r.quote) + '</p>'
          : '<p style="font-size:14.5px;line-height:1.6;color:#8F8F98;margin:0 0 22px;font-style:italic;">' + esc(r.note || "Verified 5-star review.") + '</p>') +
        '<div style="display:flex;align-items:center;gap:12px;margin-top:auto;">' +
          reviewAvatar(r) +
          '<div><div style="font-family:\'Space Grotesk\',sans-serif;font-weight:600;font-size:14.5px;color:#EDEDEF;">' + esc(r.name) + '</div>' +
          '<div style="font-family:\'JetBrains Mono\',monospace;font-size:11.5px;color:#6D6D77;margin-top:2px;">' + esc(r.role) + '</div></div>' +
        '</div></div>';
    }).join("");
  }
  function loadReviewAvatars() {
    var ids = (C.reviews || []).filter(function (r) { return r.robloxUserId && !r.avatar; }).map(function (r) { return r.robloxUserId; });
    if (!ids.length) return;
    fetch("/api/avatars?userIds=" + ids.join(",")).then(function (r) { return r.ok ? r.json() : {}; })
      .then(function (map) { avatarMap = map || {}; renderReviews(); }).catch(function () {});
  }
  function renderSkills() {
    $("pf-skills").innerHTML = (C.skills || []).map(function (s) {
      return '<div style="border:1px solid rgba(255,255,255,0.09);border-radius:14px;padding:24px;background:#111114;">' +
        '<div style="font-family:\'JetBrains Mono\',monospace;font-size:12px;color:var(--accent);margin-bottom:14px;">' + esc(s.tag) + '</div>' +
        '<div style="font-family:\'Space Grotesk\',sans-serif;font-weight:600;font-size:20px;color:#F6F6F8;margin-bottom:8px;letter-spacing:-0.02em;">' + esc(s.title) + '</div>' +
        '<div style="font-size:14.5px;line-height:1.6;color:#8F8F98;">' + esc(s.desc) + '</div></div>';
    }).join("");
  }
  function renderTech() {
    var loop = (C.tech || []).concat(C.tech || []);
    $("pf-tech").innerHTML = loop.map(function (t) {
      return '<span style="flex:none;font-family:\'JetBrains Mono\',monospace;font-size:13px;color:#B4B4BD;border:1px solid rgba(255,255,255,0.1);border-radius:100px;padding:8px 16px;">' + esc(t) + '</span>';
    }).join("");
  }
  function renderHueFeatures() {
    var el = $("pf-hue-features");
    if (!el) return; // Hue section hidden
    el.innerHTML = (C.hueFeatures || []).map(function (f) {
      return '<div style="border:1px solid rgba(255,255,255,0.09);border-radius:14px;padding:20px;background:#111114;">' +
        '<div style="font-family:\'JetBrains Mono\',monospace;font-size:11.5px;color:var(--accent);margin-bottom:10px;">' + esc(f.tag) + '</div>' +
        '<div style="font-family:\'Space Grotesk\',sans-serif;font-weight:600;font-size:16.5px;color:#F6F6F8;margin-bottom:7px;letter-spacing:-0.01em;">' + esc(f.title) + '</div>' +
        '<div style="font-size:13.5px;line-height:1.55;color:#8F8F98;">' + esc(f.desc) + '</div></div>';
    }).join("");
  }
  // Iris section — client-progress board showcase. Uses a fixed Iris purple
  // (#9d5cff), not var(--accent), so it reads as its own product. Guarded so the
  // section can be removed without a console error (same pattern as Hue).
  function renderIris() {
    var el = $("pf-iris-features");
    if (!el) return; // Iris section absent
    var iris = C.iris || {};
    el.innerHTML = (iris.features || []).map(function (f) {
      return '<div style="border:1px solid rgba(157,92,255,0.16);border-radius:12px;padding:16px 18px;background:#111114;">' +
        '<div style="font-family:\'JetBrains Mono\',monospace;font-size:10.5px;letter-spacing:0.08em;color:#9d5cff;margin-bottom:8px;">' + esc(f.tag) + '</div>' +
        '<div style="font-family:\'Space Grotesk\',sans-serif;font-weight:600;font-size:15.5px;color:#F6F6F8;margin-bottom:6px;letter-spacing:-0.01em;">' + esc(f.title) + '</div>' +
        '<div style="font-size:13px;line-height:1.5;color:#8F8F98;">' + esc(f.desc) + '</div></div>';
    }).join("");
    var url = iris.demoUrl || iris.appUrl || "https://iris.haktanefe.com";
    var demo = $("pf-iris-demo"); if (demo) demo.href = url;
    var link = $("pf-iris-shot-link"); if (link) link.href = url;
    var shot = $("pf-iris-shot");
    if (shot && iris.screenshot) {
      shot.onerror = function () {
        // screenshot not present yet — show a subtle placeholder, not a broken image
        shot.style.display = "none";
        if (shot.parentNode && !shot.parentNode.querySelector(".pf-iris-ph")) {
          var ph = document.createElement("div");
          ph.className = "pf-iris-ph";
          ph.style.cssText = "aspect-ratio:3/4;display:flex;align-items:center;justify-content:center;font-family:'JetBrains Mono',monospace;font-size:12px;color:#5f5f6a;background:repeating-linear-gradient(135deg,rgba(157,92,255,0.06) 0 12px,transparent 12px 24px);";
          ph.textContent = "[ live board preview ]";
          shot.parentNode.appendChild(ph);
        }
      };
      shot.src = iris.screenshot;
    }
  }
  function renderSteps() {
    $("pf-steps").innerHTML = (C.steps || []).map(function (s) {
      return '<div style="border:1px solid rgba(255,255,255,0.09);border-radius:14px;padding:26px;background:#111114;display:flex;flex-direction:column;">' +
        '<div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">' +
          '<span style="font-family:\'JetBrains Mono\',monospace;font-weight:700;font-size:13px;color:var(--accent);border:1px solid var(--accent);border-radius:8px;width:30px;height:30px;display:flex;align-items:center;justify-content:center;flex:none;">' + esc(s.n) + '</span>' +
          '<span style="font-family:\'JetBrains Mono\',monospace;font-size:11px;letter-spacing:0.1em;color:#6D6D77;">' + esc(s.tag) + '</span>' +
        '</div>' +
        '<div style="font-family:\'Space Grotesk\',sans-serif;font-weight:600;font-size:19px;letter-spacing:-0.02em;color:#F6F6F8;margin-bottom:9px;">' + esc(s.title) + '</div>' +
        '<div style="font-size:14px;line-height:1.6;color:#8F8F98;text-wrap:pretty;">' + esc(s.desc) + '</div></div>';
    }).join("");
  }
  function renderTiers() {
    $("pf-tiers").innerHTML = (C.tiers || []).map(function (t) {
      var border = t.accent ? "var(--accent)" : "rgba(255,255,255,0.09)";
      var tagColor = t.accent ? "var(--accent)" : "#6D6D77";
      return '<div style="border:1px solid ' + border + ';border-radius:16px;padding:30px;background:#111114;position:relative;display:flex;flex-direction:column;">' +
        '<div style="font-family:\'JetBrains Mono\',monospace;font-size:11.5px;letter-spacing:0.1em;color:' + tagColor + ';margin-bottom:18px;">' + esc(t.tag) + '</div>' +
        '<div style="font-family:\'Space Grotesk\',sans-serif;font-weight:700;font-size:22px;letter-spacing:-0.02em;color:#F6F6F8;margin-bottom:10px;">' + esc(t.title) + '</div>' +
        '<div style="display:flex;align-items:baseline;gap:6px;margin-bottom:8px;">' +
          '<span style="font-family:\'Space Grotesk\',sans-serif;font-weight:700;font-size:clamp(26px,2.4vw,34px);letter-spacing:-0.03em;color:var(--accent);white-space:nowrap;">' + esc(t.price) + '</span>' +
          '<span style="font-family:\'JetBrains Mono\',monospace;font-size:12.5px;color:#6D6D77;">' + esc(t.unit) + '</span>' +
        '</div>' +
        '<div style="font-size:14.5px;line-height:1.6;color:#8F8F98;">' + esc(t.desc) + '</div></div>';
    }).join("");
  }
  function renderPayments() {
    $("pf-payments").innerHTML = (C.payments || []).map(function (pm) {
      return '<span style="font-family:\'JetBrains Mono\',monospace;font-size:13px;color:#B4B4BD;border:1px solid rgba(255,255,255,0.1);border-radius:100px;padding:7px 15px;">' + esc(pm) + '</span>';
    }).join("");
  }

  /* ---- FAQ accordion ------------------------------------------------------- */
  var faqOpen = 0;
  function renderFaqs() {
    $("pf-faqs").innerHTML = (C.faqs || []).map(function (f, i) {
      var open = i === faqOpen;
      return '<div style="border:1px solid rgba(255,255,255,0.09);border-radius:14px;background:#111114;overflow:hidden;">' +
        '<button data-i="' + i + '" aria-expanded="' + open + '" style="width:100%;display:flex;align-items:center;justify-content:space-between;gap:20px;cursor:pointer;background:transparent;border:none;text-align:left;padding:22px 26px;font-family:\'Space Grotesk\',sans-serif;font-weight:600;font-size:18px;letter-spacing:-0.01em;color:#F6F6F8;">' +
          '<span>' + esc(f.q) + '</span>' +
          '<span style="flex:none;font-family:\'JetBrains Mono\',monospace;font-weight:400;font-size:24px;line-height:1;color:var(--accent);">' + (open ? "−" : "+") + '</span>' +
        '</button>' +
        (open ? '<div style="padding:0 26px 24px;font-size:16px;line-height:1.65;color:#A4A4AD;max-width:760px;">' + esc(f.a) + '</div>' : '') +
      '</div>';
    }).join("");
    var btns = $("pf-faqs").querySelectorAll("button");
    for (var i = 0; i < btns.length; i++) {
      btns[i].addEventListener("click", function () {
        var idx = parseInt(this.getAttribute("data-i"), 10);
        faqOpen = (faqOpen === idx) ? -1 : idx;
        renderFaqs();
      });
    }
  }

  /* ---- Work / projects ----------------------------------------------------- */
  var projectData = null;   // from /api/stats when available
  var showAll = false;
  var slideTimers = [];
  function fmtVisits(n) {
    if (n == null) return null;
    if (n >= 1e9) return (n / 1e9).toFixed(1).replace(/\.0$/, "") + "B";
    if (n >= 1e7) return Math.round(n / 1e6) + "M";
    if (n >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, "") + "M";
    if (n >= 1e3) return (n / 1e3).toFixed(1).replace(/\.0$/, "") + "K";
    return String(n);
  }
  function gameUrl(p) {
    return p.url || (p.placeId ? "https://www.roblox.com/games/" + p.placeId : "#");
  }
  function projectList() {
    if (projectData && projectData.length) {
      return projectData.map(function (p) {
        var v = fmtVisits(p.visits);
        return { tag: (p.role || "").toLowerCase(), title: p.name, desc: p.description,
          stat: v ? v + " visits" : "live", images: p.images || [], url: gameUrl(p) };
      });
    }
    return (C.projectsFallback || []).map(function (p) {
      var v = fmtVisits(p.visits);
      return { tag: p.tag, title: p.title, desc: p.desc,
        stat: v ? v + " visits" : "live", images: [], url: gameUrl(p) };
    });
  }
  function renderProjects() {
    var all = projectList();
    var list = showAll ? all : all.slice(0, 3);
    slideTimers.forEach(clearInterval); slideTimers = [];
    $("pf-projects").innerHTML = list.map(function (p, idx) {
      var media;
      if (p.images && p.images.length) {
        var slides = p.images.map(function (src, i) {
          return '<img src="' + esc(src) + '" alt="' + esc(p.title) + ' gameplay" loading="lazy" ' +
            'style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:' + (i === 0 ? 1 : 0) + ';transition:opacity 0.6s ease;">';
        }).join("");
        var dots = p.images.length > 1
          ? '<div class="pf-dots" style="position:absolute;bottom:10px;left:0;right:0;display:flex;gap:6px;justify-content:center;">' +
            p.images.map(function (_, i) { return '<span style="width:6px;height:6px;border-radius:50%;background:' + (i === 0 ? "#fff" : "rgba(255,255,255,0.4)") + ';transition:background 0.3s;"></span>'; }).join("") +
            '</div>'
          : "";
        media = '<div class="pf-slideshow" data-count="' + p.images.length + '" style="position:relative;aspect-ratio:16/10;overflow:hidden;border-bottom:1px solid rgba(255,255,255,0.07);background:#0B0B0D;">' + slides + dots + '</div>';
      } else {
        media = '<div style="aspect-ratio:16/10;background-image:repeating-linear-gradient(135deg, rgba(255,255,255,0.05) 0 12px, transparent 12px 24px);display:flex;align-items:flex-end;padding:16px;border-bottom:1px solid rgba(255,255,255,0.07);"><span style="font-family:\'JetBrains Mono\',monospace;font-size:11.5px;color:#6D6D77;">[ gameplay screenshot ]</span></div>';
      }
      return '<a href="' + esc(p.url) + '" target="_blank" rel="noopener" style="text-decoration:none;color:inherit;border:1px solid rgba(255,255,255,0.09);border-radius:16px;overflow:hidden;background:#111114;display:flex;flex-direction:column;">' +
        media +
        '<div style="padding:22px;">' +
          '<div style="font-family:\'JetBrains Mono\',monospace;font-size:11.5px;color:var(--accent);margin-bottom:10px;">' + esc(p.tag) + '</div>' +
          '<div style="font-family:\'Space Grotesk\',sans-serif;font-weight:600;font-size:20px;letter-spacing:-0.02em;color:#F6F6F8;margin-bottom:8px;">' + esc(p.title) + '</div>' +
          '<div style="font-size:14px;line-height:1.55;color:#8F8F98;margin-bottom:18px;">' + esc(p.desc) + '</div>' +
          '<div style="display:flex;align-items:center;gap:8px;font-family:\'JetBrains Mono\',monospace;font-size:12.5px;color:#B4B4BD;">' +
            '<span style="color:var(--accent);">▸</span> ' + esc(p.stat) +
          '</div></div></a>';
    }).join("");
    var count = all.length;
    $("pf-projects-toggle").style.display = count > 3 ? "inline-flex" : "none";
    $("pf-projects-label").textContent = showAll ? "Show less" : "View all projects";
    $("pf-projects-arrow").textContent = showAll ? "↑" : "↓";
    setupSlideshows();
  }
  function setupSlideshows() {
    if (reduceMotion) return;
    var shows = document.querySelectorAll("#pf-projects .pf-slideshow");
    shows.forEach(function (el) {
      var count = parseInt(el.getAttribute("data-count"), 10);
      if (!(count > 1)) return;
      var imgs = el.querySelectorAll("img");
      var dots = el.querySelectorAll(".pf-dots span");
      var cur = 0;
      var t = setInterval(function () {
        imgs[cur].style.opacity = "0";
        if (dots[cur]) dots[cur].style.background = "rgba(255,255,255,0.4)";
        cur = (cur + 1) % count;
        imgs[cur].style.opacity = "1";
        if (dots[cur]) dots[cur].style.background = "#fff";
      }, 3500);
      slideTimers.push(t);
    });
  }

  /* ---- live visits: count up once, then tick continuously ----------------- */
  // Roblox reports visits in periodic batches, not per-second, so a pure-delta
  // counter would sit still then jump. Instead we tick smoothly at an estimated
  // rate (config.visitsPerDayEstimate) and, whenever a real batch arrives, we
  // (a) correct the rate from the measured growth and (b) rebase to the true
  // total. Displayed value stays anchored to Roblox's real number, never regresses.
  var live = { displayed: 0, base: 0, baseAt: 0, anchor: null, anchorAt: 0, rate: 0, ticking: false };
  function seedRate() { return (config.visitsPerDayEstimate || 86400) / 86400; }
  function paintVisits(n) {
    var v = Math.floor(n);
    if ($("pf-visits")) $("pf-visits").textContent = v.toLocaleString("en-US");
    if ($("pf-hero-visits")) $("pf-hero-visits").textContent = (Math.floor(v / 1e7) * 10) + "M+";
  }
  function startTicker() {
    if (live.ticking || reduceMotion) return;
    live.ticking = true;
    function tick() {
      var pred = live.base + live.rate * ((performance.now() - live.baseAt) / 1000);
      if (pred < live.displayed) pred = live.displayed; // monotonic
      live.displayed = pred;
      paintVisits(pred);
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }
  function countUpTo(target, then) {
    var from = Math.max(0, target - 450000), dur = 1800, s0 = null;
    function step(ts) {
      if (s0 === null) s0 = ts;
      var p = Math.min(1, (ts - s0) / dur);
      paintVisits(from + (target - from) * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(step); else then();
    }
    requestAnimationFrame(step);
  }
  function onTrueTotal(total) {
    var now = performance.now();
    if (live.anchor == null) {
      live.anchor = total; live.anchorAt = now; live.rate = seedRate();
      if (reduceMotion) { live.base = total; live.baseAt = now; live.displayed = total; paintVisits(total); return; }
      countUpTo(total, function () {
        live.base = total; live.baseAt = performance.now(); live.displayed = total;
        startTicker();
      });
      return;
    }
    if (total > live.anchor) {
      var dt = (now - live.anchorAt) / 1000;
      if (dt > 0) { var r = (total - live.anchor) / dt; if (r >= 0 && r < 100000) live.rate = r; } // real measured rate
      live.anchor = total; live.anchorAt = now;
      live.base = Math.max(live.displayed, total); live.baseAt = now; // rebase, never backward
    }
    // unchanged poll: keep ticking at the current estimate
  }
  function loadStats() {
    return fetch("/api/stats").then(function (r) { return r.ok ? r.json() : null; }).then(function (data) {
      if (!data) throw new Error("no stats");
      if (data.projects && data.projects.length) { projectData = data.projects; renderProjects(); }
      if (data.avatar && !C.photo) {
        var av = $("pf-avatar");
        if (av) { av.style.backgroundImage = "url('" + data.avatar + "')"; var l = $("pf-avatar-label"); if (l) l.style.display = "none"; }
      }
      var total = data.total && data.total.visits ? data.total.visits : null;
      if (total) onTrueTotal(total);
      return true;
    }).catch(function () {
      // No serverless endpoint (e.g. plain static preview) — show static fallback.
      if (live.total == null) paintVisits(config.totalVisitsFallback || 133000000);
      return false;
    });
  }

  /* ---- copy Discord handle ------------------------------------------------- */
  function initCopy() {
    var btn = $("pf-copy-discord"), label = $("pf-discord-label"), t;
    if (!btn) return;
    btn.addEventListener("click", function () {
      try { navigator.clipboard && navigator.clipboard.writeText("HaqtanEfe"); } catch (e) {}
      if (label) label.textContent = "Copied!";
      clearTimeout(t);
      t = setTimeout(function () { if (label) label.textContent = "HaqtanEfe"; }, 1600);
    });
  }

  /* ---- contact form -> /api/contact --------------------------------------- */
  function initForm() {
    var form = $("pf-form");
    if (!form) return;
    var statusEl = $("pf-form-status"), submitEl = $("pf-form-submit");
    function setStatus(text, color) { if (statusEl) { statusEl.textContent = text; statusEl.style.color = color; } }
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var fd = new FormData(form);
      var payload = {
        name: (fd.get("name") || "").trim(),
        discord: (fd.get("discord") || "").trim(),
        ptype: fd.get("ptype") || "",
        budget: fd.get("budget") || "",
        message: (fd.get("message") || "").trim(),
        website: fd.get("website") || "" // honeypot
      };
      if (!payload.name || !payload.message) { setStatus("Add your name and a few project details.", "#FFCA5E"); return; }
      setStatus("Sending…", "#8F8F98");
      if (submitEl) { submitEl.disabled = true; submitEl.textContent = "Sending…"; }
      fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      }).then(function (res) {
        if (res.ok) {
          form.style.display = "none";
          var sent = $("pf-form-sent"); if (sent) sent.style.display = "block";
        } else {
          return res.json().catch(function () { return {}; }).then(function (j) {
            setStatus(j && j.error ? j.error : "Something went wrong. DM me @HaqtanEfe instead.", "#FF7A7A");
          });
        }
      }).catch(function () {
        setStatus("Something went wrong. DM me @HaqtanEfe instead.", "#FF7A7A");
      }).then(function () {
        if (submitEl) { submitEl.disabled = false; submitEl.textContent = "Send inquiry →"; }
      });
    });
  }

  /* ---- easter eggs --------------------------------------------------------- */
  function initEggs() {
    // 1. console note
    try {
      console.log("%cHaqtanEfe%c  ·  Roblox Systems Engineer\n%cyou opened the console, so you're a dev too. say hi: @HaqtanEfe",
        "font:700 22px 'Space Grotesk',sans-serif;color:#C4A6FF",
        "font:600 12px monospace;color:#8F8F98",
        "font:400 12px monospace;color:#6D6D77;line-height:2");
    } catch (e) {}
    // 2. tab title on blur
    var title = document.title;
    document.addEventListener("visibilitychange", function () {
      document.title = document.hidden ? "← come back, we have systems to build" : title;
    });
    // 3. konami code
    var code = ["arrowup","arrowup","arrowdown","arrowdown","arrowleft","arrowright","arrowleft","arrowright","b","a"];
    var seq = [], eggT;
    window.addEventListener("keydown", function (e) {
      seq.push((e.key || "").toLowerCase());
      seq = seq.slice(-code.length);
      var ok = code.every(function (k, i) { return seq[i] === k; });
      if (ok) {
        var egg = $("pf-egg");
        if (egg) { egg.style.display = "flex"; clearTimeout(eggT); eggT = setTimeout(function () { egg.style.display = "none"; }, 5600); }
      }
    });
  }

  /* ---- About photo (overrides the Roblox headshot) ------------------------- */
  function applyPhoto() {
    if (!C.photo) return;
    var av = $("pf-avatar");
    if (av) { av.style.backgroundImage = "url('" + C.photo + "')"; var l = $("pf-avatar-label"); if (l) l.style.display = "none"; }
  }

  /* ---- Hue avatar preload -------------------------------------------------- */
  function preloadHue() {
    if (!C.hueAvatar) return;
    var im = new Image();
    im.onload = function () { hueAvatarOk = true; renderChat(); };
    im.src = C.hueAvatar;
  }

  /* ---- boot ---------------------------------------------------------------- */
  function boot() {
    renderSwatches();
    renderReviews();
    renderIris();
    renderSkills();
    renderTech();
    renderHueFeatures();
    renderSteps();
    renderTiers();
    renderPayments();
    renderFaqs();
    renderProjects();
    startTerminal();
    startChat();
    initCopy();
    initForm();
    initEggs();
    applyPhoto();
    preloadHue();
    loadReviewAvatars();

    $("pf-projects-toggle").addEventListener("click", function () { showAll = !showAll; renderProjects(); });

    fetch("config.json").then(function (r) { return r.json(); }).then(function (cfg) {
      config = cfg || {};
      applyAge();
      loadStats();
    }).catch(function () {
      loadStats();
    });

    // re-poll live visits every 60s; the ticker keeps counting between polls.
    setInterval(loadStats, 60 * 1000);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
