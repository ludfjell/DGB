// Keeps the visitor on the same section when switching language.
// Without JavaScript the language links simply go to the other language's front page.
(() => {
  const links = document.querySelectorAll("a[data-sections]");
  const sections = [...document.querySelectorAll("[data-section]")];
  if (!links.length || !sections.length) return;

  const inView = (element) => {
    const rect = element.getBoundingClientRect();
    return rect.top < window.innerHeight && rect.bottom > 0;
  };

  // The section the visitor is reading: the one in the address if it is on screen,
  // otherwise the last section whose top has passed the upper third of the screen.
  const currentSection = () => {
    const target = location.hash && document.getElementById(decodeURIComponent(location.hash.slice(1)));
    const fromHash = target && target.closest("[data-section]");
    if (fromHash && inView(fromHash)) return fromHash.dataset.section;
    let current = null;
    for (const section of sections) {
      if (section.getBoundingClientRect().top <= window.innerHeight / 3) current = section.dataset.section;
    }
    return current;
  };

  const update = (link) => {
    const slugs = JSON.parse(link.dataset.sections);
    const key = currentSection();
    const base = link.href.split("#")[0];
    link.href = key && slugs[key] ? `${base}#${slugs[key]}` : base;
  };

  for (const link of links) {
    for (const type of ["click", "auxclick", "contextmenu"]) link.addEventListener(type, () => update(link));
  }
})();
