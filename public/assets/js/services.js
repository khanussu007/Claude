(() => {
  "use strict";
  const Site = window.Site;
  const grid = document.querySelector(".service-detail-grid");
  if (!Site || !grid) return;
  const arrow = '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none"><path d="M5 12h14m-5-5 5 5-5 5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  function render(update = false) {
    const page = Site.content.pageContent.services;
    const heroEyebrow=document.querySelector(".services-hero .hero-eyebrow"); if(heroEyebrow) heroEyebrow.lastChild.textContent=" "+(page.heroEyebrow||"");
    Site.setHeading(document.querySelector("#services-page-title"), page.heroTitle);
    document.querySelector(".services-hero-copy").textContent = page.heroCopy;
    const heroTags=document.querySelector(".services-hero-tags"); if(heroTags) heroTags.innerHTML=(page.heroTags||[]).map(tag=>`<span>${Site.escapeHTML(tag)}</span>`).join("");
    Site.renderPositioning(document.querySelector(".services-role"), Site.content.global.positioning);
    Site.setHeading(document.querySelector("#approach-title"), page.approachTitle);
    document.querySelector(".approach-copy > p").textContent = page.approachText;
    const approachEyebrow=document.querySelector(".approach-section .eyebrow"); if(approachEyebrow) approachEyebrow.textContent=page.approachEyebrow||"";
    const catalogEyebrow=document.querySelector(".services-catalog .eyebrow"); if(catalogEyebrow) catalogEyebrow.textContent=page.catalogEyebrow||"";
    const catalogTitle=document.querySelector("#catalog-title"); if(catalogTitle) Site.setHeading(catalogTitle,page.catalogTitle||"");
    const catalogIntro=document.querySelector(".services-catalog .section-intro"); if(catalogIntro) catalogIntro.textContent=page.catalogIntro||"";
    const cta=document.querySelector(".services-contact .button"); if(cta){Site.setButtonText(cta,page.ctaText||"Let’s Work Together");cta.href=Site.safeHref(page.ctaLink,"contact.html");}
    const ctaEyebrow=document.querySelector(".services-contact .eyebrow"); if(ctaEyebrow) ctaEyebrow.textContent=page.ctaEyebrow||"";
    const ctaTitle=document.querySelector("#services-contact-title"); if(ctaTitle) Site.setHeading(ctaTitle,page.ctaTitle||"");
    const ctaDesc=document.querySelector(".services-contact .contact-content > p:not(.eyebrow)"); if(ctaDesc) ctaDesc.textContent=page.ctaDescription||"";

    const steps=page.approachSteps||[]; const stepList=document.querySelector(".approach-steps"); if(stepList) stepList.innerHTML=steps.map((step,i)=>`<span><b>${String(i+1).padStart(2,"0")}</b>${Site.escapeHTML(step)}</span>`).join("");
    const services = Site.content.services.filter((service) => service.enabled);
    grid.innerHTML = services.map((service, index) => `
      <article class="service-detail-card reveal-child" id="${Site.escapeHTML(service.id)}">
        <div class="service-detail-top">
          <span class="service-detail-icon ${index % 2 ? "service-detail-icon--blue" : "service-detail-icon--orange"}" aria-hidden="true">${Site.icon(service.icon)}</span>
          <span class="card-index">${String(index + 1).padStart(2, "0")}</span>
        </div>
        <h3>${Site.escapeHTML(service.name)}</h3>
        ${service.image ? `<div class="service-detail-image"><img src="${Site.escapeHTML(Site.safeImage(service.image, ""))}" alt="${Site.escapeHTML(service.name)}" loading="lazy"></div>` : ""}
        <p>${Site.escapeHTML(service.description)}</p>
        ${(service.price || service.pricing) ? `<p class="service-price">${Site.escapeHTML(service.price || service.pricing)}${service.priceSuffix ? ` ${Site.escapeHTML(service.priceSuffix)}` : ""}</p>` : ""}
        <div class="service-tags" aria-label="${Site.escapeHTML(service.name)} features">${(service.features || service.tags || []).map((tag) => `<span>${Site.escapeHTML(tag)}</span>`).join("")}</div>
        <a class="service-quote-link" href="${Site.safeHref(service.ctaUrl, `contact.html?project=${encodeURIComponent(service.id)}`)}">${Site.escapeHTML(service.cta || service.ctaText || "Discuss Your Project")} ${arrow}</a>
      </article>`).join("");
    if (update) Site.forceVisible(document);
  }

  render(false);
  document.addEventListener("site:content", () => render(true));
})();
