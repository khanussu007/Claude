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
