(function () {
  var FILES = [
    { id: 'readme', name: 'README.md', icon: 'ph ph-book-open' },
    { id: 'leadership', name: 'leadership.md', icon: 'ph ph-users-three' },
    { id: 'work-terraform', name: 'bulk-version-update.agent', icon: 'ph ph-robot' },
    { id: 'work-profiler', name: 'memory-profiler.ai', icon: 'ph ph-cpu' },
    { id: 'process', name: 'design-process.md', icon: 'ph ph-flow-arrow' },
    { id: 'log', name: 'experience.log', icon: 'ph ph-git-commit' },
    { id: 'stack', name: 'stack.json', icon: 'ph ph-brackets-curly' },
    { id: 'contact', name: 'contact.sh', icon: 'ph ph-terminal' },
  ];
  var EMAIL = 'mayukhchakraborty1984@gmail.com';

  /* ---------- heap bars (memory profiler mini chart) ---------- */
  var heap = [18, 22, 26, 24, 30, 34, 33, 38, 42, 41, 46, 50, 49, 55, 58, 57, 63, 67, 66, 72, 76, 75, 82, 88];
  var heapWrap = document.getElementById('heapBars');
  if (heapWrap) {
    heapWrap.innerHTML = heap.map(function (h, i) {
      var bg = i > 15 ? 'var(--accent)' : '#26406f';
      return '<div style="flex:1;border-radius:2px 2px 0 0;height:' + h + '%;background:' + bg + '"></div>';
    }).join('');
  }

  /* ---------- active-file tracking: sidebar, topbar tab, status line ---------- */
  var ids = FILES.map(function (f) { return f.id; });
  var explorerLinks = Array.prototype.slice.call(document.querySelectorAll('#explorerNav .explorer-file[data-section-id]'));
  var tabName = document.getElementById('activeTabName');
  var tabIcon = document.getElementById('activeTabIcon');
  var crumbName = document.getElementById('activeCrumbName');
  var statusLine = document.getElementById('statusLine');

  function updateActive() {
    var cur = ids[0];
    for (var i = 0; i < ids.length; i++) {
      var el = document.getElementById(ids[i]);
      if (el && el.getBoundingClientRect().top < 160) cur = ids[i];
    }
    explorerLinks.forEach(function (link) {
      link.classList.toggle('active', link.dataset.sectionId === cur);
    });
    var f = FILES.filter(function (x) { return x.id === cur; })[0] || FILES[0];
    if (tabName) tabName.textContent = f.name;
    if (crumbName) crumbName.textContent = f.name;
    if (tabIcon) tabIcon.className = f.icon;
    if (statusLine) {
      var h = document.documentElement.scrollHeight - window.innerHeight;
      statusLine.textContent = Math.max(1, Math.round((window.scrollY / Math.max(1, h)) * 842));
    }
  }
  explorerLinks.forEach(function (link) {
    link.addEventListener('click', function (e) {
      e.preventDefault();
      smoothGo(link.dataset.sectionId);
    });
  });
  window.addEventListener('scroll', updateActive, { passive: true });
  updateActive();

  /* ---------- copy email ---------- */
  initCopyEmail('#copyEmailBtn', EMAIL);

  /* ---------- command palette ---------- */
  var overlay = document.getElementById('paletteOverlay');
  var box = document.getElementById('paletteBox');
  var input = document.getElementById('paletteInput');
  var resultsEl = document.getElementById('paletteResults');
  var sel = 0;

  function commands() {
    var list = FILES.map(function (f) {
      return { label: 'Go to ' + f.name, hint: 'file', icon: f.icon, act: function () { smoothGo(f.id); } };
    });
    list.push({ label: 'Copy email address', hint: 'action', icon: 'ph ph-copy', act: function () { document.getElementById('copyEmailBtn').click(); } });
    list.push({ label: 'Send an email', hint: 'mailto', icon: 'ph ph-envelope-simple', act: function () { window.location.href = 'mailto:' + EMAIL; } });
    list.push({ label: 'Run terraform plan', hint: 'terminal', icon: 'ph ph-terminal-window', act: function () { smoothGo('readme'); setTimeout(function () { runCommand('terraform plan'); }, 300); } });
    list.push({ label: 'Focus terminal', hint: 'terminal', icon: 'ph ph-terminal', act: focusTerminal });
    return list;
  }

  function renderPalette() {
    var q = input.value.toLowerCase().trim();
    var list = commands().filter(function (c) { return !q || c.label.toLowerCase().indexOf(q) !== -1; });
    sel = Math.min(sel, Math.max(0, list.length - 1));
    if (!list.length) {
      resultsEl.innerHTML = '<div class="palette-empty">No matches. Even grep couldn’t find it.</div>';
      return;
    }
    resultsEl.innerHTML = list.map(function (c, i) {
      return '<button type="button" class="palette-item' + (i === sel ? ' selected' : '') + '" data-idx="' + i + '"><i class="' + c.icon + '"></i><span class="label">' + c.label + '</span><span class="hint">' + c.hint + '</span></button>';
    }).join('');
    Array.prototype.slice.call(resultsEl.querySelectorAll('.palette-item')).forEach(function (btn, i) {
      btn.addEventListener('mouseenter', function () { sel = i; renderPalette(); });
      btn.addEventListener('click', function () { closePalette(); setTimeout(list[i].act, 30); });
    });
    this._list = list;
  }

  function openPalette() {
    overlay.classList.add('open');
    input.value = '';
    sel = 0;
    renderPalette();
    setTimeout(function () { input.focus(); }, 10);
  }
  function closePalette() {
    overlay.classList.remove('open');
  }

  overlay.addEventListener('click', closePalette);
  box.addEventListener('click', function (e) { e.stopPropagation(); });
  input.addEventListener('input', function () { sel = 0; renderPalette(); });
  input.addEventListener('keydown', function (e) {
    var q = input.value.toLowerCase().trim();
    var list = commands().filter(function (c) { return !q || c.label.toLowerCase().indexOf(q) !== -1; });
    if (e.key === 'ArrowDown') { e.preventDefault(); sel = Math.min(sel + 1, list.length - 1); renderPalette(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); sel = Math.max(sel - 1, 0); renderPalette(); }
    else if (e.key === 'Enter' && list[sel]) { closePalette(); setTimeout(list[sel].act, 30); }
  });

  ['openPaletteRail', 'openPaletteJump', 'openPaletteHero', 'openPaletteStatus'].forEach(function (id) {
    var el = document.getElementById(id);
    if (el) el.addEventListener('click', openPalette);
  });

  window.addEventListener('keydown', function (e) {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      overlay.classList.contains('open') ? closePalette() : openPalette();
    } else if (e.key === 'Escape' && overlay.classList.contains('open')) {
      closePalette();
    }
  });

  /* ---------- terminal ---------- */
  var termScroll = document.getElementById('termScroll');
  var lines = [];

  function out(text, color) { return { text: text, color: color || '#b2b6ca', isIn: false }; }

  function renderTerm() {
    var html = lines.map(function (l) {
      var prefix = l.isIn ? '<span style="color:var(--accent)">➔ </span><span style="color:var(--accent-icon)">~ </span>' : '';
      return '<div style="white-space:pre-wrap;word-break:break-word;color:' + l.color + '">' + prefix + escapeHtml(l.text) + '</div>';
    }).join('');
    html += '<div style="display:flex;align-items:center">' +
      '<span style="color:var(--accent)">➔&nbsp;</span><span style="color:var(--accent-icon)">~&nbsp;</span>' +
      '<input id="termInput" spellcheck="false" autocomplete="off" aria-label="Terminal input" placeholder="try: terraform plan" ' +
      'style="flex:1;min-width:0;background:transparent;border:0;outline:none;color:var(--text);font:inherit;caret-color:var(--accent-icon);padding:0">' +
      '</div>';
    termScroll.innerHTML = html;
    termScroll.scrollTop = 1e6;
    var termInput = document.getElementById('termInput');
    if (termInput) {
      termInput.value = pendingInput;
      termInput.addEventListener('keydown', onTermKey);
      termInput.addEventListener('input', function (e) { pendingInput = e.target.value; });
      termInput.focus();
    }
  }

  function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  var pendingInput = '';
  var hist = [];
  var hIdx = -1;

  function alias(w) {
    var m = {
      readme: 'readme', 'readme.md': 'readme', home: 'readme',
      process: 'process', 'design-process.md': 'process', philosophy: 'process',
      work: 'work-terraform', terraform: 'work-terraform', 'terraform-upgrade.agent': 'work-terraform', 'bulk-version-update.agent': 'work-terraform', bulk: 'work-terraform',
      profiler: 'work-profiler', memory: 'work-profiler', 'memory-profiler.ai': 'work-profiler',
      leadership: 'leadership', 'leadership.md': 'leadership',
      experience: 'log', log: 'log', 'experience.log': 'log',
      stack: 'stack', skills: 'stack', 'stack.json': 'stack',
      contact: 'contact', 'contact.sh': 'contact',
    };
    return m[(w || '').toLowerCase().replace(/^work\//, '').replace(/^\.\//, '')];
  }

  function runCommand(raw) {
    var cmd = raw.trim();
    var parts = cmd.split(/\s+/);
    var c = (parts[0] || '').toLowerCase();
    var rest = parts.slice(1);
    var arg = rest.join(' ');
    var hi = '#c3d6ff';
    var res = [];
    switch (c) {
      case '': break;
      case 'help':
        res = [out('whoami        who is this'), out('ls [work]     list files'), out('open <file>   jump to a section (also: cd, cat)'), out('process       my design process'), out('experience    career summary'), out('skills        the stack'), out('terraform plan | apply'), out('hire          the important one'), out('clear         wipe the screen'), out('…and a few undocumented ones.', '#595d6c')];
        break;
      case 'whoami':
        res = [out('Mayukh Chakraborty, Manager, Product Design', hi), out('12+ yrs in UX, 5+ leading teams. DevEx, IaC, observability, agentic AI.'), out('MDes, IIT Kanpur. Former software engineer.')];
        break;
      case 'process':
      case 'philosophy':
        res = [out('Double Diamond for strategy, Lean cycles for execution, Activity-Centered Design as the philosophy.', hi)];
        setTimeout(function () { smoothGo('process'); }, 250);
        break;
      case 'ls':
        res = arg.indexOf('work') === 0 ? [out('bulk-version-update.agent   memory-profiler.ai', hi)] : [out('README.md   work/   leadership.md   experience.log   stack.json   contact.sh', hi)];
        break;
      case 'open':
      case 'cd':
      case 'cat':
      case 'vim':
      case 'code': {
        if (c === 'vim' && !arg) { res = [out("You're in vim now. Just kidding. Nobody has to live like that.")]; break; }
        var id = alias(arg);
        if (id) { res = [out('opening ' + arg + ' …', hi)]; setTimeout(function () { smoothGo(id); }, 250); }
        else res = [out(c + ': no such file: ' + (arg || '(nothing)') + '. Try ls.', '#b2b6ca')];
        break;
      }
      case 'experience':
        res = [out('2026  IBM HashiCorp — Senior Product Designer', hi), out('2018  Progress Software — Manager, UX (7 yrs)'), out('2016  Healers at Home — Head of Product Design'), out('2013  CitiTalk — Co-founder, Head of Product Design'), out('2011  IIT Kanpur — MDes'), out('2007  Wipro — Senior Software Engineer')];
        setTimeout(function () { smoothGo('log'); }, 600);
        break;
      case 'skills':
        res = [out('design: Figma, research, IA, design systems, WCAG 2.2 AA'), out('ai: Claude Code, Gemini Code Assist, IBM Bob, Google Stitch'), out('code: HTML, CSS, JS, React, Node, Java'), out('infra: Terraform, Vault, Docker, K8s, AWS, GCP, Azure')];
        break;
      case 'terraform':
        if (rest[0] === 'apply') res = [out('Apply needs approval. Run hire to approve.', hi)];
        else if (rest[0] === 'plan') res = [out('Terraform will perform the following actions:'), out('  + resource "designer" "mayukh" {', hi), out('      experience = "12+ years"'), out('      domain     = "devex"'), out('      mode       = "manager + ic"'), out('    }', hi), out('Plan: 1 to add, 0 to change, 0 to destroy.', '#e9e9ed')];
        else res = [out('Usage: terraform plan | apply')];
        break;
      case 'hire':
      case 'sudo':
        if (c === 'sudo' && !/hire/.test(arg)) { res = [out('Nice try. This incident will be reported to design review.')]; break; }
        res = [out('Apply complete! Resources: 1 added.', hi), out('Say hello → ' + EMAIL)];
        setTimeout(function () { smoothGo('contact'); }, 700);
        break;
      case 'rm': res = [out('Design debt removed. Everything else left intact.')]; break;
      case 'coffee': res = [out('Brewing… ETA one standup.')]; break;
      case 'date': res = [out(new Date().toString())]; break;
      case 'echo': res = [out(arg)]; break;
      case 'history': res = hist.map(function (h, i) { return out(String(i + 1).padStart(3) + '  ' + h); }); break;
      case 'exit': res = [out('There is no exit. Only ⌘K.')]; break;
      case 'clear': lines = []; renderTerm(); return;
      default: res = [out('command not found: ' + c + '. Try help.')];
    }
    lines = lines.concat([{ text: cmd, color: '#e9e9ed', isIn: true }], res).slice(-120);
    renderTerm();
  }

  function onTermKey(e) {
    if (e.key === 'Enter') {
      var v = pendingInput;
      pendingInput = '';
      if (v.trim()) { hist.push(v); }
      hIdx = -1;
      runCommand(v);
    } else if (e.key === 'ArrowUp' && hist.length) {
      e.preventDefault();
      var i = hIdx < 0 ? hist.length - 1 : Math.max(0, hIdx - 1);
      hIdx = i; pendingInput = hist[i]; renderTerm();
    } else if (e.key === 'ArrowDown' && hIdx >= 0) {
      e.preventDefault();
      var j = hIdx + 1;
      if (j >= hist.length) { hIdx = -1; pendingInput = ''; } else { hIdx = j; pendingInput = hist[j]; }
      renderTerm();
    } else if (e.key === 'l' && e.ctrlKey) {
      e.preventDefault(); lines = []; renderTerm();
    }
  }

  var d = new Date();
  lines = [
    out('Last login: ' + d.toDateString() + ' on ttys012', '#595d6c'),
    out('Welcome. This is a portfolio that is also a shell.', '#cfd3e5'),
    out('Type help to see commands, or press ⌘K to jump anywhere.', '#9397ab'),
  ];
  renderTerm();

  function focusTerminal() {
    closePalette();
    var i = document.getElementById('termInput');
    if (i) {
      var r = i.getBoundingClientRect();
      if (r.top < 0 || r.bottom > window.innerHeight) smoothGo('readme');
      setTimeout(function () { i.focus({ preventScroll: true }); }, 300);
    }
  }
  ['focusTerminalRail'].forEach(function (id) {
    var el = document.getElementById(id);
    if (el) el.addEventListener('click', focusTerminal);
  });
  document.getElementById('terminalCard').addEventListener('click', function (e) {
    if (e.target.id !== 'termInput') focusTerminal();
  });

  /* ---------- animated infra graph ---------- */
  (function () {
    var cv = document.getElementById('graphCanvas');
    var wrap = document.getElementById('graphWrap');
    if (!cv || !wrap) return;
    var ctx = cv.getContext('2d');
    var defs = [
      ['agent', .50, .50, 1], ['core', .24, .26], ['providers', .78, .24], ['modules', .22, .74], ['registry', .80, .76],
      ['state', .50, .14], ['plan', .50, .86], ['ws:prod', .08, .50], ['ws:stage', .92, .50], ['policy', .36, .40], ['vcs', .65, .62],
    ];
    var nodes = defs.map(function (dd, i) { return { label: dd[0], bx: dd[1], by: dd[2], hub: !!dd[3], ph: i * 1.7, x: 0, y: 0, ox: 0, oy: 0 }; });
    var edges = [[0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [0, 6], [1, 7], [2, 8], [3, 7], [4, 8], [5, 9], [6, 10], [9, 1], [10, 4], [1, 5], [2, 5], [3, 6], [4, 6]];
    var pulses = [], W = 0, H = 0, mouse = { x: -999, y: -999 }, t = 0, raf;

    function size() {
      var r = wrap.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
      W = r.width; H = r.height; cv.width = W * dpr; cv.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    size();
    new ResizeObserver(size).observe(wrap);
    cv.onmousemove = function (e) { var r = cv.getBoundingClientRect(); mouse = { x: e.clientX - r.left, y: e.clientY - r.top }; };
    cv.onmouseleave = function () { mouse = { x: -999, y: -999 }; };

    function loop() {
      t += 0.012; ctx.clearRect(0, 0, W, H);
      var pad = 44, hot = -1;
      nodes.forEach(function (n, i) {
        var x = pad + n.bx * (W - pad * 2) + Math.sin(t + n.ph) * 6, y = pad + n.by * (H - pad * 2) + Math.cos(t * .8 + n.ph) * 5;
        var dx = x - mouse.x, dy = y - mouse.y, dist = Math.hypot(dx, dy);
        if (dist < 90) { var f = (90 - dist) / 90 * 16; n.ox += (dx / (dist || 1) * f - n.ox) * .15; n.oy += (dy / (dist || 1) * f - n.oy) * .15; }
        else { n.ox *= .9; n.oy *= .9; }
        n.x = x + n.ox; n.y = y + n.oy; if (dist < 36) hot = i;
      });
      if (Math.random() < .08) { var e = edges[(Math.random() * edges.length) | 0]; pulses.push({ a: e[0], b: e[1], p: 0, s: .008 + Math.random() * .012 }); }
      edges.forEach(function (e) {
        var a = e[0], b = e[1], lit = hot === a || hot === b;
        ctx.strokeStyle = lit ? 'rgba(143,180,255,.7)' : 'rgba(91,141,239,.18)'; ctx.lineWidth = lit ? 1.2 : 1;
        ctx.beginPath(); ctx.moveTo(nodes[a].x, nodes[a].y); ctx.lineTo(nodes[b].x, nodes[b].y); ctx.stroke();
      });
      pulses = pulses.filter(function (p) { return (p.p += p.s) < 1; });
      pulses.forEach(function (p) {
        var A = nodes[p.a], B = nodes[p.b], x = A.x + (B.x - A.x) * p.p, y = A.y + (B.y - A.y) * p.p;
        ctx.fillStyle = 'rgba(195,214,255,' + (1 - Math.abs(p.p - .5) * 1.6) + ')'; ctx.shadowColor = '#5b8def'; ctx.shadowBlur = 10;
        ctx.beginPath(); ctx.arc(x, y, 2, 0, 6.29); ctx.fill(); ctx.shadowBlur = 0;
      });
      ctx.font = '11px "JetBrains Mono", monospace'; ctx.textAlign = 'center';
      nodes.forEach(function (n, i) {
        var on = i === hot, r = n.hub ? 7 : 4.5;
        if (n.hub) { ctx.strokeStyle = 'rgba(91,141,239,' + (.25 + Math.sin(t * 3) * .15) + ')'; ctx.beginPath(); ctx.arc(n.x, n.y, 16 + Math.sin(t * 3) * 3, 0, 6.29); ctx.stroke(); }
        ctx.fillStyle = on || n.hub ? '#8fb4ff' : '#232532'; ctx.strokeStyle = on ? '#c3d6ff' : '#4270c9'; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.arc(n.x, n.y, on ? r + 2 : r, 0, 6.29); ctx.fill(); ctx.stroke();
        ctx.fillStyle = on || n.hub ? '#e9e9ed' : '#75798c'; ctx.fillText(n.label, n.x, n.y + (n.hub ? 32 : 20));
      });
      raf = requestAnimationFrame(loop);
    }
    loop();
  })();
})();
