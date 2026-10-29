(() => {
  "use strict";
  const Site = window.Site;
  const form = document.querySelector("[data-contact-form]");
  if (!Site || !form) return;

  function whatsappUrl(message) {
    const value = String(Site.content.contact.whatsappNumber || "").trim();
    if (!value) return "";
    if (/^https?:\/\//i.test(value)) return `${value}${value.includes("?") ? "&" : "?"}text=${encodeURIComponent(message)}`;
    const number = value.replace(/\D/g, "");
    return number ? `https://wa.me/${number}?text=${encodeURIComponent(message)}` : "";
  }

  function configureLink(link, url, fallback = "#contact-methods") {
    const configured = Boolean(url);
    link.dataset.linkConfigured = String(configured);
    if (configured) {
      link.href = url;
      if (/^https?:\/\//i.test(url)) { link.target = "_blank"; link.rel = "noopener noreferrer"; }
    } else {
      link.href = fallback; link.removeAttribute("target"); link.removeAttribute("rel");
    }
  }

  function renderSocialLinks() {
    const container = document.querySelector(".contact-social-links");
    if (!container) return;
    container.replaceChildren();
    (Site.content.contact.socialLinks || []).filter((item) => item.visible !== false && item.label && item.url).sort((a,b)=>(Number(a.order)||0)-(Number(b.order)||0)).forEach((social) => {
      const link = document.createElement("a"); link.href = Site.safeHref(social.url, "#social"); link.target = "_blank"; link.rel = "noopener noreferrer"; link.setAttribute("aria-label", social.label); link.innerHTML = Site.socialIcon(social.icon || social.platform || "link"); container.appendChild(link);
    });
  }

  function renderProjectOptions() {
    const select = form.elements.projectType; if (!select) return;
    const current = select.value; const requested = new URLSearchParams(location.search).get("project");
    select.replaceChildren();
    const placeholder = new Option("Select a project type", "", true, true); placeholder.disabled = true; select.add(placeholder);
    Site.content.services.filter((service) => service.enabled).forEach((service) => {
      const label = service.formLabel || service.name; const option = new Option(label, label); option.dataset.serviceId = service.id; select.add(option); if (requested === service.id) select.value = label;
    });
    select.add(new Option("Other", "Other"));
    if (!requested && [...select.options].some((option) => option.value === current)) select.value = current;
  }

  function renderFormConfig() {
    const cfg = Site.content.contact.form || {};
    const map = {
      name: ["nameLabel","namePlaceholder","nameRequired"], email:["emailLabel","emailPlaceholder","emailRequired"], projectType:["projectLabel",null,"projectRequired"], budget:["budgetLabel",null,"budgetRequired"], message:["messageLabel","messagePlaceholder","messageRequired"]
    };
    Object.entries(map).forEach(([name,[labelKey,placeholderKey,requiredKey]]) => {
      const input=form.elements[name]; if(!input) return;
      const label=input.closest(".form-field")?.querySelector("label"); if(label && cfg[labelKey]) { const star=label.querySelector("span"); label.textContent=cfg[labelKey]+" "; if(star) label.appendChild(star); }
      if(placeholderKey && cfg[placeholderKey] !== undefined) input.placeholder=cfg[placeholderKey];
      if(requiredKey && cfg[requiredKey] !== undefined) input.required=Boolean(cfg[requiredKey]);
    });
    const submit=form.querySelector("button[type='submit']"); if(submit && cfg.submitText) { const textNode=[...submit.childNodes].find(n=>n.nodeType===Node.TEXT_NODE&&n.nodeValue.trim()); if(textNode) textNode.nodeValue=` ${cfg.submitText} `; }
    const title=document.querySelector("#form-title"); const intro=document.querySelector(".contact-form-heading > p:last-child"); const note=document.querySelector(".form-note"); if(title && cfg.heading) title.textContent=cfg.heading; if(intro && cfg.description) intro.textContent=cfg.description; if(note && cfg.submitNote) note.textContent=cfg.submitNote;
    const budget=form.elements.budget; if(budget && Array.isArray(cfg.budgetOptions)){ const current=budget.value; budget.replaceChildren(new Option(cfg.budgetLabel||"Select a budget range", "", true, true)); cfg.budgetOptions.forEach(v=>budget.add(new Option(v,v))); if([...budget.options].some(o=>o.value===current)) budget.value=current; }
  }

  function render(update = false) {
    const content = Site.content; const contact = content.contact; const page = content.pageContent.contact;
    Site.setHeading(document.querySelector("#contact-title"), page.heroTitle);
    document.querySelector(".contact-hero-copy").textContent = page.heroCopy;
    const heroTags=document.querySelector(".contact-hero-tags"); if(heroTags) heroTags.innerHTML=(page.heroTags||[]).map(tag=>`<span>${Site.escapeHTML(tag)}</span>`).join("");
    const heroWhatsapp=document.querySelector(".contact-hero-actions [data-contact-link='whatsapp']"); if(heroWhatsapp){Site.setButtonText(heroWhatsapp,page.heroWhatsappText||"Start a WhatsApp Conversation");heroWhatsapp.href=Site.safeHref(page.heroWhatsappLink,"#contact-methods");}
    const heroBrief=document.querySelector(".contact-hero-actions a.button--secondary"); if(heroBrief){Site.setButtonText(heroBrief,page.heroBriefText||"Send a Project Brief");heroBrief.href=Site.safeHref(page.heroBriefLink,"#contact-form");}
    const methodsDescription=document.querySelector(".contact-methods-intro"); if(methodsDescription) methodsDescription.textContent=page.methodsDescription||"";
    const setCard=(selector,titleKey,descKey)=>{const card=document.querySelector(selector); if(!card)return; const small=card.querySelector("small"), desc=card.querySelector("span:last-child"); if(small) small.textContent=page[titleKey]||small.textContent; if(desc) desc.textContent=page[descKey]||desc.textContent;};
    setCard("[data-contact-card='email']","emailCardTitle","emailCardDescription"); setCard("[data-contact-card='website']","websiteCardTitle","websiteCardDescription"); setCard("[data-contact-card='whatsapp']","whatsappCardTitle","whatsappCardDescription"); setCard("[data-contact-card='social']","socialCardTitle","socialCardDescription");
    Site.renderPositioning(document.querySelector(".contact-role"), content.global.positioning);
    const heroEyebrow=document.querySelector(".contact-hero .hero-eyebrow"); if(heroEyebrow) heroEyebrow.lastChild.textContent=" "+(page.heroEyebrow||"");
    const methodsEy=document.querySelector(".contact-sidebar .eyebrow"); if(methodsEy) methodsEy.textContent=page.methodsEyebrow||"";
    const methodsTitle=document.querySelector("#contact-methods-title"); if(methodsTitle) Site.setHeading(methodsTitle,page.methodsTitle||"");
    document.querySelector("#form-title").textContent = content.contact.form?.heading || page.formTitle;
    document.querySelector(".contact-form-heading > p:last-child").textContent = content.contact.form?.description || page.formIntro;
    document.querySelectorAll("[data-contact-email]").forEach((link) => { link.href=`mailto:${contact.email}`; const strong=link.querySelector("strong"); if(strong) strong.textContent=contact.email; });
    document.querySelectorAll("[data-contact-website]").forEach((link) => { link.href=Site.safeHref(contact.website,"#"); const strong=link.querySelector("strong"); if(strong) strong.textContent=String(contact.website||"").replace(/^https?:\/\//,"").replace(/\/$/,""); });
    const genericMessage=contact.whatsappTemplate || "Hello Usman, I’d like to discuss a project.";
    document.querySelectorAll("[data-contact-link='whatsapp']").forEach((link) => configureLink(link, whatsappUrl(genericMessage), "#contact-methods"));
    const journey=document.querySelector(".visitor-journey"); if(journey){ const items=page.visitorJourney||[]; journey.innerHTML=items.map((item,i)=>`<li class="${i===items.length-1?'is-current':''}"${i===items.length-1?' aria-current="step"':''}>${Site.escapeHTML(item)}</li>`).join(""); }
    renderSocialLinks(); renderProjectOptions(); renderFormConfig();
    if(update) Site.forceVisible(document);
  }

  document.addEventListener("click", (event) => {
    const link=event.target.closest("[data-contact-link]"); if(!link || link.dataset.linkConfigured !== "false") return;
    event.preventDefault();
    const status=document.querySelector("[data-link-status]"); if(status) status.textContent=`This ${link.dataset.contactLink || "contact"} link is not configured yet. Please use ${Site.content.contact.email}.`;
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const cfg=Site.content.contact.form || {}; const status=form.querySelector("[data-form-status]");
    if(!form.checkValidity()){ form.reportValidity(); if(status) status.textContent=cfg.errorMessage||"Please complete the required fields before continuing."; return; }
    const data=new FormData(form);
    const name=String(data.get("name")||"").trim(); const senderEmail=String(data.get("email")||"").trim(); const projectType=String(data.get("projectType")||"Other"); const budget=String(data.get("budget")||"Not specified"); const message=String(data.get("message")||"").trim();
    const body=[`Name: ${name}`,`Email: ${senderEmail}`,`Project Type: ${projectType}`,`Budget: ${budget}`,"","Message:",message].join("\n");
    const url=whatsappUrl(body);
    if(!url){ if(status) status.textContent="WhatsApp is not configured yet. Please use the email contact option."; return; }
    const popup=window.open(url,"_blank","noopener,noreferrer");
    if(!popup) window.location.href=url;
    if(status) status.textContent=cfg.successMessage||"Thanks. Your enquiry is ready to send on WhatsApp.";
    form.reset(); renderFormConfig();
  });

  render(false);
  document.addEventListener("site:content", () => render(true));
})();
