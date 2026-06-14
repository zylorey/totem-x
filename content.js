const selector = ".flex.space-x-3.w-full";
const PIN_DIALOG_SELECTOR = '.MuiDialog-paper';
const PIN_INPUT_SELECTOR = '.pincode-input-text';
const INACTIVITY_TEXT = 'Tidak ada aktifitas dalam 30 menit terakhir.';

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

function fillPin() {
  const dialog = document.querySelector(PIN_DIALOG_SELECTOR);
  if (!dialog) return;

  const hasInactivityText = dialog.textContent.includes(INACTIVITY_TEXT);
  if (!hasInactivityText) return;

  const inputs = dialog.querySelectorAll(PIN_INPUT_SELECTOR);
  if (inputs.length === 0) return;

  for (const input of inputs) {
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype, 'value'
    ).set;
    nativeInputValueSetter.call(input, '0');
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }
}

applyButton();
fillPin();

const observer = new MutationObserver(() => {
  applyButton();
  fillPin();
});
observer.observe(document.body, { childList: true, subtree: true });
