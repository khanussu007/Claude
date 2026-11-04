(() => {
  "use strict";

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const header = document.querySelector("[data-header]");
  const menuToggle = document.querySelector("[data-menu-toggle]");
  const nav = document.querySelector("[data-nav]");

  // Current year
  document.querySelectorAll("[data-year]").forEach((node) => {
    node.textContent = new Date().getFullYear();
  });

  // Keep the page offset equal to the real header height (the header is position:fixed on mobile,
  // see responsive.css), so large text / zoom / wrapped brand text never hide content under it.
  const syncHeaderOffset = () => {
    if (!header) return;
    document.documentElement.style.setProperty("--header-offset", header.offsetHeight + "px");
  };
  syncHeaderOffset();
  window.addEventListener("resize", syncHeaderOffset, { passive: true });
  if (header && "ResizeObserver" in window) new ResizeObserver(syncHeaderOffset).observe(header);

  // Header state and mobile navigation
  const updateHeader = () => {
    if (header) header.classList.toggle("is-scrolled", window.scrollY > 24);
  };

  const closeMenu = () => {
    if (!menuToggle || !nav) return;
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-label", "Open navigation");
    nav.classList.remove("is-open");
    header?.classList.remove("is-menu-open");
    document.body.classList.remove("menu-open");
    document.documentElement.classList.remove("menu-open");
  };

  const openMenu = () => {
    if (!menuToggle || !nav) return;
    menuToggle.setAttribute("aria-expanded", "true");
    menuToggle.setAttribute("aria-label", "Close navigation");
    nav.classList.add("is-open");
    header?.classList.add("is-menu-open");
    document.body.classList.add("menu-open");
    document.documentElement.classList.add("menu-open");
  };

  menuToggle?.addEventListener("click", () => {
    const isOpen = menuToggle.getAttribute("aria-expanded") === "true";
    isOpen ? closeMenu() : openMenu();
  });

  nav?.addEventListener("click", (event) => {
    if (event.target.closest("a")) closeMenu();
  });

  document.addEventListener("click", (event) => {
    if (nav?.classList.contains("is-open") && !header?.contains(event.target)) {
      closeMenu();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && nav?.classList.contains("is-open")) {
      closeMenu();
      menuToggle?.focus();
    }
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 960) closeMenu();
  });

  window.addEventListener("scroll", updateHeader, { passive: true });
  updateHeader();

  // Sequential on-scroll reveals
  const revealItems = [...document.querySelectorAll(".reveal")];
  document.querySelectorAll("[data-reveal-group]").forEach((group) => {
    group.querySelectorAll(".reveal-child").forEach((child, index) => {
      child.style.setProperty("--reveal-index", index);
    });
  });

  if (reducedMotion.matches || !("IntersectionObserver" in window)) {
    revealItems.forEach((item) => item.classList.add("is-visible"));
  } else {
    const revealObserver = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);

          // Once the stagger finishes, return interactive cards to their own hover transitions.
          const children = [...entry.target.querySelectorAll(".reveal-child")];
          if (children.length) {
            window.setTimeout(() => {
              children.forEach((child) => {
                child.classList.remove("reveal-child");
                child.style.removeProperty("--reveal-index");
              });
            }, 1250 + children.length * 90);
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -7% 0px" }
    );

    revealItems.forEach((item) => revealObserver.observe(item));
  }

  // Count-up statistics, triggered only once when visible
  const counters = [...document.querySelectorAll("[data-counter]")];
  const setCounterFinalValues = () => {
    counters.forEach((counter) => {
      counter.textContent = counter.dataset.counter;
      counter.dataset.counted = "true";
    });
  };

  const animateCounter = (counter) => {
    if (counter.dataset.counted === "true") return;
    counter.dataset.counted = "true";

    const target = Number(counter.dataset.counter);
    const duration = 1450;
    const start = performance.now();

    const tick = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 4);
      counter.textContent = Math.round(target * eased);

      if (progress < 1) {
        requestAnimationFrame(tick);
      } else {
        counter.textContent = target;
      }
    };

    requestAnimationFrame(tick);
  };

  if (reducedMotion.matches || !("IntersectionObserver" in window)) {
    setCounterFinalValues();
  } else {
    counters.forEach((counter) => { counter.textContent = "0"; });
    const statsPanel = document.querySelector(".stats-panel");

    if (statsPanel) {
      const counterObserver = new IntersectionObserver(
        (entries, observer) => {
          if (!entries[0].isIntersecting) return;
          counters.forEach(animateCounter);
          observer.disconnect();
        },
        { threshold: 0.4 }
      );
      counterObserver.observe(statsPanel);
    }
  }

  // Testimonial slider: initialized after Home renders CMS data and after live content updates.
  let destroyTestimonialSlider = null;
  function initTestimonialSlider() {
    destroyTestimonialSlider?.();
    const slider = document.querySelector("[data-slider]");
    if (!slider) return;
    const track = slider.querySelector("[data-slider-track]");
    const viewport = slider.querySelector(".slider-viewport");
    const slides = [...slider.querySelectorAll("[data-slide]")];
    const dots = [...slider.querySelectorAll("[data-slider-dot]")];
    const previousButton = slider.querySelector("[data-slider-prev]");
    const nextButton = slider.querySelector("[data-slider-next]");
    if (!track || slides.length === 0) {
      previousButton?.setAttribute("hidden", "true"); nextButton?.setAttribute("hidden", "true");
      return;
    }
    let currentIndex = 0, autoplayTimer = null, touchStartX = 0, touchStartY = 0;
    slider.setAttribute("tabindex", "0");
    const goToSlide = (index) => {
      currentIndex = (index + slides.length) % slides.length;
      track.style.transform = `translate3d(-${currentIndex * 100}%, 0, 0)`;
      slides.forEach((slide, i) => slide.setAttribute("aria-hidden", String(i !== currentIndex)));
      dots.forEach((dot, i) => { const active=i===currentIndex; dot.classList.toggle("is-active",active); dot.setAttribute("aria-current",String(active)); });
    };
    const stop = () => { window.clearInterval(autoplayTimer); autoplayTimer=null; };
    const start = () => { if (reducedMotion.matches || document.hidden || autoplayTimer || slider.matches(":hover") || slider.contains(document.activeElement)) return; if(slides.length>1) autoplayTimer=window.setInterval(()=>goToSlide(currentIndex+1),6200); };
    const prev=()=>{goToSlide(currentIndex-1);stop();start();}; const next=()=>{goToSlide(currentIndex+1);stop();start();};
    previousButton?.addEventListener("click",prev); nextButton?.addEventListener("click",next);
    dots.forEach(dot=>dot.addEventListener("click",()=>{goToSlide(Number(dot.dataset.sliderDot));stop();start();}));
    const onKey=(e)=>{if(e.key!=="ArrowLeft"&&e.key!=="ArrowRight")return;e.preventDefault();goToSlide(currentIndex+(e.key==="ArrowRight"?1:-1));stop();start();};
    const onEnter=()=>stop(), onLeave=()=>start(), onFocus=()=>stop(), onBlur=(e)=>{if(!slider.contains(e.relatedTarget))start();};
    const onPointerDown=e=>{if(e.isPrimary){touchStartX=e.clientX;touchStartY=e.clientY;}};
    const onPointerUp=e=>{if(!e.isPrimary)return;const dx=e.clientX-touchStartX,dy=e.clientY-touchStartY;if(Math.abs(dx)<45||Math.abs(dx)<Math.abs(dy))return;goToSlide(currentIndex+(dx<0?1:-1));stop();start();};
    const onVisibility=()=>document.hidden?stop():start();
    slider.addEventListener("keydown",onKey); slider.addEventListener("pointerenter",onEnter); slider.addEventListener("pointerleave",onLeave); slider.addEventListener("focusin",onFocus); slider.addEventListener("focusout",onBlur); viewport?.addEventListener("pointerdown",onPointerDown); viewport?.addEventListener("pointerup",onPointerUp); document.addEventListener("visibilitychange",onVisibility);
    reducedMotion.addEventListener?.("change",onVisibility);
    goToSlide(0); start();
    destroyTestimonialSlider=()=>{stop();slider.removeEventListener("keydown",onKey);slider.removeEventListener("pointerenter",onEnter);slider.removeEventListener("pointerleave",onLeave);slider.removeEventListener("focusin",onFocus);slider.removeEventListener("focusout",onBlur);viewport?.removeEventListener("pointerdown",onPointerDown);viewport?.removeEventListener("pointerup",onPointerUp);document.removeEventListener("visibilitychange",onVisibility);};
  }
  initTestimonialSlider();
  document.addEventListener("site:testimonials-rendered", initTestimonialSlider);

})();

/* ==========================================================
   Visual enhancement layer: graphics, motion, hover & touch
   (additive; runs independently and never touches forms/admin)
   ========================================================== */
(() => {
  "use strict";
  if (document.querySelector("[data-admin], .admin-shell")) return;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const NS = "http://www.w3.org/2000/svg";

  const G = {
    site: `<svg viewBox="0 0 200 140" aria-hidden="true"><rect class="fx-g-card" x="1" y="1" width="198" height="138" rx="12"/><rect class="fx-g-line" x="1" y="1" width="198" height="22" rx="12"/><circle class="fx-g-orange" cx="14" cy="12" r="3"/><circle class="fx-g-blue" cx="25" cy="12" r="3"/><circle class="fx-g-line" cx="36" cy="12" r="3"/><rect class="fx-g-line" x="14" y="36" width="96" height="9" rx="4"/><rect class="fx-g-line" x="14" y="52" width="70" height="6" rx="3"/><rect class="fx-g-orange" x="14" y="68" width="48" height="16" rx="8"/><rect class="fx-g-card" x="122" y="34" width="64" height="52" rx="8"/><path class="fx-g-stroke-b fx-draw" d="M128 78l14-14 12 8 20-24"/><rect class="fx-g-line" x="14" y="98" width="52" height="28" rx="6"/><rect class="fx-g-line" x="74" y="98" width="52" height="28" rx="6"/><rect class="fx-g-line" x="134" y="98" width="52" height="28" rx="6"/></svg>`,
    google: `<svg viewBox="0 0 210 140" aria-hidden="true"><rect class="fx-g-card" x="1" y="1" width="208" height="138" rx="12"/><rect class="fx-g-line" x="14" y="14" width="182" height="20" rx="10"/><circle class="fx-g-blue" cx="27" cy="24" r="4"/><rect class="fx-g-orange" x="14" y="44" width="22" height="11" rx="3"/><rect class="fx-g-line" x="42" y="47" width="90" height="6" rx="3"/><rect class="fx-g-line" x="14" y="62" width="130" height="5" rx="2.5"/><g><rect class="fx-g-blue fx-bar" x="22" y="98" width="16" height="30" rx="3"/><rect class="fx-g-orange fx-bar" x="48" y="88" width="16" height="40" rx="3"/><rect class="fx-g-blue fx-bar" x="74" y="78" width="16" height="50" rx="3"/><rect class="fx-g-orange fx-bar" x="100" y="70" width="16" height="58" rx="3"/></g><path class="fx-g-stroke-o fx-draw" d="M130 110l16-14 14 6 24-26"/><path class="fx-g-orange" d="M184 70l6 12-13-2z"/></svg>`,
    meta: `<svg viewBox="0 0 170 150" aria-hidden="true"><rect class="fx-g-card" x="1" y="1" width="168" height="148" rx="12"/><circle class="fx-g-blue" cx="20" cy="20" r="8"/><rect class="fx-g-line" x="34" y="14" width="60" height="6" rx="3"/><rect class="fx-g-line" x="34" y="24" width="38" height="4" rx="2"/><rect class="fx-g-line" x="12" y="40" width="146" height="64" rx="8"/><path class="fx-g-stroke-o" d="M62 86c8-22 16-22 24-6s16 16 24-6"/><circle class="fx-g-blue fx-pulse" cx="62" cy="86" r="3"/><path class="fx-g-orange fx-pulse" d="M24 126c-6-4-9-7-9-11a5 5 0 0 1 9-3 5 5 0 0 1 9 3c0 4-3 7-9 11z"/><rect class="fx-g-line" x="42" y="116" width="40" height="6" rx="3"/><rect class="fx-g-blue" x="104" y="114" width="52" height="18" rx="9"/></svg>`,
    lead: `<svg viewBox="0 0 175 150" aria-hidden="true"><rect class="fx-g-card" x="1" y="1" width="173" height="148" rx="12"/><path class="fx-g-line" d="M20 18h100l-34 40v40l-20 12V58z"/><path class="fx-g-orange" opacity=".85" d="M42 30h56l-18 22H60z"/><circle class="fx-g-blue fx-drop" cx="70" cy="16" r="4"/><circle class="fx-g-orange fx-drop" cx="86" cy="16" r="4"/><circle class="fx-g-blue fx-drop" cx="102" cy="16" r="4"/><rect class="fx-g-card" x="116" y="86" width="50" height="50" rx="10"/><circle class="fx-g-orange fx-pulse" cx="141" cy="104" r="7"/><rect class="fx-g-line" x="126" y="118" width="30" height="5" rx="2.5"/><path class="fx-g-stroke-b" d="M30 124h60"/></svg>`
  };
  const MINI = {
    site: `<svg viewBox="0 0 74 56"><rect x="2" y="4" width="70" height="48" rx="6" fill="none" stroke="currentColor" stroke-width="2"/><path d="M2 16h70" stroke="currentColor" stroke-width="2"/><rect x="10" y="24" width="26" height="6" rx="3" fill="currentColor"/><rect x="10" y="36" width="18" height="4" rx="2" fill="currentColor"/><rect x="44" y="24" width="20" height="18" rx="3" fill="none" stroke="currentColor" stroke-width="2"/></svg>`,
    google: `<svg viewBox="0 0 74 56"><circle cx="30" cy="26" r="16" fill="none" stroke="currentColor" stroke-width="3"/><path d="M42 38l16 14" stroke="currentColor" stroke-width="4" stroke-linecap="round"/><path d="M22 32l6-6 5 4 7-9" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    meta: `<svg viewBox="0 0 74 56"><path d="M14 38c0-14 8-22 15-22s10 8 16 22 12 16 15 0c2-12-6-22-15-22s-10 8-16 22-15 22-15 0z" transform="translate(-3 -2) scale(.96)" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    lead: `<svg viewBox="0 0 74 56"><path d="M6 6h62L44 28v18l-14 6V28z" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/><circle cx="37" cy="4" r="2.5" fill="currentColor"/></svg>`,
    chart: `<svg viewBox="0 0 74 56"><path d="M6 50h62" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><rect x="12" y="30" width="10" height="20" rx="2" fill="currentColor"/><rect x="32" y="20" width="10" height="30" rx="2" fill="currentColor"/><rect x="52" y="8" width="10" height="42" rx="2" fill="currentColor"/></svg>`
  };

  const el = (html, cls) => { const d = document.createElement("div"); d.className = cls; d.setAttribute("aria-hidden", "true"); d.innerHTML = html; return d; };

  // 1. Scroll progress bar
  if (!reduced) {
    const bar = document.createElement("div");
    bar.className = "fx-progress"; bar.setAttribute("aria-hidden", "true");
    document.body.appendChild(bar);
    let tick = false;
    const upd = () => {
      const max = document.documentElement.scrollHeight - innerHeight;
      bar.style.transform = `scaleX(${max > 0 ? Math.min(scrollY / max, 1) : 0})`;
      tick = false;
    };
    addEventListener("scroll", () => { if (!tick) { tick = true; requestAnimationFrame(upd); } }, { passive: true });
    upd();
  }

  // 4. Card graphics + spotlight/ripple layers
  const CARD = ".service-card, .service-detail-card, .project-card, .portfolio-card";
  const pick = (t) => {
    t = t.toLowerCase();
    if (/google|search|ppc|adwords/.test(t)) return "google";
    if (/meta|facebook|instagram|social/.test(t)) return "meta";
    if (/lead|crm|funnel|conversion|enquir/.test(t)) return "lead";
    if (/website|web |design|wordpress|landing|portfolio/.test(t)) return "site";
    return "chart";
  };
  const decorate = () => {
    document.querySelectorAll(CARD + ", .button, .contact-card").forEach((c) => {
      if (c.dataset.fx) return;
      c.dataset.fx = "1";
      c.classList.add("fx-fx");
      c.insertBefore(el("", "fx-spot"), c.firstChild);
      if (/service-card|service-detail-card/.test(c.className)) {
        const t = (c.querySelector("h3,h2") || c).textContent || "";
        c.classList.add("fx-has-gfx");
        c.appendChild(el(MINI[pick(t)], "fx-gfx"));
      }
    });
  };
  decorate();
  let t = 0;
  new MutationObserver(() => { clearTimeout(t); t = setTimeout(decorate, 80); })
    .observe(document.body, { childList: true, subtree: true });

  // Pointer spotlight (mouse) and tap ripple (touch/mouse)
  if (fine && !reduced) {
    document.addEventListener("pointermove", (e) => {
      const c = e.target.closest && e.target.closest(".fx-fx");
      if (!c) return;
      const r = c.getBoundingClientRect();
      c.style.setProperty("--mx", `${e.clientX - r.left}px`);
      c.style.setProperty("--my", `${e.clientY - r.top}px`);
    }, { passive: true });
  }
  document.addEventListener("pointerdown", (e) => {
    const c = e.target.closest && e.target.closest(".fx-fx");
    if (!c || reduced) return;
    const spot = c.querySelector(":scope > .fx-spot");
    if (!spot) return;
    const r = c.getBoundingClientRect();
    const rip = document.createElement("span");
    rip.className = "fx-ripple";
    rip.style.setProperty("--rx", `${e.clientX - r.left}px`);
    rip.style.setProperty("--ry", `${e.clientY - r.top}px`);
    rip.style.setProperty("--rs", String(Math.ceil(Math.max(r.width, r.height) / 7)));
    spot.appendChild(rip);
    setTimeout(() => rip.remove(), 750);
    if (e.pointerType === "touch") {
      c.style.setProperty("--mx", `${e.clientX - r.left}px`);
      c.style.setProperty("--my", `${e.clientY - r.top}px`);
      c.classList.add("fx-touch");
      setTimeout(() => c.classList.remove("fx-touch"), 500);
    }
  }, { passive: true });
})();
