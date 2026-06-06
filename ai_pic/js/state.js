/**
 * state.js — 全域狀態管理 & localStorage 持久化
 */
const AppState = {
  _data: null,

  // 預設狀態
  _defaults() {
    return {
      apiKey: '',
      apiKeyStatus: 'idle', // idle | validating | valid | invalid

      settingsOpen: false,

      // 五區選項 (key: data-group, value: selected tag data-value or array)
      tags: {
        // Subject
        roleType: '',
        ethnicity: '',
        age: '',
        bodyType: '',
        faceShape: '',
        makeup: [],
        hairLength: '',
        hairColor: '',
        hairStyle: [],

        // 體態細節
        bodyCurve: [],
        bust: [],
        waist: [],
        hips: [],

        // 五官細節
        skinQuality: '',
        eyeType: [],
        noseType: '',
        mouthType: '',
        chinType: '',
        eyebrowType: '',

        // Action
        pose: '',
        poseStyle: '',
        expression: [],
        hands: [],
        top: [],
        outerwear: [],
        bottom: [],
        shoes: '',
        lingerie: [],
        accessories: [],
        clothingStyle: '',

        // Background
        sceneType: '',
        atmosphere: [],
        foreground: [],

        // Lighting
        lightType: '',
        colorTone: '',
        skinTone: '',

        // Framing
        shotType: '',
        angle: '',
        composition: [],
        focalLength: '',
      },

      subjectFavorites: [],
      generationHistory: [],
    };
  },

  init() {
    const saved = this._load();
    if (saved) {
      this._data = { ...this._defaults(), ...saved };
      // 確保巢狀物件存在
      if (!this._data.tags) this._data.tags = this._defaults().tags;
      else {
        const defTags = this._defaults().tags;
        for (const k of Object.keys(defTags)) {
          if (this._data.tags[k] === undefined) this._data.tags[k] = defTags[k];
        }
      }
      if (!this._data.subjectFavorites) this._data.subjectFavorites = [];
      if (!this._data.generationHistory) this._data.generationHistory = [];
    } else {
      this._data = this._defaults();
    }
    // 若 API key 存在且狀態是 valid，恢復狀態
    if (this._data.apiKey && this._data.apiKeyStatus === 'valid') {
      // UI 會處理遮罩顯示
    }
  },

  // 取得完整狀態
  get() {
    return this._data;
  },

  // 取得 tags
  getTags() {
    return this._data.tags;
  },

  // 取得某個 tag group 的值
  getTag(group) {
    const val = this._data.tags[group];
    return val;
  },

  // 設定 tag (單選)
  setTag(group, value) {
    this._data.tags[group] = value;
    this._save();
    this._notify();
  },

  // 設定 tag (複選 toggle)
  toggleTag(group, value) {
    const arr = this._data.tags[group];
    if (!Array.isArray(arr)) return;
    const idx = arr.indexOf(value);
    if (idx >= 0) {
      arr.splice(idx, 1);
    } else {
      arr.push(value);
    }
    this._save();
    this._notify();
  },

  // 清除單一群組
  clearGroup(group) {
    const def = this._defaults().tags[group];
    this._data.tags[group] = Array.isArray(def) ? [] : '';
    this._save();
    this._notify();
  },

  // 清除所有 tags
  clearAllTags() {
    this._data.tags = JSON.parse(JSON.stringify(this._defaults().tags));
    this._save();
    this._notify();
  },

  // 設定整個 tags 物件 (還原用)
  setAllTags(tagsObj) {
    this._data.tags = JSON.parse(JSON.stringify(tagsObj));
    this._save();
    this._notify();
  },

  // API Key
  setApiKey(key) {
    this._data.apiKey = key;
    this._save();
  },

  setApiKeyStatus(status) {
    this._data.apiKeyStatus = status;
    this._save();
  },

  setSettingsOpen(val) {
    this._data.settingsOpen = val;
    this._save();
  },

  // 我的最愛
  getFavorites() {
    return this._data.subjectFavorites;
  },

  addFavorite(fav) {
    this._data.subjectFavorites.unshift(fav);
    if (this._data.subjectFavorites.length > 20) {
      this._data.subjectFavorites.pop();
    }
    this._save();
  },

  removeFavorite(id) {
    this._data.subjectFavorites = this._data.subjectFavorites.filter((f) => f.id !== id);
    this._save();
  },

  // 生成紀錄
  getHistory() {
    return this._data.generationHistory;
  },

  addHistory(record) {
    this._data.generationHistory.unshift(record);
    if (this._data.generationHistory.length > 10) {
      this._data.generationHistory.pop();
    }
    this._save();
  },

  removeHistory(id) {
    this._data.generationHistory = this._data.generationHistory.filter((h) => h.id !== id);
    this._save();
  },

  clearHistory() {
    this._data.generationHistory = [];
    this._save();
  },

  // 持久化
  _save() {
    try {
      localStorage.setItem('pic_app_state', JSON.stringify(this._data));
    } catch (e) {
      console.warn('State save failed:', e);
    }
  },

  _load() {
    try {
      const raw = localStorage.getItem('pic_app_state');
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  },

  // 通知 listeners (由 app.js 註冊)
  _listeners: [],
  onChange(fn) {
    this._listeners.push(fn);
  },
  _notify() {
    for (const fn of this._listeners) fn(this._data);
  },
};

// 初始化
AppState.init();
