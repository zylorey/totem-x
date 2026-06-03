const DEFAULT_TEMPLATES = [
  { id: 't1', label: '\uD83D\uDCE6 Ready Stock', text: 'Ready Stock, bisa langsung di order ya kak', send: false },
  { id: 't2', label: '\uD83D\uDCCB Pesanan Diproses', text: 'Pesanan sedang diproses, mohon ditunggu ya kak', send: false },
  { id: 't3', label: '\uD83D\uDE4F Terima Kasih Sudah Order', text: 'Terima kasih sudah order, kak \uD83D\uDE4F', send: false },
];

function injectModal(tabId) {
  chrome.scripting.executeScript({
    target: { tabId },
    files: ['modal.js'],
  }).catch(() => {});
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get('templates', (data) => {
    if (!data.templates) {
      chrome.storage.local.set({ templates: DEFAULT_TEMPLATES });
    }
  });
  createContextMenus();
});

function createContextMenus() {
  chrome.contextMenus.removeAll(() => {
    chrome.storage.local.get('templates', (data) => {
      const templates = data.templates || DEFAULT_TEMPLATES;
      for (const t of templates) {
        chrome.contextMenus.create({
          id: `template-${t.id}`,
          title: t.label,
          contexts: ['editable'],
        });
      }
    });
  });
}

chrome.action.onClicked.addListener((tab) => {
  if (tab?.id && tab.url?.startsWith('https://tokoku.itemku.com/')) {
    injectModal(tab.id);
  }
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (!tab?.url?.startsWith('https://tokoku.itemku.com/')) return;
  if (!info.menuItemId.startsWith('template-')) return;
  const templateId = info.menuItemId.replace('template-', '');
  chrome.storage.local.get('templates', (data) => {
    const templates = data.templates || DEFAULT_TEMPLATES;
    const template = templates.find((t) => t.id === templateId);
    if (!template || !tab || !tab.id) return;
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: insertText,
      args: [template.text, !!template.send],
    });
  });
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'getDefaults') {
    sendResponse(DEFAULT_TEMPLATES);
  } else if (msg.action === 'refreshMenus') {
    createContextMenus();
    sendResponse({ ok: true });
  }
});

function insertText(text, send) {
  const el = document.activeElement;
  if (!el) return;

  const setValue = (element, value) => {
    const proto = Object.getPrototypeOf(element);
    const descriptor = Object.getOwnPropertyDescriptor(proto, 'value');
    if (descriptor && descriptor.set) {
      descriptor.set.call(element, value);
    } else {
      element.value = value;
    }
    element.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
  };

  const tag = el.tagName.toLowerCase();
  if (tag === 'input' || tag === 'textarea') {
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? start;
    const before = el.value.substring(0, start);
    const after = el.value.substring(end);
    setValue(el, before + text + after);
    el.selectionStart = el.selectionEnd = start + text.length;
  } else if (el.isContentEditable) {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) {
      el.focus();
      sel?.removeAllRanges();
      const range = document.createRange();
      range.selectNodeContents(el);
      range.collapse(false);
      sel?.addRange(range);
    }
    const range = sel.getRangeAt(0);
    range.deleteContents();
    const textNode = document.createTextNode(text);
    range.insertNode(textNode);
    range.collapse(false);
    sel.removeAllRanges();
    sel.addRange(range);
    el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }

  if (!send) return;

  function dispatchEnter(target) {
    const opts = { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true, cancelable: true };
    target.dispatchEvent(new KeyboardEvent('keydown', opts));
    target.dispatchEvent(new KeyboardEvent('keypress', opts));
    target.dispatchEvent(new KeyboardEvent('keyup', opts));
  }

  dispatchEnter(el);

  setTimeout(() => {
    const selectors = [
      'button:has(#send-icon)',
      '[aria-label="Send"]',
      '[aria-label="Kirim"]',
      '[aria-label="Send message"]',
      'button[type="submit"]',
      '[data-testid="send"]',
      '[data-icon="send"]',
      '.send-btn',
      '#send',
    ];
    for (const sel of selectors) {
      const btn = document.querySelector(sel);
      if (btn && !btn.disabled && btn.offsetParent !== null) {
        btn.click();
        break;
      }
    }
  }, 50);
}
