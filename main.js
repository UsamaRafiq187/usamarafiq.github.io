(() => {
  const apps = window.APPS || [];
  const releases = window.RELEASES || [];
  const cfg = window.PORTFOLIO_CONFIG || {};

  const CATEGORIES = [
    { id: "all", label: "All" },
    { id: "mobility", label: "Mobility" },
    { id: "commerce", label: "Commerce" },
    { id: "fintech", label: "Fintech" },
    { id: "lifestyle", label: "Lifestyle" },
    { id: "learning", label: "Learning" },
    { id: "healthcare", label: "Healthcare" },
    { id: "social", label: "Social" },
    { id: "ops", label: "Ops" },
    { id: "productivity", label: "Productivity" },
  ];

  const byId = Object.fromEntries(apps.map((a) => [a.id, a]));
  let activeFilter = "all";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  function initials(name) {
    return name
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0])
      .join("")
      .toUpperCase();
  }

  function iconHTML(app, sizeClass = "ic") {
    if (app.icon) {
      return `<div class="${sizeClass}"><img src="${app.icon}" alt="" loading="lazy" /></div>`;
    }
    return `<div class="${sizeClass}"><span class="fallback">${initials(app.name)}</span></div>`;
  }

  function countByCategory(id) {
    if (id === "all") return apps.length;
    return apps.filter((a) => a.category === id).length;
  }

  function renderFilters() {
    const el = $("#filters");
    el.innerHTML = CATEGORIES.filter((c) => countByCategory(c.id) > 0)
      .map(
        (c) =>
          `<button class="filter" type="button" data-filter="${c.id}" aria-pressed="${
            c.id === activeFilter
          }">${c.label} ${String(countByCategory(c.id)).padStart(2, "0")}</button>`
      )
      .join("");

    el.querySelectorAll(".filter").forEach((btn) => {
      btn.addEventListener("click", () => {
        activeFilter = btn.dataset.filter;
        renderFilters();
        renderWork();
      });
    });
  }

  function filteredApps() {
    if (activeFilter === "all") return apps;
    return apps.filter((a) => a.category === activeFilter);
  }

  function renderWork() {
    const grid = $("#workGrid");
    const list = filteredApps();
    grid.innerHTML = list
      .map((app) => {
        const tags = [...(app.tags || [])].join(" · ");
        return `
        <button class="card" type="button" data-id="${app.id}">
          ${iconHTML(app)}
          <div>
            <div class="meta">${app.category} · ${tags}</div>
            <h3>${app.name}</h3>
            <p>${app.blurb}</p>
            <div class="chips">${(app.tech || [])
              .slice(0, 4)
              .map((t) => `<span class="chip">${t}</span>`)
              .join("")}</div>
            <div class="status">${app.status}${app.year ? ` · ${app.year}` : ""}</div>
          </div>
        </button>`;
      })
      .join("");

    grid.querySelectorAll(".card").forEach((card) => {
      card.addEventListener("click", () => openModal(card.dataset.id));
    });
  }

  function renderReleases() {
    const ol = $("#timeline");
    const items = releases
      .map((r) => {
        const app = byId[r.appId];
        const icon = app
          ? iconHTML(app, "mini")
          : `<div class="mini"></div>`;
        return `
        <li class="release is-on">
          <span class="release-node" aria-hidden="true"></span>
          <span class="date">${r.date}</span>
          <div class="release-body">
            <button type="button" data-id="${r.appId}" aria-label="${r.title}, open details" style="border:0;background:none;padding:0;cursor:pointer">${icon}</button>
            <div>
              <h3>${r.title}</h3>
              <p>${r.body}</p>
            </div>
          </div>
        </li>`;
      })
      .join("");
    ol.innerHTML = `<li class="timeline-rail" aria-hidden="true"><i></i></li>${items}`;

    ol.querySelectorAll("button[data-id]").forEach((btn) => {
      btn.addEventListener("click", () => openModal(btn.dataset.id));
    });
  }

  function setupReleaseLog() {
    const ol = $("#timeline");
    if (!ol) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
    let logSeen = false;
    let logMarks = [];
    let ticking = false;

    const measureLog = () => {
      logMarks = $$(".release", ol).map((li) => ({
        li,
        y: li.offsetTop + 30,
      }));
      logScroll();
    };

    const logScroll = () => {
      if (!logSeen || reduce) return;
      const r = ol.getBoundingClientRect();
      const span = Math.max(r.height - 60, 1);
      const p = clamp((window.innerHeight * 0.62 - r.top - 30) / span, 0, 1);
      ol.style.setProperty("--p", p.toFixed(4));
      const y = 30 + p * span;
      for (const m of logMarks) m.li.classList.toggle("is-on", m.y <= y + 1);
    };

    const onScroll = () => {
      ticking = false;
      logScroll();
    };

    window.addEventListener(
      "scroll",
      () => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(onScroll);
      },
      { passive: true }
    );
    window.addEventListener("resize", measureLog);

    const logIo = new IntersectionObserver((es) => {
      logSeen = es[0].isIntersecting;
      logScroll();
    });
    logIo.observe(ol);

    if (!reduce) ol.classList.add("is-live");
    // start empty until scroll reaches the log
    ol.style.setProperty("--p", "0");
    $$(".release", ol).forEach((li) => li.classList.remove("is-on"));
    measureLog();
  }

  function renderMarquee() {
    const names = apps.map((a) => a.name);
    const build = (list) => {
      // Asad duplicates once so translate(-50%) loops seamlessly
      const parts = [];
      for (let k = 0; k < 2; k++) {
        list.forEach((n) => {
          parts.push(`<span>${n}</span><i></i>`);
        });
      }
      return parts.join("");
    };
    const half = Math.ceil(names.length / 2);
    const row1 = names;
    const row2 = [...names.slice(half), ...names.slice(0, half)];
    $("#mq1").innerHTML = build(row1);
    $("#mq2").innerHTML = build(row2);

    // Asad: 60s / 44s for ~21 names. Scale so names move at the same pixel speed.
    const asadCount = 21;
    const scale = Math.max(1, names.length / asadCount);
    const root = document.documentElement;
    root.style.setProperty("--mq-dur", `${(60 * scale).toFixed(2)}s`);
    root.style.setProperty("--mq-dur-rev", `${(44 * scale).toFixed(2)}s`);
  }

  function setupMarqueeSpeed() {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const mqEls = [$("#mq1"), $("#mq2")].filter(Boolean);
    if (!mqEls.length) return;

    let mqAnims = [];
    let mqRate = 1;
    let mqTarget = 1;
    let mqDir = 1;
    let mqIdle = 1;
    let mqSeen = false;
    let ticking = false;
    let lastY = window.scrollY;
    let lastT = performance.now();
    let raf = 0;

    const captureAnims = () => {
      mqAnims = mqEls
        .map((el) => (el.getAnimations ? el.getAnimations()[0] : null))
        .filter(Boolean);
    };

    const mqTask = (dt) => {
      mqIdle += dt;
      if (mqIdle > 0.12) mqTarget = mqDir;
      mqRate += (mqTarget - mqRate) * Math.min(1, dt * 5);
      const done = mqIdle > 0.12 && Math.abs(mqRate - mqTarget) < 0.01;
      if (done) mqRate = mqTarget;
      mqAnims.forEach((a) => a.updatePlaybackRate(mqRate));
      return !done;
    };

    const runTask = () => {
      cancelAnimationFrame(raf);
      let prev = performance.now();
      const tick = (now) => {
        const dt = Math.min(0.05, (now - prev) / 1000);
        prev = now;
        if (mqTask(dt)) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    };

    const onScroll = (now) => {
      ticking = false;
      if (reduce || !mqSeen) return;
      const y = window.scrollY;
      const dt = Math.max(1, now - lastT);
      const vel = (y - lastY) / dt;
      lastY = y;
      lastT = now;
      if (!mqAnims.length) captureAnims();
      if (mqAnims.length && Math.abs(vel) > 0.02) {
        mqDir = vel < 0 ? -1 : 1;
        mqTarget = mqDir * Math.min(7, 1 + Math.abs(vel) * 2.4);
        mqIdle = 0;
        runTask();
      }
    };

    window.addEventListener(
      "scroll",
      () => {
        if (!ticking) {
          ticking = true;
          requestAnimationFrame(onScroll);
        }
      },
      { passive: true }
    );

    const mqIo = new IntersectionObserver((es) => {
      mqSeen = es[0].isIntersecting;
      if (!mqAnims.length) captureAnims();
      mqAnims.forEach((a) => (mqSeen ? a.play() : a.pause()));
    });
    const marquee = $("#marquee");
    if (marquee) mqIo.observe(marquee);

    // capture after styles apply
    requestAnimationFrame(() => requestAnimationFrame(captureAnims));
  }

  function shortName(name) {
    const clean = String(name || "").replace(/^İ/, "I");
    const parts = clean.split(/\s+/);
    if (parts[0].length >= 3) return parts[0].slice(0, 10);
    return clean.slice(0, 10);
  }

  function phoneBtnHTML(app) {
    if (!app?.icon) return "";
    return `<button class="phone-app" type="button" data-id="${app.id}" aria-label="${app.name}, open details">
      <img src="${app.icon}" alt="" width="54" height="54" loading="lazy" decoding="async" />
      <span>${shortName(app.name)}</span>
    </button>`;
  }

  function renderPhone() {
    const home = $("#phoneHome");
    const dock = $("#phoneDock");
    const folder = $("#phoneFolder");
    const folderBox = $("#phoneFolderBox");
    if (!home || !dock || !folder || !folderBox) return;

    const withIcons = apps.filter((a) => a.icon);
    const dockApps = (
      withIcons.filter((a) => a.featured).length >= 4
        ? withIcons.filter((a) => a.featured)
        : withIcons
    ).slice(0, 4);
    const dockIds = new Set(dockApps.map((a) => a.id));
    const rest = withIcons.filter((a) => !dockIds.has(a.id));
    // Home holds widget (2x2) + 14 icons + folder = five rows of four
    const homeApps = rest.slice(0, 14);
    const folderApps = rest.slice(14);
    const folderPreview = folderApps.slice(0, 9);

    const widget = home.querySelector(".phone-widget");
    home.innerHTML = "";
    if (widget) home.appendChild(widget);

    home.insertAdjacentHTML(
      "beforeend",
      homeApps.map(phoneBtnHTML).join("")
    );

    if (folderApps.length) {
      home.insertAdjacentHTML(
        "beforeend",
        `<button class="phone-app" type="button" id="phoneFolderBtn" aria-expanded="false" aria-controls="phoneFolder" aria-label="More apps, open folder">
          <span class="phone-folder-tile" aria-hidden="true">${folderPreview
            .map(
              (a) =>
                `<img src="${a.icon}" alt="" width="14" height="14" loading="lazy" decoding="async" />`
            )
            .join("")}</span>
          <span>More</span>
        </button>`
      );
    }

    dock.innerHTML = dockApps.map(phoneBtnHTML).join("");
    folderBox.innerHTML = folderApps.map(phoneBtnHTML).join("");

    const shown =
      dockApps.length + homeApps.length + (folderApps.length ? folderApps.length : 0);
    const cap = $("#phoneCap");
    if (cap) {
      cap.textContent = `One home screen, ${shown} apps. Every icon opens.`;
    }

    const setFolder = (open) => {
      folder.hidden = !open;
      const btn = $("#phoneFolderBtn");
      if (btn) btn.setAttribute("aria-expanded", String(open));
    };

    $("#phoneFolderBtn")?.addEventListener("click", (e) => {
      e.stopPropagation();
      setFolder(true);
    });
    folder.addEventListener("click", (e) => {
      if (e.target === folder) setFolder(false);
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !folder.hidden && !sheet()?.open) setFolder(false);
    });

    $("#phone")?.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-id]");
      if (!btn) return;
      openModal(btn.dataset.id);
    });
  }

  function renderContact() {
    const actions = $("#contactActions");
    if (!actions) return;
    const email = cfg.email || "usamarafiq187@gmail.com";
    const wa = (cfg.whatsapp || "").replace(/\D/g, "");
    const mailIcon = `<svg class="copy-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M4 6.5h16v11H4z"/><path d="m4.5 7 7.5 6 7.5-6"/></svg>`;
    const chatIcon = `<svg class="copy-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M5 18.5 6.2 15A7.5 7.5 0 1 1 12 19.5H7z"/></svg>`;

    let html = `
      <div class="copy">
        ${mailIcon}
        <a class="copy-text" id="mailText" href="mailto:${email}">${email}</a>
        <button class="copy-act copy-act--main" type="button" id="copyEmail">
          <span>Copy<span class="copy-wide"> email</span></span>
        </button>
      </div>`;
    if (wa) {
      html += `
      <div class="copy">
        ${chatIcon}
        <span class="copy-text">WhatsApp</span>
        <a class="copy-act" href="https://wa.me/${wa}" target="_blank" rel="noopener">Open ↗</a>
      </div>`;
    }
    actions.innerHTML = html;
    $("#copyEmail")?.addEventListener("click", async () => {
      const btn = $("#copyEmail");
      try {
        await navigator.clipboard.writeText(email);
        btn.classList.add("is-done");
        btn.innerHTML = `<span>Copied</span>`;
        setTimeout(() => {
          btn.classList.remove("is-done");
          btn.innerHTML = `<span>Copy<span class="copy-wide"> email</span></span>`;
        }, 1400);
      } catch (_) {
        /* ignore */
      }
    });
  }

  let currentSheetId = null;
  const sheet = () => $("#sheet");
  const sheetIn = () => $("#sheetIn");

  function iconOf(app) {
    return app.icon || "";
  }

  function fillSheet(app) {
    currentSheetId = app.id;
    const icon = iconOf(app);
    const iconEl = $("#sheetIcon");
    if (icon) {
      iconEl.src = icon;
      iconEl.style.display = "";
      $("#sheetAura").style.backgroundImage = `url("${icon}")`;
    } else {
      iconEl.removeAttribute("src");
      iconEl.style.display = "none";
      $("#sheetAura").style.backgroundImage = "";
    }
    iconEl.alt = `${app.name} app icon`;
    $("#sheetTag").textContent = [app.category, ...(app.tags || [])]
      .filter(Boolean)
      .join(" · ");
    $("#sheetName").textContent = app.name;
    const sub = app.blurb || "";
    const about = app.about || app.detail || "";
    const subEl = $("#sheetSub");
    if (sub && sub !== app.name) {
      subEl.hidden = false;
      subEl.textContent = sub;
    } else {
      subEl.hidden = true;
      subEl.textContent = "";
    }
    $("#sheetAbout").textContent = about && about !== sub ? about : about || sub;

    const cells = [
      ["Industry", (app.category || "iOS").replace(/^\w/, (c) => c.toUpperCase())],
      ["Platform", "iOS"],
      ["Status", (app.status || "Shipped").split(" · ")[0]],
    ];
    if (app.year) cells.push(["Year", app.year]);
    $("#sheetStrip").innerHTML = cells
      .map(
        ([k, v]) =>
          `<div><dt>${k}</dt><dd>${v}</dd></div>`
      )
      .join("");

    const points = (app.points || []).filter(
      (p) => p && p !== about && p !== sub
    );
    const pts = $("#sheetPoints");
    if (points.length) {
      pts.hidden = false;
      pts.innerHTML = points.map((p) => `<li>${p}</li>`).join("");
    } else {
      pts.hidden = true;
      pts.innerHTML = "";
    }

    const tech = app.tech || [];
    const pills = $("#sheetPills");
    if (tech.length) {
      pills.hidden = false;
      pills.innerHTML = tech.map((t) => `<span class="pill">${t}</span>`).join("");
    } else {
      pills.hidden = true;
      pills.innerHTML = "";
    }

    const store = $("#sheetStore");
    const state = $("#sheetState");
    if (app.store && app.store.url) {
      store.hidden = false;
      store.href = app.store.url;
      state.hidden = true;
      $("#sheetSrc").hidden = false;
    } else {
      store.hidden = true;
      state.hidden = false;
      state.textContent = app.status || "Shipped";
      $("#sheetSrc").hidden = true;
    }
  }

  function openModal(id) {
    const app = byId[id];
    if (!app) return;
    fillSheet(app);
    const el = sheet();
    if (!el.open) {
      el.showModal();
      document.documentElement.classList.add("is-locked");
    }
    sheetIn().scrollTop = 0;
  }

  function closeModal() {
    const el = sheet();
    if (!el.open || el.classList.contains("is-closing")) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const done = () => {
      el.classList.remove("is-closing");
      if (el.open) el.close();
      document.documentElement.classList.remove("is-locked");
    };
    if (reduce) return done();
    el.classList.add("is-closing");
    setTimeout(done, 210);
  }

  function stepSheet(dir) {
    const list =
      activeFilter === "all"
        ? apps
        : apps.filter((a) => a.category === activeFilter);
    const pool = list.some((a) => a.id === currentSheetId) ? list : apps;
    const i = pool.findIndex((a) => a.id === currentSheetId);
    if (i < 0) return;
    const next = pool[(i + dir + pool.length) % pool.length];
    const inn = sheetIn();
    inn.classList.remove("is-swap");
    fillSheet(next);
    void inn.offsetWidth;
    inn.classList.add("is-swap");
    inn.scrollTop = 0;
  }

  function setupModal() {
    const el = sheet();
    $("#sheetX").addEventListener("click", closeModal);
    $("#sheetPrev").addEventListener("click", () => stepSheet(-1));
    $("#sheetNext").addEventListener("click", () => stepSheet(1));
    el.addEventListener("click", (e) => {
      // click on backdrop (dialog itself)
      if (e.target === el) closeModal();
    });
    el.addEventListener("cancel", (e) => {
      e.preventDefault();
      closeModal();
    });
    el.addEventListener("close", () => {
      document.documentElement.classList.remove("is-locked");
      el.classList.remove("is-closing");
    });
  }

  function setupNav() {
    const nav = $("#nav");
    const onScroll = () => nav.classList.toggle("scrolled", window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    const links = [...document.querySelectorAll(".nav-links a")];
    const sections = ["work", "releases", "about", "contact"]
      .map((id) => document.getElementById(id))
      .filter(Boolean);

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          links.forEach((l) =>
            l.setAttribute(
              "aria-current",
              l.getAttribute("href") === `#${entry.target.id}` ? "true" : "false"
            )
          );
        });
      },
      { rootMargin: "-40% 0px -50% 0px", threshold: 0.01 }
    );
    sections.forEach((s) => io.observe(s));
  }

  function setupReveal() {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) e.target.classList.add("visible");
        });
      },
      { threshold: 0.25 }
    );
    document.querySelectorAll("[data-reveal]").forEach((el) => io.observe(el));
  }

  function setupClock() {
    const el = $("#localClock");
    const phoneTime = $("#phoneTime");
    const daypart = $("#daypart");
    const tick = () => {
      const now = new Date();
      const parts = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Karachi",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }).formatToParts(now);
      const get = (type) => parts.find((p) => p.type === type)?.value || "00";
      const hh = get("hour");
      const mm = get("minute");
      const ss = get("second");
      if (el) el.textContent = `${hh}:${mm}:${ss}`;
      if (phoneTime) phoneTime.textContent = `${Number(hh)}:${mm}`;
      if (daypart) {
        const h = Number(hh);
        daypart.textContent = h >= 6 && h < 18 ? "Daytime" : "Night-time";
      }
    };
    tick();
    setInterval(tick, 1000);
  }

  function setupNameMotion() {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const hero = $(".hero");
    const stage = $("#stage");
    const lineA = $(".name-line-a");
    const lineB = $(".name-line-b");
    const portrait = $(".portrait");
    const chars = [...document.querySelectorAll(".name .ch")];
    if (!hero || !stage || !lineA || !lineB || !chars.length) return;

    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

    // Replay letter entrance after fonts load — never touch transform during intro
    const replayIntro = () => {
      chars.forEach((el) => {
        el.style.animation = "none";
        el.style.transform = "";
        el.style.removeProperty("--f");
        void el.offsetWidth;
        el.style.animation = "";
      });
    };
    const fontsReady =
      document.fonts && document.fonts.ready
        ? document.fonts.ready
        : Promise.resolve();
    fontsReady.then(replayIntro);

    if (reduce) return;

    const spring = (k = 180, d = 18, x = 0) => ({ k, d, x, v: 0, t: x });
    const step = (s, dt, eps = 0.001) => {
      const a = -s.k * (s.x - s.t) - s.d * s.v;
      s.v += a * dt;
      s.x += s.v * dt;
      if (Math.abs(s.x - s.t) < eps && Math.abs(s.v) < eps) {
        s.x = s.t;
        s.v = 0;
        return false;
      }
      return true;
    };

    const letters = chars.map((el) => ({
      el,
      line: el.parentNode,
      b: el.parentNode === lineB,
      cx: 0,
      cy: 0,
      h: 1,
      s: spring(210, 15, 1),
      f: spring(120, 22, 0),
    }));

    let stageW = 1;
    let heroH = 1;
    let shiftA = 0;
    let shiftB = 0;
    let lift = 0;
    let heroSeen = true;
    let introDone = false;
    let pointerOver = false;
    const ptr = { x: 0, y: 0, live: false };
    const px = spring(70, 14, 0);
    const py = spring(70, 14, 0);

    const measure = () => {
      stageW = stage.offsetWidth || 1;
      heroH = hero.offsetHeight || 1;
      letters.forEach((L) => {
        L.cx = L.line.offsetLeft + L.el.offsetLeft + L.el.offsetWidth / 2;
        L.cy = L.line.offsetTop + L.line.offsetHeight / 2;
        L.h = Math.max(L.el.offsetHeight, 1);
      });
    };

    const placePortrait = () => {
      if (!portrait) return;
      const x = px.x;
      const y = py.x + lift;
      if (Math.abs(x) < 0.05 && Math.abs(y) < 0.05) {
        portrait.style.transform = "";
      } else {
        portrait.style.transform = `translate3d(${x.toFixed(2)}px,${y.toFixed(2)}px,0)`;
      }
    };

    let raf = 0;
    let looping = false;
    const heroTask = (dt) => {
      if (!introDone) return false;
      let alive = false;
      for (const L of letters) {
        let inf = 0;
        if (ptr.live && Math.abs(ptr.y - L.cy) < L.h * 0.8) {
          inf = Math.max(
            0,
            1 - Math.abs(ptr.x - (L.cx + (L.b ? shiftB : shiftA))) / (L.h * 1.15)
          );
          inf *= inf;
        }
        L.s.t = 1 + inf * 0.12;
        L.f.t = inf;
        const a = step(L.s, dt, 0.0008);
        const b = L.b ? step(L.f, dt, 0.004) : false;
        // Don't leave inline transform stuck — clear when settled at 1
        if (Math.abs(L.s.x - 1) < 0.002) {
          L.el.style.transform = "";
        } else {
          L.el.style.transform = `scaleY(${L.s.x.toFixed(4)})`;
        }
        if (L.b) {
          const f = clamp(L.f.x, 0, 1);
          if (f < 0.01) L.el.style.removeProperty("--f");
          else L.el.style.setProperty("--f", f.toFixed(3));
        }
        alive = alive || a || b;
      }
      const g = step(px, dt, 0.02);
      const i = step(py, dt, 0.02);
      placePortrait();
      return alive || g || i || ptr.live;
    };

    const runHero = () => {
      if (looping || !introDone) return;
      looping = true;
      let prev = performance.now();
      const tick = (now) => {
        const dt = Math.min(0.05, (now - prev) / 1000);
        prev = now;
        if (heroTask(dt)) {
          raf = requestAnimationFrame(tick);
        } else {
          looping = false;
          raf = 0;
        }
      };
      raf = requestAnimationFrame(tick);
    };

    let ghostTimer = 0;
    let ghostActive = false;
    const scheduleGhost = (ms = 3200) => {
      clearTimeout(ghostTimer);
      ghostTimer = window.setTimeout(sweep, ms);
    };
    const sweep = () => {
      if (!introDone || !heroSeen || pointerOver || ghostActive) {
        scheduleGhost(2600);
        return;
      }
      measure();
      ghostActive = true;
      const targets = [lineA, lineB];
      let i = 0;
      const pass = () => {
        if (pointerOver) {
          ghostActive = false;
          ptr.live = false;
          px.t = 0;
          py.t = 0;
          runHero();
          scheduleGhost(3200);
          return;
        }
        if (i >= targets.length) {
          ghostActive = false;
          ptr.live = false;
          px.t = 0;
          py.t = 0;
          runHero();
          scheduleGhost(3200);
          return;
        }
        const line = targets[i++];
        const y = line.offsetTop + line.offsetHeight * 0.5;
        ptr.live = true;
        ptr.y = y;
        ptr.x = -40;
        const start = performance.now();
        const dur = 900;
        const width = stage.offsetWidth;
        const move = (now) => {
          if (pointerOver) {
            ghostActive = false;
            runHero();
            scheduleGhost(3200);
            return;
          }
          const t = clamp((now - start) / dur, 0, 1);
          ptr.x = -40 + t * (width + 80);
          px.t = (ptr.x - stageW * 0.5) * 0.04;
          py.t = (ptr.y - stage.offsetHeight * 0.55) * 0.03;
          runHero();
          if (t < 1) requestAnimationFrame(move);
          else pass();
        };
        requestAnimationFrame(move);
      };
      pass();
    };

    stage.addEventListener("pointerenter", () => {
      pointerOver = true;
      ghostActive = false;
    });
    stage.addEventListener("pointermove", (e) => {
      if (!introDone) return;
      pointerOver = true;
      const r = stage.getBoundingClientRect();
      ptr.live = true;
      ptr.x = e.clientX - r.left;
      ptr.y = e.clientY - r.top;
      px.t = (ptr.x - stageW * 0.5) * 0.05;
      py.t = (ptr.y - stage.offsetHeight * 0.55) * 0.04;
      runHero();
    });
    stage.addEventListener("pointerleave", () => {
      pointerOver = false;
      ptr.live = false;
      px.t = 0;
      py.t = 0;
      // reset letter targets so they spring back instead of sticking
      letters.forEach((L) => {
        L.s.t = 1;
        L.f.t = 0;
      });
      runHero();
      scheduleGhost(1800);
    });

    let ticking = false;
    const onScroll = () => {
      ticking = false;
      if (!heroSeen) return;
      const y = window.scrollY;
      const p = clamp(y / Math.max(heroH, 1), 0, 1);
      shiftA = -p * stageW * 0.1;
      shiftB = p * stageW * 0.1;
      lift = -p * 34;
      lineA.style.transform = `translate3d(${shiftA.toFixed(1)}px,0,0)`;
      lineB.style.transform = `translate3d(${shiftB.toFixed(1)}px,0,0)`;
      placePortrait();
    };
    window.addEventListener(
      "scroll",
      () => {
        if (!ticking) {
          ticking = true;
          requestAnimationFrame(onScroll);
        }
      },
      { passive: true }
    );

    const io = new IntersectionObserver((es) => {
      heroSeen = es[0].isIntersecting;
    });
    io.observe(hero);

    measure();
    window.addEventListener("resize", () => {
      measure();
      onScroll();
    });

    // Enable hover only after letter intro finishes (last letter ~0.86s + 9*46ms + 0.95s)
    const introMs = 860 + (chars.length - 1) * 46 + 950 + 80;
    fontsReady.then(() => {
      window.setTimeout(() => {
        introDone = true;
        measure();
        scheduleGhost(1200);
      }, introMs);
    });
  }

  $("#year").textContent = String(new Date().getFullYear());

  renderFilters();
  renderWork();
  renderReleases();
  setupReleaseLog();
  renderMarquee();
  setupMarqueeSpeed();
  renderPhone();
  renderContact();
  setupModal();
  setupNav();
  setupReveal();
  setupClock();
  setupNameMotion();
})();
