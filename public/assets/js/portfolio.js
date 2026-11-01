(() => {
  "use strict";
  const Site = window.Site;
  const grid = document.querySelector("[data-portfolio-grid]");
  if (!Site || !grid) return;

  const filterTabs = document.querySelector("[data-filter-tabs]");
  const filterStatus = document.querySelector("[data-filter-status]");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const arrowIcon = '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none"><path d="M7 17 17 7M8 7h9v9" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const filterNames = { all: "all", website: "Website Design", landing: "Landing Pages", marketing: "Digital Marketing & Lead Generation" };
  let projects = [];
  let projectMap = new Map();
  let currentFilter = "all";
  let filterAnimations = [];

  function updateFilterStatus(filter, count) {
    if (!filterStatus) return;
    filterStatus.textContent = filter === "all"
      ? `Showing all ${count} project${count === 1 ? "" : "s"}`
      : `Showing ${count} ${filterNames[filter]} project${count === 1 ? "" : "s"}`;
  }

  function filterProjects(filter, animate = true) {
    currentFilter = filter;
    const cards = [...grid.querySelectorAll(".portfolio-card")];
    filterAnimations.forEach((animation) => animation.cancel());
    filterAnimations = [];
    const firstPositions = new Map(cards.filter((card) => !card.hidden).map((card) => [card, card.getBoundingClientRect()]));

    filterTabs?.querySelectorAll("[data-filter]").forEach((button) => {
      const active = button.dataset.filter === filter;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    cards.forEach((card) => { card.hidden = filter !== "all" && card.dataset.category !== filter; });
    const visibleCards = cards.filter((card) => !card.hidden);
    updateFilterStatus(filter, visibleCards.length);
    if (!animate || reducedMotion.matches) return;

    visibleCards.forEach((card, index) => {
      const first = firstPositions.get(card);
      const last = card.getBoundingClientRect();
      if (first) {
        const deltaX = first.left - last.left;
        const deltaY = first.top - last.top;
        if (Math.abs(deltaX) < 1 && Math.abs(deltaY) < 1) return;
        filterAnimations.push(card.animate([
          { transform: `translate(${deltaX}px, ${deltaY}px)` }, { transform: "translate(0, 0)" }
        ], { duration: 520, easing: "cubic-bezier(0.22, 1, 0.36, 1)" }));
      } else {
        filterAnimations.push(card.animate([
          { opacity: 0, transform: "translateY(18px)" }, { opacity: 1, transform: "translateY(0)" }
        ], { duration: 460, delay: Math.min(index * 55, 220), easing: "cubic-bezier(0.22, 1, 0.36, 1)", fill: "backwards" }));
      }
    });
  }

  filterTabs?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-filter]");
    if (!button || button.classList.contains("is-active")) return;
    filterProjects(button.dataset.filter);
  });

  const lightbox = document.querySelector("[data-lightbox]");
  const dialog = document.querySelector("[data-lightbox-dialog]");
  const pageRegions = [...document.querySelectorAll(".site-header, main, .site-footer")];
  const fields = lightbox ? {
    image: lightbox.querySelector("[data-lightbox-image]"),
    category: lightbox.querySelector("[data-lightbox-category]"),
    title: lightbox.querySelector("[data-lightbox-title]"),
    type: lightbox.querySelector("[data-lightbox-type]"),
    description: lightbox.querySelector("[data-lightbox-description]"),
    focus: lightbox.querySelector("[data-lightbox-focus]"),
    placeholder: lightbox.querySelector("[data-lightbox-placeholder]"),
    projectLink: lightbox.querySelector("[data-lightbox-project-link]")
  } : null;
  let lastFocusedElement = null;
  let lightboxIsOpen = false;
  let closeTimer = null;

  function openLightbox(project) {
    if (!lightbox || !dialog || !project) return;
    clearTimeout(closeTimer);
    lastFocusedElement = document.activeElement;
    lightboxIsOpen = true;
    fields.image.src = Site.safeImage(project.image, "assets/projects/nexa-properties.svg");
    fields.image.alt = project.alt || project.title;
    fields.category.textContent = Site.categoryLabels[project.category] || project.category;
    fields.title.textContent = project.title;
    fields.type.textContent = project.type;
    fields.description.textContent = project.description;
    fields.focus.textContent = project.focus;
    if (fields.placeholder) fields.placeholder.textContent = project.badge || "";
    if (fields.projectLink) { const url=Site.safeHref(project.ctaUrl || project.projectUrl, ""); fields.projectLink.hidden=!url; if(url){fields.projectLink.href=url;fields.projectLink.textContent=project.cta||"View Project";} }
    lightbox.hidden = false;
    document.body.classList.add("lightbox-open");
    pageRegions.forEach((region) => { region.inert = true; });
    void lightbox.offsetHeight;
    lightbox.classList.add("is-open");
    requestAnimationFrame(() => lightbox.querySelector(".lightbox-close")?.focus());
  }

  function closeLightbox() {
    if (!lightbox || !lightboxIsOpen) return;
    lightboxIsOpen = false;
    lightbox.classList.remove("is-open");
    document.body.classList.remove("lightbox-open");
    pageRegions.forEach((region) => { region.inert = false; });
    closeTimer = setTimeout(() => {
      lightbox.hidden = true;
      if (lastFocusedElement && document.contains(lastFocusedElement)) lastFocusedElement.focus({ preventScroll: true });
    }, reducedMotion.matches ? 0 : 300);
  }

  grid.addEventListener("click", (event) => {
    const card = event.target.closest("[data-project-id]");
    if (card) openLightbox(projectMap.get(card.dataset.projectId));
  });
  lightbox?.addEventListener("click", (event) => {
    if (event.target.closest("[data-lightbox-close]")) closeLightbox();
  });
  document.addEventListener("keydown", (event) => {
    if (!lightboxIsOpen) return;
    if (event.key === "Escape") {
      event.preventDefault();
      closeLightbox();
      return;
    }
    if (event.key !== "Tab" || !dialog) return;
    const focusable = [...dialog.querySelectorAll("button, a[href], [tabindex]:not([tabindex='-1'])")].filter((element) => !element.disabled && element.getClientRects().length);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });

  function render(update = false) {
    if (lightboxIsOpen) closeLightbox();
    const page = Site.content.pageContent.portfolio;
    const heroEyebrow=document.querySelector(".portfolio-hero .hero-eyebrow"); if(heroEyebrow) heroEyebrow.lastChild.textContent=" "+(page.heroEyebrow||"");
    Site.setHeading(document.querySelector("#portfolio-title"), page.heroTitle);
    document.querySelector(".portfolio-hero-copy").textContent = page.heroCopy;
    const heroTags=document.querySelector(".portfolio-hero-tags"); if(heroTags) heroTags.innerHTML=(page.heroTags||[]).map(tag=>`<span>${Site.escapeHTML(tag)}</span>`).join("");
    const libEyebrow=document.querySelector(".portfolio-browser .eyebrow"); if(libEyebrow) libEyebrow.textContent=page.libraryEyebrow||"";
    const libTitle=document.querySelector("#projects-title"); if(libTitle) Site.setHeading(libTitle,page.libraryTitle||"");
    const libIntro=document.querySelector(".portfolio-section-heading > p"); if(libIntro) libIntro.textContent=page.libraryIntro||"";
    const ctaEyebrow=document.querySelector(".portfolio-contact .eyebrow"); if(ctaEyebrow) ctaEyebrow.textContent=page.ctaEyebrow||"";
    const ctaTitle=document.querySelector("#portfolio-contact-title"); if(ctaTitle) Site.setHeading(ctaTitle,page.ctaTitle||"");
    const ctaDesc=document.querySelector(".portfolio-contact .contact-content > p:not(.eyebrow)"); if(ctaDesc) ctaDesc.textContent=page.ctaDescription||"";
    const cta=document.querySelector(".portfolio-contact .button"); if(cta){Site.setButtonText(cta,page.ctaText||"Start a Conversation");cta.href=Site.safeHref(page.ctaLink,"contact.html");}
    Site.renderPositioning(document.querySelector(".portfolio-role"), Site.content.global.positioning);
    projects = Site.content.projects.filter((project) => project.enabled);
    projectMap = new Map(projects.map((project) => [project.id, project]));
    if (filterTabs) {
      const categories = [...new Set(projects.map(p => p.category).filter(Boolean))];
      const labels = Site.categoryLabels || {};
      const orderedCategories=(Site.content.portfolioCategories||[]).filter(item=>item.visible!==false).sort((a,b)=>(Number(a.order)||0)-(Number(b.order)||0)).map(item=>item.id).filter(id=>categories.includes(id));
      const fallbackCategories=categories.filter(category=>!orderedCategories.includes(category));
      const displayCategories=[...orderedCategories,...fallbackCategories];
      filterTabs.innerHTML = `<button class="filter-button is-active" type="button" data-filter="all" aria-pressed="true"><span>All</span><span class="filter-count">${projects.length}</span></button>` + displayCategories.map(category => `<button class="filter-button" type="button" data-filter="${Site.escapeHTML(category)}" aria-pressed="false"><span>${Site.escapeHTML(labels[category] || category)}</span><span class="filter-count">${projects.filter(p=>p.category===category).length}</span></button>`).join("");
    }
    grid.innerHTML = projects.map((project) => `
      <button type="button" class="portfolio-card reveal-child" data-project-id="${Site.escapeHTML(project.id)}" data-category="${Site.escapeHTML(project.category)}" aria-haspopup="dialog" aria-label="View ${Site.escapeHTML(project.title)} project details">
        <span class="portfolio-card-media">
          <img src="${Site.escapeHTML(Site.safeImage(project.image, "assets/projects/nexa-properties.svg"))}" width="1200" height="800" loading="lazy" decoding="async" alt="${Site.escapeHTML(project.alt || project.title)}">
          ${Site.clean(project.badge) ? `<span class="portfolio-badge">${Site.escapeHTML(Site.clean(project.badge))}</span>` : ""}
          <span class="portfolio-open" aria-hidden="true">${arrowIcon}</span>
        </span>
        <span class="portfolio-card-content">
          ${Site.clean(project.type) ? `<span class="portfolio-card-category">${Site.escapeHTML(Site.clean(project.type))}</span>` : ""}
          <strong class="portfolio-card-title">${Site.escapeHTML(project.title)}</strong>
          ${Site.clean(project.shortDescription) ? `<span class="portfolio-card-description">${Site.escapeHTML(Site.clean(project.shortDescription))}</span>` : ""}
          <span class="portfolio-card-action">${Site.escapeHTML(project.cta || "View project")} <span aria-hidden="true">→</span></span>
        </span>
      </button>`).join("");
    filterTabs?.querySelectorAll("[data-filter]").forEach((button) => {
      const filter = button.dataset.filter;
      const count = filter === "all" ? projects.length : projects.filter((project) => project.category === filter).length;
      const counter = button.querySelector(".filter-count");
      if (counter) counter.textContent = count;
    });
    filterProjects(currentFilter, false);
    if (update) Site.forceVisible(document);
  }

  render(false);
  document.addEventListener("site:content", () => render(true));
})();
