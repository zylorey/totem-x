const selector = ".flex.space-x-3.w-full";

function getStoreUrl(container) {
  const nameEl = container.querySelector('p.line-clamp-1');
  if (!nameEl) return null;
  const name = nameEl.textContent.trim();
  if (!name) return null;
  const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  return `https://www.itemku.com/t/${slug}`;
}

function applyButton() {
  const el = document.querySelector(selector);
  if (el && !el.classList.contains("itemku-redirect-btn")) {
    el.classList.add("itemku-redirect-btn");

    const url = getStoreUrl(el);
    if (!url) return;

    el.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      window.open(url, "_blank");
    });

  }
}

applyButton();

const observer = new MutationObserver(() => applyButton());
observer.observe(document.body, { childList: true, subtree: true });
