# 🎨 视觉资源替换方案
## 用原游戏图片资源替换所有矢量绘制

---

## 核心思路

原游戏 `ggemu-fishing-joy` 包含：
- `images/` — 鱼、背景、特效等图片资源
- `src/WaterFilter.js` — 原版 WebGL 水波纹着色器
- `src/entities/Fish.js` — 原版鱼精灵渲染

我们的抖音直播版需要：
1. 把这些原始文件**直接复制进来**
2. 对我们的 3 个文件做**精确修改**，让它们调用原始资源而非矢量绘制

**其余 12 个文件（服务器、炮台系统、直播系统等）完全不动。**

---

## 第一步：从原游戏获取资源

```bash
# 克隆原游戏仓库（另找一个目录）
git clone https://github.com/imtonyjaa/ggemu-fishing-joy.git original-game

# 将 images 文件夹复制到我们的项目
cp -r original-game/images  fishing-joy-douyin/images

# 将 loop-01.mp3 复制过来
cp original-game/loop-01.mp3 fishing-joy-douyin/loop-01.mp3

# 将原版水波纹着色器复制过来（保留原文件名，不冲突）
cp original-game/src/WaterFilter.js fishing-joy-douyin/src/OriginalWaterFilter.js
```

复制完后目录结构：
```
fishing-joy-douyin/
├── images/            ← ★ 新增，原游戏全套图片
│   ├── bg/            ← 背景图
│   ├── fish/          ← 鱼的精灵图
│   ├── bullet/        ← 炮弹特效图
│   └── ...
├── loop-01.mp3        ← ★ 新增，原游戏背景音乐
└── src/
    ├── OriginalWaterFilter.js  ← ★ 新增，原版水波纹着色器
    └── ...（其余不变）
```

---

## 第二步：修改 index.html

在所有 `<script src="src/...">` 之前，**新增一行**加载原版着色器：

```html
<!-- 在 PixiJS 和 Tone.js 之后，游戏模块之前，新增以下一行 -->
<script src="https://pixijs.download/v8.1.0/pixi.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/tone/14.8.49/Tone.js"></script>

<!-- ★ 新增：原版水波纹着色器 -->
<script src="src/OriginalWaterFilter.js"></script>

<!-- 游戏模块（顺序不变） -->
<script src="src/Config.js"></script>
...
```

---

## 第三步：修改 src/Config.js

**问题**：当前 `fishTypes` 里的 `id` 字段是我们随便起的名字（如 `fish_small_01`），
需要改成**与原游戏 images/ 里实际文件名一致**的名字。

打开 `images/fish/` 目录，查看实际文件名，然后修改 `Config.js`：

```javascript
// src/Config.js — 修改 fishTypes 中的 id 字段
// 把 id 改成原游戏图片的实际文件名（不含 .png）

fishTypes: [
  // 修改前：{ id: 'fish_small_01', ... }
  // 修改后：id 对应 images/fish/实际文件名
  { id: '原游戏小鱼1的文件名', color: 0xFF6B6B, glowColor: 0xFF9999, score: 10,  speed: 2.5, size: 0.6 },
  { id: '原游戏小鱼2的文件名', color: 0xFFBF00, glowColor: 0xFFE066, score: 20,  speed: 2.0, size: 0.65 },
  { id: '原游戏中鱼1的文件名', color: 0x00D4FF, glowColor: 0x66EEFF, score: 50,  speed: 1.5, size: 1.0  },
  { id: '原游戏中鱼2的文件名', color: 0x9B59B6, glowColor: 0xC39BD3, score: 80,  speed: 1.3, size: 1.1  },
  { id: '原游戏大鱼1的文件名', color: 0x2ECC71, glowColor: 0x82E0AA, score: 150, speed: 1.0, size: 1.5  },
  { id: '原游戏大鱼2的文件名', color: 0xE74C3C, glowColor: 0xF1948A, score: 200, speed: 0.8, size: 1.8  },
  { id: '原游戏BOSS的文件名',  color: 0xF39C12, glowColor: 0xFAD7A0, score: 500, speed: 0.5, size: 2.5  },
],
```

**图片路径规则**：`FishManager` 会自动拼接为 `images/{id}.png` 加载。
如果原游戏图片在 `images/fish/` 子目录，则 `id` 要写成 `fish/文件名`。

---

## 第四步：修改 src/FishManager.js

**找到以下代码块（第 15-35 行附近），替换整个 `_tryLoadOriginalTextures` 和 `_createFish` 方法：**

### 4-A：修改图片加载路径（第15-25行）

**当前代码：**
```javascript
async _tryLoadOriginalTextures() {
  const types = window.GameConfig.fishTypes;
  for (const t of types) {
    try {
      const tex = await PIXI.Assets.load(`images/${t.id}.png`);
      this._textures[t.id] = tex;
    } catch (_) {
      // 使用矢量绘制
    }
  }
}
```

**修改为（改变图片路径，并在加载失败时打印警告而非静默失败）：**
```javascript
async _tryLoadOriginalTextures() {
  const types  = window.GameConfig.fishTypes;
  const prefix = window.GameConfig.imagePrefix || 'images/';  // 图片目录前缀
  for (const t of types) {
    try {
      const tex = await PIXI.Assets.load(`${prefix}${t.id}.png`);
      this._textures[t.id] = tex;
      console.log(`[FishManager] 图片加载成功: ${t.id}`);
    } catch (e) {
      console.warn(`[FishManager] ⚠ 图片未找到: ${prefix}${t.id}.png，将使用矢量替代`);
    }
  }
}
```

### 4-B：修改 `_createFish` 中的发光特效（第 48-55 行）

**当前代码**（图片加载成功时不加发光）：
```javascript
const glowGfx = new PIXI.Graphics();
if (!tex) {
  glowGfx.ellipse(0, 0, 50 * typeData.size, 24 * typeData.size)
         .fill({ color: typeData.glowColor, alpha: 0.25 });
  glowGfx.filters = [new PIXI.BlurFilter(4 + typeData.size * 2)];
  container.addChildAt(glowGfx, 0);
}
```

**修改为（图片也加发光效果）：**
```javascript
// 不论图片还是矢量，都加发光光晕（保持视觉一致）
const glowGfx = new PIXI.Graphics();
glowGfx.ellipse(0, 0, 50 * typeData.size, 24 * typeData.size)
       .fill({ color: typeData.glowColor, alpha: tex ? 0.18 : 0.28 });
glowGfx.filters = [new PIXI.BlurFilter(4 + typeData.size * 2)];
container.addChildAt(glowGfx, 0);
```

---

## 第五步：修改 src/WaterBackground.js

这是改动最大的文件。原版使用 WebGL 着色器产生真实水波纹，我们需要接入它。

### 5-A：如果原游戏 WaterFilter.js 导出的是 PIXI.Filter 类

在 `WaterBackground.js` 的 `constructor` 中，**在 `_buildBackground()` 之后加入**：

```javascript
constructor(app) {
  this.app       = app;
  this.container = new PIXI.Container();
  this.time      = 0;
  this._caustics = [];
  this._bubbles  = [];
  this._lightRays = [];

  this._buildBackground();
  this._buildLightRays();
  this._buildCaustics();
  this._buildBubbles();
  this._buildSeaFloor();
  this._buildCoral();

  // ★ 新增：接入原版水波纹着色器
  this._applyOriginalWaterFilter();
}

// ★ 新增方法
_applyOriginalWaterFilter() {
  try {
    // 原游戏 WaterFilter.js 通常导出为 window.WaterFilter 或 window.WaterRippleFilter
    const FilterClass = window.WaterFilter || window.WaterRippleFilter;
    if (FilterClass) {
      const waterFilter = new FilterClass();
      this.container.filters = [waterFilter];
      this._waterFilter = waterFilter;
      console.log('[WaterBackground] 原版水波纹着色器已应用');
    }
  } catch (e) {
    console.warn('[WaterBackground] 着色器加载失败，使用内置特效', e);
  }
}
```

在 `update(delta)` 方法末尾，**新增着色器时间更新**：

```javascript
update(delta) {
  this.time += delta * 0.016;
  // ... 现有的光效、气泡更新代码 ...

  // ★ 新增：驱动水波纹着色器时间轴
  if (this._waterFilter && this._waterFilter.uniforms) {
    this._waterFilter.uniforms.time = this.time;
    // 部分版本用 uTime
    if ('uTime' in this._waterFilter.uniforms) {
      this._waterFilter.uniforms.uTime = this.time;
    }
  }
}
```

### 5-B：如果原游戏背景是图片而非纯色

在 `_buildBackground()` 方法中，**在矢量背景之上叠加原始背景图**：

```javascript
_buildBackground() {
  this._bgGfx = new PIXI.Graphics();
  this.container.addChild(this._bgGfx);
  this._drawBg();  // 保留深海渐变色底

  // ★ 新增：尝试加载原游戏背景图（如存在）
  const bgPaths = [
    'images/bg/background.png',
    'images/bg/bg.png',
    'images/background.png',
    'images/bg.jpg',
  ];
  this._tryLoadBgImage(bgPaths);
}

async _tryLoadBgImage(paths) {
  for (const path of paths) {
    try {
      const tex = await PIXI.Assets.load(path);
      const sprite = new PIXI.Sprite(tex);
      sprite.width  = this._w();
      sprite.height = this._h();
      // 插入到矢量底色之上，特效之下
      this.container.addChildAt(sprite, 1);
      this._bgSprite = sprite;
      console.log(`[WaterBackground] 背景图加载成功: ${path}`);
      return;
    } catch (_) {
      continue;
    }
  }
  console.log('[WaterBackground] 未找到背景图，使用渐变色底');
}
```

---

## 第六步：补充 Config.js 中的路径配置

在 `Config.js` 最后加入图片目录前缀，方便统一管理：

```javascript
// 在 Config.js 的 window.GameConfig 对象末尾新增：
imagePrefix: 'images/',       // 如果图片在子目录，改为 'images/fish/'
bgImagePrefix: 'images/bg/',  // 背景图目录
```

---

## 第七步：验证加载结果

启动服务器后，打开浏览器控制台（F12 → Console），检查：

```
✅ 正常输出：
[FishManager] 图片加载成功: fish_01
[FishManager] 图片加载成功: fish_02
...
[WaterBackground] 背景图加载成功: images/bg/background.png
[WaterBackground] 原版水波纹着色器已应用

⚠ 如果看到：
[FishManager] ⚠ 图片未找到: images/fish_small_01.png
→ 说明 Config.js 中的 id 与实际文件名不匹配，需要修正
```

---

## 修改文件汇总

| 操作 | 文件 | 说明 |
|------|------|------|
| **复制** | `images/` 整个目录 | 从原游戏复制 |
| **复制** | `loop-01.mp3` | 从原游戏复制 |
| **复制** | `src/OriginalWaterFilter.js` | 原 `WaterFilter.js` 改名 |
| **修改** | `index.html` | 新增 1 行 script 标签 |
| **修改** | `src/Config.js` | 修正 fishTypes[].id + 新增路径前缀 |
| **修改** | `src/FishManager.js` | 修改路径逻辑 + 图片也加光晕 |
| **修改** | `src/WaterBackground.js` | 接入着色器 + 加载背景图 |
| **不动** | 其余 12 个文件 | 服务器/炮台/直播系统全部保持原样 |

---

## 关键注意事项

### ⚠ 关于原游戏图片文件名

由于无法直接访问原仓库的 `images/` 目录，**图片的实际文件名需要你复制后自行查看**。
查看方式：
```bash
ls images/           # 看有哪些子目录
ls images/fish/      # 看鱼的图片文件名（如果在子目录）
ls images/*.png      # 看根目录的图片
```

然后据此修改 `Config.js` 中的 `fishTypes[].id`。

### ⚠ 关于 WaterFilter.js 的接口

原游戏的着色器导出方式不确定，对应处理：

```javascript
// 情况1: 导出为类
// window.WaterFilter = class extends PIXI.Filter { ... }
const filter = new window.WaterFilter();

// 情况2: 导出为函数
// window.createWaterFilter = function() { return new PIXI.Filter(...) }
const filter = window.createWaterFilter();

// 情况3: 直接注册到 PIXI
// PIXI.filters.WaterFilter = ...
const filter = new PIXI.filters.WaterFilter();
```

复制 `WaterFilter.js` 后，打开文件查看最后几行，确认导出方式，再对应调整 `_applyOriginalWaterFilter()` 中的引用方式。

### ⚠ 关于精灵图（Spritesheet）

如果原游戏用的是精灵图（`.json` + 图集格式），加载方式不同：

```javascript
// FishManager._tryLoadOriginalTextures 中改为：
const sheet = await PIXI.Assets.load('images/fish_atlas.json');
this._textures['fish_01'] = sheet.textures['fish_01.png'];
// 以此类推，按 atlas 中的帧名映射
```

---

## 改完后的效果

| 模块 | 改前 | 改后 |
|------|------|------|
| 鱼的外观 | PixiJS 矢量几何图 | 原游戏精美鱼类精灵图 |
| 水底背景 | 纯色渐变 + 矢量珊瑚 | 原游戏背景图 + 水波纹着色器 |
| 背景音乐 | Tone.js 合成环境音 | 原游戏 loop-01.mp3 |
| 炮台系统 | 矢量多边形（保持不变）| 矢量多边形（保持不变）|
| 直播系统 | 完整（保持不变） | 完整（保持不变） |
| 排行榜UI | PixiJS 绘制（保持不变）| PixiJS 绘制（保持不变）|

