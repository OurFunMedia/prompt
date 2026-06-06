/**
 * tags.js — 標籤選擇系統（單選/複選邏輯）
 */
const TagsSystem = {
  init() {
    document.querySelectorAll('.tags').forEach((container) => {
      const group = container.dataset.group;
      if (!group) return;
      const isSingle = container.dataset.single === 'true';

      // 點擊事件
      container.addEventListener('click', (e) => {
        const tag = e.target.closest('.tag');
        if (!tag) return;
        e.stopPropagation();

        const value = tag.dataset.value || tag.textContent.trim();

        if (isSingle) {
          this._selectSingle(container, group, tag, value);
        } else {
          this._toggleMulti(container, group, tag, value);
        }
      });
    });

    // 子選單展開/收合
    document.querySelectorAll('.sub-toggle').forEach((toggle) => {
      toggle.addEventListener('click', (e) => {
        e.stopPropagation();
        const targetId = toggle.dataset.target;
        const target = document.getElementById(targetId);
        if (!target) return;
        const isHidden = target.style.display === 'none';
        target.style.display = isHidden ? 'block' : 'none';
        const arrow = toggle.querySelector('.arrow');
        if (arrow) arrow.classList.toggle('open', isHidden);
      });
    });

    // Section 折疊
    document.querySelectorAll('.section-header[data-toggle]').forEach((header) => {
      header.addEventListener('click', (e) => {
        // 忽略按鈕點擊
        if (e.target.closest('.btn') || e.target.closest('.sub-toggle')) return;
        const section = header.closest('.section');
        const body = section.querySelector('.section-body');
        const arrow = header.querySelector('.collapse-arrow');
        if (!body || !arrow) return;
        const isHidden = body.classList.toggle('hidden');
        arrow.classList.toggle('collapsed', isHidden);
      });
    });
  },

  // 單選
  _selectSingle(container, group, selectedTag, value) {
    // 取消所有 active
    container.querySelectorAll('.tag.active').forEach((t) => t.classList.remove('active'));
    // 如果點擊的是已選中的，則取消選取
    if (AppState.getTag(group) === value) {
      selectedTag.classList.remove('active');
      AppState.setTag(group, '');
      return;
    }
    selectedTag.classList.add('active');
    AppState.setTag(group, value);
  },

  // 複選 toggle
  _toggleMulti(container, group, tag, value) {
    const isActive = tag.classList.toggle('active');
    AppState.toggleTag(group, value);
  },

  // 從 state 同步 UI (還原時使用)
  syncFromState() {
    const tags = AppState.getTags();
    document.querySelectorAll('.tags').forEach((container) => {
      const group = container.dataset.group;
      if (!group || tags[group] === undefined) return;
      const isSingle = container.dataset.single === 'true';

      container.querySelectorAll('.tag').forEach((tag) => {
        const val = tag.dataset.value || tag.textContent.trim();
        let shouldBeActive = false;
        if (isSingle) {
          shouldBeActive = tags[group] === val;
        } else {
          shouldBeActive = Array.isArray(tags[group]) && tags[group].includes(val);
        }
        tag.classList.toggle('active', shouldBeActive);
      });
    });
  },

  // 隨機選取某個 section 的 tag groups
  randomizeSection(sectionName) {
    const groups = this._getSectionGroups(sectionName);
    groups.forEach((group) => {
      const container = document.querySelector(`.tags[data-group="${group}"]`);
      if (!container) return;
      const isSingle = container.dataset.single === 'true';
      const tags = container.querySelectorAll('.tag');
      if (tags.length === 0) return;

      // 清除目前選取
      container.querySelectorAll('.tag.active').forEach((t) => t.classList.remove('active'));

      if (isSingle) {
        // 單選：隨機選一個（50% 機率不選）
        if (Math.random() > 0.15) {
          const randomTag = tags[Math.floor(Math.random() * tags.length)];
          const val = randomTag.dataset.value || randomTag.textContent.trim();
          randomTag.classList.add('active');
          AppState.setTag(group, val);
        } else {
          AppState.setTag(group, '');
        }
      } else {
        // 複選：隨機選 0-2 個
        const count = Math.floor(Math.random() * 3);
        const shuffled = [...tags].sort(() => Math.random() - 0.5);
        const selected = shuffled.slice(0, count);
        const values = [];
        selected.forEach((t) => {
          t.classList.add('active');
          values.push(t.dataset.value || t.textContent.trim());
        });
        AppState._data.tags[group] = values;
        AppState._save();
        AppState._notify();
      }
    });
  },

  // 取得某 section 下所有的 data-group
  _getSectionGroups(sectionName) {
    const sectionMap = {
      action: ['pose', 'poseStyle', 'expression', 'hands', 'top', 'outerwear', 'bottom', 'shoes', 'lingerie', 'accessories', 'clothingStyle'],
      background: ['sceneType', 'atmosphere', 'foreground'],
      lighting: ['lightType', 'colorTone', 'skinTone'],
      framing: ['shotType', 'angle', 'composition', 'focalLength'],
    };
    return sectionMap[sectionName] || [];
  },

  // 隨機全部五區
  randomizeAll() {
    // Subject 只隨機 roleType，保留我的最愛相關設定
    const subjectGroup = document.querySelector('.tags[data-group="roleType"]');
    if (subjectGroup) {
      subjectGroup.querySelectorAll('.tag.active').forEach((t) => t.classList.remove('active'));
      const tags = subjectGroup.querySelectorAll('.tag');
      if (tags.length > 0) {
        const randomTag = tags[Math.floor(Math.random() * tags.length)];
        const val = randomTag.dataset.value || randomTag.textContent.trim();
        randomTag.classList.add('active');
        AppState.setTag('roleType', val);
      }
    }
    // 其他四區
    this.randomizeSection('action');
    this.randomizeSection('background');
    this.randomizeSection('lighting');
    this.randomizeSection('framing');
  },

  // 為指定 section 的所有 tags 設定值 (我的最愛套用)
  applyTags(tagsObj) {
    AppState.setAllTags(tagsObj);
    this.syncFromState();
  },
};
