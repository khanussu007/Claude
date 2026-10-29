(() => {
  "use strict";

  const skillPanel = document.querySelector("[data-skill-meters]");
  if (!skillPanel) return;

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const showSkills = () => skillPanel.classList.add("skills-are-visible");

  if (reducedMotion.matches || !("IntersectionObserver" in window)) {
    showSkills();
    return;
  }

  const skillObserver = new IntersectionObserver(
    (entries, observer) => {
      if (!entries[0].isIntersecting) return;
      showSkills();
      observer.disconnect();
    },
    { threshold: 0.22, rootMargin: "0px 0px -7% 0px" }
  );

  skillObserver.observe(skillPanel);
})();
