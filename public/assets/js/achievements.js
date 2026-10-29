(() => {
  "use strict";
  const Site = window.Site;
  const timeline = document.querySelector(".achievement-timeline");
  if (!Site || !timeline) return;

  function render(update = false) {
    const content = Site.content; const page=content.pageContent.achievements;
    const heroEyebrow=document.querySelector(".achievements-hero .hero-eyebrow"); if(heroEyebrow) heroEyebrow.lastChild.textContent=" "+(page.heroEyebrow||"");
    Site.setHeading(document.querySelector("#achievements-title"), page.heroTitle);
    document.querySelector(".achievements-hero-copy").textContent = page.heroCopy;
    const heroTags=document.querySelector(".achievements-hero-tags"); if(heroTags) heroTags.innerHTML=(page.heroTags||[]).map(tag=>`<span>${Site.escapeHTML(tag)}</span>`).join("");
    const jEy=document.querySelector(".journey-section .eyebrow"); if(jEy) jEy.textContent=page.journeyEyebrow||"";
    const jTitle=document.querySelector("#journey-title"); if(jTitle) Site.setHeading(jTitle,page.journeyTitle||"");
    const aEy=document.querySelector(".achievements-timeline-section .eyebrow"); if(aEy) aEy.textContent=page.awardsEyebrow||"";
    const aTitle=document.querySelector("#timeline-title"); if(aTitle) Site.setHeading(aTitle,page.awardsTitle||"");
    const aIntro=document.querySelector(".achievements-timeline-section .section-intro"); if(aIntro) aIntro.textContent=page.awardsIntro||"";
    const ctaEy=document.querySelector(".achievements-contact .eyebrow"); if(ctaEy) ctaEy.textContent=page.ctaEyebrow||"";
    const ctaTitle=document.querySelector("#achievements-contact-title"); if(ctaTitle) Site.setHeading(ctaTitle,page.ctaTitle||"");
    const ctaDesc=document.querySelector(".achievements-contact .contact-content > p:not(.eyebrow)"); if(ctaDesc) ctaDesc.textContent=page.ctaDescription||"";
    const cta=document.querySelector(".achievements-contact .button--primary"); if(cta){Site.setButtonText(cta,page.ctaText||"Let’s Work Together");cta.href=Site.safeHref(page.ctaLink,"contact.html");}
    const secondary=document.querySelector(".achievements-contact .button--secondary"); if(secondary){Site.setButtonText(secondary,page.secondaryCtaText||"Explore Services");secondary.href=Site.safeHref(page.secondaryCtaLink,"services.html");}
    Site.renderPositioning(document.querySelector(".achievements-role"), content.global.positioning);

    const journey = document.querySelector(".journey-steps");
    journey.innerHTML = content.about.careerJourney.map((stage, index) => `<li><span>${String(index + 1).padStart(2, "0")}</span><strong>${Site.escapeHTML(stage)}</strong></li>`).join("");

    const achievements = content.achievements.filter((achievement) => achievement.enabled);
    timeline.innerHTML = achievements.map((achievement, index) => {
      const image = achievement.image ? Site.safeImage(achievement.image, "") : "";
      return `
        <article class="achievement-item ${achievement.featured ? "achievement-item--featured" : ""} reveal" id="${Site.escapeHTML(achievement.id)}">
          <span class="achievement-marker" aria-hidden="true">${String(index + 1).padStart(2, "0")}</span>
          <div class="achievement-card">
            <div class="achievement-card-top">
              <span class="achievement-icon ${index % 2 ? "achievement-icon--blue" : "achievement-icon--orange"}" aria-hidden="true">${Site.icon(achievement.icon)}</span>
              <span class="${achievement.featured ? "achievement-badge" : "achievement-stage"}">${achievement.featured ? "Featured recognition" : Site.escapeHTML(achievement.category || "Career milestone")}</span>
            </div>
            <p class="achievement-kicker">${Site.escapeHTML(achievement.title)}</p>
            <h3>${Site.escapeHTML(achievement.recognition || achievement.title)}</h3>
            <div class="achievement-meta">
              <span><small>Year / Period</small>${Site.escapeHTML(achievement.year || "Career milestone")}</span>
              <span><small>Category</small>${Site.escapeHTML(achievement.category || "Professional journey")}</span>
              ${achievement.organization ? `<span><small>Organization</small>${Site.escapeHTML(achievement.organization)}</span>` : ""}
            </div>
            <p class="achievement-description">${Site.escapeHTML(achievement.description)}</p>
            ${image ? `<a class="achievement-certificate" href="${Site.escapeHTML(image)}" target="_blank" rel="noopener noreferrer"><img src="${Site.escapeHTML(image)}" alt="${Site.escapeHTML(achievement.title)} certificate or achievement image" loading="lazy"><span>View image / certificate</span></a>` : ""}
          </div>
        </article>`;
    }).join("");
    if (update) Site.forceVisible(document);
  }

  render(false);
  document.addEventListener("site:content", () => render(true));
})();
