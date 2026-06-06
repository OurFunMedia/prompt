/**
 * prompt.js — 提示詞組合邏輯
 */
const PromptBuilder = {
  // 組合對應表：tag group → 中文描述前綴
  _prefixMap: {
    roleType: '',
    ethnicity: '',
    age: '',
    bodyType: '',
    faceShape: '',
    makeup: '妝容：',
    hairLength: '',
    hairColor: '',
    hairStyle: '',

    pose: '',
    expression: '',
    hands: '',
    top: '身穿',
    bottom: '下身',
    shoes: '腳穿',
    accessories: '佩戴',

    sceneType: '場景：',
    atmosphere: '',
    foreground: '',

    lightType: '光線：',
    colorTone: '色調：',
    skinTone: '膚色：',

    shotType: '',
    angle: '',
    composition: '',
    focalLength: '',
  },

  // 哪些 group 需要跳過空值
  _skipEmpty: true,

  /**
   * 從目前 state 組合提示詞
   * @returns {string} 組合後的中文提示詞
   */
  build() {
    const tags = AppState.getTags();
    const parts = [];

    // --- Subject ---
    const subjectParts = [];
    // 年齡
    if (tags.age) subjectParts.push(tags.age);
    // 種族
    if (tags.ethnicity) subjectParts.push(tags.ethnicity);
    // 角色類型
    if (tags.roleType) subjectParts.push(tags.roleType + '氣質');
    // 膚質
    if (tags.skinQuality) subjectParts.push(tags.skinQuality + '肌膚');
    // 臉型
    if (tags.faceShape) subjectParts.push(tags.faceShape);
    // 眼型
    if (tags.eyeType && tags.eyeType.length > 0) {
      subjectParts.push(tags.eyeType.join('、') + '的雙眼');
    }
    // 鼻型
    if (tags.noseType) subjectParts.push(tags.noseType);
    // 嘴型
    if (tags.mouthType) subjectParts.push(tags.mouthType);
    // 下巴
    if (tags.chinType) subjectParts.push(tags.chinType);
    // 眉毛
    if (tags.eyebrowType) subjectParts.push(tags.eyebrowType);
    // 身形
    if (tags.bodyType) subjectParts.push(tags.bodyType + '身材');
    // 體態曲線
    if (tags.bodyCurve && tags.bodyCurve.length > 0) {
      subjectParts.push(tags.bodyCurve.join('、') + '曲線');
    }
    // 胸型
    if (tags.bust && tags.bust.length > 0) {
      subjectParts.push(tags.bust.join('、'));
    }
    // 腰腹
    if (tags.waist && tags.waist.length > 0) {
      subjectParts.push(tags.waist.join('、'));
    }
    // 臀部
    if (tags.hips && tags.hips.length > 0) {
      subjectParts.push(tags.hips.join('、'));
    }
    // 妝容
    if (tags.makeup && tags.makeup.length > 0) {
      subjectParts.push(tags.makeup.join('、') + '妝容');
    }
    // 髮型
    const hairDesc = this._buildHair(tags);
    if (hairDesc) subjectParts.push(hairDesc);

    if (subjectParts.length > 0) {
      parts.push(subjectParts.join('，'));
    }

    // --- Action ---
    const actionParts = [];
    if (tags.pose) actionParts.push(tags.pose);
    if (tags.poseStyle) actionParts.push(tags.poseStyle);
    if (tags.expression && tags.expression.length > 0) {
      // 表情中有視線相關的優先處理
      const gazeKeywords = ['直視鏡頭', '閉眼', '回眸', '仰望', '俯視'];
      const hasGaze = tags.expression.some((e) => gazeKeywords.includes(e));
      if (hasGaze) {
        actionParts.push(tags.expression.filter((e) => gazeKeywords.includes(e)).join('，'));
        const others = tags.expression.filter((e) => !gazeKeywords.includes(e));
        if (others.length > 0) actionParts.push(others.join('，'));
      } else {
        actionParts.push(tags.expression.join('，'));
      }
    }
    if (tags.hands && tags.hands.length > 0) {
      actionParts.push('雙手' + tags.hands.join('，'));
    }
    // 服裝
    const clothDesc = this._buildClothing(tags);
    if (clothDesc) actionParts.push(clothDesc);
    if (tags.clothingStyle) actionParts.push(tags.clothingStyle + '穿搭');

    if (actionParts.length > 0) {
      parts.push(actionParts.join('，'));
    }

    // --- Background ---
    const bgParts = [];
    if (tags.sceneType) bgParts.push(tags.sceneType);
    if (tags.atmosphere && tags.atmosphere.length > 0) {
      bgParts.push(tags.atmosphere.join('、'));
    }
    if (tags.foreground && tags.foreground.length > 0) {
      bgParts.push('前景：' + tags.foreground.join('、'));
    }
    if (bgParts.length > 0) {
      parts.push(bgParts.join('，'));
    }

    // --- Lighting ---
    const lightParts = [];
    if (tags.lightType) lightParts.push(tags.lightType);
    if (tags.colorTone) lightParts.push(tags.colorTone);
    if (tags.skinTone) lightParts.push(tags.skinTone + '肌膚');
    if (lightParts.length > 0) {
      parts.push(lightParts.join('，'));
    }

    // --- Framing ---
    const frameParts = [];
    if (tags.shotType) frameParts.push(tags.shotType);
    if (tags.angle) frameParts.push(tags.angle + '拍攝');
    if (tags.composition && tags.composition.length > 0) {
      frameParts.push(tags.composition.join('、'));
    }
    if (tags.focalLength) frameParts.push(tags.focalLength + '焦距');
    if (frameParts.length > 0) {
      parts.push(frameParts.join('，'));
    }

    return parts.join('。');
  },

  _buildHair(tags) {
    const parts = [];
    if (tags.hairLength) parts.push(tags.hairLength);
    if (tags.hairStyle && tags.hairStyle.length > 0) {
      parts.push(tags.hairStyle.join('、'));
    }
    if (tags.hairColor) parts.push(tags.hairColor);
    if (parts.length > 0) return parts.join('') + '髮型';
    return '';
  },

  _buildClothing(tags) {
    const items = [];
    if (tags.top && tags.top.length > 0) items.push('身穿' + tags.top.join('、'));
    if (tags.outerwear && tags.outerwear.length > 0) items.push('外搭' + tags.outerwear.join('、'));
    if (tags.bottom && tags.bottom.length > 0) items.push('下身' + tags.bottom.join('、'));
    if (tags.shoes) items.push('腳穿' + tags.shoes);
    if (tags.lingerie && tags.lingerie.length > 0) {
      items.push('內著' + tags.lingerie.join('、'));
    }
    if (tags.accessories && tags.accessories.length > 0) {
      items.push('佩戴' + tags.accessories.join('、'));
    }
    return items.join('，');
  },
};
