(() => {
  "use strict";
  const Site = window.Site;
  if (!Site || !document.querySelector(".hero-content")) return;

  const arrow = '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none"><path d="M5 12h14m-5-5 5 5-5 5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const diagonalArrow = '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none"><path d="M7 17 17 7M8 7h9v9" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  // Show a section only when it has content; otherwise hide it completely on the live site.
  function toggleSection(el, show) {
    if (!el) return;
    el.hidden = !show;
    el.style.display = show ? "" : "none";
  }

  function renderTestimonials(items) {
    const slider = document.querySelector("[data-slider]");
    if (!slider) return;
    const visible = (items || []).filter((item) => item.enabled !== false).sort((a,b)=>(Number(a.order)||0)-(Number(b.order)||0));
    toggleSection(document.querySelector("#testimonials"), visible.length > 0);
    const track = slider.querySelector("[data-slider-track]");
    const dots = slider.querySelector(".slider-dots");
    if (!track) return;
    track.innerHTML = visible.map((item, index) => {
      const initials = String(item.clientName || "Client").split(/\s+/).map((p) => p[0]).join("").slice(0,2).toUpperCase();
      const photo = item.clientPhoto ? `<img class="client-avatar-image" src="${Site.escapeHTML(Site.safeImage(item.clientPhoto, ""))}" alt="${Site.escapeHTML(item.clientName || "Client")}" loading="lazy">` : `<span class="client-avatar" aria-hidden="true">${Site.escapeHTML(initials)}</span>`;
      const stars = "★".repeat(Math.max(0, Math.min(5, Number(item.rating)||0))) + "☆".repeat(5-Math.max(0,Math.min(5,Number(item.rating)||0)));
      return `<article class="testimonial-slide" data-slide aria-label="Testimonial ${index+1} of ${visible.length}"${index ? ' aria-hidden="true"' : ""}><div class="testimonial-card"><div class="quote-mark" aria-hidden="true">“</div>${item.verified ? '<span class="placeholder-label">Verified</span>' : ''}${Site.clean(item.text) ? `<blockquote>${Site.escapeHTML(Site.clean(item.text))}</blockquote>` : ""}<div class="client-row">${photo}<div><strong>${Site.escapeHTML(item.clientName || "Client")}</strong>${[item.designation,item.company].map(Site.clean).filter(Boolean).length ? `<span>${Site.escapeHTML([item.designation,item.company].map(Site.clean).filter(Boolean).join(" · "))}</span>` : ""}${Site.clean(item.projectService) ? `<small>${Site.escapeHTML(Site.clean(item.projectService))}</small>` : ""}</div><span class="client-stars" aria-label="${Site.escapeHTML(String(item.rating||0))} out of 5">${stars}</span></div></div></article>`;
    }).join("") || '<div class="public-empty">Client testimonials will appear here when added in the Admin Panel.</div>';
    if (dots) dots.innerHTML = visible.map((_,i)=>`<button class="slider-dot${i===0?' is-active':''}" type="button" data-slider-dot="${i}" aria-label="Show testimonial ${i+1}" aria-current="${i===0}"></button>`).join("");
    slider.dataset.sliderVersion = String(Date.now());
    document.dispatchEvent(new CustomEvent("site:testimonials-rendered"));
  }

  function renderTools(items) {
    const section = document.querySelector("#tools");
    const track = section && section.querySelector(".brand-track");
    if (!track) return;
    const visible = (items || []).filter((item) => item.visible !== false && String(item.name || "").trim()).sort((a,b)=>(Number(a.order)||0)-(Number(b.order)||0));
    toggleSection(section, visible.length > 0);
    const group = visible.map((item) => {
      const name = Site.escapeHTML(item.name);
      const icon = item.icon ? Site.safeImage(item.icon, "") : "";
      const symbol = icon ? `<img src="${Site.escapeHTML(icon)}" alt="" loading="lazy">` : `<i aria-hidden="true">${Site.escapeHTML(String(item.name).trim().slice(0,1).toUpperCase())}</i>`;
      const inner = `<span class="tool-icon">${symbol}</span><span class="tool-name">${name}</span>`;
      const href = Site.safeHref(item.websiteUrl, "");
      return href ? `<a class="tool-chip" href="${Site.escapeHTML(href)}" title="${name}" target="_blank" rel="noopener noreferrer">${inner}</a>` : `<span class="tool-chip" title="${name}">${inner}</span>`;
    }).join("");
    track.innerHTML = visible.length ? `<div class="brand-group">${group}</div><div class="brand-group" aria-hidden="true">${group}</div>` : "";
    // Tool icon files can be missing or fail to load; swap a broken image for the tool's initial.
    track.querySelectorAll(".tool-icon img").forEach((img) => {
      img.addEventListener("error", () => {
        const initial = document.createElement("i");
        initial.setAttribute("aria-hidden", "true");
        initial.textContent = (img.closest(".tool-chip")?.getAttribute("title") || "?").trim().slice(0, 1).toUpperCase();
        img.replaceWith(initial);
      }, { once: true });
    });
  }

  function renderBrands(items) {
    // Scoped to the Brands section: the Tools strip above it also contains a .brand-track.
    const track = document.querySelector(".brands-section .brand-track");
    if (!track) return;
    const visible = (items || []).filter((item) => item.visible !== false).sort((a,b)=>(Number(a.order)||0)-(Number(b.order)||0));
    toggleSection(document.querySelector(".brands-section"), visible.length > 0);
    const group = visible.map((item) => { const inner=`${item.logo ? `<img src="${Site.escapeHTML(Site.safeImage(item.logo, ""))}" alt="${Site.escapeHTML(item.name || "Brand")}" loading="lazy">` : `<i class="logo-symbol" aria-hidden="true">${Site.escapeHTML((item.name || "B").slice(0,1).toUpperCase())}</i>`}<span>${Site.escapeHTML(item.name || "Brand")}</span>`; const href=Site.safeHref(item.websiteUrl,""); return href ? `<a class="brand-logo" href="${Site.escapeHTML(href)}" title="${Site.escapeHTML(item.name || "Brand")}" target="_blank" rel="noopener noreferrer">${inner}</a>` : `<span class="brand-logo" title="${Site.escapeHTML(item.name || "Brand")}">${inner}</span>`; }).join("");
    track.innerHTML = visible.length ? `<div class="brand-group">${group}</div><div class="brand-group" aria-hidden="true">${group}</div>` : '<div class="public-empty">Brands and collaborations will appear here when added in the Admin Panel.</div>';
  }

  function setEyebrow(element, value) {
    if (!element) return;
    const node = [...element.childNodes].find((child) => child.nodeType === Node.TEXT_NODE && child.nodeValue.trim());
    if (node) node.nodeValue = ` ${value} `;
  }

  function render(update = false) {
    const { home, projects, services } = Site.content;
    const sections = home.sections;
    document.body.classList.add("home-page");

    const heroTitle = document.querySelector(".hero-content h1");
    if (heroTitle) {
      heroTitle.textContent = home.name;
    }
    setEyebrow(document.querySelector(".hero-eyebrow"), home.eyebrow);
    Site.renderPositioning(document.querySelector(".hero-role"), home.title);
    document.querySelector(".hero-tagline").textContent = home.mainTagline;
    document.querySelector(".hero-description").textContent = home.heroDescription;
    const heroCta = document.querySelector(".hero-actions .button");
    Site.setButtonText(heroCta, home.heroCtaText);
    heroCta.href = Site.safeHref(home.heroCtaLink, "portfolio.html");
    const secondaryCta = document.querySelector(".hero-actions [data-secondary-cta]");
    if (secondaryCta) { Site.setButtonText(secondaryCta, home.secondaryCtaText || "Let’s Talk"); secondaryCta.href = Site.safeHref(home.secondaryCtaLink, "contact.html"); }
    const support = document.querySelector(".hero-support");
    if (support) { support.replaceChildren(); const prefix=document.createElement("span"); prefix.textContent=home.heroSupportPrefix || "Supported by"; support.appendChild(prefix); const badges=(home.heroBadges||[]).filter(b=>b.visible!==false).sort((a,b)=>(Number(a.order)||0)-(Number(b.order)||0)); badges.forEach((b)=>{ const sep=document.createElement("b"); sep.textContent="·"; support.appendChild(sep); const span=document.createElement("span"); span.textContent=b.text||""; support.appendChild(span); }); }
    const chips = document.querySelectorAll(".profile-chip");
    const sortedBadges=(home.heroBadges||[]).filter(b=>b.visible!==false).sort((a,b)=>(Number(a.order)||0)-(Number(b.order)||0));
    if (chips[0]) chips[0].textContent = sortedBadges[0]?.text || "";
    if (chips[1]) chips[1].textContent = sortedBadges[1]?.text || "";
    const caption = document.querySelector(".profile-caption");
    if (caption) { const small=caption.querySelector("small"); const value=caption.querySelector("span:last-child"); if(small) small.textContent=home.heroImageOverlayLabel || "Focused on"; if(value && home.heroImageOverlay) { value.replaceChildren(small || document.createElement("small"), document.createTextNode(home.heroImageOverlay)); } }

    const activeStats = (home.stats || []).filter((stat) => stat.enabled !== false && String(stat.number ?? "").trim() !== "");
    const experience = activeStats.find((stat) => stat.id === home.experienceStatId) || activeStats[0];
    toggleSection(document.querySelector(".hero-experience"), Boolean(experience));
    toggleSection(document.querySelector("#stats"), activeStats.length > 0);
    const scrollCue = document.querySelector(".scroll-cue");
    if (scrollCue && !activeStats.length) scrollCue.setAttribute("href", "#services");
    if (experience) {
      document.querySelector(".hero-experience strong").textContent = experience.number;
      document.querySelector(".hero-experience span").textContent = experience.label;
      document.querySelector(".hero-experience").setAttribute("aria-label", `${experience.number} ${experience.label}`);
    }

    const statsPanel = document.querySelector(".stats-panel");
    statsPanel.innerHTML = activeStats.map((stat) => {
      const raw = String(stat.number ?? "0");
      const match = raw.match(/^\s*(\d+(?:\.\d+)?)(.*)$/);
      const value = match ? match[1] : raw;
      const suffix = stat.suffix || (match ? match[2] : "");
      const prefix = stat.prefix || "";
      return `<article class="stat reveal-child"><div class="stat-number">${prefix ? `<sup>${Site.escapeHTML(prefix)}</sup>` : ""}<span data-counter="${Site.escapeHTML(value)}">${Site.escapeHTML(value)}</span>${suffix ? `<sup>${Site.escapeHTML(suffix)}</sup>` : ""}</div><p>${Site.escapeHTML(stat.label)}</p></article>`;
    }).join("");

    setEyebrow(document.querySelector("#services .section-heading .eyebrow"), sections.servicesEyebrow);
    Site.setHeading(document.querySelector("#services-title"), sections.servicesTitle);
    document.querySelector("#services .section-intro").textContent = sections.servicesIntro;
    const servicesAction=document.querySelector(".services-action .button"); if(servicesAction){Site.setButtonText(servicesAction,sections.servicesCtaText||"Explore All Services");servicesAction.href=Site.safeHref(sections.servicesCtaLink,"services.html");}
    const teaserGrid = document.querySelector(".services-grid");
    const teasers = home.serviceTeaserIds.map((id) => services.find((service) => service.id === id && service.enabled)).filter(Boolean);
    teaserGrid.innerHTML = teasers.map((service, index) => `
      <a class="service-card reveal-child" href="${Site.safeHref(service.homeCtaUrl, `services.html#${encodeURIComponent(service.id)}`)}">
        <div class="service-top">
          <span class="service-icon ${index % 2 ? "service-icon--blue" : "service-icon--orange"}" aria-hidden="true">${Site.icon(service.icon)}</span>
          <span class="card-index">${String(index + 1).padStart(2, "0")}</span>
        </div>
        ${Site.clean(service.badge) ? `<span class="project-badge">${Site.escapeHTML(Site.clean(service.badge))}</span>` : ""}
        <h3>${Site.escapeHTML(service.name)}</h3>
        <p>${Site.escapeHTML(home.serviceTeaserOverrides?.[service.id] || service.shortDescription || service.description)}</p>
        <span class="service-card-link">${Site.escapeHTML(service.homeCta || "Learn more")} <span aria-hidden="true">→</span></span>
      </a>`).join("");

    setEyebrow(document.querySelector("#work .section-heading .eyebrow"), sections.workEyebrow);
    Site.setHeading(document.querySelector("#work-title"), sections.workTitle);
    document.querySelector("#work .section-intro").textContent = sections.workIntro;
    const workAction=document.querySelector(".work-action .button"); if(workAction){Site.setButtonText(workAction,sections.workCtaText||"View Full Portfolio");workAction.href=Site.safeHref(sections.workCtaLink,"portfolio.html");}
    const featured = projects.filter((project) => project.enabled && project.featured);
    document.querySelector(".project-grid").innerHTML = featured.map((project) => `
      <article class="project-card reveal-child">
        <div class="project-media">
          <img src="${Site.escapeHTML(Site.safeImage(project.image, "assets/projects/nexa-properties.svg"))}" width="1200" height="800" loading="lazy" alt="${Site.escapeHTML(project.alt || project.title)}">
        </div>
        <div class="project-info">
          <div>${Site.clean(project.type) ? `<p>${Site.escapeHTML(Site.clean(project.type))}</p>` : ""}<h3>${Site.escapeHTML(project.title)}</h3></div>
          <span class="project-arrow" aria-hidden="true">${diagonalArrow}</span>
        </div>
      </article>`).join("") || '<p class="public-empty">Featured projects will appear here when selected in the Admin Panel.</p>';

    setEyebrow(document.querySelector("#testimonials .section-heading .eyebrow"), sections.testimonialsEyebrow);
    Site.setHeading(document.querySelector("#testimonials-title"), sections.testimonialsTitle);
    document.querySelector("#testimonials .section-intro").textContent = sections.testimonialsIntro;
    setEyebrow(document.querySelector("#contact .contact-content .eyebrow"), sections.contactEyebrow);
    Site.setHeading(document.querySelector("#contact-title"), sections.contactTitle);
    document.querySelector("#contact .contact-content > p:not(.eyebrow)").textContent = sections.contactIntro;
    const ctaEyebrow=document.querySelector("[data-home-cta-eyebrow]"); if(ctaEyebrow) ctaEyebrow.textContent=sections.contactEyebrow || "";
    Site.setHeading(document.querySelector("[data-home-cta-eyebrow] + h2"), sections.contactTitle || "");
    const ctaDesc=document.querySelector("[data-home-cta-description]"); if(ctaDesc) ctaDesc.textContent=sections.contactIntro || "";
    const ctaButton=document.querySelector("[data-home-cta-button]"); if(ctaButton){Site.setButtonText(ctaButton, sections.ctaText || "Start a Conversation"); ctaButton.href=Site.safeHref(sections.ctaLink,"contact.html");}
    const brandEyebrow = document.querySelector("#brands-title");
    if (brandEyebrow) setEyebrow(brandEyebrow, sections.brandsEyebrow || "Brands & collaborations");
    const brandIntro = document.querySelector(".brands-heading .section-intro");
    if (brandIntro) brandIntro.textContent = sections.brandsDescription || sections.brandsIntro || "";
    renderTestimonials(Site.content.home.testimonials);
    renderBrands(Site.content.home.brands);
    const toolsEyebrow = document.querySelector("#tools-title");
    if (toolsEyebrow) setEyebrow(toolsEyebrow, sections.toolsEyebrow || "Tools I work with");
    const toolsIntro = document.querySelector("#tools .section-intro");
    if (toolsIntro) toolsIntro.textContent = sections.toolsDescription || "";
    renderTools(Site.content.home.tools);

    if (update) {
      Site.forceVisible(document);
      statsPanel.querySelectorAll("[data-counter]").forEach((counter) => {
        counter.textContent = counter.dataset.counter;
        counter.dataset.counted = "true";
      });
    }
  }

  render(false);
  document.addEventListener("site:content", () => render(true));
})();
