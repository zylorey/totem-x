(function () {
  var KEY = '__itemkuModal';
  if (window[KEY]) {
    window[KEY].toggle();
    return;
  }

  var templates = [];
  var focusedEl = null;
  var showing = false;
  var closing = false;
  var statusTimeout = null;

  function isEditable(el) {
    if (!el || el === document.body || el === document.documentElement) return false;
    var tag = el.tagName.toLowerCase();
    return tag === 'input' || tag === 'textarea' || el.isContentEditable;
  }

  function hostContains(el) {
    while (el) {
      if (el === host) return true;
      el = el.parentNode || (el.getRootNode ? el.getRootNode().host : null);
    }
    return false;
  }

  function storeFocus() {
    var el = document.activeElement;
    if (el && isEditable(el) && !hostContains(el)) {
      focusedEl = el;
    } else {
      focusedEl = null;
    }
  }

  var host = document.createElement('div');
  host.id = 'itemku-modal-root';
  var root = host.attachShadow({ mode: 'closed' });

  var style = document.createElement('style');
  style.textContent = `
    :host {
      all: initial;
      position: fixed;
      inset: 0;
      z-index: 2147483647;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      font-size: 14px;
      line-height: 1.5;
      --bg: #ffffff;
      --bg-secondary: #f0f2f5;
      --bg-tertiary: #f8f9fa;
      --text: #1a1a2e;
      --text-secondary: #6b7280;
      --text-muted: #9ca3af;
      --border: #e5e7eb;
      --card-bg: #ffffff;
      --card-border: #e5e7eb;
      --card-shadow: 0 1px 2px rgba(0,0,0,0.04);
      --primary: #2563eb;
      --primary-hover: #1d4ed8;
      --danger: #dc2626;
      --danger-bg: #fee2e2;
      --success: #16a34a;
      --input-bg: #fafafa;
      --header-bg: #f8f9fa;
      --scrollbar: #d1d5db;
      --scrollbar-hover: #9ca3af;
    }
    .backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.3);
      animation: fadeIn 0.15s ease-out;
    }
    .backdrop.closing {
      animation: fadeOut 0.15s ease-in forwards;
    }
    .modal {
      position: fixed;
      top: 20px;
      right: 20px;
      transform: none;
      width: 440px;
      max-height: 85vh;
      background: var(--bg);
      border-radius: 20px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.15), 0 4px 16px rgba(0,0,0,0.06);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      animation: modalIn 0.2s ease-out;
    }
    .modal.closing {
      animation: modalOut 0.15s ease-in forwards;
    }
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes fadeOut {
      from { opacity: 1; }
      to { opacity: 0; }
    }
    @keyframes modalIn {
      from { opacity: 0; transform: translateY(-10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes modalOut {
      from { opacity: 1; transform: translateY(0); }
      to { opacity: 0; transform: translateY(-10px); }
    }
    .header {
      display: flex;
      align-items: center;
      padding: 14px 18px;
      background: var(--header-bg);
      border-bottom: 1px solid var(--border);
      user-select: none;
      flex-shrink: 0;
    }
    .header-title {
      flex: 1;
      font-size: 15px;
      font-weight: 600;
      color: var(--text);
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .header-logo {
      width: 20px;
      height: 20px;
      border-radius: 4px;
      flex-shrink: 0;
    }
    .header-actions {
      display: flex;
      gap: 2px;
      align-items: center;
    }
    .icon-btn {
      width: 32px;
      height: 32px;
      border: none;
      background: transparent;
      border-radius: 8px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--text-muted);
      font-size: 16px;
      transition: background 0.15s, color 0.15s;
      padding: 0;
    }
    .icon-btn:hover {
      background: var(--border);
      color: var(--text);
    }
    .body {
      flex: 1;
      overflow-y: auto;
      padding: 14px 18px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      scrollbar-width: thin;
      scrollbar-color: var(--scrollbar) transparent;
    }
    .body::-webkit-scrollbar { width: 6px; }
    .body::-webkit-scrollbar-thumb {
      background: var(--scrollbar);
      border-radius: 3px;
    }
    .body::-webkit-scrollbar-thumb:hover {
      background: var(--scrollbar-hover);
    }

    .template-card {
      display: flex;
      flex-direction: column;
      gap: 6px;
      padding: 10px 12px;
      background: var(--card-bg);
      border-radius: 14px;
      border: 1px solid var(--card-border);
      box-shadow: var(--card-shadow);
      transition: border-color 0.15s;
    }
    .template-card.dragging { opacity: 0.4; }
    .template-card.drag-over { border-top: 2px solid var(--primary); }
    .template-card.drag-over-bottom { border-bottom: 2px solid var(--primary); }
    .card-row {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .drag-handle {
      cursor: grab;
      font-size: 16px;
      color: var(--text-muted);
      user-select: none;
      padding: 0 2px;
      flex-shrink: 0;
      touch-action: none;
    }
    .drag-handle:active { cursor: grabbing; }
    .label-input {
      flex: 1;
      font-size: 13px;
      padding: 6px 10px;
      border: 1px solid var(--border);
      border-radius: 8px;
      outline: none;
      background: var(--input-bg);
      color: var(--text);
      transition: border-color 0.15s;
      min-width: 0;
    }
    .label-input:focus { border-color: var(--primary); }
    .label-input.invalid { border-color: var(--danger); }
    .card-btn {
      width: 28px;
      height: 28px;
      border: none;
      background: transparent;
      border-radius: 6px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--text-muted);
      font-size: 13px;
      transition: all 0.15s;
      flex-shrink: 0;
      padding: 0;
    }
    .card-btn:hover { color: var(--danger); background: var(--danger-bg); }

    .send-check-wrap {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      flex-shrink: 0;
      cursor: pointer;
    }
    .send-check {
      width: 14px;
      height: 14px;
      accent-color: var(--primary);
      cursor: pointer;
    }
    .text-area {
      font-size: 12px;
      padding: 6px 10px;
      border: 1px solid var(--border);
      border-radius: 8px;
      outline: none;
      resize: none;
      overflow: hidden;
      width: 100%;
      font-family: inherit;
      background: var(--input-bg);
      color: var(--text);
      transition: border-color 0.15s;
      box-sizing: border-box;
    }
    .text-area:focus { border-color: var(--primary); }
    .text-area.invalid { border-color: var(--danger); }
    .actions {
      display: flex;
      gap: 6px;
    }
    .btn {
      flex: 1;
      font-size: 12px;
      padding: 8px 14px;
      border-radius: 8px;
      border: 1px solid var(--border);
      background: var(--bg);
      cursor: pointer;
      color: var(--text);
      font-weight: 500;
      transition: all 0.15s;
    }
    .btn:hover { background: var(--bg-secondary); }
    .btn.primary {
      background: var(--primary);
      color: #fff;
      border-color: var(--primary);
    }
    .btn.primary:hover { background: var(--primary-hover); }
    .btn.success {
      background: var(--success);
      color: #fff;
      border-color: var(--success);
    }
    .btn.danger {
      background: var(--danger);
      color: #fff;
      border-color: var(--danger);
    }
  `;
  root.appendChild(style);

  var backdrop = document.createElement('div');
  backdrop.className = 'backdrop';
  root.appendChild(backdrop);

  var modal = document.createElement('div');
  modal.className = 'modal';

  var header = document.createElement('div');
  header.className = 'header';
  var headerTitle = document.createElement('span');
  headerTitle.className = 'header-title';
  var headerImg = document.createElement('img');
  headerImg.className = 'header-logo';
  headerImg.alt = '';
  headerImg.src = 'https://tokoku.itemku.com/static/icon/tokoku-favicon.png?v=1.203.2';
  headerTitle.appendChild(headerImg);
  headerTitle.appendChild(document.createTextNode('Itemku Templates'));
  header.appendChild(headerTitle);

  var headerActions = document.createElement('div');
  headerActions.className = 'header-actions';
  var closeBtn = document.createElement('button');
  closeBtn.className = 'icon-btn';
  closeBtn.id = 'close-btn';
  closeBtn.title = 'Close';
  closeBtn.textContent = '\u2715';
  headerActions.appendChild(closeBtn);
  header.appendChild(headerActions);
  modal.appendChild(header);

  var body = document.createElement('div');
  body.className = 'body';

  var list = document.createElement('div');
  list.style.cssText = 'display:flex;flex-direction:column;gap:8px;';
  body.appendChild(list);

  var actionRow = document.createElement('div');
  actionRow.className = 'actions';

  var addBtn = document.createElement('button');
  addBtn.className = 'btn';
  addBtn.textContent = '+ Add Template';

  var saveBtn = document.createElement('button');
  saveBtn.className = 'btn primary';
  saveBtn.textContent = 'Save Changes';

  actionRow.appendChild(addBtn);
  actionRow.appendChild(saveBtn);
  body.appendChild(actionRow);

  modal.appendChild(body);
  root.appendChild(modal);
  document.body.appendChild(host);

  function autoResize(el) {
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
  }

  function render() {
    list.innerHTML = '';
    for (var i = 0; i < templates.length; i++) {
      (function (idx) {
        var t = templates[idx];
        var card = document.createElement('div');
        card.className = 'template-card';

        var row = document.createElement('div');
        row.className = 'card-row';

        var dragHandle = document.createElement('span');
        dragHandle.className = 'drag-handle';
        dragHandle.draggable = true;
        dragHandle.textContent = '\u283F';

        var labelInput = document.createElement('input');
        labelInput.className = 'label-input';
        labelInput.type = 'text';
        labelInput.value = t.label;
        labelInput.placeholder = 'Menu label...';
        labelInput.addEventListener('input', function () { templates[idx].label = labelInput.value; });

        var sendCheck = document.createElement('input');
        sendCheck.type = 'checkbox';
        sendCheck.className = 'send-check';
        sendCheck.title = 'Auto-send after insert';
        sendCheck.checked = !!t.send;
        sendCheck.addEventListener('change', function () { templates[idx].send = sendCheck.checked; });

        var checkWrap = document.createElement('label');
        checkWrap.className = 'send-check-wrap';
        checkWrap.appendChild(sendCheck);

        var deleteBtn = document.createElement('button');
        deleteBtn.className = 'card-btn';
        deleteBtn.title = 'Delete';
        deleteBtn.textContent = '\u2715';
        deleteBtn.addEventListener('click', function () {
          templates.splice(idx, 1);
          render();
        });

        row.appendChild(dragHandle);
        row.appendChild(labelInput);
        row.appendChild(checkWrap);
        row.appendChild(deleteBtn);

        var textArea = document.createElement('textarea');
        textArea.className = 'text-area';
        textArea.value = t.text;
        textArea.placeholder = 'Template text...';
        textArea.rows = 1;
        requestAnimationFrame(function () { autoResize(textArea); });
        textArea.addEventListener('input', function () {
          templates[idx].text = textArea.value;
          autoResize(textArea);
        });

        card.appendChild(row);
        card.appendChild(textArea);
        list.appendChild(card);

        dragHandle.addEventListener('dragstart', function (e) {
          e.dataTransfer.effectAllowed = 'move';
          e.dataTransfer.setData('text/plain', idx.toString());
          requestAnimationFrame(function () { card.classList.add('dragging'); });
        });

        card.addEventListener('dragover', function (e) {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          if (!card.classList.contains('dragging')) {
            var rect = card.getBoundingClientRect();
            var after = (e.clientY - rect.top) > rect.height / 2;
            card.classList.toggle('drag-over', !after);
            card.classList.toggle('drag-over-bottom', after);
          }
        });

        card.addEventListener('dragleave', function () {
          card.classList.remove('drag-over', 'drag-over-bottom');
        });

        card.addEventListener('drop', function (e) {
          e.preventDefault();
          card.classList.remove('drag-over', 'drag-over-bottom');
          var from = parseInt(e.dataTransfer.getData('text/plain'), 10);
          if (isNaN(from)) return;
          var to = card.classList.contains('drag-over-bottom') ? idx + 1 : idx;
          if (from === to || from === to - 1) return;
          var moved = templates.splice(from, 1)[0];
          if (from < to) to--;
          templates.splice(to, 0, moved);
          render();
        });

        card.addEventListener('dragend', function () {
          var cards = list.querySelectorAll('.template-card');
          for (var j = 0; j < cards.length; j++) {
            cards[j].classList.remove('dragging', 'drag-over', 'drag-over-bottom');
          }
        });
      })(i);
    }
  }

  function load() {
    chrome.storage.local.get('templates', function (data) {
      if (data.templates) {
        templates = data.templates;
        render();
      } else {
        try {
          chrome.runtime.sendMessage({ action: 'getDefaults' }, function (response) {
            templates = response || [];
            render();
          });
        } catch (e) {
          templates = JSON.parse(JSON.stringify([{ id: 't1', label: '\uD83D\uDCE6 Ready Stock', text: 'Ready Stock, bisa langsung di order ya kak', send: false }]));
          render();
        }
      }
    });
  }

  function showStatus(msg, isError, duration) {
    if (statusTimeout) clearTimeout(statusTimeout);
    saveBtn.textContent = msg;
    saveBtn.className = 'btn';
    saveBtn.classList.add(isError ? 'danger' : 'success');
    statusTimeout = setTimeout(function () {
      saveBtn.textContent = 'Save Changes';
      saveBtn.className = 'btn primary';
      statusTimeout = null;
    }, duration);
  }

  function save() {
    var invalids = list.querySelectorAll('.label-input.invalid, .text-area.invalid');
    for (var i = 0; i < invalids.length; i++) {
      invalids[i].classList.remove('invalid');
    }

    if (templates.length === 0) {
      showStatus('Add a template first.', true, 1500);
      return;
    }

    var valid = [];
    for (var i = 0; i < templates.length; i++) {
      if (templates[i].label.trim() && templates[i].text.trim()) {
        valid.push(templates[i]);
      }
    }

    if (valid.length === 0) {
      var cards = list.querySelectorAll('.template-card');
      var firstInvalid = null;
      for (var i = 0; i < templates.length; i++) {
        var card = cards[i];
        if (!card) continue;
        if (!templates[i].label.trim()) {
          var li = card.querySelector('.label-input');
          if (li) {
            li.classList.add('invalid');
            if (!firstInvalid) firstInvalid = li;
          }
        }
        if (!templates[i].text.trim()) {
          var ta = card.querySelector('.text-area');
          if (ta) {
            ta.classList.add('invalid');
            if (!firstInvalid) firstInvalid = ta;
          }
        }
      }
      if (firstInvalid) firstInvalid.focus();
      showStatus('Need at least one valid template.', true, 1500);
      return;
    }

    try {
      chrome.storage.local.set({ templates: valid }, function () {
        try { chrome.runtime.sendMessage({ action: 'refreshMenus' }); } catch (e) {}
        templates = valid;
        render();
        showStatus('Saved!', false, 1500);
      });
    } catch (e) {
      showStatus('Error saving.', true, 1500);
    }
  }

  addBtn.addEventListener('click', function () {
    var id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    templates.push({ id: id, label: '', text: '', send: false });
    render();
    var cards = list.querySelectorAll('.template-card');
    if (cards.length > 0) {
      cards[cards.length - 1].scrollIntoView({ block: 'nearest' });
      var li = cards[cards.length - 1].querySelector('.label-input');
      if (li) li.focus();
    }
  });

  saveBtn.addEventListener('click', save);

  function closeModal() {
    if (closing) return;
    closing = true;
    modal.style.animation = '';
    modal.classList.add('closing');
    backdrop.classList.add('closing');
    modal.addEventListener('animationend', function () {
      host.style.display = 'none';
      showing = false;
      closing = false;
      modal.classList.remove('closing');
      backdrop.classList.remove('closing');
      if (focusedEl) focusedEl.focus();
    }, { once: true });
  }

  function showModal() {
    storeFocus();
    host.style.display = '';
    modal.style.left = '';
    modal.style.top = '';
    modal.style.right = '';
    modal.style.transform = '';
    modal.style.animation = '';
    showing = true;
    void modal.offsetWidth;
    modal.style.animation = 'modalIn 0.2s ease-out';
  }

  function toggleModal() {
    if (showing) {
      closeModal();
    } else {
      showModal();
    }
  }

  backdrop.addEventListener('click', closeModal);
  root.getElementById('close-btn').addEventListener('click', closeModal);

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && showing) closeModal();
  });

  document.addEventListener('focusin', function (e) {
    if (showing && isEditable(e.target) && !hostContains(e.target)) {
      focusedEl = e.target;
    }
  });

  load();
  showModal();

  window[KEY] = {
    show: showModal,
    hide: closeModal,
    toggle: toggleModal,
    destroy: function () {
      closeModal();
      setTimeout(function () {
        host.remove();
        delete window[KEY];
      }, 200);
    },
  };
})();
