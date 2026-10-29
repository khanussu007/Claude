(() => {
  "use strict";
  const app = document.querySelector("#admin-app");
  const routeTitle = document.querySelector("#admin-route-title");
  const saveState = document.querySelector("#save-state");
  const toastElement = document.querySelector("#admin-toast");
  const fileInput = document.querySelector("#admin-file-input");
  const mediaModal = document.querySelector("#media-modal");
  const routes = {
    dashboard: "Dashboard", global: "Global Settings", home: "Home Page", portfolio: "Portfolio",
    about: "About", services: "Services", achievements: "Awards & Achievements", contact: "Contact",
    media: "Images / Media", seo: "SEO", theme: "Theme Settings", settings: "Admin Settings"
  };
  const themeNames = { "charcoal-orange": "Charcoal Orange", "midnight-blue": "Midnight Blue", "slate-purple": "Slate Purple", "emerald-dark": "Emerald Dark", "premium-navy-gold": "Premium Navy & Gold" };
  let categoryOptions = [["website", "Website Design"], ["landing", "Landing Pages"], ["marketing", "Digital Marketing & Lead Generation"]];
  const iconOptions = ["website", "landing", "ads", "lead", "strategy", "automation", "award", "milestone"];
  let content = null;
  let session = null;
  let route = "dashboard";
  let dirty = false;
  let saving = false;
  let toastTimer = null;
  let pendingUpload = null;
  let mediaLastFocused = null;
  let openCollection = "";
  let openIndex = -1;

  const escapeHTML = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character]));
  const uid = (prefix) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  const get = (path, source = content) => path.split(".").reduce((value, key) => value?.[key], source);
  function set(path, value) {
    const keys = path.split(".");
    const last = keys.pop();
    let target = content;
    keys.forEach((key) => { if (!target[key] || typeof target[key] !== "object") target[key] = {}; target = target[key]; });
    target[last] = value;
  }
  function toast(message, error = false) {
    clearTimeout(toastTimer);
    toastElement.textContent = message;
    toastElement.classList.toggle("is-error", error);
    toastElement.classList.add("is-visible");
    toastTimer = setTimeout(() => toastElement.classList.remove("is-visible"), 4200);
  }
  async function api(url, options = {}) {
    const response = await fetch(url, {
      ...options,
      headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest", ...(options.headers || {}) }
    });
    const data = await response.json().catch(() => ({}));
    if (response.status === 401 && data.error === "Authentication required.") {
      location.replace("/admin/login.html");
      throw new Error("Your session has expired. Please sign in again.");
    }
    if (!response.ok) throw new Error(data.error || "The server could not complete the request.");
    return data;
  }


  function openMediaPreview(item) {
    mediaLastFocused = document.activeElement;
    document.querySelector("#media-preview-title").textContent = item.name;
    document.querySelector("#media-preview-image").src = item.url;
    mediaModal.hidden = false;
    document.querySelector(".admin-shell").inert = true;
    mediaModal.querySelector(".media-modal-dialog [data-close-media]")?.focus();
  }
  function closeMediaPreview() {
    if (mediaModal.hidden) return;
    mediaModal.hidden = true;
    document.querySelector(".admin-shell").inert = false;
    if (mediaLastFocused && document.contains(mediaLastFocused)) mediaLastFocused.focus({ preventScroll: true });
    mediaLastFocused = null;
  }

  function field(label, path, value, options = {}) {
    const classes = `field${options.full ? " field--full" : ""}`;
    const help = options.help ? `<small>${escapeHTML(options.help)}</small>` : "";
    const required = options.required ? " required" : "";
    if (options.textarea) {
      return `<label class="${classes}">${escapeHTML(label)}<textarea data-path="${escapeHTML(path)}" rows="${options.rows || 4}"${required}>${escapeHTML(value)}</textarea>${help}</label>`;
    }
    if (options.options) {
      return `<label class="${classes}">${escapeHTML(label)}<select data-path="${escapeHTML(path)}"${options.image ? " data-image-select" : ""}>${options.options.map((option) => {
        const [optionValue, optionLabel] = Array.isArray(option) ? option : [option, option];
        return `<option value="${escapeHTML(optionValue)}"${String(optionValue) === String(value) ? " selected" : ""}>${escapeHTML(optionLabel)}</option>`;
      }).join("")}</select>${help}</label>`;
    }
    const type = options.type || "text";
    const constraints = `${type === "number" ? ` min="${options.min ?? ""}" max="${options.max ?? ""}"` : ""}`;
    return `<label class="${classes}">${escapeHTML(label)}<input type="${type}" data-path="${escapeHTML(path)}" value="${escapeHTML(value)}"${constraints}${required}>${help}</label>`;
  }
  function checkbox(label, path, value, description = "") {
    return `<label class="check-card"><input type="checkbox" data-path="${escapeHTML(path)}"${value ? " checked" : ""}><div>${escapeHTML(label)}${description ? `<span>${escapeHTML(description)}</span>` : ""}</div></label>`;
  }
  function heading(title, description, addAction = "") {
    return `<div class="section-heading-admin"><div><h2>${escapeHTML(title)}</h2><p>${escapeHTML(description)}</p></div><div>${addAction}<button class="admin-button admin-button--primary" type="button" data-save${dirty ? "" : " disabled"}>Save Changes</button></div></div>`;
  }
  function panel(title, description, body, action = "") {
    return `<section class="admin-panel"><div class="admin-panel-heading"><div><h3>${escapeHTML(title)}</h3>${description ? `<p>${escapeHTML(description)}</p>` : ""}</div>${action}</div>${body}</section>`;
  }
  function addButton(collection, label) {
    return `<button class="admin-button admin-button--small" type="button" data-action="add" data-collection="${escapeHTML(collection)}">+ ${escapeHTML(label)}</button>`;
  }
  function editorCard(collection, index, title, subtitle, body, badges = []) {
    const length = get(collection)?.length || 0;
    const open = collection === openCollection && index === openIndex;
    return `<div class="editor-row"><details class="editor-card"${open ? " open" : ""}><summary>
      <span class="editor-order">${String(index + 1).padStart(2, "0")}</span>
      <span class="editor-summary"><strong>${escapeHTML(title || "Untitled item")}</strong><small>${escapeHTML(subtitle || "")}</small></span>
      <span class="editor-badges">${badges.map((badge) => `<span class="editor-badge${badge.accent ? " editor-badge--accent" : ""}">${escapeHTML(badge.label)}</span>`).join("")}</span>
      </summary><div class="editor-body">${body}</div></details><span class="editor-actions">
        <button class="icon-button" type="button" data-action="move" data-collection="${escapeHTML(collection)}" data-index="${index}" data-direction="-1" aria-label="Move ${escapeHTML(title)} up"${index === 0 ? " disabled" : ""}>↑</button>
        <button class="icon-button" type="button" data-action="move" data-collection="${escapeHTML(collection)}" data-index="${index}" data-direction="1" aria-label="Move ${escapeHTML(title)} down"${index === length - 1 ? " disabled" : ""}>↓</button>
        <button class="icon-button" type="button" data-action="duplicate" data-collection="${escapeHTML(collection)}" data-index="${index}" aria-label="Duplicate ${escapeHTML(title)}">⧉</button>
        <button class="icon-button icon-button--danger" type="button" data-action="delete" data-collection="${escapeHTML(collection)}" data-index="${index}" data-title="${escapeHTML(title)}" aria-label="Delete ${escapeHTML(title)}">×</button>
      </span></div>`;
  }
  function listPanel(title, description, collection, renderer, addLabel) {
    const items = get(collection) || [];
    const body = `<div class="editor-list">${items.map((item, index) => renderer(item, index)).join("") || '<div class="empty-admin">No items yet. Use the add button to create the first one.</div>'}</div>`;
    return panel(title, description, body, addButton(collection, addLabel));
  }
  function mediaOptions(current) {
    const options = content.media.map((item) => [item.url, item.name]);
    if (current && !options.some(([url]) => url === current)) options.unshift([current, "Current image"]);
    if (!options.some(([url]) => url === "")) options.unshift(["", "No image / certificate"]);
    return options;
  }
  function imageField(label, path, current, uploadPath, removable = false) {
    const preview = current || "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=";
    return `<div class="image-editor field--full"><img src="${escapeHTML(preview)}" alt="Current selected image"><div>${field(label, path, current, { options: mediaOptions(current), image: true })}<div class="image-editor-actions"><button class="admin-button admin-button--small" type="button" data-action="upload-field" data-upload-path="${escapeHTML(uploadPath)}">Upload / Replace</button>${removable ? `<button class="admin-button admin-button--small admin-button--danger" type="button" data-action="remove-field" data-remove-path="${escapeHTML(path)}">Remove Logo</button>` : ""}</div></div></div>`;
  }

  function dashboardView() {
    const contactReady = Boolean(content.contact.email);
    const socialCount = (content.contact.socialLinks || []).filter((item) => item.visible !== false && item.url).length;
    return `${heading("Dashboard", "Manage every public page from one protected content source. Saved changes appear on the live website.")}
      <div class="stats-grid">
        <article class="stat-card"><span>Projects</span><strong>${content.projects.length}</strong><p>${content.projects.filter((item) => item.featured).length} featured on Home</p></article>
        <article class="stat-card"><span>Services</span><strong>${content.services.length}</strong><p>${content.services.filter((item) => item.enabled).length} enabled</p></article>
        <article class="stat-card"><span>Achievements</span><strong>${content.achievements.length}</strong><p>${content.achievements.filter((item) => item.enabled).length} visible</p></article>
        <article class="stat-card"><span>Testimonials</span><strong>${content.home.testimonials.length}</strong><p>${content.home.testimonials.filter((item) => item.enabled).length} visible</p></article>
        <article class="stat-card"><span>Brands</span><strong>${content.home.brands.length}</strong><p>${content.home.brands.filter((item) => item.visible !== false).length} visible</p></article>
        <article class="stat-card"><span>Current theme</span><strong style="font-size:18px">${escapeHTML(themeNames[content.global.theme])}</strong><p>Applied site-wide after saving</p></article>
      </div>
      ${panel("Manage website sections", "Open an editor to add, update, reorder or remove content.", `<div class="quick-grid">${[
        ["global", "Global Settings"], ["home", "Home Page"], ["portfolio", "Portfolio"], ["about", "About"],
        ["services", "Services"], ["achievements", "Awards & Achievements"], ["contact", "Contact"],
        ["media", "Images / Media"], ["seo", "SEO"], ["theme", "Theme Settings"]
      ].map(([target, label]) => `<button class="quick-card" type="button" data-go-route="${target}">${label}<span>→</span></button>`).join("")}</div>`)}
      ${panel("Contact & publishing status", "A quick check of the details currently used across the website.", `<div class="form-grid form-grid--three">
        <div class="check-card"><div>Email address<span>${contactReady ? escapeHTML(content.contact.email) : "Not configured"}</span></div></div>
        <div class="check-card"><div>WhatsApp<span>${content.contact.whatsappNumber ? "Configured" : "Not configured — editable in Contact"}</span></div></div>
        <div class="check-card"><div>Social links<span>${socialCount} configured; empty links remain hidden</span></div></div>
      </div>`)}`;
  }

  function globalView() {
    return `${heading("Global Settings", "Update shared branding, navigation, profile, contact information and defaults used across all six pages.")}
      ${panel("Website & logo", "These details update the header, footer and browser-facing brand copy.", `<div class="form-grid">
        ${field("Website name", "global.websiteName", content.global.websiteName, { required: true })}
        ${field("Logo text", "global.logoText", content.global.logoText)}
        ${field("Logo accent character", "global.logoAccent", content.global.logoAccent)}
        ${field("Brand subtitle", "global.brandSubtitle", content.global.brandSubtitle)}
        ${field("Positioning statement", "global.positioning", content.global.positioning, { full: true, help: "Separate each role with the | character." })}
        ${imageField("Profile photo", "global.profilePhoto", content.global.profilePhoto, "global.profilePhoto")}
        ${imageField("Logo image", "global.logoImage", content.global.logoImage || "", "global.logoImage", true)}
      </div>`)}
      ${panel("Site identity", "Browser title, favicon and default social sharing image.", `<div class="form-grid">${field("Site title", "global.siteTitle", content.global.siteTitle)}${field("Browser title", "global.browserTitle", content.global.browserTitle)}${imageField("Favicon", "global.favicon", content.global.favicon, "global.favicon")}${imageField("Default social sharing image", "global.ogImage", content.global.ogImage, "global.ogImage")}</div>`)}
      ${listPanel("Navigation items", "Add, edit, reorder or hide any visible navigation item.", "global.navigationItems", (item, index) => editorCard("global.navigationItems", index, item.label, item.destination, `<div class="form-grid">${field("Label", `global.navigationItems.${index}.label`, item.label)}${field("Destination", `global.navigationItems.${index}.destination`, item.destination)}${checkbox("Visible", `global.navigationItems.${index}.visible`, item.visible)}${checkbox("Open in new tab", `global.navigationItems.${index}.newTab`, item.newTab)}</div>`), "Add Navigation Item")}
      ${panel("Footer & default actions", "Shared closing copy and contact-button labels.", `<div class="form-grid">
        ${field("Default CTA text", "global.defaultCtaText", content.global.defaultCtaText)}
        ${field("Default CTA link", "global.defaultCtaLink", content.global.defaultCtaLink)}
        ${field("Footer description", "global.footerText", content.global.footerText, { textarea: true, full: true })}
        ${field("Footer bottom line", "global.footerBottom", content.global.footerBottom, { full: true })}${field("Footer social title", "global.footerSocialTitle", content.global.footerSocialTitle)}${field("Footer social description", "global.footerSocialDescription", content.global.footerSocialDescription, { textarea: true })}
      </div>`)}
      ${panel("Site-wide contact details", "The same values are available in the Contact editor and are saved in one place.", `<div class="form-grid">
        ${field("Email address", "contact.email", content.contact.email, { type: "email", required: true })}
        ${field("WhatsApp number", "contact.whatsappNumber", content.contact.whatsappNumber, { help: "Use international format. Leave blank until a real number is supplied." })}
        ${field("Website URL", "contact.website", content.contact.website)}
        ${field("Phone", "contact.phone", content.contact.phone)}
      </div>`)}
      ${listPanel("Social Links", "Manage the shared social profiles used by the footer and Contact page.", "contact.socialLinks", (item,index)=>editorCard("contact.socialLinks",index,item.label,item.url,`<div class="form-grid">${field("Platform",`contact.socialLinks.${index}.platform`,item.platform||"other")}${field("Label",`contact.socialLinks.${index}.label`,item.label)}${field("Icon",`contact.socialLinks.${index}.icon`,item.icon||"link",{options:[["linkedin","LinkedIn"],["instagram","Instagram"],["youtube","YouTube"],["facebook","Facebook"],["x","X"],["link","Link"]]})}${field("Profile URL",`contact.socialLinks.${index}.url`,item.url)}${checkbox("Visible",`contact.socialLinks.${index}.visible`,item.visible)}</div>`),"Add Social Profile")}
      ${field("Active theme", "global.theme", content.global.theme, { options: Object.entries(themeNames).map(([value, label]) => [value, label]) })}`;
  }

  function homeView() {
    const home = content.home;
    return `${heading("Home Page", "Edit the hero, statistics, service teasers, featured projects and homepage section copy.")}
      ${panel("Hero section", "The main introduction shown at the top of Home.", `<div class="form-grid">
        ${field("Full name", "home.name", home.name, { required: true })}${field("Professional title", "home.title", home.title)}
        ${field("Eyebrow / availability text", "home.eyebrow", home.eyebrow)}${field("Main tagline", "home.mainTagline", home.mainTagline)}
        ${field("Hero description", "home.heroDescription", home.heroDescription, { textarea: true, full: true })}
        ${field("Hero CTA text", "home.heroCtaText", home.heroCtaText)}${field("Hero CTA link", "home.heroCtaLink", home.heroCtaLink)}
        ${field("Secondary CTA text", "home.secondaryCtaText", home.secondaryCtaText)}${field("Secondary CTA link", "home.secondaryCtaLink", home.secondaryCtaLink)}
        ${field("Hero image overlay label", "home.heroImageOverlayLabel", home.heroImageOverlayLabel || "Focused on")}${field("Hero image overlay", "home.heroImageOverlay", home.heroImageOverlay)}${field("Hero support prefix", "home.heroSupportPrefix", home.heroSupportPrefix || "Supported by")}${field("Featured project badge", "home.featuredBadge", home.featuredBadge)}
      </div>`)}
      ${listPanel("Hero badges / labels", "Manage the small badges and supporting labels around the hero image.", "home.heroBadges", (item, index) => editorCard("home.heroBadges", index, item.text, item.icon, `<div class="form-grid">${field("Badge text", `home.heroBadges.${index}.text`, item.text)}${field("Icon", `home.heroBadges.${index}.icon`, item.icon, { options: iconOptions })}${checkbox("Visible", `home.heroBadges.${index}.visible`, item.visible)}</div>`), "Add Hero Badge")}
      ${listPanel("Homepage statistics", "Use the value and suffix together, for example 5+ or 10+.", "home.stats", (item, index) => editorCard("home.stats", index, item.label, item.number, `<div class="form-grid">${field("Prefix", `home.stats.${index}.prefix`, item.prefix || "")}${field("Number / value", `home.stats.${index}.number`, item.number)}${field("Suffix", `home.stats.${index}.suffix`, item.suffix || "")}${field("Statistic label", `home.stats.${index}.label`, item.label)}${field("Icon", `home.stats.${index}.icon`, item.icon || "", { options: [["","None"],...iconOptions] })}${checkbox("Visible", `home.stats.${index}.enabled`, item.enabled)}</div>`), "Add Statistic")}
      ${panel("Hero experience", "Choose which homepage statistic is shown beside the primary hero actions.", `<div class="form-grid">${field("Experience statistic", "home.experienceStatId", home.experienceStatId || "", { options: home.stats.map((stat) => [stat.id, stat.label]) })}</div>`)}
      ${panel("Service teasers", "Choose which enabled services appear on Home and optionally customize their teaser text.", `<div class="check-grid">${content.services.map((service) => `<div>${`<label class="check-card"><input type="checkbox" data-special="teaser" data-id="${escapeHTML(service.id)}"${home.serviceTeaserIds.includes(service.id) ? " checked" : ""}><div>${escapeHTML(service.name)}<span>${service.enabled ? "Enabled" : "Currently disabled"}</span></div></label>`}${field("Homepage teaser override", `home.serviceTeaserOverrides.${service.id}`, home.serviceTeaserOverrides?.[service.id] || service.shortDescription || "", { textarea: true, rows: 2 })}</div>`).join("")}</div>`)}
      ${panel("Featured projects", "Featured and enabled projects appear automatically in Home’s Selected Work section.", `<div class="check-grid">${content.projects.map((project) => `<label class="check-card"><input type="checkbox" data-special="featured" data-id="${escapeHTML(project.id)}"${project.featured ? " checked" : ""}><div>${escapeHTML(project.title)}<span>${project.enabled ? "Enabled" : "Hidden from Portfolio"}</span></div></label>`).join("")}</div>`)}
      ${panel("Homepage section text", "Use a new line in a heading to create a deliberate desktop line break.", `<div class="form-grid">
        ${field("Services eyebrow", "home.sections.servicesEyebrow", home.sections.servicesEyebrow)}${field("Services heading", "home.sections.servicesTitle", home.sections.servicesTitle)}
        ${field("Services introduction", "home.sections.servicesIntro", home.sections.servicesIntro, { textarea: true, full: true })}
        ${field("Work eyebrow", "home.sections.workEyebrow", home.sections.workEyebrow)}${field("Work heading", "home.sections.workTitle", home.sections.workTitle)}
        ${field("Work introduction", "home.sections.workIntro", home.sections.workIntro, { textarea: true, full: true })}
        ${field("Testimonials eyebrow", "home.sections.testimonialsEyebrow", home.sections.testimonialsEyebrow)}${field("Testimonials heading", "home.sections.testimonialsTitle", home.sections.testimonialsTitle)}
        ${field("Testimonials introduction", "home.sections.testimonialsIntro", home.sections.testimonialsIntro, { textarea: true, full: true })}
        ${field("Brands eyebrow", "home.sections.brandsEyebrow", home.sections.brandsEyebrow)}${field("Brands description", "home.sections.brandsDescription", home.sections.brandsDescription, { textarea: true })}
        ${field("CTA button text", "home.sections.ctaText", home.sections.ctaText)}${field("CTA destination", "home.sections.ctaLink", home.sections.ctaLink)}
        ${field("Contact eyebrow", "home.sections.contactEyebrow", home.sections.contactEyebrow)}${field("Contact heading", "home.sections.contactTitle", home.sections.contactTitle)}
        ${field("Contact introduction", "home.sections.contactIntro", home.sections.contactIntro, { textarea: true, full: true })}${field("Services CTA text", "home.sections.servicesCtaText", home.sections.servicesCtaText || "Explore All Services")}${field("Services CTA URL", "home.sections.servicesCtaLink", home.sections.servicesCtaLink || "services.html")}${field("Work CTA text", "home.sections.workCtaText", home.sections.workCtaText || "View Full Portfolio")}${field("Work CTA URL", "home.sections.workCtaLink", home.sections.workCtaLink || "portfolio.html")}
      </div>`)}
      ${listPanel("Client Feedback / Testimonials", "Manage all Home Page testimonials here. There is no fixed limit.", "home.testimonials", (item,index)=>editorCard("home.testimonials",index,item.clientName,item.company||item.designation||"",`<div class="form-grid">${field("Client name",`home.testimonials.${index}.clientName`,item.clientName)}${field("Company",`home.testimonials.${index}.company`,item.company||"")}${field("Designation",`home.testimonials.${index}.designation`,item.designation||"")}${field("Testimonial text",`home.testimonials.${index}.text`,item.text,{textarea:true,full:true})}${field("Rating",`home.testimonials.${index}.rating`,item.rating,{type:"number",min:0,max:5})}${field("Project / service",`home.testimonials.${index}.projectService`,item.projectService||"")}${imageField("Client photo",`home.testimonials.${index}.clientPhoto`,item.clientPhoto||"",`home.testimonials.${index}.clientPhoto`)}${checkbox("Visible",`home.testimonials.${index}.enabled`,item.enabled!==false)}</div>`,[{label:item.enabled!==false?"Visible":"Hidden"}]),"Add Testimonial")}
      ${listPanel("Brands & Collaborations", "Manage all Home Page brands and collaborations here. There is no fixed limit.", "home.brands", (item,index)=>editorCard("home.brands",index,item.name,item.category||item.year||"",`<div class="form-grid">${field("Brand name",`home.brands.${index}.name`,item.name)}${field("Website URL",`home.brands.${index}.websiteUrl`,item.websiteUrl||"")}${field("Description",`home.brands.${index}.description`,item.description||"",{textarea:true})}${field("Year",`home.brands.${index}.year`,item.year||"")}${field("Category",`home.brands.${index}.category`,item.category||"")}${imageField("Logo / image",`home.brands.${index}.logo`,item.logo||"",`home.brands.${index}.logo`)}${checkbox("Visible",`home.brands.${index}.visible`,item.visible!==false)}</div>`,[{label:item.visible!==false?"Visible":"Hidden"}]),"Add Brand")}
      ${panel("Closing CTA", "Edit the final Home Page call to action.", `<div class="form-grid">${field("CTA button text", "home.sections.ctaText", home.sections.ctaText)}${field("CTA destination", "home.sections.ctaLink", home.sections.ctaLink)}</div>`)}`;
  }

  function portfolioView() {
    return `${heading("Portfolio", "Add, edit, delete and reorder projects. Enabled projects appear in Portfolio; featured projects also appear on Home.")}
      ${panel("Portfolio page copy", "All visible portfolio section labels and CTA copy.", `<div class="form-grid">${field("Hero eyebrow", "pageContent.portfolio.heroEyebrow", content.pageContent.portfolio.heroEyebrow)}${field("Hero heading", "pageContent.portfolio.heroTitle", content.pageContent.portfolio.heroTitle, { full: true })}${field("Hero copy", "pageContent.portfolio.heroCopy", content.pageContent.portfolio.heroCopy, { textarea: true, full: true })}${field("Hero tags (one per line)", "pageContent.portfolio.heroTags", (content.pageContent.portfolio.heroTags||[]).join("\n"), { textarea: true, rows: 3, full: true })}${field("Library eyebrow", "pageContent.portfolio.libraryEyebrow", content.pageContent.portfolio.libraryEyebrow)}${field("Library title", "pageContent.portfolio.libraryTitle", content.pageContent.portfolio.libraryTitle)}${field("Library introduction", "pageContent.portfolio.libraryIntro", content.pageContent.portfolio.libraryIntro || "", { textarea: true, full: true })}${field("CTA eyebrow", "pageContent.portfolio.ctaEyebrow", content.pageContent.portfolio.ctaEyebrow)}${field("CTA title", "pageContent.portfolio.ctaTitle", content.pageContent.portfolio.ctaTitle)}${field("CTA description", "pageContent.portfolio.ctaDescription", content.pageContent.portfolio.ctaDescription, { textarea: true, full: true })}${field("CTA text", "pageContent.portfolio.ctaText", content.pageContent.portfolio.ctaText)}${field("CTA URL", "pageContent.portfolio.ctaLink", content.pageContent.portfolio.ctaLink)}</div>`)}
      ${listPanel("Portfolio categories", "Manage the category names used by filters and project assignments. Categories are repeatable and code-free.", "portfolioCategories", (item,index) => editorCard("portfolioCategories", index, item.label, item.id, `<div class="form-grid">${field("Category name", `portfolioCategories.${index}.label`, item.label, {required:true})}${field("Category ID", `portfolioCategories.${index}.id`, item.id, {required:true, help:"Keep IDs lowercase with hyphens; existing project assignments use this value."})}${checkbox("Visible in filters", `portfolioCategories.${index}.visible`, item.visible !== false)}</div>`, [{label:item.visible!==false?"Visible":"Hidden"}]), "Add Category")}
      ${listPanel("Project library", `${content.projects.length} total projects. Open a project to edit its complete details.`, "projects", (project, index) => editorCard("projects", index, project.title, project.type, `<div class="form-grid">
        ${field("Project title", `projects.${index}.title`, project.title, { required: true })}${field("Project type / label", `projects.${index}.type`, project.type)}
        ${field("Category", `projects.${index}.category`, project.category, { options: categoryOptions })}${field("Alt text", `projects.${index}.alt`, project.alt)}
        ${field("Short description", `projects.${index}.shortDescription`, project.shortDescription, { textarea: true, full: true })}
        ${field("Full project description", `projects.${index}.description`, project.description, { textarea: true, full: true })}
        ${field("Primary focus", `projects.${index}.focus`, project.focus, { full: true })}
        ${imageField("Project thumbnail", `projects.${index}.image`, project.image, `projects.${index}.image`)}
        ${field("Gallery URLs (comma separated)", `projects.${index}.gallery`, (project.gallery || []).join(", "), { help: "Use Media Library URLs or uploaded asset paths." })}
        ${checkbox("Featured on Home", `projects.${index}.featured`, project.featured)}${checkbox("Enabled on Portfolio", `projects.${index}.enabled`, project.enabled)}
      </div>`, [{ label: categoryOptions.find(([value]) => value === project.category)?.[1] || project.category }, ...(project.featured ? [{ label: "Featured", accent: true }] : [])]), "Add Project")}`;
  }

  function servicesView() {
    return `${heading("Services", "Manage the services shown on Home, Services and Contact. Disabled services remain saved but are hidden publicly.")}
      ${panel("Services page introduction", "Hero copy and the conversion approach section.", `<div class="form-grid">
        ${field("Hero heading", "pageContent.services.heroTitle", content.pageContent.services.heroTitle, { full: true })}${field("Hero copy", "pageContent.services.heroCopy", content.pageContent.services.heroCopy, { textarea: true, full: true })}${field("Hero tags (one per line)", "pageContent.services.heroTags", (content.pageContent.services.heroTags||[]).join("\n"), { textarea: true, rows: 3, full: true })}
        ${field("Approach heading", "pageContent.services.approachTitle", content.pageContent.services.approachTitle)}${field("Approach text", "pageContent.services.approachText", content.pageContent.services.approachText, { textarea: true })}${field("Approach steps (one per line)", "pageContent.services.approachSteps", (content.pageContent.services.approachSteps||[]).join("\n"), { textarea: true, rows: 4, full: true })}
      </div>`)}
      ${listPanel("Services & offerings", `${content.services.length} services. Pricing is optional; leave it blank to keep a quote/discussion CTA.`, "services", (service, index) => editorCard("services", index, service.name, service.shortDescription, `<div class="form-grid">
        ${field("Service name", `services.${index}.name`, service.name, { required: true })}${field("Icon", `services.${index}.icon`, service.icon, { options: iconOptions })}
        ${field("Short description", `services.${index}.shortDescription`, service.shortDescription, { textarea: true, full: true })}${field("Full description", `services.${index}.description`, service.description, { textarea: true, full: true })}
        ${field("Contact form label", `services.${index}.formLabel`, service.formLabel || service.name)}${field("Price", `services.${index}.price`, service.price || "")}
        ${field("Price suffix", `services.${index}.priceSuffix`, service.priceSuffix || "")}${field("CTA text", `services.${index}.cta`, service.cta || service.ctaText || "")}
        ${field("CTA URL", `services.${index}.ctaUrl`, service.ctaUrl || "")}${field("Home badge", `services.${index}.badge`, service.badge || "")}${field("Home CTA text", `services.${index}.homeCta`, service.homeCta || "Learn more")}${field("Home CTA URL", `services.${index}.homeCtaUrl`, service.homeCtaUrl || `services.html#${service.id}`)}${field("Features (comma separated)", `services.${index}.features`, (service.features || service.tags || []).join(", "), { help: "Saved as separate features." })}
        ${imageField("Service image", `services.${index}.image`, service.image || "", `services.${index}.image`)}${checkbox("Enabled on the public website", `services.${index}.enabled`, service.enabled)}
      </div>`, [{ label: service.enabled ? "Enabled" : "Disabled", accent: service.enabled }]), "Add Service")}`;
  }

  function achievementsView() {
    return `${heading("Awards & Achievements", "Add only genuine awards and professional milestones. Reorder, hide, edit or attach an optional image/certificate.")}
      ${panel("Achievements page copy", "All visible Achievements section labels and CTA copy.", `<div class="form-grid">${field("Hero eyebrow", "pageContent.achievements.heroEyebrow", content.pageContent.achievements.heroEyebrow)}${field("Hero heading", "pageContent.achievements.heroTitle", content.pageContent.achievements.heroTitle, { full: true })}${field("Hero copy", "pageContent.achievements.heroCopy", content.pageContent.achievements.heroCopy, { textarea: true, full: true })}${field("Hero tags (one per line)", "pageContent.achievements.heroTags", (content.pageContent.achievements.heroTags||[]).join("\n"), { textarea: true, rows: 3, full: true })}${field("Journey eyebrow", "pageContent.achievements.journeyEyebrow", content.pageContent.achievements.journeyEyebrow)}${field("Journey title", "pageContent.achievements.journeyTitle", content.pageContent.achievements.journeyTitle)}${field("Awards eyebrow", "pageContent.achievements.awardsEyebrow", content.pageContent.achievements.awardsEyebrow)}${field("Awards title", "pageContent.achievements.awardsTitle", content.pageContent.achievements.awardsTitle)}${field("Awards intro", "pageContent.achievements.awardsIntro", content.pageContent.achievements.awardsIntro, { textarea: true, full: true })}${field("CTA eyebrow", "pageContent.achievements.ctaEyebrow", content.pageContent.achievements.ctaEyebrow)}${field("CTA title", "pageContent.achievements.ctaTitle", content.pageContent.achievements.ctaTitle)}${field("CTA description", "pageContent.achievements.ctaDescription", content.pageContent.achievements.ctaDescription, { textarea: true, full: true })}${field("CTA text", "pageContent.achievements.ctaText", content.pageContent.achievements.ctaText)}${field("CTA URL", "pageContent.achievements.ctaLink", content.pageContent.achievements.ctaLink)}${field("Secondary CTA text", "pageContent.achievements.secondaryCtaText", content.pageContent.achievements.secondaryCtaText || "")}${field("Secondary CTA URL", "pageContent.achievements.secondaryCtaLink", content.pageContent.achievements.secondaryCtaLink || "")}</div>`)}
      ${listPanel("Recognitions & milestones", `${content.achievements.length} entries. No awards or certifications are generated automatically.`, "achievements", (item, index) => editorCard("achievements", index, item.recognition || item.title, item.title, `<div class="form-grid">
        ${field("Achievement / date title", `achievements.${index}.title`, item.title, { required: true })}${field("Recognition heading", `achievements.${index}.recognition`, item.recognition || "")}
        ${field("Date / year", `achievements.${index}.year`, item.year)}${field("Category", `achievements.${index}.category`, item.category)}
        ${field("Organization (optional)", `achievements.${index}.organization`, item.organization || "")}${field("Icon", `achievements.${index}.icon`, item.icon, { options: iconOptions })}
        ${field("Description", `achievements.${index}.description`, item.description, { textarea: true, full: true })}
        ${imageField("Optional certificate / image", `achievements.${index}.image`, item.image || "", `achievements.${index}.image`)}
        ${checkbox("Featured recognition", `achievements.${index}.featured`, item.featured)}${checkbox("Enabled on the public website", `achievements.${index}.enabled`, item.enabled)}
      </div>`, [{ label: item.enabled ? "Visible" : "Hidden" }, ...(item.featured ? [{ label: "Featured", accent: true }] : [])]), "Add Achievement")}
      <div class="security-note"><strong>Content integrity:</strong> empty organization and image fields stay empty. The website does not invent awards, certifications, employers or recognition.</div>`;
  }

  function aboutView() {
    const about = content.about;
    return `${heading("About", "Manage Usman’s introduction, story, career journey, mission, skills, focus areas and professional timeline.")}
      ${panel("Introduction & story", "Core About page copy.", `<div class="form-grid">
        ${field("Hero eyebrow", "pageContent.about.heroEyebrow", content.pageContent.about.heroEyebrow)}${field("Hero heading", "about.heroTitle", about.heroTitle, { full: true })}${field("Hero lead", "pageContent.about.heroLead", content.pageContent.about.heroLead || "", { textarea: true, full: true })}${field("Hero background tags (one per line)", "pageContent.about.heroTags", (content.pageContent.about.heroTags||[]).join("\n"), { textarea: true, rows: 3, full: true })}${field("Introduction", "about.introduction", about.introduction, { textarea: true, full: true })}${field("Story eyebrow", "pageContent.about.storyEyebrow", content.pageContent.about.storyEyebrow)}${field("Story heading", "pageContent.about.storyHeading", content.pageContent.about.storyHeading)}${field("Story intro", "pageContent.about.storyIntro", content.pageContent.about.storyIntro, { textarea: true })}${field("Timeline eyebrow", "pageContent.about.timelineEyebrow", content.pageContent.about.timelineEyebrow)}${field("Timeline heading", "pageContent.about.timelineHeading", content.pageContent.about.timelineHeading)}${field("Timeline intro", "pageContent.about.timelineIntro", content.pageContent.about.timelineIntro, { textarea: true })}${field("Skills eyebrow", "pageContent.about.skillsEyebrow", content.pageContent.about.skillsEyebrow)}${field("Skills heading", "pageContent.about.skillsHeading", content.pageContent.about.skillsHeading)}${field("Skills intro", "pageContent.about.skillsIntro", content.pageContent.about.skillsIntro, { textarea: true })}${field("Focus eyebrow", "pageContent.about.focusEyebrow", content.pageContent.about.focusEyebrow)}${field("Focus heading", "pageContent.about.focusHeading", content.pageContent.about.focusHeading)}${field("Focus intro", "pageContent.about.focusIntro", content.pageContent.about.focusIntro, { textarea: true })}
        ${field("Story lead", "about.storyLead", about.storyLead, { textarea: true, full: true })}${field("Full story", "about.story", about.story, { textarea: true, rows: 7, full: true, help: "Separate paragraphs with a blank line." })}
        ${field("Mission", "about.mission", about.mission, { textarea: true })}${field("What makes Usman different", "about.differentiator", about.differentiator, { textarea: true })}
        ${field("Differentiator description", "about.differentiatorDescription", about.differentiatorDescription, { textarea: true, full: true })}${field("Perspective eyebrow", "pageContent.about.perspectiveEyebrow", content.pageContent.about.perspectiveEyebrow || "")}${field("Perspective title / prefix", "pageContent.about.perspectivePrefix", content.pageContent.about.perspectivePrefix || "", { full: true })}${field("Perspective emphasis", "pageContent.about.perspectiveStrong", content.pageContent.about.perspectiveStrong || "")}${field("Perspective middle", "pageContent.about.perspectiveMiddle", content.pageContent.about.perspectiveMiddle || "")}${field("Perspective accent", "pageContent.about.perspectiveAccent", content.pageContent.about.perspectiveAccent || "")}${field("Perspective tags (one per line)", "pageContent.about.perspectiveTags", (content.pageContent.about.perspectiveTags||[]).join("\n"), { textarea: true, rows: 3, full: true })}${field("Goal eyebrow", "pageContent.about.journeyEyebrow", content.pageContent.about.journeyEyebrow || "")}${field("Goal text", "pageContent.about.journeyTitle", content.pageContent.about.journeyTitle || "", { textarea: true, full: true })}
        ${field("Career journey (one stage per line)", "about.careerJourney", about.careerJourney.join("\n"), { textarea: true, rows: 5, full: true })}
      </div>`)}
      ${listPanel("Professional timeline", "Add, edit, reorder or delete real career stages.", "about.timeline", (item, index) => editorCard("about.timeline", index, item.title, item.phase, `<div class="form-grid">${field("Phase", `about.timeline.${index}.phase`, item.phase)}${field("Title", `about.timeline.${index}.title`, item.title)}${field("Description", `about.timeline.${index}.description`, item.description, { textarea: true, full: true })}</div>`), "Add Timeline Stage")}
      ${listPanel("Skills & capability levels", "Percentages are displayed as accessible animated skill meters.", "about.skills", (item, index) => editorCard("about.skills", index, item.name, item.label, `<div class="form-grid form-grid--three">${field("Skill name", `about.skills.${index}.name`, item.name)}${field("Skill label", `about.skills.${index}.label`, item.label)}${field("Percentage", `about.skills.${index}.level`, item.level, { type: "number", min: 0, max: 100 })}</div>`), "Add Skill")}
      ${listPanel("Focus cards", "The principles and outcomes highlighted at the end of About.", "about.focusCards", (item, index) => editorCard("about.focusCards", index, item.title, item.description, `<div class="form-grid">${field("Card title", `about.focusCards.${index}.title`, item.title)}${field("Icon", `about.focusCards.${index}.icon`, item.icon, { options: iconOptions })}${field("Description", `about.focusCards.${index}.description`, item.description, { textarea: true, full: true })}</div>`), "Add Focus Card")}`;
  }

  function contactView() {
    return `${heading("Contact", "Centralize contact details, social profiles and every visible enquiry-form label.")}
      ${panel("Business information", "These values are reused across WhatsApp, email, website and social CTAs.", `<div class="form-grid">${field("Email address", "contact.email", content.contact.email, { type: "email", required: true })}${field("Phone", "contact.phone", content.contact.phone)}${field("WhatsApp number", "contact.whatsappNumber", content.contact.whatsappNumber)}${field("Website URL", "contact.website", content.contact.website)}${field("Default email subject", "contact.defaultEmailSubject", content.contact.defaultEmailSubject)}${field("Default email message", "contact.defaultEmailMessage", content.contact.defaultEmailMessage, { textarea: true, full: true })}${field("WhatsApp message template", "contact.whatsappTemplate", content.contact.whatsappTemplate, { textarea: true, full: true })}</div>`)}
      ${listPanel("Social profiles", "Add as many social profiles as needed. Empty or hidden profiles are not rendered publicly.", "contact.socialLinks", (item, index) => editorCard("contact.socialLinks", index, item.label, item.url, `<div class="form-grid">${field("Platform", `contact.socialLinks.${index}.platform`, item.platform || "other")}${field("Label", `contact.socialLinks.${index}.label`, item.label)}${field("Icon", `contact.socialLinks.${index}.icon`, item.icon || "link", { options: [["linkedin","LinkedIn"],["instagram","Instagram"],["youtube","YouTube"],["facebook","Facebook"],["x","X"],["link","Link"]] })}${field("Profile URL", `contact.socialLinks.${index}.url`, item.url)}${checkbox("Visible", `contact.socialLinks.${index}.visible`, item.visible)}</div>`), "Add Social Profile")}
      ${panel("Contact form", "All labels, placeholders, required states and feedback messages are editable.", `<div class="form-grid">${field("Heading", "contact.form.heading", content.contact.form.heading)}${field("Description", "contact.form.description", content.contact.form.description, { textarea: true })}${field("Name label", "contact.form.nameLabel", content.contact.form.nameLabel)}${field("Name placeholder", "contact.form.namePlaceholder", content.contact.form.namePlaceholder)}${checkbox("Name required", "contact.form.nameRequired", content.contact.form.nameRequired)}${field("Email label", "contact.form.emailLabel", content.contact.form.emailLabel)}${field("Email placeholder", "contact.form.emailPlaceholder", content.contact.form.emailPlaceholder)}${checkbox("Email required", "contact.form.emailRequired", content.contact.form.emailRequired)}${field("Project Type label", "contact.form.projectLabel", content.contact.form.projectLabel)}${checkbox("Project Type required", "contact.form.projectRequired", content.contact.form.projectRequired)}${field("Budget label", "contact.form.budgetLabel", content.contact.form.budgetLabel)}${checkbox("Budget required", "contact.form.budgetRequired", content.contact.form.budgetRequired)}${field("Message label", "contact.form.messageLabel", content.contact.form.messageLabel)}${field("Message placeholder", "contact.form.messagePlaceholder", content.contact.form.messagePlaceholder)}${checkbox("Message required", "contact.form.messageRequired", content.contact.form.messageRequired)}${field("Submit button", "contact.form.submitText", content.contact.form.submitText)}${field("Success message", "contact.form.successMessage", content.contact.form.successMessage, { textarea: true })}${field("Error message", "contact.form.errorMessage", content.contact.form.errorMessage, { textarea: true })}${field("Submit note", "contact.form.submitNote", content.contact.form.submitNote, { textarea: true, full: true })}${field("Budget options (one per line)", "contact.form.budgetOptions", (content.contact.form.budgetOptions||[]).join("\n"), { textarea: true, rows: 5, full: true })}</div>`)}
      ${panel("Contact page text", "Hero and page copy.", `<div class="form-grid">${field("Hero eyebrow", "pageContent.contact.heroEyebrow", content.pageContent.contact.heroEyebrow)}${field("Hero heading", "pageContent.contact.heroTitle", content.pageContent.contact.heroTitle, { full: true })}${field("Hero copy", "pageContent.contact.heroCopy", content.pageContent.contact.heroCopy, { textarea: true, full: true })}${field("Hero tags (one per line)", "pageContent.contact.heroTags", (content.pageContent.contact.heroTags||[]).join("\n"), { textarea: true, rows: 5, full: true })}${field("Hero WhatsApp CTA text", "pageContent.contact.heroWhatsappText", content.pageContent.contact.heroWhatsappText || "")}${field("Hero WhatsApp CTA link", "pageContent.contact.heroWhatsappLink", content.pageContent.contact.heroWhatsappLink || "")}${field("Hero brief CTA text", "pageContent.contact.heroBriefText", content.pageContent.contact.heroBriefText || "")}${field("Hero brief CTA link", "pageContent.contact.heroBriefLink", content.pageContent.contact.heroBriefLink || "")}${field("Methods description", "pageContent.contact.methodsDescription", content.pageContent.contact.methodsDescription || "", { textarea: true, full: true })}${field("Email card title", "pageContent.contact.emailCardTitle", content.pageContent.contact.emailCardTitle || "Email")}${field("Email card description", "pageContent.contact.emailCardDescription", content.pageContent.contact.emailCardDescription || "")}${field("Website card title", "pageContent.contact.websiteCardTitle", content.pageContent.contact.websiteCardTitle || "Website")}${field("Website card description", "pageContent.contact.websiteCardDescription", content.pageContent.contact.websiteCardDescription || "")}${field("WhatsApp card title", "pageContent.contact.whatsappCardTitle", content.pageContent.contact.whatsappCardTitle || "WhatsApp · Primary CTA")}${field("WhatsApp card description", "pageContent.contact.whatsappCardDescription", content.pageContent.contact.whatsappCardDescription || "")}${field("Social card title", "pageContent.contact.socialCardTitle", content.pageContent.contact.socialCardTitle || "Social")}${field("Social card description", "pageContent.contact.socialCardDescription", content.pageContent.contact.socialCardDescription || "")}${field("Contact methods eyebrow", "pageContent.contact.methodsEyebrow", content.pageContent.contact.methodsEyebrow)}${field("Contact methods title", "pageContent.contact.methodsTitle", content.pageContent.contact.methodsTitle)}${field("Visitor journey labels (one per line)", "pageContent.contact.visitorJourney", (content.pageContent.contact.visitorJourney||[]).join("\n"), { textarea: true, rows: 5, full: true })}</div>`)}
    `;
  }

  function seoView() {
    return `${heading("SEO", "Edit title, meta description, Open Graph fields and canonical URL for each public page.")}${Object.keys(content.seo||{}).map((page)=>panel(page[0].toUpperCase()+page.slice(1),"Search and social metadata.",`<div class="form-grid">${field("Page title",`seo.${page}.title`,content.seo[page].title)}${field("Meta description",`seo.${page}.description`,content.seo[page].description,{textarea:true,full:true})}${field("OG title",`seo.${page}.ogTitle`,content.seo[page].ogTitle)}${field("OG description",`seo.${page}.ogDescription`,content.seo[page].ogDescription,{textarea:true})}${imageField("OG image",`seo.${page}.ogImage`,content.seo[page].ogImage||"",`seo.${page}.ogImage`)}${field("Canonical URL",`seo.${page}.canonical`,content.seo[page].canonical||"")}</div>`)).join("")}`;
  }

  function mediaView() {
    return `${heading("Images / Media", "Upload optimized images, preview them, replace existing files and assign the active profile photo.", `<button class="admin-button admin-button--primary" type="button" data-action="upload-media">+ Upload Image</button>`)}
      ${panel("Media library", `${content.media.length} images. PNG, JPEG, WebP and SVG uploads are supported.`, `<div class="media-grid">${content.media.map((item, index) => `<article class="media-card">
        <div class="media-preview"><img src="${escapeHTML(item.url)}" alt="${escapeHTML(item.name)}" loading="lazy"><span class="media-kind">${escapeHTML(item.kind)}</span></div>
        <div class="media-card-body">${field("Image name", `media.${index}.name`, item.name)}${field("Media type", `media.${index}.kind`, item.kind, { options: [["profile", "Profile"], ["portfolio", "Portfolio"], ["service", "Service"], ["achievement", "Achievement"], ["testimonial", "Testimonial"], ["brand", "Brand"], ["favicon", "Favicon"], ["other", "Other"]] })}
          <div class="media-card-actions">
            <button class="admin-button admin-button--small" type="button" data-action="preview-media" data-id="${escapeHTML(item.id)}">Preview</button>
            <button class="admin-button admin-button--small" type="button" data-action="replace-media" data-id="${escapeHTML(item.id)}">Replace</button>
            <button class="admin-button admin-button--small" type="button" data-action="use-profile" data-id="${escapeHTML(item.id)}">Set as Profile</button>
            <button class="admin-button admin-button--small admin-button--danger" type="button" data-action="delete-media" data-id="${escapeHTML(item.id)}">Delete</button>
          </div>
        </div></article>`).join("")}</div>`)}`;
  }

  function themeView() {
    const themes = [
      { id: "charcoal-orange", colors: ["#0b0d10", "#171c22", "#ff7a1a", "#2c9fff"], description: "Warm orange highlights with electric-blue accents on a charcoal base." },
      { id: "midnight-blue", colors: ["#07101f", "#13253b", "#5aa8ff", "#68d3ff"], description: "Deep navy surfaces with crisp blue and cool-cyan highlights." },
      { id: "slate-purple", colors: ["#100d18", "#211b31", "#a875ff", "#8f9fff"], description: "Slate-violet surfaces with expressive purple and periwinkle accents." },
      { id: "emerald-dark", colors: ["#071410", "#142d24", "#2ec98e", "#55c9b0"], description: "Deep green surfaces with emerald and soft-mint highlights." },
      { id: "premium-navy-gold", colors: ["#111B26", "#F5A900", "#FFFFFF", "#F5F5F3"], description: "Light white and warm off-white surfaces with deep navy text and refined gold accents." }
    ];
    return `${heading("Theme Settings", "Choose one centralized theme for every public page. The selection goes live when you save.", `<button class="admin-button admin-button--primary" type="button" data-save${dirty ? "" : " disabled"}>Save Theme</button>`)}
      ${panel("Public website theme", `Current selection: ${themeNames[content.global.theme]}`, `<div class="theme-grid">${themes.map((theme) => `<button class="theme-card${content.global.theme === theme.id ? " is-active" : ""}" type="button" data-action="choose-theme" data-theme="${theme.id}"><div class="theme-swatches">${theme.colors.map((color) => `<span style="background:${color}"></span>`).join("")}</div><h3>${themeNames[theme.id]}</h3><p>${theme.description}</p>${content.global.theme === theme.id ? '<span class="theme-selected">Selected</span>' : ""}</button>`).join("")}</div>`)}
      <div class="security-note"><strong>Site-wide application:</strong> themes update shared backgrounds, surfaces, buttons, accents, cards, filters, forms and soft ambient glows on Home, Portfolio, About, Services, Achievements and Contact.</div>`;
  }

  function settingsView() {
    return `${heading("Admin Settings", "Change the protected Admin username and password. Passwords are stored as salted scrypt hashes, never as readable text.")}
      ${panel("Change login credentials", `Signed in as ${session.username}. Sessions expire automatically and are invalidated on logout.`, `<form class="credential-form" id="credential-form">
        <label>New username<input name="username" autocomplete="username" value="${escapeHTML(session.username)}" minlength="3" required></label>
        <label>Current password<input name="currentPassword" type="password" autocomplete="current-password" required></label>
        <label>New password<input name="newPassword" type="password" autocomplete="new-password" minlength="8" required></label>
        <label>Confirm new password<input name="confirmPassword" type="password" autocomplete="new-password" minlength="8" required></label>
        <button class="admin-button admin-button--primary" type="submit">Update Login Credentials</button>
      </form>`)}
      ${panel("Session & security", "Use a unique password with at least eight characters.", `<div class="security-note"><strong>CHANGE THIS PASSWORD BEFORE THE WEBSITE GOES LIVE.</strong><br>Never place Admin credentials in public JavaScript or page content. Logout destroys the current server-side session; changing credentials signs out other active sessions.</div><br><button class="admin-button admin-button--danger" type="button" id="settings-logout">Logout of Admin Panel</button>`)}`;
  }

  const views = { dashboard: dashboardView, global: globalView, home: homeView, portfolio: portfolioView, about: aboutView, services: servicesView, achievements: achievementsView, contact: contactView, seo: seoView, media: mediaView, theme: themeView, settings: settingsView };

  function updateDirtyUI() {
    document.querySelectorAll("[data-save]").forEach((button) => { button.disabled = !dirty || saving; });
    saveState.classList.toggle("is-dirty", dirty && !saving);
    saveState.classList.toggle("is-saving", saving);
    saveState.textContent = saving ? "Saving to persistent storage…" : dirty ? "Unsaved changes" : "All changes saved";
  }
  function markDirty() { dirty = true; updateDirtyUI(); }
  function render() {
    categoryOptions = (content.portfolioCategories || []).filter((item) => item.visible !== false).sort((a,b) => (Number(a.order)||0)-(Number(b.order)||0)).map((item) => [item.id, item.label]);
    routeTitle.textContent = routes[route];
    document.querySelectorAll("[data-route]").forEach((button) => button.classList.toggle("is-active", button.dataset.route === route));
    app.innerHTML = `<div class="route-enter">${views[route]()}</div>`;
    document.querySelector("#default-password-banner").hidden = !session.defaultPassword;
    updateDirtyUI();
  }
  function navigate(target) {
    if (!views[target]) return;
    route = target;
    openCollection = "";
    openIndex = -1;
    render();
    closeSidebar();
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  function validateContent() {
    if (!content.global.websiteName.trim() || !content.home.name.trim()) throw new Error("Website name and Home name are required.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(content.contact.email)) throw new Error("Enter a valid contact email address.");
    const categoryIds = (content.portfolioCategories || []).map((item) => String(item.id || "").trim()).filter(Boolean);
    if (new Set(categoryIds).size !== categoryIds.length) throw new Error("Portfolio category IDs must be unique.");
    for (const [label, items] of [["project", content.projects], ["service", content.services], ["achievement", content.achievements]]) {
      if (items.some((item) => !(item.title || item.name || "").trim())) throw new Error(`Every ${label} needs a title or name before saving.`);
    }
    for (const [label, url] of [["Website", content.contact.website], ...(content.contact.socialLinks||[]).map((item,i)=>[`Social profile ${i+1}`,item.url]), ...(content.global.navigationItems||[]).map((item,i)=>[`Navigation ${i+1}`,item.destination])]) {
      if (url && /^(https?:\/\/|mailto:|tel:|#|[a-z0-9-]+\.html)/i.test(String(url)) === false) throw new Error(`${label} contains an invalid URL.`);
    }
  }
  async function saveContent(successMessage = "Changes saved. The live website has been updated.") {
    if (saving) return false;
    try {
      validateContent();
      saving = true;
      updateDirtyUI();
      const result = await api("/api/admin/content", { method: "PUT", body: JSON.stringify({ content }) });
      content = result.content;
      dirty = false;
      saving = false;
      render();
      toast(successMessage);
      return true;
    } catch (error) {
      saving = false;
      updateDirtyUI();
      toast(error.message, true);
      return false;
    }
  }

  function createItem(collection) {
    if (collection === "portfolioCategories") return { id: uid("category"), label: "New Category", visible: true, order: (content.portfolioCategories?.length||0)+1 };
    if (collection === "projects") return { id: uid("project"), category: "website", type: "Website Design", title: "New Project", shortDescription: "Add a concise project summary.", description: "Add the complete project description and conversion strategy.", focus: "Describe the primary project focus.", image: "assets/projects/nexa-properties.svg", alt: "New project thumbnail", featured: false, enabled: true };
    if (collection === "services") return { id: uid("service"), name: "New Service", icon: "strategy", shortDescription: "Add a short service summary.", description: "Add the complete service description.", formLabel: "New Service", pricing: "", ctaText: "Discuss Your Project", tags: [], enabled: true };
    if (collection === "achievements") return { id: uid("achievement"), year: "2026", category: "Career milestone", title: "New Achievement", recognition: "", organization: "", description: "Add a genuine professional achievement or milestone.", image: "", icon: "milestone", featured: false, enabled: true };
    if (collection === "about.timeline") return { phase: "Career stage", title: "New Timeline Stage", description: "Describe this genuine professional stage." };
    if (collection === "about.skills") return { name: "New Skill", label: "Capability level", level: 50 };
    if (collection === "about.focusCards") return { title: "New Focus Card", description: "Describe this focus area.", icon: "strategy" };
    if (collection === "home.stats") return { number: "0+", label: "New Statistic" };
    if (collection === "contact.socialLinks") return { id: uid("social"), platform: "other", label: "New Social Profile", icon: "link", url: "", visible: true, order: (content.contact.socialLinks?.length||0)+1 };
    if (collection === "global.navigationItems") return { id: uid("nav"), label: "New Link", destination: "index.html", visible: true, order: (content.global.navigationItems?.length||0)+1, newTab: false };
    if (collection === "home.brands") return { id: uid("brand"), name: "New Brand", logo: "", websiteUrl: "", description: "", year: "", category: "", visible: true, order: (content.home.brands?.length||0)+1 };
    if (collection === "home.testimonials") return { id: uid("testimonial"), clientName: "New Client", clientPhoto: "", company: "", designation: "", text: "", rating: 5, projectService: "", date: "", verified: false, featured: false, enabled: true, order: (content.home.testimonials?.length||0)+1 };
    throw new Error("This item type cannot be added.");
  }
  function cleanupDeletedItem(collection, item) {
    if (collection === "services") {
      content.home.serviceTeaserIds = content.home.serviceTeaserIds.filter((id) => id !== item.id);
      delete content.home.serviceTeaserOverrides[item.id];
    }
  }
  function isUrlUsed(url) {
    const { media, ...publicContent } = content;
    let used = false;
    function walk(value) {
      if (used) return;
      if (typeof value === "string" && value === url) { used = true; return; }
      if (value && typeof value === "object") Object.values(value).forEach(walk);
    }
    walk(publicContent);
    return used;
  }
  function replaceUrl(value, oldUrl, newUrl) {
    if (Array.isArray(value)) { value.forEach((item, index) => { if (item === oldUrl) value[index] = newUrl; else replaceUrl(item, oldUrl, newUrl); }); }
    else if (value && typeof value === "object") Object.keys(value).forEach((key) => { if (value[key] === oldUrl) value[key] = newUrl; else replaceUrl(value[key], oldUrl, newUrl); });
  }

  function syncOrder(collection) {
    const items = get(collection);
    if (!Array.isArray(items)) return;
    items.forEach((item, index) => { if (item && typeof item === "object" && "order" in item) item.order = index + 1; });
  }

  async function handleAction(button) {
    const action = button.dataset.action;
    if (action === "add") {
      const collection = button.dataset.collection;
      const items = get(collection);
      items.push(createItem(collection));
      openCollection = collection;
      openIndex = items.length - 1;
      markDirty(); render();
    } else if (action === "move") {
      const collection = button.dataset.collection;
      const items = get(collection);
      const index = Number(button.dataset.index);
      const target = index + Number(button.dataset.direction);
      if (target < 0 || target >= items.length) return;
      [items[index], items[target]] = [items[target], items[index]];
      syncOrder(collection);
      openCollection = collection; openIndex = target;
      markDirty(); render();
    } else if (action === "duplicate") {
      const collection = button.dataset.collection; const items=get(collection); const index=Number(button.dataset.index); const copy=JSON.parse(JSON.stringify(items[index]));
      if(!copy) return; copy.id=uid(collection.replace(/.*\./,"item")); copy.name=copy.name ? `${copy.name} Copy` : copy.name; copy.title=copy.title ? `${copy.title} Copy` : copy.title; copy.label=copy.label ? `${copy.label} Copy` : copy.label;
      items.splice(index+1,0,copy); syncOrder(collection); openCollection=collection; openIndex=index+1; markDirty(); render();
    } else if (action === "delete") {
      const collection = button.dataset.collection;
      const items = get(collection);
      const index = Number(button.dataset.index);
      if (collection === "portfolioCategories") {
        const categoryId = items[index]?.id;
        if (content.projects.some((project) => project.category === categoryId)) { toast("This category is still assigned to one or more projects. Reassign those projects before deleting it.", true); return; }
      }
      if (!confirm(`Delete “${button.dataset.title}”? Save Changes to publish this deletion.`)) return;
      const [removed] = items.splice(index, 1);
      syncOrder(collection);
      cleanupDeletedItem(collection, removed);
      openCollection = ""; openIndex = -1;
      markDirty(); render();
    } else if (action === "choose-theme") {
      content.global.theme = button.dataset.theme;
      markDirty(); render();
    } else if (action === "upload-media") {
      pendingUpload = { type: "media" }; fileInput.value = ""; fileInput.click();
    } else if (action === "upload-field") {
      pendingUpload = { type: "field", path: button.dataset.uploadPath }; fileInput.value = ""; fileInput.click();
    } else if (action === "remove-field") {
      set(button.dataset.removePath, "");
      markDirty();
      render();
    } else if (action === "replace-media") {
      pendingUpload = { type: "replace", id: button.dataset.id }; fileInput.value = ""; fileInput.click();
    } else if (action === "preview-media") {
      const item = content.media.find((media) => media.id === button.dataset.id);
      if (!item) return;
      openMediaPreview(item);
    } else if (action === "use-profile") {
      const item = content.media.find((media) => media.id === button.dataset.id);
      if (!item) return;
      content.global.profilePhoto = item.url;
      markDirty();
      await saveContent("Profile photo updated across the public website.");
    } else if (action === "delete-media") {
      const index = content.media.findIndex((media) => media.id === button.dataset.id);
      if (index < 0) return;
      const item = content.media[index];
      if (isUrlUsed(item.url)) { toast("This image is still in use. Replace its page assignment before deleting it.", true); return; }
      if (!confirm(`Delete “${item.name}” from the media library?`)) return;
      content.media.splice(index, 1);
      markDirty();
      const saved = await saveContent("Media item deleted.");
      if (saved && item.url.startsWith("assets/uploads/")) {
        try { await api("/api/admin/delete-upload", { method: "POST", body: JSON.stringify({ url: item.url }) }); }
        catch (error) { toast(`Media record removed, but the file could not be deleted: ${error.message}`, true); }
      }
    }
  }

  function readFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error("The selected image could not be read."));
      reader.readAsDataURL(file);
    });
  }
  async function optimizeImage(file) {
    if (!/^image\/(png|jpeg|webp|svg\+xml)$/.test(file.type)) throw new Error("Choose a PNG, JPEG, WebP or SVG image.");
    if (file.size > 15 * 1024 * 1024) throw new Error("The original image must be smaller than 15 MB.");
    if (file.type === "image/svg+xml") {
      const text = await file.text();
      if (!text.trim().startsWith("<svg") && !text.includes("<svg")) throw new Error("The selected SVG is not valid.");
      return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(text)))}`;
    }
    const original = await readFile(file);
    const image = await new Promise((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error("The selected file is not a readable image."));
      element.src = original;
    });
    const maxDimension = 1800;
    const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext("2d", { alpha: true });
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/webp", 0.84);
  }
  fileInput.addEventListener("change", async () => {
    const file = fileInput.files?.[0];
    const operation = pendingUpload;
    pendingUpload = null;
    if (!file || !operation) return;
    try {
      toast("Optimizing and uploading image…");
      const data = await optimizeImage(file);
      const result = await api("/api/admin/upload", { method: "POST", body: JSON.stringify({ name: file.name.replace(/\.[^.]+$/, ""), data }) });
      if (operation.type === "media") {
        content.media.push(result.media);
      } else if (operation.type === "field") {
        content.media.push(result.media);
        set(operation.path, result.media.url);
      } else if (operation.type === "replace") {
        const item = content.media.find((media) => media.id === operation.id);
        if (!item) throw new Error("The media item no longer exists.");
        const oldUrl = item.url;
        result.media.id = item.id;
        result.media.name = item.name;
        Object.assign(item, result.media);
        replaceUrl(content, oldUrl, item.url);
      }
      markDirty();
      await saveContent("Image uploaded, optimized and saved to the live website.");
    } catch (error) { toast(error.message, true); }
    finally { fileInput.value = ""; }
  });

  app.addEventListener("input", (event) => {
    const input = event.target;
    if (input.matches("[data-path]")) {
      let value = input.type === "checkbox" ? input.checked : input.value;
      if (input.type === "number") value = Number(value);
      if (/\.tags$/.test(input.dataset.path)) value = input.value.split(",").map((tag) => tag.trim()).filter(Boolean);
      if (["about.careerJourney","contact.form.budgetOptions","pageContent.services.approachSteps","pageContent.contact.visitorJourney"].includes(input.dataset.path)) value = input.value.split("\n").map((stage) => stage.trim()).filter(Boolean);
      set(input.dataset.path, value);
      markDirty();
    } else if (input.dataset.special === "featured") {
      const project = content.projects.find((item) => item.id === input.dataset.id);
      if (project) { project.featured = input.checked; markDirty(); }
    } else if (input.dataset.special === "teaser") {
      const ids = content.home.serviceTeaserIds;
      if (input.checked && !ids.includes(input.dataset.id)) ids.push(input.dataset.id);
      if (!input.checked) content.home.serviceTeaserIds = ids.filter((id) => id !== input.dataset.id);
      markDirty();
    }
    if (input.matches("[data-image-select]")) {
      const preview = input.closest(".image-editor")?.querySelector("img");
      if (preview) preview.src = input.value;
    }
  });
  app.addEventListener("change", (event) => {
    if (event.target.matches("select[data-path], input[type='checkbox'][data-path], [data-special]")) event.target.dispatchEvent(new Event("input", { bubbles: true }));
  });

  document.addEventListener("click", async (event) => {
    const routeButton = event.target.closest("[data-route]");
    if (routeButton) { navigate(routeButton.dataset.route); return; }
    const goRoute = event.target.closest("[data-go-route]");
    if (goRoute) { navigate(goRoute.dataset.goRoute); return; }
    if (event.target.closest("[data-go-settings]")) { navigate("settings"); return; }
    if (event.target.closest("[data-save]")) { await saveContent(); return; }
    if (event.target.closest("#admin-logout, #settings-logout")) {
      if (dirty && !confirm("You have unsaved changes. Logout anyway?")) return;
      try { await api("/api/admin/logout", { method: "POST", body: "{}" }); } catch (_) {}
      location.replace("/admin/login.html"); return;
    }
    if (event.target.closest("[data-close-media]")) { closeMediaPreview(); return; }
    const actionButton = event.target.closest("[data-action]");
    if (actionButton) {
      event.preventDefault();
      try { await handleAction(actionButton); } catch (error) { toast(error.message, true); }
    }
  });

  app.addEventListener("submit", async (event) => {
    if (event.target.id !== "credential-form") return;
    event.preventDefault();
    const form = event.target;
    const username = form.elements.username.value.trim();
    const currentPassword = form.elements.currentPassword.value;
    const newPassword = form.elements.newPassword.value;
    const confirmPassword = form.elements.confirmPassword.value;
    if (newPassword !== confirmPassword) { toast("New password and confirmation do not match.", true); return; }
    const button = form.querySelector("button[type='submit']");
    button.disabled = true;
    try {
      const result = await api("/api/admin/credentials", { method: "POST", body: JSON.stringify({ username, currentPassword, newPassword }) });
      session = { ...session, username: result.user?.username || result.username || username, defaultPassword: result.defaultPassword };
      dirty = false;
      render();
      toast("Login credentials updated. Use the new username and password next time you sign in.");
    } catch (error) { toast(error.message, true); button.disabled = false; }
  });

  const sidebar = document.querySelector("#admin-sidebar");
  const overlay = document.querySelector("#sidebar-overlay");
  const menuButton = document.querySelector("#admin-menu-button");
  const mobileSidebar = window.matchMedia("(max-width: 960px)");
  function syncSidebarAccessibility() {
    const hidden = mobileSidebar.matches && !sidebar.classList.contains("is-open");
    sidebar.inert = hidden;
    if (mobileSidebar.matches) sidebar.setAttribute("aria-hidden", String(hidden));
    else sidebar.removeAttribute("aria-hidden");
  }
  function closeSidebar(restoreFocus = true) {
    const wasOpen = sidebar.classList.contains("is-open");
    sidebar.classList.remove("is-open"); overlay.hidden = true;
    menuButton.setAttribute("aria-expanded", "false");
    menuButton.setAttribute("aria-label", "Open Admin navigation");
    syncSidebarAccessibility();
    if (wasOpen && restoreFocus && mobileSidebar.matches) menuButton.focus();
  }
  menuButton.addEventListener("click", () => {
    const open = !sidebar.classList.contains("is-open");
    if (!open) { closeSidebar(); return; }
    sidebar.classList.add("is-open"); overlay.hidden = false;
    menuButton.setAttribute("aria-expanded", "true");
    menuButton.setAttribute("aria-label", "Close Admin navigation");
    syncSidebarAccessibility();
    sidebar.querySelector("[data-route].is-active")?.focus();
  });
  overlay.addEventListener("click", () => closeSidebar());
  window.addEventListener("resize", () => {
    if (!mobileSidebar.matches) { sidebar.classList.remove("is-open"); overlay.hidden = true; menuButton.setAttribute("aria-expanded", "false"); }
    syncSidebarAccessibility();
  });
  syncSidebarAccessibility();
  document.addEventListener("keydown", (event) => {
    if (!mediaModal.hidden) {
      if (event.key === "Escape") { event.preventDefault(); closeMediaPreview(); return; }
      if (event.key === "Tab") {
        const focusable = [...mediaModal.querySelectorAll(".media-modal-dialog button, .media-modal-dialog a[href], .media-modal-dialog [tabindex]:not([tabindex='-1'])")].filter((element) => !element.disabled && element.getClientRects().length);
        if (!focusable.length) return;
        const first = focusable[0], last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
      return;
    }
    if (event.key === "Escape") closeSidebar();
  });
  window.addEventListener("beforeunload", (event) => { if (dirty) { event.preventDefault(); event.returnValue = ""; } });

  async function initialize() {
    try {
      const [sessionResult, contentResult] = await Promise.all([api("/api/admin/session"), api("/api/admin/content")]);
      if (!sessionResult.ok && !sessionResult.authenticated) { location.replace("/admin/login.html"); return; }
      session = { ...sessionResult, username: sessionResult.user?.username || sessionResult.username };
      content = contentResult;
      const requestedRoute = location.hash.slice(1);
      if (views[requestedRoute]) route = requestedRoute;
      render();
    } catch (error) {
      app.innerHTML = `<div class="empty-admin">${escapeHTML(error.message)} <a href="/admin/login.html">Return to login</a>.</div>`;
    }
  }
  initialize();
})();
