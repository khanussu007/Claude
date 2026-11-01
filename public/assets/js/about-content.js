(() => {
  "use strict";
  const Site = window.Site;
  if (!Site || !document.body.classList.contains("about-page")) return;

  function render(update = false) {
    const about = Site.content.about;
    Site.setHeading(document.querySelector("#about-title"), about.heroTitle);
    const page = Site.content.pageContent.about || {};
    const heroEyebrow=document.querySelector(".about-hero .hero-eyebrow"); if(heroEyebrow) heroEyebrow.lastChild.textContent=" "+(page.heroEyebrow||"");
    const storyIntro=document.querySelector(".about-story .section-intro"); if(storyIntro) storyIntro.textContent=page.storyIntro||"";
    const timelineIntro=document.querySelector(".timeline-section .section-intro"); if(timelineIntro) timelineIntro.textContent=page.timelineIntro||"";
    const skillsIntro=document.querySelector(".skills-section .section-intro"); if(skillsIntro) skillsIntro.textContent=page.skillsIntro||"";
    const focusIntro=document.querySelector(".focus-section .section-intro"); if(focusIntro) focusIntro.textContent=page.focusIntro||"";
    const storyEy=document.querySelector(".about-story .section-heading .eyebrow"); if(storyEy) storyEy.textContent=page.storyEyebrow||"";
    const timelineEy=document.querySelector(".timeline-section .section-heading .eyebrow"); if(timelineEy) timelineEy.textContent=page.timelineEyebrow||"";
    const skillsEy=document.querySelector(".skills-section .section-heading .eyebrow"); if(skillsEy) skillsEy.textContent=page.skillsEyebrow||"";
    const focusEy=document.querySelector(".focus-section .section-heading .eyebrow"); if(focusEy) focusEy.textContent=page.focusEyebrow||"";
    const storyTitle = document.querySelector("#story-title"); if (storyTitle && page.storyHeading) Site.setHeading(storyTitle, page.storyHeading);
    const storyEyebrow = document.querySelector(".about-story .section-heading .eyebrow"); if (storyEyebrow && page.heroEyebrow) storyEyebrow.textContent = page.heroEyebrow;
    const timelineTitle = document.querySelector("#timeline-title"); if (timelineTitle && page.timelineHeading) Site.setHeading(timelineTitle, page.timelineHeading);
    const skillsTitle = document.querySelector("#skills-title"); if (skillsTitle && page.skillsHeading) Site.setHeading(skillsTitle, page.skillsHeading);
    const focusTitle = document.querySelector("#focus-title"); if (focusTitle && page.focusHeading) Site.setHeading(focusTitle, page.focusHeading);
    Site.renderPositioning(document.querySelector(".about-role"), Site.content.global.positioning);
    const heroLead=document.querySelector(".about-hero-lead"); if(heroLead) heroLead.textContent=page.heroLead||"";
    document.querySelector(".about-hero-copy").textContent = about.introduction;
    const heroTags=document.querySelector(".about-hero-tags"); if(heroTags) heroTags.innerHTML=(page.heroTags||[]).map(tag=>`<span>${Site.escapeHTML(tag)}</span>`).join("");
    document.querySelector(".story-narrative .story-lead").textContent = about.storyLead;
    const narrative = document.querySelector(".story-narrative");
    narrative.querySelectorAll("p:not(.story-lead)").forEach((paragraph) => paragraph.remove());
    String(about.story || "").split(/\n\s*\n/).filter(Boolean).forEach((text) => {
      const paragraph = document.createElement("p");
      paragraph.textContent = text.trim();
      narrative.appendChild(paragraph);
    });
    const perspectiveEy=document.querySelector(".perspective-card .eyebrow"); if(perspectiveEy) perspectiveEy.textContent=page.perspectiveEyebrow||"";
    const perspectiveQuote=document.querySelector(".perspective-card blockquote"); if(perspectiveQuote){ perspectiveQuote.replaceChildren(document.createTextNode(page.perspectivePrefix||""), document.createTextNode(" "), Object.assign(document.createElement("strong"),{textContent:page.perspectiveStrong||""}), document.createTextNode(" "+(page.perspectiveMiddle||"")), document.createTextNode(" "), Object.assign(document.createElement("span"),{textContent:page.perspectiveAccent||""})); }
    document.querySelector(".perspective-card > p:not(.eyebrow)").textContent = about.differentiatorDescription;
    const goalLabel=document.querySelector(".story-goal > div > span"); if(goalLabel) goalLabel.textContent=page.journeyEyebrow||"My goal";
    document.querySelector(".story-goal p").textContent = page.journeyTitle || about.mission;

    const journey = document.querySelector(".journey-labels");
    journey.replaceChildren();
    (page.perspectiveTags||[]).forEach((stage, index) => {
      if (index) {
        const arrow = document.createElement("i");
        arrow.setAttribute("aria-hidden", "true");
        arrow.textContent = "→";
        journey.appendChild(arrow);
      }
      const label = document.createElement("span");
      label.textContent = stage;
      journey.appendChild(label);
    });

    const timelineEl = document.querySelector(".professional-timeline");
    if (timelineEl) timelineEl.innerHTML = about.timeline.map((item, index) => `
      <article class="timeline-item reveal">
        <span class="timeline-marker" aria-hidden="true">${String(index + 1).padStart(2, "0")}</span>
        <div class="timeline-card">
          <p class="timeline-phase">${Site.escapeHTML(item.phase)}</p>
          <h3>${Site.escapeHTML(item.title)}</h3>
          <p>${Site.escapeHTML(item.description)}</p>
        </div>
      </article>`).join("");

    const skillPanel = document.querySelector("[data-skill-meters]");
    if (skillPanel) skillPanel.innerHTML = about.skills.map((skill, index) => {
      const level = Math.max(0, Math.min(100, Number(skill.level) || 0));
      return `
        <article class="skill-item" style="--skill-index: ${index}">
          <div class="skill-heading"><h3>${Site.escapeHTML(skill.name)}</h3><span>${Site.escapeHTML(skill.label)}</span></div>
          <div class="skill-track" role="progressbar" aria-label="${Site.escapeHTML(skill.name)} capability" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${level}"><span class="skill-fill" style="--skill-level: ${level}%"></span></div>
        ${skill.description ? `<p class="skill-description">${Site.escapeHTML(skill.description)}</p>` : ""}
        </article>`;
    }).join("");

    const focusGrid = document.querySelector(".focus-grid");
    if (focusGrid) focusGrid.innerHTML = about.focusCards.map((card, index) => `
      <article class="focus-card reveal-child">
        <div class="focus-card-top">
          <span class="focus-icon ${index % 2 ? "focus-icon--blue" : "focus-icon--orange"}" aria-hidden="true">${Site.icon(card.icon)}</span>
          <span class="card-index">${String(index + 1).padStart(2, "0")}</span>
        </div>
        ${card.label ? `<p class="eyebrow">${Site.escapeHTML(card.label)}</p>` : ""}
        <h3>${Site.escapeHTML(card.title)}</h3>
        <p>${Site.escapeHTML(card.description)}</p>
      </article>`).join("");

    const aboutCta = document.querySelector(".about-page .button--primary[href='contact.html']");
    if (aboutCta) { Site.setButtonText(aboutCta, page.ctaText || "Let’s Work Together"); aboutCta.href = Site.safeHref(page.ctaLink, "contact.html"); }
    if (update) {
      if (skillPanel) skillPanel.classList.add("skills-are-visible");
      Site.forceVisible(document);
    }
  }

  render(false);
  document.addEventListener("site:content", () => render(true));
})();
