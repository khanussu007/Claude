(() => {
  "use strict";

  if (!window.__SITE_CONTENT__) {
    console.error("Website content was not provided by the server. Run the project with node server.js.");
    return;
  }

  const Site = window.Site = window.Site || {};
  Site.content = window.__SITE_CONTENT__;
  Site.categoryLabels = Object.fromEntries((Site.content.portfolioCategories || [
    { id: "website", label: "Website Design", visible: true, order: 1 },
    { id: "landing", label: "Landing Pages", visible: true, order: 2 },
    { id: "marketing", label: "Digital Marketing & Lead Generation", visible: true, order: 3 }
  ]).filter((item) => item.visible !== false).sort((a,b) => (Number(a.order)||0)-(Number(b.order)||0)).map((item) => [item.id, item.label]));

  Site.escapeHTML = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  })[character]);

  Site.safeHref = (value, fallback = "#") => {
    const href = String(value || "").trim();
    if (/^(https?:\/\/|mailto:|tel:|#|[a-z0-9-]+\.html(?:[?#]|$)|assets\/)/i.test(href)) return href;
    return fallback;
  };

  Site.safeImage = (value, fallback = "assets/images/usman-headshot-placeholder.webp") => {
    const url = String(value || "").trim();
    return /^assets\/[a-zA-Z0-9_/.-]+\.(?:svg|png|jpe?g|webp|gif)$/i.test(url) ? url : fallback;
  };

  Site.setHeading = (element, value) => {
    if (!element) return;
    const lines = String(value || "").split("\n").filter((line) => line.trim());
    element.replaceChildren();
    lines.forEach((line, index) => {
      if (index) element.appendChild(document.createElement("br"));
      const part = index ? document.createElement("span") : document.createTextNode(line);
      if (index) part.textContent = line;
      element.appendChild(part);
    });
  };

  Site.setButtonText = (element, value) => {
    if (!element) return;
    const textNode = [...element.childNodes].find((node) => node.nodeType === Node.TEXT_NODE && node.nodeValue.trim());
    if (textNode) textNode.nodeValue = ` ${value} `;
    else element.prepend(document.createTextNode(`${value} `));
  };

  Site.renderPositioning = (element, value) => {
    if (!element) return;
    const [first, second] = String(value || "Website Design | Lead Generation").split("|").map((part) => part.trim());
    element.replaceChildren();
    element.appendChild(document.createTextNode(first || "Website Design"));
    const separator = document.createElement("span");
    separator.setAttribute("aria-hidden", "true");
    separator.textContent = "|";
    const strong = document.createElement("strong");
    strong.textContent = second || "Lead Generation";
    element.append(separator, strong);
  };

  const icons = {
    monitor: '<rect x="3" y="4" width="18" height="16" rx="2.5"/><path d="M3 9h18M8 13h8M8 16h5"/>',
    layout: '<rect x="4" y="3" width="16" height="18" rx="2.5"/><path d="M8 7h8M8 11h5M8 16h8"/>',
    search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 4 4M7.5 10.5h6M10.5 7.5v6"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M3.5 19c.4-3.7 2.2-5.5 5.5-5.5s5.1 1.8 5.5 5.5M16 7h5m-2.5-2.5v5"/>',
    chart: '<path d="M4 19V9m5 10V5m6 14v-7m5 7V3"/><path d="m3 6 5-3 6 5 7-6"/>',
    automation: '<rect x="7" y="7" width="10" height="10" rx="3"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3M5 5l2 2m10 10 2 2m0-14-2 2M7 17l-2 2"/><path d="m10 12 1.3 1.3L14 10.5"/>',
    award: '<path d="M8 4h8v5a4 4 0 0 1-8 0V4Z"/><path d="M8 6H4v1a4 4 0 0 0 4 4m8-5h4v1a4 4 0 0 1-4 4M12 13v4m-4 4h8m-6-4h4l1 4H9l1-4Z"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="m4 7 8 6 8-6"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.3 2.5 3.5 5.5 3.5 9S14.3 18.5 12 21c-2.3-2.5-3.5-5.5-3.5-9S9.7 5.5 12 3Z"/>',
    link: '<path d="M10 13a5 5 0 0 0 7.5.5l2-2a5 5 0 0 0-7-7l-1.2 1.2M14 11a5 5 0 0 0-7.5-.5l-2 2a5 5 0 0 0 7 7l1.2-1.2"/>',
    spark: '<path d="m12 3 1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5L12 3Z"/><path d="m19 16 .7 2.3L22 19l-2.3.7L19 22l-.7-2.3L16 19l2.3-.7L19 16Z"/>'
  };

  Site.icon = (name, className = "") => {
    const paths = icons[name] || icons.spark;
    return `<svg${className ? ` class="${Site.escapeHTML(className)}"` : ""} aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
  };

  Site.socialIcon = (name) => {
    if (name === "linkedin") return '<svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor"><path d="M6.5 8.2H3.2V20h3.3V8.2ZM4.8 3A1.9 1.9 0 1 0 5 6.8 1.9 1.9 0 0 0 4.8 3ZM20.8 13.2c0-3.6-1.9-5.3-4.5-5.3-2 0-3 1.1-3.5 1.9V8.2H9.5V20h3.3v-5.8c0-1.5.3-3 2.2-3 1.8 0 1.9 1.7 1.9 3.1V20h3.9v-6.8Z"/></svg>';
    if (name === "instagram") return '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="4" stroke="currentColor" stroke-width="1.8"/><circle cx="17.4" cy="6.7" r="1.1" fill="currentColor"/></svg>';
    if (name === "youtube") return '<svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor"><path d="M21 8.2a2.7 2.7 0 0 0-1.9-1.9C17.4 5.8 12 5.8 12 5.8s-5.4 0-7.1.5A2.7 2.7 0 0 0 3 8.2 28 28 0 0 0 2.6 12c0 1.4.1 2.6.4 3.8a2.7 2.7 0 0 0 1.9 1.9c1.7.5 7.1.5 7.1.5s5.4 0 7.1-.5a2.7 2.7 0 0 0 1.9-1.9c.3-1.2.4-2.4.4-3.8s-.1-2.6-.4-3.8ZM10 15.4V8.6l5.5 3.4L10 15.4Z"/></svg>';
    if (name === "facebook") return '<svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor"><path d="M13.6 21v-8h2.7l.4-3h-3.1V8.1c0-.9.3-1.6 1.7-1.6h1.8V3.8c-.3 0-1.4-.1-2.6-.1-2.6 0-4.4 1.6-4.4 4.5V10H7.3v3h2.8v8h3.5Z"/></svg>';
    if (name === "x") return '<svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor"><path d="M5 4h4.2l3.2 4.6L16.2 4H19l-5.3 6.1L20 20h-4.2l-3.7-5.3L7.2 20H4.4l5.7-6.8L5 4Zm3.3 2 7.9 12h1.1L9.4 6H8.3Z"/></svg>';
    return Site.icon("link");
  };

  Site.forceVisible = (container = document) => {
    container.querySelectorAll(".reveal").forEach((element) => element.classList.add("is-visible"));
    container.querySelectorAll(".reveal-child").forEach((element) => element.classList.remove("reveal-child"));
  };

  function applyGlobals() {
    const content = Site.content;
    const global = content.global;
    const contact = content.contact;
    document.documentElement.dataset.theme = global.theme || "charcoal-orange";

    document.querySelectorAll(".brand-mark").forEach((mark) => {
      mark.replaceChildren();
      if (global.logoImage) {
        const image = document.createElement("img");
        image.src = Site.safeImage(global.logoImage, "");
        image.alt = `${global.websiteName || "Website"} logo`;
        image.loading = "eager";
        image.decoding = "async";
        mark.classList.add("brand-mark--image");
        mark.appendChild(image);
      } else {
        mark.classList.remove("brand-mark--image");
        mark.appendChild(document.createTextNode(global.logoText || "UK"));
        const accent = document.createElement("span");
        accent.textContent = global.logoAccent || ".";
        mark.appendChild(accent);
      }
    });
    document.querySelectorAll(".brand-name").forEach((brand) => {
      const small = brand.querySelector("small");
      brand.firstChild?.nodeType === Node.TEXT_NODE
        ? brand.firstChild.nodeValue = global.websiteName
        : brand.prepend(document.createTextNode(global.websiteName));
      if (small) small.textContent = global.brandSubtitle || "";
    });
    document.querySelectorAll("[data-footer-description]").forEach((element) => {
      element.textContent = global.footerText || "";
      element.style.whiteSpace = "pre-line";
    });
    document.querySelectorAll("[data-footer-bottom]").forEach((element) => { element.textContent = global.footerBottom || ""; });
    document.querySelectorAll("[data-footer-social-title]").forEach((element) => { element.textContent = global.footerSocialTitle || ""; });
    document.querySelectorAll("[data-footer-social-description]").forEach((element) => { element.textContent = global.footerSocialDescription || ""; });

    const footerNav = Array.isArray(global.navigationItems) ? [...global.navigationItems].filter((item) => item.visible !== false).sort((a,b) => (Number(a.order)||0)-(Number(b.order)||0)) : [];
    document.querySelectorAll("[data-footer-quick-links]").forEach((container) => {
      container.replaceChildren();
      footerNav.forEach((item) => {
        const link = document.createElement("a");
        link.href = Site.safeHref(item.destination, "index.html");
        link.textContent = item.label || "Link";
        if (item.newTab) { link.target = "_blank"; link.rel = "noopener noreferrer"; }
        container.appendChild(link);
      });
    });

    document.querySelectorAll("[data-footer-service-links]").forEach((container) => {
      container.replaceChildren();
      content.services.filter((service) => service.enabled !== false).sort((a,b) => (Number(a.order)||0)-(Number(b.order)||0)).forEach((service) => {
        const link = document.createElement("a");
        link.href = `services.html#${encodeURIComponent(service.id)}`;
        link.textContent = service.name;
        container.appendChild(link);
      });
    });

    document.querySelectorAll("[data-footer-email]").forEach((link) => {
      link.textContent = contact.email || "";
      link.href = contact.email ? `mailto:${contact.email}` : "#";
    });
    document.querySelectorAll("[data-footer-website]").forEach((link) => {
      const website = String(contact.website || "").trim();
      link.textContent = website.replace(/^https?:\/\//i, "").replace(/\/$/, "") || "Website";
      link.href = Site.safeHref(website, "#");
      if (/^https?:\/\//i.test(website)) { link.target = "_blank"; link.rel = "noopener noreferrer"; }
    });
    document.querySelectorAll("[data-footer-whatsapp]").forEach((link) => {
      const digits = String(contact.whatsappNumber || "").replace(/\D/g, "");
      link.href = digits ? `https://wa.me/${digits}` : "contact.html";
      link.target = "_blank";
      link.rel = "noopener noreferrer";
    });

    const navItems = Array.isArray(global.navigationItems) ? [...global.navigationItems].filter((item) => item.visible !== false).sort((a,b) => (Number(a.order)||0)-(Number(b.order)||0)) : [];
    const navContainer = document.querySelector(".primary-nav");
    if (navContainer && navItems.length) {
      navContainer.replaceChildren();
      navItems.forEach((item) => {
        const link = document.createElement("a");
        link.className = "nav-link";
        link.href = Site.safeHref(item.destination, "index.html");
        link.textContent = item.label || "Link";
        if (item.newTab) { link.target = "_blank"; link.rel = "noopener noreferrer"; }
        const current = location.pathname.endsWith(link.getAttribute("href")) || (location.pathname === "/" && link.getAttribute("href") === "index.html");
        if (current) { link.classList.add("is-active"); link.setAttribute("aria-current", "page"); }
        navContainer.appendChild(link);
      });
    }

    document.querySelectorAll("img[data-profile-image], img[src*='usman-headshot-placeholder']").forEach((image) => {
      image.dataset.profileImage = "true";
      image.src = Site.safeImage(global.profilePhoto);
      image.alt = `${global.websiteName} — professional profile`;
    });

    document.querySelectorAll("a.button[href='contact.html'], a.button[data-default-cta]").forEach((button) => {
      button.dataset.defaultCta = "true";
      Site.setButtonText(button, global.defaultCtaText || "Let’s Work Together");
      button.href = Site.safeHref(global.defaultCtaLink, "contact.html");
    });
    document.querySelectorAll(".header-cta").forEach((button) => {
      Site.setButtonText(button, global.headerCtaText || global.defaultCtaText || "Let’s Work Together");
      button.href = Site.safeHref(global.headerCtaLink || global.defaultCtaLink, "contact.html");
    });
    document.querySelectorAll("a[href^='mailto:']").forEach((link) => {
      if (!link.hasAttribute("data-contact-link")) link.href = `mailto:${contact.email}`;
    });

    const socials = Array.isArray(contact.socialLinks)
      ? [...contact.socialLinks].filter((item) => item.visible !== false && item.label && item.url).sort((a,b) => (Number(a.order)||0)-(Number(b.order)||0))
      : [];
    document.querySelectorAll("[data-footer-social-links], .footer-social .social-links").forEach((container) => {
      container.replaceChildren();
      socials.forEach((social) => {
        const link = document.createElement("a");
        const configured = /^https?:\/\//i.test(String(social.url || ""));
        link.href = configured ? social.url : "contact.html#social";
        link.setAttribute("aria-label", social.label);
        if (configured) {
          link.target = "_blank";
          link.rel = "noopener noreferrer";
        } else if (document.body.classList.contains("contact-page")) {
          link.dataset.contactLink = social.key;
        }
        link.innerHTML = Site.socialIcon(social.key);
        container.appendChild(link);
      });
    });
  }

  function applyIdentityAndSEO() {
    const global = Site.content.global || {};
    const pageKey = location.pathname.includes("portfolio") ? "portfolio" : location.pathname.includes("about") ? "about" : location.pathname.includes("services") ? "services" : location.pathname.includes("achievements") ? "achievements" : location.pathname.includes("contact") ? "contact" : "home";
    const seo = Site.content.seo?.[pageKey] || {};
    document.title = seo.title || global.browserTitle || global.siteTitle || global.websiteName || "Usman Khan";
    const setMeta = (name, value, attr="name") => {
      if (!value) return;
      let node = document.head.querySelector(`meta[${attr}="${name}"]`);
      if (!node) { node = document.createElement("meta"); node.setAttribute(attr, name); document.head.appendChild(node); }
      node.setAttribute("content", value);
    };
    setMeta("description", seo.description || "");
    setMeta("og:title", seo.ogTitle || seo.title || document.title, "property");
    setMeta("og:description", seo.ogDescription || seo.description || "", "property");
    const ogImage = Site.safeImage(seo.ogImage || global.ogImage, "");
    if (ogImage) setMeta("og:image", ogImage, "property");
    if (seo.canonical) {
      let canonical = document.head.querySelector("link[rel=canonical]");
      if (!canonical) { canonical = document.createElement("link"); canonical.rel = "canonical"; document.head.appendChild(canonical); }
      canonical.href = seo.canonical;
    }
    const favicon = Site.safeImage(global.favicon, "");
    if (favicon) {
      document.querySelectorAll("link[rel='icon']").forEach((node) => node.remove());
      const link = document.createElement("link"); link.rel = "icon"; link.href = favicon; document.head.appendChild(link);
    }
  }

  Site.applyGlobals = applyGlobals;
  Site.applyIdentityAndSEO = applyIdentityAndSEO;
  applyGlobals();
  applyIdentityAndSEO();

  async function refreshContent(version) {
    try {
      const response = await fetch("/api/public/content", { cache: "no-store" });
      if (!response.ok) return;
      const content = await response.json();
      if (content.meta?.version === Site.content.meta?.version) return;
      Site.content = content;
      Site.categoryLabels = Object.fromEntries((Site.content.portfolioCategories || []).filter((item) => item.visible !== false).sort((a,b) => (Number(a.order)||0)-(Number(b.order)||0)).map((item) => [item.id, item.label]));
      applyGlobals();
      applyIdentityAndSEO();
      document.dispatchEvent(new CustomEvent("site:content", { detail: { content, update: true, version } }));
    } catch (error) {
      console.warn("Live content refresh will retry automatically.", error.message);
    }
  }

  Site.refreshContent = refreshContent;
  if ("EventSource" in window) {
    const events = new EventSource("/api/public/events");
    events.addEventListener("content", (event) => {
      const data = JSON.parse(event.data || "{}");
      refreshContent(data.version);
    });
  } else {
    window.setInterval(() => refreshContent(), 15000);
  }
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") refreshContent();
  });
})();
