/**
 * FishManager.js — 鱼群管理器
 *
 * 完全对齐原版 Fish.js，包括 AnimatedSprite 帧动画。
 *
 * 原版参数说明：
 *   frames        游泳帧数（从 y=0 开始，每帧高度 = height）
 *   captureFrames 捕获帧数（紧接游泳帧之后）
 *   width/height  单帧尺寸（px）
 *   regX/regY     锚点位置（px，转换为 0~1 比例后传给 anchor）
 *   collRect      碰撞矩形 [x1,y1,x2,y2]（相对于精灵左上角）
 *
 * 与原版的唯一差异：
 *   ResourceManager.getTexture(id, rect) → 本文件内部实现
 *   Game.width / Game.height             → this.app.screen.width/height
 */
window.FishManager = class FishManager {

  // ══════════════════════════════════════════════════════════════════════════
  //  原版 Fish.types，完整照搬，一字不改
  // ══════════════════════════════════════════════════════════════════════════
  static TYPES = {
    1:  { id: 'fish1',  coin: 2,   rarity: 1,  speed: 1.5, frames: 4, captureFrames: 4, width: 55,  height: 37,  regX: 35,  regY: 12,  collRect: [10, 5,  45,  17]  },
    2:  { id: 'fish2',  coin: 3,   rarity: 2,  speed: 1.5, frames: 4, captureFrames: 4, width: 78,  height: 64,  regX: 58,  regY: 20,  collRect: [15, 10, 63,  22]  },
    3:  { id: 'fish3',  coin: 5,   rarity: 3,  speed: 1.5, frames: 4, captureFrames: 4, width: 72,  height: 56,  regX: 52,  regY: 18,  collRect: [5,  5,  67,  23]  },
    4:  { id: 'fish4',  coin: 8,   rarity: 4,  speed: 1.5, frames: 4, captureFrames: 4, width: 77,  height: 59,  regX: 57,  regY: 18,  collRect: [10, 5,  67,  23]  },
    5:  { id: 'fish5',  coin: 10,  rarity: 5,  speed: 1.2, frames: 4, captureFrames: 4, width: 107, height: 122, regX: 67,  regY: 50,  collRect: [20, 30, 80,  40]  },
    6:  { id: 'fish6',  coin: 20,  rarity: 6,  speed: 1.2, frames: 8, captureFrames: 4, width: 105, height: 79,  regX: 65,  regY: 25,  collRect: [45, 0,  60,  55]  },
    7:  { id: 'fish7',  coin: 30,  rarity: 7,  speed: 1.0, frames: 6, captureFrames: 4, width: 92,  height: 151, regX: 40,  regY: 50,  collRect: [15, 5,  70,  75]  },
    8:  { id: 'fish8',  coin: 40,  rarity: 8,  speed: 1.0, frames: 8, captureFrames: 4, width: 174, height: 126, regX: 90,  regY: 50,  collRect: [20, 20, 100, 55]  },
    9:  { id: 'fish9',  coin: 50,  rarity: 9,  speed: 0.8, frames: 8, captureFrames: 4, width: 166, height: 183, regX: 120, regY: 70,  collRect: [60, 10, 100, 130] },
    10: { id: 'fish10', coin: 60,  rarity: 10, speed: 0.8, frames: 6, captureFrames: 4, width: 178, height: 187, regX: 100, regY: 80,  collRect: [20, 30, 150, 90]  },
    11: { id: 'shark1', coin: 100, rarity: 11, speed: 0.6, frames: 8, captureFrames: 4, width: 509, height: 270, regX: 350, regY: 130, collRect: [20, 50, 480, 170] },
    12: { id: 'shark2', coin: 200, rarity: 11, speed: 0.5, frames: 8, captureFrames: 4, width: 516, height: 273, regX: 350, regY: 130, collRect: [20, 50, 480, 170] },
  };

  // 生成权重（rarity 越小越常见）
  static WEIGHTS = { 1:30, 2:25, 3:20, 4:15, 5:8, 6:5, 7:4, 8:3, 9:2, 10:2, 11:1, 12:1 };

  // ══════════════════════════════════════════════════════════════════════════
  //  构造
  // ══════════════════════════════════════════════════════════════════════════
  constructor(app) {
    this.app       = app;
    this.container = new PIXI.Container();
    this.fishes    = [];

    this._maxFish       = 12;
    this._spawnTimer    = 0;
    this._spawnInterval = 180;   // ~3秒一条（60fps）

    // typeIndex → 整张精灵图的 BaseTexture
    this._baseTextures  = {};
    this._loadImages();
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  图片加载
  //  原版用 ResourceManager.getTexture(id, [x,y,w,h])
  //  我们加载整张图后用 PIXI.Texture 裁切子区域，效果完全相同
  // ══════════════════════════════════════════════════════════════════════════
  async _loadImages() {
    const prefix = window.GameConfig.imagePrefix || 'images/';
    let loaded   = 0;

    for (const [idx, t] of Object.entries(FishManager.TYPES)) {
      // 避免重复加载同 id（shark1/shark2 的 id 不同，不会重复）
      if (this._baseTextures[t.id]) { loaded++; continue; }

      for (const path of [
        `${prefix}${t.id}.png`,
        `${prefix}fish/${t.id}.png`,
      ]) {
        try {
          const tex = await PIXI.Assets.load(path);
          // 保存 BaseTexture 供后续裁切帧
          this._baseTextures[t.id] = tex.source || tex.baseTexture || tex;
          loaded++;
          console.log(`[FishManager] ✅ ${t.id}.png`);
          break;
        } catch (_) {}
      }
      if (!this._baseTextures[t.id]) {
        console.warn(`[FishManager] ⚠ ${t.id}.png 未找到，将使用矢量替代`);
      }
    }
    console.log(`[FishManager] 图片加载完成 ${loaded}/${Object.keys(FishManager.TYPES).length}`);
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  对齐原版 ResourceManager.getTexture(id, [x, y, w, h])
  //  从已加载的整张图裁切指定区域，返回 PIXI.Texture
  // ══════════════════════════════════════════════════════════════════════════
  _getTexture(id, rect) {
    const base = this._baseTextures[id];
    if (!base) return null;
    const [x, y, w, h] = rect;
    return new PIXI.Texture({ source: base, frame: new PIXI.Rectangle(x, y, w, h) });
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  创建单条鱼（100% 对齐原版 Fish constructor + initPosition）
  // ══════════════════════════════════════════════════════════════════════════
  _createFish(typeIndex, spawnOptions = {}) {
    const type = FishManager.TYPES[typeIndex];
    const W    = this.app.screen.width;
    const H    = this.app.screen.height;

    // ── 对齐原版：构建游泳帧 AnimatedSprite ───────────────────────────────────
    const base = this._baseTextures[type.id];
    let sprite;

    if (base) {
      // ── 有原版图片：完全照搬原版帧裁切逻辑 ──────────────────────────────────
      const swimFrames = [];
      for (let i = 0; i < type.frames; i++) {
        // 原版：[0, i * height, width, height]
        swimFrames.push(
          this._getTexture(type.id, [0, i * type.height, type.width, type.height])
        );
      }
      sprite = new PIXI.AnimatedSprite(swimFrames);
      // 对齐原版：animationSpeed = 0.1（animationSpeedMultiplier 默认 1）
      sprite.animationSpeed = 0.1 * (spawnOptions.animationSpeedMultiplier || 1);
      sprite.play();
      // 对齐原版：anchor 由 regX/regY 换算
      sprite.anchor.set(type.regX / type.width, type.regY / type.height);
      sprite.scale.set(1, 1);   // 确保初始 scale 正常，update 中再按方向调整
    } else {
      // ── 矢量降级（图片不存在时）────────────────────────────────────────────
      sprite = this._makeVectorSprite(type);
    }

    // ── 发光光晕（原版没有，我们额外加的视觉效果）────────────────────────────
    const glowGfx = new PIXI.Graphics();
    const glowR   = (type.collRect[2] - type.collRect[0]) * 0.8;
    glowGfx.ellipse(0, 0, glowR, glowR * 0.5)
            .fill({ color: 0xFFDD66, alpha: 0.18 });
    glowGfx.filters = [new PIXI.BlurFilter(8 + glowR * 0.06)];

    // ── 容器（对应原版 Fish extends PIXI.Container）──────────────────────────
    const container = new PIXI.Container();
    container.addChild(glowGfx);
    container.addChild(sprite);

    // ── 积分标签 ─────────────────────────────────────────────────────────────
    const scoreLabel = new PIXI.Text({
      text: `+${type.coin * 10}`,
      style: {
        fill: '#FFD700',
        fontSize: Math.max(16, Math.min(32, type.width * 0.25)),
        fontWeight: 'bold',
        stroke: { color: '#000000', width: 3 },
      }
    });
    scoreLabel.anchor.set(0.5);
    scoreLabel.visible = false;
    container.addChild(scoreLabel);

    // ── 对齐原版 initPosition ────────────────────────────────────────────────
    const side        = spawnOptions.side || (Math.random() > 0.5 ? 'left' : 'right');
    const spawnOffset = typeof spawnOptions.spawnOffset === 'number'
      ? spawnOptions.spawnOffset
      : 100 + Math.random() * 60;

    let rotation;
    if (side === 'left') {
      container.x = -spawnOffset;
      rotation    = typeof spawnOptions.rotation === 'number'
        ? spawnOptions.rotation
        : Math.random() * 0.4 - 0.2;
    } else {
      container.x = W + spawnOffset;
      rotation    = typeof spawnOptions.rotation === 'number'
        ? spawnOptions.rotation
        : Math.PI + (Math.random() * 0.4 - 0.2);
    }

    container.y = typeof spawnOptions.y === 'number'
      ? spawnOptions.y
      : Math.random() * (H - 200) + 100;   // 对齐原版公式

    const turnSpeed = typeof spawnOptions.turnSpeed === 'number'
      ? spawnOptions.turnSpeed
      : (Math.random() - 0.5) * 0.001;     // 对齐原版

    // ── 鱼对象（保存所有原版字段 + 我们额外需要的字段）────────────────────────
    return {
      typeIndex,
      type,
      container,
      sprite,
      glowGfx,
      scoreLabel,
      rotation,
      turnSpeed,
      speedMultiplier:          spawnOptions.speedMultiplier || 1,
      animationSpeedMultiplier: spawnOptions.animationSpeedMultiplier || 1,
      isDead:           false,   // 原版字段
      captured:         false,   // 原版字段
      hasEnteredScreen: false,   // 原版字段
      // 我们额外加的
      alive:      true,
      dying:      false,
      dyingTimer: 0,
      wobble:     Math.random() * Math.PI * 2,
    };
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  对齐原版 Fish.update(delta)，100% 照搬逻辑
  // ══════════════════════════════════════════════════════════════════════════
  _updateFish(fish, delta) {
    if (fish.captured) return;

    const W = this.app.screen.width;
    const H = this.app.screen.height;

    // 对齐原版：旋转转向
    fish.rotation += fish.turnSpeed * delta;

    // 对齐原版：cos/sin 驱动移动
    const movementSpeed = fish.type.speed * fish.speedMultiplier;
    fish.container.x += Math.cos(fish.rotation) * movementSpeed * delta;
    fish.container.y += Math.sin(fish.rotation) * movementSpeed * delta;

    // 向左游时水平镜像（scale.x=-1），保持鱼背部朝上、不颠倒
    // 注意：原版用 scale.y 是因为其精灵图特殊设计；普通鱼图用 scale.x
    const isHeadingLeft = Math.cos(fish.rotation) < 0;
    fish.sprite.scale.x = isHeadingLeft ? -1 : 1;
    // scale.y 保持原始值（不做上下翻转）
    fish.sprite.scale.y = 1;

    // 特殊旋转偏移（如原版图片有额外偏转角）
    if (fish.type.rotationOffset) {
      fish.sprite.rotation = isHeadingLeft
        ? -fish.type.rotationOffset
        :  fish.type.rotationOffset;
    }

    // 光晕跟随容器（位置由容器管理，光晕始终在中心）
    fish.wobble += 0.04 * delta;
    if (fish.glowGfx) {
      fish.glowGfx.alpha = 0.12 + Math.abs(Math.sin(fish.wobble * 0.5)) * 0.12;
    }

    // 对齐原版：边界检测
    const leftBound   = -200;
    const rightBound  = W + 200;
    const topBound    = -200;
    const bottomBound = H + 200;

    if (!fish.hasEnteredScreen) {
      if (fish.container.x >= leftBound && fish.container.x <= rightBound &&
          fish.container.y >= topBound  && fish.container.y <= bottomBound) {
        fish.hasEnteredScreen = true;
      } else if (
        fish.container.x < -2500 || fish.container.x > W + 2500 ||
        fish.container.y < -2500 || fish.container.y > H + 2500
      ) {
        fish.isDead = true;
      }
    } else {
      if (fish.container.x < leftBound || fish.container.x > rightBound ||
          fish.container.y < topBound  || fish.container.y > bottomBound) {
        fish.isDead = true;
      }
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  对齐原版 Fish.capture()，100% 照搬帧切换逻辑
  // ══════════════════════════════════════════════════════════════════════════
  _captureFish(fish) {
    if (fish.captured) return;
    fish.captured = true;
    fish.alive    = false;

    const base = this._baseTextures[fish.type.id];

    if (base) {
      // 对齐原版：构建捕获帧（紧接游泳帧之后）
      const captureFrames = [];
      const captureCount  = fish.type.captureFrames || 4;
      const startFrame    = fish.type.frames;           // 游泳帧结束位置
      for (let i = startFrame; i < startFrame + captureCount; i++) {
        captureFrames.push(
          this._getTexture(fish.type.id, [0, i * fish.type.height, fish.type.width, fish.type.height])
        );
      }

      if (captureFrames.length > 0) {
        // 对齐原版：切换到捕获帧，播放完毕后 isDead = true
        fish.sprite.textures = captureFrames;
        fish.sprite.loop     = false;
        fish.sprite.onComplete = () => { fish.isDead = true; };
        fish.sprite.play();
      } else {
        fish.isDead = true;
      }
    } else {
      // 矢量降级：直接标记死亡，走淡出动画
      fish.isDead  = false;   // 由淡出动画控制移除
      fish.dying   = true;
      fish.dyingTimer = 0;
    }

    // 显示积分标签
    fish.scoreLabel.visible = true;
    fish.scoreLabel.alpha   = 1;
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  每帧主循环
  // ══════════════════════════════════════════════════════════════════════════
  update(delta) {
    // ── 按节奏生成鱼 ──────────────────────────────────────────────────────────
    this._spawnTimer += delta;
    if (this._spawnTimer >= this._spawnInterval &&
        this.fishes.length < this._maxFish) {
      this._spawnTimer = 0;
      this._spawnOne(this._pickTypeIndex());
    }

    // ── 更新每条鱼 ────────────────────────────────────────────────────────────
    for (let i = this.fishes.length - 1; i >= 0; i--) {
      const fish = this.fishes[i];

      // 捕获后淡出动画（矢量降级路径）
      if (fish.dying) {
        fish.dyingTimer += delta;
        fish.container.alpha = Math.max(0, 1 - fish.dyingTimer / 40);
        fish.container.scale.set(1 + fish.dyingTimer * 0.025);
        fish.scoreLabel.y -= 0.8;
        if (fish.dyingTimer > 50) {
          this.container.removeChild(fish.container);
          this.fishes.splice(i, 1);
        }
        continue;
      }

      // 对齐原版 update
      this._updateFish(fish, delta);

      // 积分标签上飘（捕获后）
      if (fish.captured && fish.scoreLabel.visible) {
        fish.scoreLabel.y -= 0.8;
        fish.scoreLabel.alpha = Math.max(0, fish.scoreLabel.alpha - 0.02);
      }

      // isDead → 移除（原版的方式：捕获帧播完 onComplete 触发 isDead=true）
      if (fish.isDead) {
        this.container.removeChild(fish.container);
        this.fishes.splice(i, 1);
      }
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  命中检测（用原版 collRect 计算碰撞圆半径）
  // ══════════════════════════════════════════════════════════════════════════
  hitTest(x, y, radius) {
    return this.fishes.filter(fish => {
      if (!fish.alive || fish.dying || fish.captured) return false;
      // collRect [x1,y1,x2,y2] → 碰撞圆半径取宽高均值的一半
      const [cx1, cy1, cx2, cy2] = fish.type.collRect;
      const collR = ((cx2 - cx1) + (cy2 - cy1)) / 4;  // 宽+高 均值的一半
      const dx    = fish.container.x - x;
      const dy    = fish.container.y - y;
      return Math.sqrt(dx * dx + dy * dy) < radius + collR;
    });
  }

  // 击杀鱼（调用 capture，返回积分）
  killFish(fish, scoreMultiplier = 1) {
    if (!fish.alive || fish.captured) return 0;
    const score = Math.round(fish.type.coin * 10 * scoreMultiplier);
    fish.scoreLabel.text = `+${score}`;
    this._captureFish(fish);
    return score;
  }

  getFishes() { return this.fishes.filter(f => f.alive && !f.dying && !f.captured); }

  // ══════════════════════════════════════════════════════════════════════════
  //  生成鱼
  // ══════════════════════════════════════════════════════════════════════════
  _spawnOne(typeIndex, spawnOpts = {}) {
    const fish = this._createFish(typeIndex, spawnOpts);
    this.fishes.push(fish);
    this.container.addChild(fish.container);
    return fish;
  }

  _pickTypeIndex() {
    const keys  = Object.keys(FishManager.WEIGHTS).map(Number);
    const total = keys.reduce((s, k) => s + FishManager.WEIGHTS[k], 0);
    let rand    = Math.random() * total;
    for (const k of keys) {
      rand -= FishManager.WEIGHTS[k];
      if (rand <= 0) return k;
    }
    return 1;
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  编队生成（逐条延迟 500ms，遵守 _maxFish）
  // ══════════════════════════════════════════════════════════════════════════
  spawnFormation(typeId, count) {
    // typeId 是字符串（'fish1'等），需要反查 typeIndex
    const entry  = Object.entries(FishManager.TYPES).find(([, t]) => t.id === typeId);
    const idx    = entry ? Number(entry[0]) : 1;
    const type   = FishManager.TYPES[idx];
    const H      = this.app.screen.height;
    const side   = Math.random() > 0.5 ? 'left' : 'right';

    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        if (this.fishes.length >= this._maxFish) return;
        const y = Math.random() * (H - 200) + 100;   // 对齐原版公式
        this._spawnOne(idx, { side, y });
      }, i * 500);
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  矢量降级（图片不存在时）
  // ══════════════════════════════════════════════════════════════════════════
  _makeVectorSprite(type) {
    const g = new PIXI.Graphics();
    const s = Math.min(type.width / 90, 2.0);   // 按原版宽度缩放
    g.ellipse(0, 0, 44*s, 17*s).fill(0xFFAA00);
    g.ellipse(0, 4*s, 28*s, 9*s).fill({ color:0xffffff, alpha:0.18 });
    g.poly([-37*s,0, -56*s,-13*s, -56*s,13*s]).fill(0xCC7700);
    g.circle(25*s, -4*s, 4*s).fill(0xffffff);
    g.circle(26*s, -3*s, 2*s).fill(0x111111);
    return g;
  }
};
