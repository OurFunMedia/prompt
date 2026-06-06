/**
 * favorites.js — 我的最愛（主體 Subject 儲存/套用/刪除）
 */
const FavoritesManager = {
  // 儲存當前 Subject 選項為我的最愛
  saveCurrent() {
    const tags = AppState.getTags();
    const subjectData = {
      roleType: tags.roleType,
      ethnicity: tags.ethnicity,
      age: tags.age,
      bodyType: tags.bodyType,
      faceShape: tags.faceShape,
      skinQuality: tags.skinQuality,
      eyeType: [...(tags.eyeType || [])],
      noseType: tags.noseType,
      mouthType: tags.mouthType,
      chinType: tags.chinType,
      eyebrowType: tags.eyebrowType,
      bodyCurve: [...(tags.bodyCurve || [])],
      bust: [...(tags.bust || [])],
      waist: [...(tags.waist || [])],
      hips: [...(tags.hips || [])],
      makeup: [...(tags.makeup || [])],
      hairLength: tags.hairLength,
      hairColor: tags.hairColor,
      hairStyle: [...(tags.hairStyle || [])],
    };

    // 檢查是否有任何選項
    const hasAny = Object.values(subjectData).some((v) => {
      if (Array.isArray(v)) return v.length > 0;
      return v !== '';
    });
    if (!hasAny) {
      this._showToast('請先選擇主體選項再儲存', 'error');
      return;
    }

    // 自動命名
    const name = this._autoName(subjectData);

    const favorite = {
      id: 'fav_' + Date.now(),
      name: name,
      data: subjectData,
      preview: this._preview(subjectData),
      createdAt: new Date().toISOString(),
    };

    AppState.addFavorite(favorite);
    this._showToast('已儲存我的最愛：「' + name + '」', 'success');
    this.render();
  },

  // 套用我的最愛
  apply(id) {
    const favs = AppState.getFavorites();
    const fav = favs.find((f) => f.id === id);
    if (!fav) return;

    // 合併到目前 tags
    const tags = AppState.getTags();
    const merged = { ...tags, ...fav.data };
    TagsSystem.applyTags(merged);
    this._showToast('已套用：「' + fav.name + '」', 'info');
  },

  // 刪除我的最愛
  remove(id) {
    const favs = AppState.getFavorites();
    const fav = favs.find((f) => f.id === id);
    AppState.removeFavorite(id);
    this._showToast('已刪除：「' + (fav?.name || '') + '」', 'info');
    this.render();
  },

  // 渲染我的最愛列表
  render() {
    const bar = document.getElementById('fav-bar');
    if (!bar) return;
    const favs = AppState.getFavorites();

    if (favs.length === 0) {
      bar.innerHTML = '<span class="fav-empty">尚無我的最愛，選好主體後點擊 ⭐ 儲存</span>';
      return;
    }

    bar.innerHTML = favs
      .map(
        (f) => `
        <span class="fav-chip" data-id="${f.id}" title="${f.preview}">
          ⭐ ${f.name}
          <span class="fav-del" data-action="del" data-id="${f.id}">✕</span>
        </span>
      `
      )
      .join('');

    // 事件綁定
    bar.querySelectorAll('.fav-chip').forEach((chip) => {
      chip.addEventListener('click', (e) => {
        if (e.target.closest('.fav-del')) return;
        this.apply(chip.dataset.id);
      });
    });
    bar.querySelectorAll('.fav-del').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.remove(btn.dataset.id);
      });
    });
  },

  _autoName(data) {
    const parts = [];
    if (data.roleType) parts.push(data.roleType);
    if (data.age) parts.push(data.age);
    if (data.ethnicity) parts.push(data.ethnicity?.replace(/人$/, '') || '');
    const name = parts.filter(Boolean).join('·');
    return name || '未命名';
  },

  _preview(data) {
    const parts = [];
    if (data.roleType) parts.push(data.roleType);
    if (data.age) parts.push(data.age);
    if (data.ethnicity) parts.push(data.ethnicity);
    if (data.bodyType) parts.push(data.bodyType);
    if (data.makeup?.length) parts.push(data.makeup.join('/'));
    return parts.join(' | ');
  },

  _showToast(msg, type) {
    // 透過全域函式
    if (window.showToast) window.showToast(msg, type);
  },
};
