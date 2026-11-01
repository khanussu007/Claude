(() => {
  "use strict";
  const form = document.querySelector("#admin-login-form");
  const error = document.querySelector("#login-error");
  const button = document.querySelector("#login-button");

  async function request(url, options = {}) {
    const response = await fetch(url, {
      ...options,
      headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest", ...(options.headers || {}) }
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "The server could not complete the request.");
    return data;
  }

  // Same logo as the public site: uploaded logo image, otherwise the text mark.
  const logo = document.querySelector("#admin-logo");
  function renderLogo(global = {}) {
    const image = String(global.logoImage || "").trim();
    logo.replaceChildren();
    if (/^\/?assets\/[a-zA-Z0-9_/.-]+\.(?:svg|png|jpe?g|webp|gif)$/i.test(image)) {
      const img = document.createElement("img");
      img.src = image.startsWith("/") ? image : `/${image}`;
      img.alt = global.websiteName || "Logo";
      logo.classList.add("is-image");
      logo.appendChild(img);
    } else {
      logo.appendChild(document.createTextNode(global.logoText || "UK"));
      const accent = document.createElement("span");
      accent.textContent = global.logoAccent || ".";
      logo.appendChild(accent);
    }
    logo.classList.add("is-ready");
  }
  request("/api/public/content").then((content) => renderLogo(content.global)).catch(() => renderLogo());

  if (new URLSearchParams(location.search).get("expired")) {
    document.querySelector("#login-notice").textContent = "Your session expired due to inactivity. Please log in again.";
    history.replaceState(null, "", location.pathname);
  }

  request("/api/admin/session").then((result) => {
    if (result.authenticated || result.ok) location.replace("/admin");
  }).catch(() => {});

  document.querySelector("#toggle-password").addEventListener("click", (event) => {
    const input = form.elements.password;
    const show = input.type === "password";
    input.type = show ? "text" : "password";
    event.currentTarget.textContent = show ? "Hide" : "Show";
    event.currentTarget.setAttribute("aria-label", show ? "Hide password" : "Show password");
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    error.textContent = "";
    button.disabled = true;
    button.textContent = "Signing in…";
    try {
      await request("/api/admin/login", {
        method: "POST",
        body: JSON.stringify({ username: form.elements.username.value, password: form.elements.password.value })
      });
      location.replace("/admin");
    } catch (reason) {
      error.textContent = reason.message;
      form.elements.password.select();
      button.disabled = false;
      button.textContent = "Sign In Securely";
    }
  });
})();
