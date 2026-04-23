/**
 * Config.js — 全局配置（会被服务器推送的 config 事件覆盖）
 */
window.GameConfig = {
  serverUrl: `ws://${location.hostname}:3000`,
  apiBase:   `http://${location.hostname}:3000/api`,

  // 画布逻辑分辨率
  designWidth:  1920,
  designHeight: 1080,

  // 坐标标尺
  ruler: {
    thickness: 36,   // 标尺宽/高（px）
    tickEvery:  50,  // 每隔多少像素打刻度
    labelEvery: 100, // 每隔多少像素显示数字
    bgAlpha: 0.55,
    color: 0x00e5ff,
  },

  // 鱼种配置（与原游戏图片文件夹对应，fallback 到矢量绘制）
  fishTypes: [
    { id: 'fish10', color: 0xFF6B6B, glowColor: 0xFF9999, score: 10,  speed: 2.5, size: 0.6 },
    { id: 'fish9', color: 0xFFBF00, glowColor: 0xFFE066, score: 20,  speed: 2.0, size: 0.65 },
    { id: 'fish8',   color: 0x00D4FF, glowColor: 0x66EEFF, score: 50,  speed: 1.5, size: 1.0  },
    { id: 'fish7',   color: 0x9B59B6, glowColor: 0xC39BD3, score: 80,  speed: 1.3, size: 1.1  },
    { id: 'fish6',   color: 0x2ECC71, glowColor: 0x82E0AA, score: 150, speed: 1.0, size: 1.5  },
    { id: 'fish5',   color: 0xE74C3C, glowColor: 0xF1948A, score: 200, speed: 0.8, size: 1.8  },
    { id: 'fish1',     color: 0xF39C12, glowColor: 0xFAD7A0, score: 500, speed: 0.5, size: 2.5  },
  ],

  // 大炮等级（会被服务器配置覆盖）
  cannonLevels: {
    1: { name: 'bullet1',   bulletCount: 1, power: 1,  radius: 60,  color: 0xCD7F32, glowColor: 0xFF9A00, timeout: 30 },
    2: { name: 'bullet4',   bulletCount: 2, power: 2,  radius: 85,  color: 0xC0C0C0, glowColor: 0xFFFFFF, timeout: 40 },
    3: { name: 'bullet6',   bulletCount: 3, power: 4,  radius: 110, color: 0xFFD700, glowColor: 0xFFFF00, timeout: 50 },
    4: { name: 'bullet7', bulletCount: 5, power: 7,  radius: 140, color: 0xFF4500, glowColor: 0xFF0000, timeout: 60 },
    5: { name: 'bullet8', bulletCount: 8, power: 10, radius: 180, color: 0xFF00FF, glowColor: 0x00FFFF, timeout: 90 },
  },

  scoreMultipliers: { 1: 1, 2: 1.5, 3: 2.5, 4: 4, 5: 7 },
  maxCannonsOnScreen: 8,

  // ── 图片资源路径配置 ─────────────────────────────────────────────────────
  // 复制原游戏 images/ 目录后，根据实际文件位置修改以下前缀
  imagePrefix:   'images/',     // 鱼图片前缀，FishManager 会拼接 {id}.png
  bgImagePrefix: 'images/',     // 背景图前缀，WaterBackground 会尝试多个文件名
};
