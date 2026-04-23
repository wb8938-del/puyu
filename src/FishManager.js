/**
 * FishManager.js — 鱼群管理器
 *
 * 优先加载原游戏图片资源（images/ 目录）。
 * 只有在图片确实不存在时，才回退到矢量绘制。
 * 图片路径通过 window.GameConfig.imagePrefix 控制。
 */
window.FishManager = class FishManager {
  constructor(app) {
    this.app       = app;
    this.container = new PIXI.Container();
    this.fishes    = [];
    this._timer    = 0;
    this._spawnInterval = 90;
    this._maxFish       = 35;
    this._textures      = {};   // id → PIXI.Texture
    this._atlasLoaded   = false;

    this._loadAssets();
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  资源加载（优先图片，降级矢量）
  // ══════════════════════════════════════════════════════════════════════════

  async _loadAssets() {
    const prefix = window.GameConfig.imagePrefix || 'images/';

    // ── 1. 尝试加载精灵图集（atlas）─────────────────────────────────────────
    const atlasCandidates = [
      `${prefix}fish_atlas.json`,
      `${prefix}fish/atlas.json`,
      `${prefix}atlas.json`,
    ];
    for (const path of atlasCandidates) {
      try {
        const sheet = await PIXI.Assets.load(path);
        // 将 atlas 中的帧映射到我们的 id
        const types = window.GameConfig.fishTypes;
        types.forEach(t => {
          // 尝试多种帧名格式
          const candidates = [`${t.id}.png`, `${t.id}`, t.id];
          for (const name of candidates) {
            if (sheet.textures && sheet.textures[name]) {
              this._textures[t.id] = sheet.textures[name];
              break;
            }
          }
        });
        this._atlasLoaded = true;
        console.log(`[FishManager] ✅ 精灵图集加载成功: ${path}`);
        return;
      } catch (_) { /* 继续尝试下一个 */ }
    }

    // ── 2. 逐张加载独立图片 ──────────────────────────────────────────────────
    const types = window.GameConfig.fishTypes;
    let loadedCount = 0;
    for (const t of types) {
      // 尝试多个路径格式
      const pathCandidates = [
        `${prefix}${t.id}.png`,
        `${prefix}fish/${t.id}.png`,
        `${prefix}${t.id}.webp`,
        `${prefix}${t.id}.jpg`,
      ];
      let loaded = false;
      for (const path of pathCandidates) {
        try {
          const tex = await PIXI.Assets.load(path);
          this._textures[t.id] = tex;
          loadedCount++;
          loaded = true;
          break;
        } catch (_) { /* 试下一个格式 */ }
      }
      if (!loaded) {
        console.warn(`[FishManager] ⚠ 图片未找到: ${t.id}，将使用矢量替代`);
      }
    }
    if (loadedCount > 0) {
      console.log(`[FishManager] ✅ 独立图片加载: ${loadedCount}/${types.length} 张`);
    } else {
      console.log('[FishManager] ℹ 未找到图片资源，全部使用矢量绘制');
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  创建单条鱼
  // ══════════════════════════════════════════════════════════════════════════

  _createFish(typeData, startX, startY) {
    const container = new PIXI.Container();
    const tex       = this._textures[typeData.id];

    // ── 鱼体 ────────────────────────────────────────────────────────────────
    let body;
    if (tex) {
      body = new PIXI.Sprite(tex);
      body.anchor.set(0.5);
      body.scale.set(typeData.size);
    } else {
      body = this._drawVectorFish(typeData);
    }

    // ── 发光光晕（图片和矢量都加，图片的 alpha 稍低） ─────────────────────────
    const glowGfx = new PIXI.Graphics();
    glowGfx.ellipse(0, 0, 50 * typeData.size, 24 * typeData.size)
           .fill({ color: typeData.glowColor, alpha: tex ? 0.16 : 0.28 });
    glowGfx.filters = [new PIXI.BlurFilter(4 + typeData.size * 2)];
    container.addChild(glowGfx);
    container.addChild(body);

    // ── 积分弹出标签 ─────────────────────────────────────────────────────────
    const scoreLabel = new PIXI.Text({
      text: `+${typeData.score}`,
      style: {
        fill: '#FFD700',
        fontSize: Math.max(14, 20 * typeData.size),
        fontWeight: 'bold',
        stroke: { color: '#000000', width: 3 },
      }
    });
    scoreLabel.anchor.set(0.5);
    scoreLabel.visible = false;
    container.addChild(scoreLabel);

    container.x = startX;
    container.y = startY;

    return {
      container, body, glowGfx, scoreLabel,
      typeData,
      path:         this._generatePath(startX, startY),
      pathProgress: 0,
      pathSpeed:    typeData.speed * (0.008 + Math.random() * 0.004),
      alive:        true,
      dying:        false,
      dyingTimer:   0,
      wobble:       Math.random() * Math.PI * 2,
    };
  }

  // ── 矢量鱼（降级方案）────────────────────────────────────────────────────
  _drawVectorFish(typeData) {
    const g    = new PIXI.Graphics();
    const s    = typeData.size;
    const c    = typeData.color;
    const dark = this._darken(c, 0.5);

    g.ellipse(0, 0, 45*s, 18*s).fill(c);
    g.ellipse(0, 4*s, 30*s, 10*s).fill({ color:0xffffff, alpha:0.2 });
    g.poly([-38*s,0, -58*s,-16*s, -58*s,16*s]).fill(dark);
    g.poly([-5*s,-18*s, 10*s,-28*s, 20*s,-18*s]).fill(dark);
    g.poly([-5*s,14*s, 5*s,22*s, 15*s,14*s]).fill({ color:dark, alpha:0.7 });
    g.circle(28*s,-5*s, 5*s).fill(0xffffff);
    g.circle(29*s,-4*s, 3*s).fill(0x000000);
    g.circle(30*s,-5*s, 1*s).fill(0xffffff);
    if (s >= 1.0) {
      for (let i=-1; i<=2; i++) {
        g.ellipse(i*12*s, 0, 8*s, 14*s).stroke({ color:dark, width:1, alpha:0.3 });
      }
    }
    return g;
  }

  _darken(color, factor) {
    const r = Math.floor(((color>>16)&0xff)*factor);
    const g = Math.floor(((color>>8)&0xff)*factor);
    const b = Math.floor((color&0xff)*factor);
    return (r<<16)|(g<<8)|b;
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  路径生成（贝塞尔曲线游动）
  // ══════════════════════════════════════════════════════════════════════════

  _generatePath(startX, startY) {
    const w = this.app.screen.width;
    const h = this.app.screen.height;
    const points = [{ x:startX, y:startY }];
    let cx = startX, cy = startY;
    const count = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < count; i++) {
      cx += (Math.random()-0.5)*w*0.6 + (Math.random()>0.5 ? w*0.3 : -w*0.3);
      cy += (Math.random()-0.5)*h*0.5;
      cx = Math.max(50, Math.min(w-50, cx));
      cy = Math.max(80, Math.min(h-120, cy));
      points.push({ x:cx, y:cy });
    }
    return points;
  }

  _bezierPoint(p0, p1, p2, t) {
    const mt = 1-t;
    return {
      x: mt*mt*p0.x + 2*mt*t*p1.x + t*t*p2.x,
      y: mt*mt*p0.y + 2*mt*t*p1.y + t*t*p2.y
    };
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  生成鱼
  // ══════════════════════════════════════════════════════════════════════════

  _spawn() {
    if (this.fishes.length >= this._maxFish) return;
    const types   = window.GameConfig.fishTypes;
    const weights = types.map((_, i) => Math.max(1, 8 - i*1.5));
    const total   = weights.reduce((a,b)=>a+b, 0);
    let rand = Math.random()*total;
    let typeData = types[0];
    for (let i=0; i<types.length; i++) {
      rand -= weights[i];
      if (rand <= 0) { typeData = types[i]; break; }
    }

    const w = this.app.screen.width, h = this.app.screen.height;
    const side = Math.floor(Math.random()*4);
    let sx, sy;
    switch(side) {
      case 0: sx=-60;   sy=80+Math.random()*(h-200); break;
      case 1: sx=w+60;  sy=80+Math.random()*(h-200); break;
      case 2: sx=Math.random()*w; sy=80;     break;
      default:sx=Math.random()*w; sy=h-120;
    }

    const fish = this._createFish(typeData, sx, sy);
    this.fishes.push(fish);
    this.container.addChild(fish.container);
  }

  spawnFormation(typeId, count) {
    const types    = window.GameConfig.fishTypes;
    const typeData = types.find(t=>t.id===typeId) || types[0];
    const w = this.app.screen.width, h = this.app.screen.height;
    const startY = 100 + Math.random()*(h-250);
    for (let i=0; i<count; i++) {
      const fish = this._createFish(typeData, -80-i*80, startY+(Math.random()-0.5)*100);
      this.fishes.push(fish);
      this.container.addChild(fish.container);
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  命中判定 & 死亡
  // ══════════════════════════════════════════════════════════════════════════

  hitTest(x, y, radius) {
    return this.fishes.filter(fish => {
      if (!fish.alive || fish.dying) return false;
      const dx   = fish.container.x - x;
      const dy   = fish.container.y - y;
      const dist = Math.sqrt(dx*dx + dy*dy);
      return dist < radius + 40*fish.typeData.size;
    });
  }

  killFish(fish, scoreMultiplier = 1) {
    if (!fish.alive) return 0;
    fish.alive  = false;
    fish.dying  = true;
    fish.dyingTimer = 0;

    const score = Math.round(fish.typeData.score * scoreMultiplier);
    fish.scoreLabel.text    = `+${score}`;
    fish.scoreLabel.visible = true;
    fish.scoreLabel.alpha   = 1;

    // 被击中闪白
    if (fish.body.tint !== undefined) fish.body.tint = 0xFFFFFF;
    return score;
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  每帧更新
  // ══════════════════════════════════════════════════════════════════════════

  update(delta) {
    this._timer += delta;
    if (this._timer >= this._spawnInterval) {
      this._timer = 0;
      this._spawn();
      if (Math.random() < 0.15) {
        const types = window.GameConfig.fishTypes;
        const t = types[Math.floor(Math.random()*3)];
        this.spawnFormation(t.id, 3+Math.floor(Math.random()*4));
      }
    }

    const w = this.app.screen.width, h = this.app.screen.height;

    for (let i = this.fishes.length-1; i >= 0; i--) {
      const fish = this.fishes[i];

      // ── 死亡动画 ──────────────────────────────────────────────────────────
      if (fish.dying) {
        fish.dyingTimer += delta;
        fish.container.alpha = Math.max(0, 1 - fish.dyingTimer/40);
        fish.container.scale.set(1 + fish.dyingTimer*0.03);
        fish.scoreLabel.y -= 0.8;
        if (fish.dyingTimer > 50) {
          this.container.removeChild(fish.container);
          this.fishes.splice(i, 1);
        }
        continue;
      }

      // ── 路径游动 ──────────────────────────────────────────────────────────
      fish.pathProgress += fish.pathSpeed;
      if (fish.pathProgress >= fish.path.length-1) {
        if (fish.container.x < -100 || fish.container.x > w+100 ||
            fish.container.y < -100 || fish.container.y > h+100) {
          this.container.removeChild(fish.container);
          this.fishes.splice(i, 1);
          continue;
        }
        fish.path = this._generatePath(fish.container.x, fish.container.y);
        fish.pathProgress = 0;
        continue;
      }

      const segIdx = Math.floor(fish.pathProgress);
      const t      = fish.pathProgress - segIdx;
      const p0     = fish.path[segIdx];
      const p1     = fish.path[Math.min(segIdx+1, fish.path.length-1)];
      const mid    = { x:(p0.x+p1.x)/2, y:(p0.y+p1.y)/2 };
      const pos    = this._bezierPoint(p0, mid, p1, t);

      const prevX = fish.container.x;
      fish.container.x = pos.x;
      fish.container.y = pos.y;

      // 左右翻转跟随运动方向
      const dx = pos.x - prevX;
      if (Math.abs(dx) > 0.5) {
        fish.body.scale.x = dx > 0 ? Math.abs(fish.body.scale.x) : -Math.abs(fish.body.scale.x);
      }

      // 摇摆动画
      fish.wobble += 0.06;
      fish.container.rotation = Math.sin(fish.wobble)*0.08;

      // 光晕脉动
      if (fish.glowGfx) {
        fish.glowGfx.alpha = 0.12 + Math.abs(Math.sin(fish.wobble*0.5))*0.14;
      }
    }
  }

  getFishes() { return this.fishes.filter(f => f.alive && !f.dying); }
};
