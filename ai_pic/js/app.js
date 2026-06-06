/**
 * app.js — 主應用邏輯、事件綁定、UI 整合
 */
(function () {
  'use strict';

  // ===== DOM References =====
  const $ = (id) => document.getElementById(id);
  const dom = {
    settingsPanel: $('settings-panel'),
    btnSettings: $('btn-settings'),
    btnSettingsClose: $('btn-settings-close'),
    apiKeyInput: $('api-key-input'),
    btnApiValidate: $('btn-api-validate'),
    btnApiClear: $('btn-api-clear'),
    apiStatus: $('api-status'),
    apiKeyMasked: $('api-key-masked'),
    apiStatusDot: $('api-status-dot'),

    promptOutput: $('prompt-output'),
    promptTranslation: $('prompt-translation'),
    translationContainer: $('translation-container'),
    btnCopy: $('btn-copy'),
    btnClearAll: $('btn-clear-all'),
    btnRandomAll: $('btn-random-all'),
    btnExpand: $('btn-expand'),
    btnExpandGenerate: $('btn-expand-generate'),

    genSize: $('gen-size'),

    btnGenerate: $('btn-generate'),
    resultArea: $('result-area'),
    btnDownload: $('btn-download'),
    btnRegenerate: $('btn-regenerate'),

    btnClearHistory: $('btn-clear-history'),
    historyList: $('history-list'),
  };

  // ===== Toast System =====
  window.showToast = function (message, type) {
    const container = $('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = 'toast ' + (type || 'info');
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s';
      setTimeout(() => toast.remove(), 300);
    }, 2500);
  };

  // ===== Initialize =====
  function init() {
    // 註冊 state change listener
    AppState.onChange(onStateChange);

    // 初始化子系統
    TagsSystem.init();
    FavoritesManager.render();
    HistoryManager.render();

    // 還原 UI 狀態
    restoreUIState();

    // 綁定事件
    bindEvents();

    // 初始提示詞
    updatePrompt();

    console.log('AI Prompt Studio 已初始化');
  }

  // ===== Restore UI State =====
  function restoreUIState() {
    const state = AppState.get();

    // API Key 狀態
    if (state.apiKey && state.apiKeyStatus === 'valid') {
      showApiKeyMasked(state.apiKey);
      setApiStatus('✓ API Key 已驗證', 'ok');
      dom.apiStatusDot.style.display = '';
      hideApiGuide(); // 已驗證的使用者不需要引導
    } else if (state.apiKey && state.apiKeyStatus === 'invalid') {
      setApiStatus('✗ API Key 無效，請重新輸入', 'err');
    }

    // 設定面板
    if (state.settingsOpen) {
      dom.settingsPanel.classList.add('open');
    }

    // 同步 tags UI
    TagsSystem.syncFromState();

    // 展開所有 section body (預設)
    document.querySelectorAll('.section-body').forEach((body) => body.classList.remove('hidden'));
    document.querySelectorAll('.collapse-arrow').forEach((a) => a.classList.remove('collapsed'));
  }

  // ===== Events Binding =====
  function bindEvents() {
    // --- Settings ---
    dom.btnSettings.addEventListener('click', toggleSettings);
    dom.btnSettingsClose.addEventListener('click', closeSettings);
    dom.btnApiValidate.addEventListener('click', handleValidateKey);
    dom.btnApiClear.addEventListener('click', handleClearKey);
    dom.apiKeyInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleValidateKey();
    });

    // --- Prompt Actions ---
    dom.btnCopy.addEventListener('click', copyPrompt);
    dom.btnClearAll.addEventListener('click', handleClearAll);
    dom.btnRandomAll.addEventListener('click', handleRandomAll);
    dom.btnExpand.addEventListener('click', handleExpand);
    dom.btnExpandGenerate.addEventListener('click', handleExpandAndGenerate);

    // 使用者手動編輯提示詞時，隱藏翻譯（不再對應）
    dom.promptOutput.addEventListener('input', () => {
      dom.translationContainer.style.display = 'none';
    });

    // --- Random buttons (per section) ---
    document.querySelectorAll('.js-btn-random').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const section = btn.dataset.section;
        if (section) TagsSystem.randomizeSection(section);
      });
    });

    // --- Favorites ---
    document.querySelector('.js-btn-fav')?.addEventListener('click', (e) => {
      e.stopPropagation();
      FavoritesManager.saveCurrent();
    });

    // --- Generate ---
    dom.btnGenerate.addEventListener('click', handleGenerate);
    dom.btnRegenerate.addEventListener('click', handleGenerate);
    dom.btnDownload.addEventListener('click', handleDownload);

    // --- History ---
    dom.btnClearHistory.addEventListener('click', () => HistoryManager.clearAll());
  }

  // ===== State Change Handler =====
  function onStateChange() {
    updatePrompt();
  }

  // ===== Settings =====
  function toggleSettings() {
    const isOpen = dom.settingsPanel.classList.toggle('open');
    AppState.setSettingsOpen(isOpen);
  }

  function closeSettings() {
    dom.settingsPanel.classList.remove('open');
    AppState.setSettingsOpen(false);
  }

  async function handleValidateKey() {
    const key = dom.apiKeyInput.value.trim();
    if (!key) {
      setApiStatus('請輸入 API Key', 'err');
      return;
    }

    dom.btnApiValidate.disabled = true;
    dom.btnApiValidate.textContent = '驗證中...';
    setApiStatus('⏳ 驗證中，請稍候...', 'idle');

    const result = await ApiClient.validateKey(key);

    dom.btnApiValidate.disabled = false;
    dom.btnApiValidate.textContent = '✓ 驗證';

    if (result.valid) {
      setApiStatus('✓ API Key 已驗證，可開始使用', 'ok');
      showApiKeyMasked(key);
      dom.apiStatusDot.style.display = '';
      dom.apiKeyInput.value = '';
      hideApiGuide();
      showToast('API Key 驗證成功', 'success');
    } else {
      setApiStatus('✗ ' + (result.message || 'API Key 無效'), 'err');
      dom.apiStatusDot.style.display = 'none';
      showToast('API Key 驗證失敗：' + (result.message || ''), 'error');
    }
  }

  function handleClearKey() {
    AppState.setApiKey('');
    AppState.setApiKeyStatus('idle');
    dom.apiKeyInput.value = '';
    dom.apiKeyMasked.style.display = 'none';
    dom.apiKeyMasked.innerHTML = '';
    dom.apiStatusDot.style.display = 'none';
    setApiStatus('API Key 已清除', 'idle');
    showApiGuide();
    showToast('API Key 已清除', 'info');
  }

  function showApiKeyMasked(key) {
    const masked = key.length > 8 ? key.slice(0, 4) + '…' + key.slice(-4) : '…' + key.slice(-4);
    dom.apiKeyMasked.style.display = 'block';
    dom.apiKeyMasked.innerHTML = `
      <div class="api-key-masked">
        <span>🔑</span>
        <span>${masked}</span>
        <span class="btn btn-ghost btn-xs" id="btn-show-key" style="margin-left:auto;">顯示</span>
      </div>
    `;
    const showBtn = dom.apiKeyMasked.querySelector('#btn-show-key');
    if (showBtn) {
      showBtn.addEventListener('click', () => {
        dom.apiKeyInput.value = key;
        showBtn.textContent = showBtn.textContent === '顯示' ? '隱藏' : '顯示';
      });
    }
  }

  function setApiStatus(msg, type) {
    dom.apiStatus.textContent = msg;
    dom.apiStatus.className = 'api-status ' + (type || 'idle');
  }

  function hideApiGuide() {
    const guide = document.getElementById('api-guide');
    if (guide) guide.style.display = 'none';
  }

  function showApiGuide() {
    const guide = document.getElementById('api-guide');
    if (guide) guide.style.display = '';
  }

  // ===== Prompt =====
  function updatePrompt() {
    const prompt = PromptBuilder.build();
    dom.promptOutput.value = prompt;
    dom.promptOutput.classList.toggle('empty', !prompt);
    // 標籤變更時自動隱藏中文翻譯（已不對應）
    dom.translationContainer.style.display = 'none';
  }

  function copyPrompt() {
    const text = dom.promptOutput.value.trim();
    if (!text) {
      showToast('尚無提示詞可複製', 'error');
      return;
    }
    navigator.clipboard.writeText(text).then(
      () => showToast('提示詞已複製', 'success'),
      () => showToast('複製失敗', 'error')
    );
  }

  function handleClearAll() {
    AppState.clearAllTags();
    TagsSystem.syncFromState();
    dom.promptOutput.value = '';
    dom.promptOutput.classList.add('empty');
    dom.translationContainer.style.display = 'none';
    showToast('已全部重設', 'info');
  }

  function handleRandomAll() {
    TagsSystem.randomizeAll();
    showToast('已隨機生成所有選項', 'info');
  }

  async function handleExpand() {
    const prompt = dom.promptOutput.value.trim();
    if (!prompt) {
      showToast('請先選擇標籤產生提示詞', 'error');
      return;
    }

    dom.btnExpand.disabled = true;
    dom.btnExpand.textContent = '擴寫中...';

    try {
      const result = await ApiClient.expandPrompt(prompt);
      dom.promptOutput.value = result.english;
      dom.promptOutput.classList.remove('empty');
      // 顯示中文翻譯
      if (result.chinese) {
        dom.promptTranslation.textContent = result.chinese;
        dom.translationContainer.style.display = 'block';
      } else {
        dom.translationContainer.style.display = 'none';
      }
      showToast('AI 擴寫完成', 'success');
    } catch (e) {
      showToast('擴寫失敗：' + e.message, 'error');
    } finally {
      dom.btnExpand.disabled = false;
      dom.btnExpand.textContent = '📝 AI 擴寫';
    }
  }

  async function handleExpandAndGenerate() {
    let prompt = dom.promptOutput.value.trim();
    if (!prompt) {
      showToast('請先選擇標籤產生提示詞', 'error');
      return;
    }

    // 先 AI 擴寫
    dom.btnExpandGenerate.disabled = true;
    dom.btnExpandGenerate.textContent = '擴寫中...';
    let englishPrompt = prompt;
    try {
      const result = await ApiClient.expandPrompt(prompt);
      englishPrompt = result.english;
      dom.promptOutput.value = englishPrompt;
      dom.promptOutput.classList.remove('empty');
      // 顯示中文翻譯
      if (result.chinese) {
        dom.promptTranslation.textContent = result.chinese;
        dom.translationContainer.style.display = 'block';
      } else {
        dom.translationContainer.style.display = 'none';
      }
    } catch (e) {
      showToast('擴寫失敗，使用原始提示詞：' + e.message, 'error');
      // 繼續用原始 prompt
    } finally {
      dom.btnExpandGenerate.disabled = false;
      dom.btnExpandGenerate.textContent = '📝✨ 擴寫並生成';
    }

    // 生成圖片（使用英文 prompt）
    await doGenerate(englishPrompt);
  }

  async function handleGenerate() {
    const prompt = dom.promptOutput.value.trim();
    if (!prompt) {
      showToast('請先選擇標籤產生提示詞', 'error');
      return;
    }
    await doGenerate(prompt);
  }

  async function doGenerate(prompt) {
    const size = dom.genSize.value;

    // 顯示 loading
    dom.resultArea.innerHTML = `
      <div class="spinner-wrap">
        <div class="spinner"></div>
        <span>🎨 正在生成圖片...</span>
      </div>
    `;
    dom.btnGenerate.disabled = true;
    dom.btnRegenerate.style.display = 'none';
    dom.btnDownload.style.display = 'none';

    try {
      const imageUrls = await ApiClient.generateImage(prompt, size, 1);

      // 顯示圖片網格
      const gridClass = imageUrls.length >= 3 ? 'grid-2' : 'grid-' + imageUrls.length;
      dom.resultArea.innerHTML = `<div class="image-grid ${gridClass}">${
        imageUrls.map((url, i) => `
          <div class="image-grid-item">
            <img src="${url}" alt="生成的圖片 ${i+1}" loading="lazy">
            <button class="btn btn-secondary btn-sm btn-dl-single" data-url="${url}" data-index="${i}">
              ⬇️ 下載 ${i+1}
            </button>
          </div>
        `).join('')
      }</div>`;

      // 綁定每張圖的下載事件
      dom.resultArea.querySelectorAll('.btn-dl-single').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const url = btn.dataset.url;
          const a = document.createElement('a');
          a.href = url;
          a.download = 'ai_prompt_' + Date.now() + '_' + btn.dataset.index + '.png';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          showToast('開始下載圖片', 'info');
        });
      });

      dom.btnRegenerate.style.display = '';

      // 儲存紀錄（傳入所有 URL）
      HistoryManager.addRecord(prompt, imageUrls, size, AppState.getTags());

      showToast(`成功生成 ${imageUrls.length} 張圖片`, 'success');
    } catch (e) {
      dom.resultArea.innerHTML = `<div class="error-msg">❌ ${e.message}</div>`;
      showToast('生成失敗：' + e.message, 'error');
    } finally {
      dom.btnGenerate.disabled = false;
    }
  }

  // ===== Download =====
  function handleDownload() {
    const url = dom.btnDownload.dataset.url;
    if (!url) return;

    // 建立臨時 a 標籤下載
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ai_prompt_' + Date.now() + '.png';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast('開始下載圖片', 'info');
  }

  // ===== 啟動 =====
  document.addEventListener('DOMContentLoaded', init);
})();
