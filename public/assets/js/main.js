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
