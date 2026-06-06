/**
 * history.js — 最近紀錄管理（最多 10 筆）
 */
const HistoryManager = {
  /**
   * 新增一筆生成紀錄
   */
  addRecord(prompt, imageUrls, size, tagsState) {
    // 如果 imageUrls 是 blob URL，轉為較短的 data URL 或保留
    const record = {
      id: 'hist_' + Date.now(),
      timestamp: new Date().toLocaleString('zh-TW', {
        hour12: false,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }),
      prompt: prompt,
      imageUrls: Array.isArray(imageUrls) ? imageUrls : [imageUrls],
      size: size,
      tagsState: JSON.parse(JSON.stringify(tagsState || AppState.getTags())),
    };

    AppState.addHistory(record);
    this.render();
  },

  /**
   * 還原某筆紀錄
   */
  restore(id) {
    const history = AppState.getHistory();
    const record = history.find((h) => h.id === id);
    if (!record) return;

    // 還原 tags
    if (record.tagsState) {
      TagsSystem.applyTags(record.tagsState);
    }

    // 還原提示詞
    const output = document.getElementById('prompt-output');
    if (output && record.prompt) {
      output.value = record.prompt;
      output.classList.remove('empty');
    }

    // 還原圖片
    if (record.imageUrls && record.imageUrls.length > 0) {
      this._showImages(record.imageUrls);
    }

    if (window.showToast) window.showToast('已還原紀錄', 'info');
  },

  /**
   * 刪除一筆紀錄
   */
  remove(id) {
    AppState.removeHistory(id);
    this.render();
  },

  /**
   * 清除全部
   */
  clearAll() {
    AppState.clearHistory();
    this.render();
    if (window.showToast) window.showToast('已清除所有紀錄', 'info');
  },

  /**
   * 渲染紀錄列表
   */
  render() {
    const list = document.getElementById('history-list');
    if (!list) return;
    const history = AppState.getHistory();

    if (history.length === 0) {
      list.innerHTML = '<div class="history-empty">暫無生成紀錄</div>';
      return;
    }

    list.innerHTML = history
      .map(
        (h) => `
        <div class="history-item" data-id="${h.id}">
          ${
            h.imageUrls && h.imageUrls.length > 0
              ? `<img class="thumb" src="${h.imageUrls[0]}" alt="thumb" loading="lazy">`
              : `<div class="thumb-placeholder">🖼️</div>`
          }
          <div class="info">
            <div class="time">${h.timestamp} · ${h.size || ''}</div>
            <div class="prompt-text">${this._escapeHtml(h.prompt)}</div>
          </div>
          <button class="history-del" data-action="del" data-id="${h.id}" title="刪除紀錄">✕</button>
        </div>
      `
      )
      .join('');

    // 事件：點擊還原
    list.querySelectorAll('.history-item').forEach((item) => {
      item.addEventListener('click', (e) => {
        if (e.target.closest('.history-del')) return;
        this.restore(item.dataset.id);
      });
    });

    // 事件：刪除
    list.querySelectorAll('.history-del').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.remove(btn.dataset.id);
      });
    });
  },

  _showImages(urls) {
    const area = document.getElementById('result-area');
    const downloadBtn = document.getElementById('btn-download');
    const regenerateBtn = document.getElementById('btn-regenerate');
    if (!area) return;

    const arr = Array.isArray(urls) ? urls : [urls];
    const gridClass = arr.length >= 3 ? 'grid-2' : 'grid-' + arr.length;
    area.innerHTML = `<div class="image-grid ${gridClass}">${
      arr.map((url, i) => `
        <div class="image-grid-item">
          <img src="${url}" alt="生成的圖片 ${i+1}" loading="lazy">
          <button class="btn btn-secondary btn-sm btn-dl-single" data-url="${url}" data-index="${i}">⬇️ 下載 ${i+1}</button>
        </div>
      `).join('')
    }</div>`;

    area.querySelectorAll('.btn-dl-single').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const a = document.createElement('a');
        a.href = btn.dataset.url;
        a.download = 'ai_prompt_' + Date.now() + '_' + btn.dataset.index + '.png';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      });
    });

    if (regenerateBtn) regenerateBtn.style.display = '';
  },

  _escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
  },
};
