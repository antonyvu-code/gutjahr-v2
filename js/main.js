/* GUTJAHR DACHTECHNIK v2 — Motion-System im Stil von Framer/alethia.earth
   GSAP ScrollTrigger + SplitText + Lenis; Fallback: IntersectionObserver */
(function () {
  "use strict";

  var docEl = document.documentElement;
  docEl.classList.add("has-js");

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var hasGsap = typeof gsap !== "undefined" && typeof ScrollTrigger !== "undefined";

  /* ---------- Basics: Jahr, Header, Nav, Formular ---------- */
  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  var header = document.querySelector(".site-header");
  var hero = document.getElementById("hero");
  var lastY = 0;

  function onScrollHeader(y) {
    if (!header) return;
    header.classList.toggle("is-scrolled", y > 24);
    // Header ausblenden beim Runterscrollen, einblenden beim Hochscrollen
    if (y > 400 && y > lastY + 4) header.classList.add("is-hidden");
    else if (y < lastY - 4) header.classList.remove("is-hidden");
    // helle Schrift solange der dunkle Hero im Viewport ist
    if (hero) header.classList.toggle("on-dark", y < hero.offsetHeight - 80);
    lastY = y;
  }
  onScrollHeader(window.scrollY);

  var navToggle = document.getElementById("nav-toggle");
  var mainNav = document.getElementById("main-nav");
  if (navToggle && mainNav) {
    navToggle.addEventListener("click", function () {
      var open = navToggle.getAttribute("aria-expanded") === "true";
      navToggle.setAttribute("aria-expanded", String(!open));
      navToggle.setAttribute("aria-label", open ? "Menü öffnen" : "Menü schließen");
      mainNav.classList.toggle("is-open", !open);
      header.classList.toggle("nav-open", !open);
      document.body.style.overflow = open ? "" : "hidden";
    });
    mainNav.addEventListener("click", function (e) {
      if (e.target.closest("a")) {
        navToggle.setAttribute("aria-expanded", "false");
        mainNav.classList.remove("is-open");
        header.classList.remove("nav-open");
        document.body.style.overflow = "";
      }
    });
  }

  var form = document.getElementById("contact-form");
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var note = document.getElementById("form-note");
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }
      var d = new FormData(form);
      var body =
        "Name: " + d.get("name") + "\n" +
        "Telefon: " + (d.get("tel") || "-") + "\n" +
        "E-Mail: " + d.get("email") + "\n" +
        (d.get("callback") ? "Um Rückruf wird gebeten.\n" : "") +
        "\n" + d.get("message");
      location.href = "mailto:info@gutjahr-dachtechnik.de?subject=" +
        encodeURIComponent("Anfrage über die Website") +
        "&body=" + encodeURIComponent(body);
      if (note) note.textContent = "Ihr E-Mail-Programm öffnet sich mit der vorbereiteten Nachricht.";
    });
  }

  /* ---------- Leistungen: Bildvorschau (Crossfade A/B) ---------- */
  var rows = Array.prototype.slice.call(document.querySelectorAll(".service-row"));
  var imgA = document.getElementById("services-img-a");
  var imgB = document.getElementById("services-img-b");
  var tagEl = document.getElementById("services-tag");
  var frontIsA = true;

  function activateRow(row) {
    if (!row || row.classList.contains("is-active")) return;
    rows.forEach(function (r) { r.classList.toggle("is-active", r === row); });
    if (imgA && imgB) {
      var back = frontIsA ? imgB : imgA;
      var front = frontIsA ? imgA : imgB;
      back.src = row.dataset.img;
      back.classList.add("is-active");
      front.classList.remove("is-active");
      frontIsA = !frontIsA;
    }
    if (tagEl) tagEl.textContent = row.dataset.tag;
  }
  rows.forEach(function (row) {
    row.addEventListener("mouseenter", function () { activateRow(row); });
    row.addEventListener("click", function () { activateRow(row); });
  });

  /* ---------- Hero-Canvas: driftende Partikel ("Atmosphäre") ---------- */
  var canvas = document.getElementById("hero-canvas");
  if (canvas && !reduceMotion) {
    var ctx = canvas.getContext("2d");
    var parts = [];
    var W = 0, H = 0, running = true;

    function sizeCanvas() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = canvas.clientWidth; H = canvas.clientHeight;
      canvas.width = W * dpr; canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function seed() {
      parts = [];
      var n = Math.round(Math.min(90, W / 16));
      for (var i = 0; i < n; i++) {
        parts.push({
          x: Math.random() * W, y: Math.random() * H,
          r: Math.random() * 1.6 + 0.4,
          vx: (Math.random() - 0.5) * 0.12,
          vy: -(Math.random() * 0.25 + 0.06),
          a: Math.random() * 0.35 + 0.1
        });
      }
    }
    function tick() {
      if (!running) return;
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = "#c6f19d";
      for (var i = 0; i < parts.length; i++) {
        var p = parts[i];
        p.x += p.vx; p.y += p.vy;
        if (p.y < -4) { p.y = H + 4; p.x = Math.random() * W; }
        if (p.x < -4) p.x = W + 4;
        if (p.x > W + 4) p.x = -4;
        ctx.globalAlpha = p.a;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      requestAnimationFrame(tick);
    }
    sizeCanvas(); seed(); tick();
    window.addEventListener("resize", function () { sizeCanvas(); seed(); });
    document.addEventListener("visibilitychange", function () {
      running = !document.hidden;
      if (running) tick();
    });
  }

  /* ---------- Motion: GSAP-Pfad ---------- */
  if (hasGsap && !reduceMotion) {
    gsap.registerPlugin(ScrollTrigger);
    if (typeof SplitText !== "undefined") gsap.registerPlugin(SplitText);

    /* Lenis Smooth-Scroll, an GSAP-Ticker gekoppelt */
    var lenis;
    if (typeof Lenis !== "undefined") {
      lenis = new Lenis({ lerp: 0.1, anchors: true });
      window.lenis = lenis;
      lenis.on("scroll", function (e) {
        ScrollTrigger.update();
        onScrollHeader(e.scroll);
      });
      gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
      gsap.ticker.lagSmoothing(0);
    } else {
      window.addEventListener("scroll", function () { onScrollHeader(window.scrollY); }, { passive: true });
    }

    /* Scroll-Fortschrittsbalken */
    gsap.to(".scroll-progress", {
      scaleX: 1,
      ease: "none",
      scrollTrigger: { trigger: document.body, start: "top top", end: "max", scrub: 0.4 }
    });

    /* Framer-Signatur: opacity + y + blur */
    var APPEAR = { y: 28, autoAlpha: 0, filter: "blur(8px)" };

    function heroIntro() {
      var tl = gsap.timeline({ defaults: { ease: "power3.out" } });
      var h1 = document.getElementById("hero-title");
      if (typeof SplitText !== "undefined" && h1) {
        var split = new SplitText(h1, { type: "lines,words", linesClass: "sl" });
        gsap.set(h1, { autoAlpha: 1 });
        tl.from(split.words, {
          y: 60, autoAlpha: 0, filter: "blur(10px)",
          duration: 1.1, stagger: 0.06
        }, 0.15);
      } else if (h1) {
        tl.from(h1, { y: 40, autoAlpha: 0, duration: 1 }, 0.15);
      }
      tl.fromTo('[data-hero="1"]', APPEAR, { y: 0, autoAlpha: 1, filter: "blur(0px)", duration: 0.9 }, 0)
        .fromTo('[data-hero="2"]', APPEAR, { y: 0, autoAlpha: 1, filter: "blur(0px)", duration: 0.9 }, 0.55)
        .fromTo('[data-hero="3"]', APPEAR, { y: 0, autoAlpha: 1, filter: "blur(0px)", duration: 0.9 }, 0.7)
        .fromTo('[data-hero="4"]', { autoAlpha: 0 }, { autoAlpha: 1, duration: 1 }, 1.0);
      /* Hintergrundbild: langsamer Zoom-Out beim Laden, Parallax beim Scrollen */
      gsap.fromTo(".hero-bg img", { scale: 1.16 }, { scale: 1.08, duration: 2.4, ease: "power2.out" });
      gsap.to(".hero-bg img", {
        yPercent: 12, ease: "none",
        scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true }
      });
      /* Hero-Exit: Inhalt schiebt schneller nach oben und blendet aus */
      gsap.to(".hero-inner", {
        yPercent: -22, autoAlpha: 0, ease: "none",
        scrollTrigger: { trigger: ".hero", start: "top top", end: "75% top", scrub: 0.4 }
      });
      gsap.to(".hero-data", {
        autoAlpha: 0, ease: "none",
        scrollTrigger: { trigger: ".hero", start: "top top", end: "40% top", scrub: 0.4 }
      });
    }
    /* Alles mit SplitText erst starten, wenn Geist geladen ist –
       sonst splittet der Text mit falschen Zeilenumbrüchen */
    function splitInits() {
      heroIntro();

      /* Überschriften: zeilenweise Reveal */
      document.querySelectorAll("[data-split]").forEach(function (el) {
        if (typeof SplitText === "undefined") {
          gsap.from(el, {
            y: 30, autoAlpha: 0, duration: 1, ease: "power3.out",
            scrollTrigger: { trigger: el, start: "top 85%" }
          });
          return;
        }
        var split = new SplitText(el, { type: "lines", linesClass: "sl" });
        gsap.from(split.lines, {
          y: 46, autoAlpha: 0, filter: "blur(8px)",
          duration: 1, stagger: 0.09, ease: "power3.out",
          scrollTrigger: { trigger: el, start: "top 85%" }
        });
      });

      /* Vision-Statement: Sektion wird gepinnt, Wörter füllen sich beim Scrollen */
      var vision = document.getElementById("vision-statement");
      if (vision && typeof SplitText !== "undefined") {
        var vsplit = new SplitText(vision, { type: "words", wordsClass: "w" });
        gsap.fromTo(vsplit.words, { opacity: 0.12 }, {
          opacity: 1, stagger: 0.06, ease: "none",
          scrollTrigger: {
            trigger: "#anspruch",
            start: "top 25%",
            end: "+=90%",
            pin: true,
            pinSpacing: true,
            scrub: 0.5
          }
        });
      }

      /* Karriere-Überschrift: Zeilen schieben abwechselnd von links/rechts herein */
      document.querySelectorAll("[data-split-x]").forEach(function (el) {
        if (typeof SplitText === "undefined") return;
        var sx = new SplitText(el, { type: "lines", linesClass: "sl" });
        sx.lines.forEach(function (line, i) {
          gsap.fromTo(line,
            { x: i % 2 ? 120 : -120, autoAlpha: 0 },
            {
              x: 0, autoAlpha: 1, ease: "none",
              scrollTrigger: { trigger: el, start: "top 92%", end: "top 45%", scrub: 0.5 }
            });
        });
      });

      /* Footer-Wortmarke: Buchstaben steigen einzeln mit dem Scroll auf */
      var wm = document.getElementById("footer-wordmark");
      if (wm && typeof SplitText !== "undefined") {
        var wmsplit = new SplitText(wm, { type: "chars" });
        gsap.fromTo(wmsplit.chars,
          { yPercent: 60, autoAlpha: 0 },
          {
            yPercent: 0, autoAlpha: 1, stagger: 0.05, ease: "none",
            scrollTrigger: { trigger: ".site-footer", start: "top 90%", end: "bottom bottom", scrub: 0.5 }
          });
      }
    }
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () {
        splitInits();
        /* Pin fügt Platzhalter ein → Startpositionen aller Trigger neu berechnen */
        ScrollTrigger.refresh();
      });
    } else {
      splitInits();
      ScrollTrigger.refresh();
    }

    /* Standard-Reveals */
    gsap.utils.toArray(".reveal").forEach(function (el) {
      gsap.fromTo(el, APPEAR, {
        y: 0, autoAlpha: 1, filter: "blur(0px)",
        duration: 0.9, ease: "power3.out",
        scrollTrigger: { trigger: el, start: "top 88%" }
      });
    });

    /* Dunkle Energie-Sektion: fährt wie eine Karte heran (Scale + Radius, Scrub) */
    var energie = document.getElementById("energie");
    if (energie) {
      gsap.fromTo(energie,
        { scale: 0.94, borderRadius: "48px" },
        {
          scale: 1, borderRadius: "20px", ease: "none",
          transformOrigin: "50% 0%",
          scrollTrigger: { trigger: energie, start: "top 95%", end: "top 35%", scrub: 0.5 }
        });
    }

    /* Energie-Schritte: Fortschrittslinie + Schritte leuchten nacheinander auf (Scrub) */
    var steps = document.getElementById("steps");
    if (steps) {
      gsap.to("#steps-progress-bar", {
        scaleX: 1, ease: "none",
        scrollTrigger: { trigger: steps, start: "top 80%", end: "bottom 45%", scrub: 0.5 }
      });
      gsap.fromTo(".step",
        { autoAlpha: 0.22, y: 26 },
        {
          autoAlpha: 1, y: 0, stagger: 0.22, ease: "none",
          scrollTrigger: { trigger: steps, start: "top 82%", end: "bottom 50%", scrub: 0.5 }
        });
    }

    /* Statistiken: Count-up */
    gsap.utils.toArray("[data-count]").forEach(function (el) {
      var target = parseInt(el.dataset.count, 10);
      var obj = { v: 0 };
      gsap.to(obj, {
        v: target, duration: 1.6, ease: "power2.out",
        scrollTrigger: { trigger: el, start: "top 88%" },
        onUpdate: function () { el.textContent = Math.round(obj.v); }
      });
    });

    /* Showcase: Clip-Reveal + Parallax-Zoom + Marker-Pop */
    var showcase = document.getElementById("showcase");
    if (showcase) {
      gsap.fromTo(".showcase-media",
        { clipPath: "inset(12% 8% 12% 8% round 32px)" },
        {
          clipPath: "inset(0% 0% 0% 0% round 20px)", ease: "none",
          scrollTrigger: { trigger: showcase, start: "top 85%", end: "top 25%", scrub: 0.5 }
        });
      gsap.fromTo("#showcase-img", { scale: 1.18 }, {
        scale: 1.02, ease: "none",
        scrollTrigger: { trigger: showcase, start: "top 90%", end: "bottom 20%", scrub: 0.6 }
      });
      gsap.from(".marker", {
        scale: 0.4, autoAlpha: 0,
        duration: 0.7, stagger: 0.18, ease: "back.out(2)",
        scrollTrigger: { trigger: showcase, start: "top 55%" }
      });
    }

    /* Über-uns-Foto: sanfter Parallax innerhalb des Rahmens */
    var ueberImg = document.querySelector(".ueber-media img");
    if (ueberImg) {
      gsap.fromTo(ueberImg, { yPercent: -8, scale: 1.16 }, {
        yPercent: 8, scale: 1.16, ease: "none",
        scrollTrigger: { trigger: ".ueber-media", start: "top bottom", end: "bottom top", scrub: true }
      });
    }

    /* Timeline: Linie mitwachsen lassen */
    var tl = document.querySelector(".timeline-wrap");
    if (tl) {
      gsap.to("#tl-progress", {
        scaleY: 1, ease: "none",
        scrollTrigger: { trigger: tl, start: "top 75%", end: "bottom 55%", scrub: 0.5 }
      });
      gsap.from(".tl-item", {
        x: 24, autoAlpha: 0,
        duration: 0.8, stagger: 0.12, ease: "power3.out",
        scrollTrigger: { trigger: tl, start: "top 80%" }
      });
    }

    /* Trust-Marquee: Grundlauf + Tempo/Richtung folgen der Scroll-Geschwindigkeit */
    var track = document.getElementById("trust-track");
    if (track) {
      var marquee = gsap.to(track, { xPercent: -50, ease: "none", duration: 26, repeat: -1 });
      ScrollTrigger.create({
        trigger: document.body, start: "top top", end: "max",
        onUpdate: function (self) {
          var v = self.getVelocity() / 250;                 // Scrollgeschwindigkeit → Faktor
          v = Math.max(-6, Math.min(6, v));
          if (Math.abs(v) < 1) v = v < 0 ? -1 : 1;          // nie ganz stehen bleiben
          gsap.to(marquee, { timeScale: v, duration: 0.5, ease: "power2.out", overwrite: true });
        }
      });
    }

    /* Leistungen-Scrollspy: aktive Zeile + Vorschaubild folgen dem Scroll (Desktop) */
    if (window.matchMedia("(min-width: 961px)").matches) {
      rows.forEach(function (row) {
        ScrollTrigger.create({
          trigger: row,
          start: "top 45%", end: "bottom 45%",
          onEnter: function () { activateRow(row); },
          onEnterBack: function () { activateRow(row); }
        });
      });
    }

    return; // GSAP-Pfad fertig
  }

  /* ---------- Fallback: IntersectionObserver ---------- */
  window.addEventListener("scroll", function () { onScrollHeader(window.scrollY); }, { passive: true });

  if (reduceMotion) {
    // alles sofort sichtbar (CSS regelt den Rest)
    document.querySelectorAll("[data-count]").forEach(function (el) {
      el.textContent = el.dataset.count;
    });
    return;
  }

  docEl.classList.add("io-motion");
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("in-view");
      if (entry.target.hasAttribute("data-count-holder")) {
        entry.target.querySelectorAll("[data-count]").forEach(function (el) {
          el.textContent = el.dataset.count;
        });
      }
      io.unobserve(entry.target);
    });
  }, { threshold: 0.15 });

  document.querySelectorAll(".reveal, [data-hero]").forEach(function (el) { io.observe(el); });
  document.querySelectorAll(".stat").forEach(function (el) {
    el.setAttribute("data-count-holder", "");
    io.observe(el);
  });
})();
