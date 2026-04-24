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
    thickness: 25,   // 标尺宽/高（px）
    tickEvery:  10,  // 每隔多少像素打刻度
    labelEvery: 50, // 每隔多少像素显示数字
    bgAlpha: 0.55,
    color: 0x00e5ff,
  },

  // 鱼种配置（与原游戏图片文件夹对应，fallback 到矢量绘制）
  fishTypes: [
    { id: 'fish1',  color: 0xFF6B6B, glowColor: 0xFF9999, score: 20,   speed: 1.5, size: 1.0 },
    { id: 'fish2',  color: 0xFFBF00, glowColor: 0xFFE066, score: 30,   speed: 1.5, size: 1.0 },
    { id: 'fish3',  color: 0x00D4FF, glowColor: 0x66EEFF, score: 50,   speed: 1.5, size: 1.0 },
    { id: 'fish4',  color: 0x9B59B6, glowColor: 0xC39BD3, score: 80,   speed: 1.5, size: 1.0 },
    { id: 'fish5',  color: 0x2ECC71, glowColor: 0x82E0AA, score: 100,  speed: 1.2, size: 1.0 },
    { id: 'fish6',  color: 0xE74C3C, glowColor: 0xF1948A, score: 200,  speed: 1.2, size: 1.0 },
    { id: 'fish7',  color: 0xF39C12, glowColor: 0xFAD7A0, score: 300,  speed: 1.0, size: 1.0 },
    { id: 'fish8',  color: 0x1ABC9C, glowColor: 0x76D7C4, score: 400,  speed: 1.0, size: 1.0 },
    { id: 'fish9',  color: 0x8E44AD, glowColor: 0xBB8FCE, score: 500,  speed: 0.8, size: 1.0 },
    { id: 'fish10', color: 0x2980B9, glowColor: 0x7FB3D3, score: 600,  speed: 0.8, size: 1.0 },
    { id: 'shark1', color: 0xE74C3C, glowColor: 0xFF8888, score: 1000, speed: 0.6, size: 1.0 },
    { id: 'shark2', color: 0xC0392B, glowColor: 0xFF6666, score: 2000, speed: 0.5, size: 1.0 },
  ],

  // 大炮等级（会被服务器配置覆盖）
  cannonLevels: {
    1: { name: '铜炮',   bulletCount: 1, power: 1,  radius: 60,  color: 0xCD7F32, glowColor: 0xFF9A00, timeout: 30 },
    2: { name: '银炮',   bulletCount: 2, power: 2,  radius: 85,  color: 0xC0C0C0, glowColor: 0xFFFFFF, timeout: 40 },
    3: { name: '金炮',   bulletCount: 3, power: 4,  radius: 110, color: 0xFFD700, glowColor: 0xFFFF00, timeout: 50 },
    4: { name: '火焰炮', bulletCount: 5, power: 7,  radius: 140, color: 0xFF4500, glowColor: 0xFF0000, timeout: 60 },
    5: { name: '彩虹炮', bulletCount: 8, power: 10, radius: 180, color: 0xFF00FF, glowColor: 0x00FFFF, timeout: 90 },
  },

  scoreMultipliers: { 1: 1, 2: 1.5, 3: 2.5, 4: 4, 5: 7 },
  maxCannonsOnScreen: 8,

  // ══════════════════════════════════════════════════════════════════════════
  //  图片资源配置（★ 修改这里即可，其他文件不用动）
  // ══════════════════════════════════════════════════════════════════════════

  // 鱼图片目录（FishManager 自动拼接 fish1.png、shark1.png 等）
  imagePrefix: 'images/',

  // 背景图路径（直接填完整路径，支持 png/jpg）
  // 示例：'images/bg/ocean.jpg'  或  'images/background.png'
  // 填 null 或 '' 则使用内置深海渐变色
  bgImage: 'images/game_bg_2_hd.jpg',

  // 水波纹着色器（把原版 WaterFilter.js 改名为 OriginalWaterFilter.js 放到 src/ 目录）
  // true = 自动尝试加载；false = 只用内置气泡/光柱效果
  useOriginalWaterFilter: true,
};
