/**
 * api.js — API 呼叫（Key 驗證、圖片生成、AI 擴寫）
 * 使用 Agnes Image 2.1 Flash API
 * 文件：https://agnes-ai.com/doc/agnes-image-21-flash
 * 端點：https://apihub.agnes-ai.com/v1
 */
const ApiClient = {
  BASE: 'https://apihub.agnes-ai.com/v1',

  _headers(apiKey) {
    return {
      'Authorization': `Bearer ${apiKey || AppState.get().apiKey}`,
      'Content-Type': 'application/json',
    };
  },

  /**
   * 驗證 API Key 是否有效
   */
  async validateKey(apiKey) {
    try {
      AppState.setApiKeyStatus('validating');

      // 用列出模型或生成測試圖片來驗證
      const resp = await fetch(`${this.BASE}/models`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      });

      if (resp.ok) {
        AppState.setApiKey(apiKey);
        AppState.setApiKeyStatus('valid');
        return { valid: true };
      } else {
        AppState.setApiKeyStatus('invalid');
        const err = await resp.json().catch(() => ({}));
        return { valid: false, message: err.error?.message || `HTTP ${resp.status}` };
      }
    } catch (e) {
      AppState.setApiKeyStatus('invalid');
      return { valid: false, message: '網路連線失敗：' + e.message };
    }
  },

  /**
   * AI 擴寫提示詞 — 回傳 { english, chinese }
   */
  async expandPrompt(basePrompt) {
    const { apiKey, apiKeyStatus } = AppState.get();
    if (apiKeyStatus !== 'valid' || !apiKey) {
      throw new Error('請先設定並驗證 API Key');
    }

    const systemPrompt =
      '你是一個專業的 AI 繪圖提示詞擴寫專家。\n\n' +
      '## 任務\n' +
      '1. 將使用者的基礎提示詞擴寫為豐富、具體的英文 prompt（用於 AI 圖片生成）\n' +
      '2. 提供對應的中文翻譯，方便使用者理解內容\n\n' +
      '## 輸出格式（嚴格遵守，不要添加任何其他內容）\n' +
      '===ENGLISH===\n' +
      '[擴寫後的英文 prompt]\n' +
      '===CHINESE===\n' +
      '[對應的中文翻譯]\n\n' +
      '## 核心規則\n' +
      '1. 嚴格遵循原始內容——人物穿比基尼就不能有裙子，穿裙子就不能有褲子，所有細節忠於原意\n' +
      '2. ⚠️ 維持單一連貫場景——只描述一個姿勢、一個表情、一個構圖。不要列舉多種可能性，不要出現「或」「也可以」「同時」等字眼\n' +
      '3. 英文 prompt 風格為寫實攝影風格，自然光線，保留原始特徵\n' +
      '4. 英文 prompt 長度控制在 150-250 個英文單字之間，精簡但不失細節\n' +
      '5. 中文翻譯忠實反映英文 prompt 的內容\n\n' +
      '## 表情描寫（選一個角度具體描述）\n' +
      '- 微笑：抿嘴笑 / 露齒笑 / 微笑凝視 / 低頭淺笑\n' +
      '- 高冷：嚴肅凝視 / 冷漠表情 / 疏離感 / 沉思狀\n' +
      '- 甜美：可愛眨眼 / 歪頭微笑 / 無辜眼神 / 元氣滿滿\n' +
      '- 情緒：溫柔凝視 / 堅定眼神 / 若有所思 / 療癒笑容\n\n' +
      '## 姿勢描寫（選一個，不要列舉多種）\n' +
      '- 站姿：交叉雙臂 / 單手插兜側身 / 雙手自然下垂 / 一手扶腰 / 倚靠牆面 / 手扶欄桿\n' +
      '- 坐姿：側身坐 / 翹腿坐 / 慵懶靠坐 / 手撐下巴 / 盤腿坐\n' +
      '- 躺姿：側躺 / 平躺 / 慵懶伸展\n' +
      '- 動態：行走抓拍 / 轉身瞬間 / 回眸 / 漫步\n' +
      '- 蹲/跪：半蹲 / 單膝跪地 / 優雅跪坐\n' +
      '- 手部動作：撩發 / 托腮 / 插兜 / 輕觸嘴唇 / 整理衣領\n\n' +
      '## 拍攝角度與構圖（選一個）\n' +
      '- 角度：正面 / 側面 45° / 低角度仰拍 / 高角度俯拍 / 平視\n' +
      '- 景別：特寫 / 近景 / 中景 / 全身 / 七分身\n' +
      '- 構圖：置中 / 三分法則 / 對稱構圖 / 留白\n' +
      '- 焦段：廣角 / 50mm / 85mm / 135mm';

    const resp = await fetch(`${this.BASE}/chat/completions`, {
      method: 'POST',
      headers: this._headers(apiKey),
      body: JSON.stringify({
        model: 'agnes-2.0-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: '基礎提示詞：' + basePrompt },
        ],
        max_tokens: 800,
        temperature: 0.7,
      }),
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err.error?.message || `擴寫失敗 (HTTP ${resp.status})`);
    }

    const data = await resp.json();
    const content = data.choices?.[0]?.message?.content?.trim() || '';

    // 解析 ===ENGLISH=== ... ===CHINESE=== 格式
    const enMatch = content.match(/===ENGLISH===\s*([\s\S]*?)\s*===CHINESE===/);
    const zhMatch = content.match(/===CHINESE===\s*([\s\S]*?)$/);

    if (enMatch && zhMatch) {
      return {
        english: enMatch[1].trim() || basePrompt,
        chinese: zhMatch[1].trim() || '',
      };
    }

    // 若格式不符，整個當作英文，嘗試用 API 翻譯中文
    return { english: content || basePrompt, chinese: '' };
  },

  /**
   * 生成圖片
   */
  async generateImage(prompt, size, n = 1, negativePrompt) {
    const { apiKey, apiKeyStatus } = AppState.get();
    if (apiKeyStatus !== 'valid' || !apiKey) {
      throw new Error('請先設定並驗證 API Key');
    }

    const [width, height] = size.split('x').map(Number);

    const resp = await fetch(`${this.BASE}/images/generations`, {
      method: 'POST',
      headers: this._headers(apiKey),
      body: JSON.stringify({
        model: 'agnes-image-2.1-flash',
        prompt: prompt,
        n: n,
        size: `${width}x${height}`,
        ...(negativePrompt ? { negative_prompt: negativePrompt } : {}),
      }),
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err.error?.message || `生成失敗 (HTTP ${resp.status})`);
    }

    const data = await resp.json();
    const urls = (data.data || [])
      .map((item) => item.url || item.b64_json)
      .filter(Boolean);

    if (urls.length === 0) {
      throw new Error('API 回傳格式異常，無法取得圖片');
    }

    return urls;
  },
};
