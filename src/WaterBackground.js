/**
 * WaterBackground.js — 水底场景背景
 *
 * 加载优先级：
 *  1. 原游戏背景图（images/bg/*.png）
 *  2. 原游戏 WaterFilter.js 着色器（window.WaterFilter 等）
 *  3. 内置矢量特效（气泡、光柱、焦散光，作为降级方案）
 */
window.WaterBackground = class WaterBackground {
  constructor(app) {
    this.app         = app;
    this.container   = new PIXI.Container();
    this.time        = 0;
    this._caustics   = [];
    this._bubbles    = [];
    this._lightRays  = [];
    this._waterFilter = null;
    this._bgSprite    = null;

    // ── 先构建内置矢量底层 ──────────────────────────────────────────────────
    this._buildBackground();
    this._buildLightRays();
    this._buildCaustics();
    this._buildBubbles();
    this._buildSeaFloor();
    this._buildCoral();

    // ── 异步覆盖：加载原游戏资源 ──────────────────────────────────────────────
    this._loadOriginalAssets();
  }

  _w() { return this.app.screen.width; }
  _h() { return this.app.screen.height; }

  // ══════════════════════════════════════════════════════════════════════════
  //  原游戏资源加载（异步，加载成功后替换内置特效）
  // ══════════════════════════════════════════════════════════════════════════

  async _loadOriginalAssets() {
    await this._tryLoadBgImage();
    this._applyOriginalWaterFilter();
  }

  // ── 加载背景图 ────────────────────────────────────────────────────────────
  // 路径由 Config.js 的 bgImage 字段控制，一处配置全局生效
  async _tryLoadBgImage() {
    const path = window.GameConfig.bgImage;

    // 未配置或空字符串 → 使用内置渐变色
    if (!path) {
      console.log('[WaterBackground] bgImage 未配置，使用内置渐变色');
      return;
    }

    try {
      const tex    = await PIXI.Assets.load(path);
      const sprite = new PIXI.Sprite(tex);
      sprite.width  = this._w();
      sprite.height = this._h();
      // 插在矢量色块之上（index 1），保留气泡/光柱等覆盖层
      this.container.addChildAt(sprite, 1);
      this._bgSprite = sprite;
      console.log(`[WaterBackground] ✅ 背景图加载成功: ${path}`);
    } catch (e) {
      console.warn(`[WaterBackground] ⚠ 背景图加载失败: ${path}`);
      console.warn('  → 请检查路径是否正确，或在 Config.js 中把 bgImage 改为实际文件路径');
    }
  }

  // ── 接入原版水波纹着色器 ──────────────────────────────────────────────────
  _applyOriginalWaterFilter() {
    // 是否启用原版着色器由 Config.js 的 useOriginalWaterFilter 控制
    if (!window.GameConfig.useOriginalWaterFilter) {
      console.log('[WaterBackground] useOriginalWaterFilter=false，跳过着色器');
      return;
    }
    const FilterClass =
      window.WaterFilter         ||
      window.WaterRippleFilter   ||
      window.WaterShaderFilter   ||
      (window.PIXI && window.PIXI.filters && window.PIXI.filters.WaterFilter);

    if (!FilterClass) {
      console.log('[WaterBackground] ℹ 未找到原版水波纹着色器，使用内置光效');
      return;
    }

    try {
      const filter = new FilterClass();
      // 叠加到整个容器（覆盖所有子元素）
      this.container.filters = [filter];
      this._waterFilter = filter;
      console.log('[WaterBackground] ✅ 原版水波纹着色器已应用');
    } catch (e) {
      console.warn('[WaterBackground] ⚠ 着色器实例化失败:', e.message);
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  内置矢量场景（始终构建，作为底层或降级方案）
  // ══════════════════════════════════════════════════════════════════════════

  _buildBackground() {
    this._bgGfx = new PIXI.Graphics();
    this.container.addChild(this._bgGfx);
    this._drawBg();
  }

  _drawBg() {
    const g = this._bgGfx;
    const w = this._w(), h = this._h();
    g.clear();
    const layers = [
      { y:0,       h:h*0.25, color:0x000820 },
      { y:h*0.25,  h:h*0.25, color:0x001540 },
      { y:h*0.50,  h:h*0.25, color:0x002060 },
      { y:h*0.75,  h:h*0.25, color:0x001030 },
    ];
    layers.forEach(l => g.rect(0, l.y, w, l.h).fill(l.color));
  }

  _buildLightRays() {
    const w = this._w(), h = this._h();
    for (let i = 0; i < 7; i++) {
      const g  = new PIXI.Graphics();
      const cx = (w/7)*i + w/14 + (Math.random()-0.5)*80;
      const bw = 40 + Math.random()*60;
      g.poly([cx-bw,0, cx+bw,0, cx+bw*0.5,h*0.7, cx-bw*0.5,h*0.7])
       .fill({ color:0x0066cc, alpha:0.025+Math.random()*0.02 });
      g.filters = [new PIXI.BlurFilter(8)];
      this.container.addChild(g);
      this._lightRays.push({ gfx:g, phase:Math.random()*Math.PI*2, speed:0.3+Math.random()*0.5 });
    }
  }

  _buildCaustics() {
    const w = this._w(), h = this._h();
    for (let i = 0; i < 24; i++) {
      const g     = new PIXI.Graphics();
      const r     = 25 + Math.random()*70;
      const color = Math.random()>0.5 ? 0x00d4ff : 0x0088ff;
      this._drawCausticShape(g, r, color);
      g.x = Math.random()*w; g.y = Math.random()*h;
      g.alpha = 0.04+Math.random()*0.06;
      g.filters = [new PIXI.BlurFilter(3+Math.random()*4)];
      this._caustics.push({ gfx:g, r, speed:0.2+Math.random()*0.8,
        phase:Math.random()*Math.PI*2, dx:(Math.random()-0.5)*0.4, dy:(Math.random()-0.5)*0.2 });
      this.container.addChild(g);
    }
  }

  _drawCausticShape(g, r, color) {
    g.clear();
    const pts = 5 + Math.floor(Math.random()*4);
    for (let j=0; j<pts; j++) {
      const a1=(j/pts)*Math.PI*2, a2=((j+0.35)/pts)*Math.PI*2, a3=((j+1)/pts)*Math.PI*2;
      g.poly([0,0, Math.cos(a1)*r,Math.sin(a1)*r,
              Math.cos(a2)*r*0.4,Math.sin(a2)*r*0.4,
              Math.cos(a3)*r,Math.sin(a3)*r]).fill({ color, alpha:0.7 });
    }
  }

  _buildBubbles() {
    const w = this._w(), h = this._h();
    for (let i=0; i<35; i++) {
      const g = new PIXI.Graphics();
      const r = 1.5 + Math.random()*5.5;
      g.circle(0,0,r).fill({ color:0xaaeeff, alpha:0.18 });
      g.circle(0,0,r).stroke({ color:0x66ccff, width:0.8, alpha:0.5 });
      g.circle(-r*0.3,-r*0.3,r*0.25).fill({ color:0xffffff, alpha:0.5 });
      g.x=Math.random()*w; g.y=Math.random()*h;
      this._bubbles.push({ gfx:g, speed:0.25+Math.random()*0.7,
        startX:g.x, driftA:Math.random()*Math.PI*2,
        driftS:0.2+Math.random()*0.4, wobble:Math.random()*100 });
      this.container.addChild(g);
    }
  }

  _buildSeaFloor() {
    const g = new PIXI.Graphics();
    const w = this._w(), h = this._h();
    g.rect(0, h-90, w, 90).fill({ color:0x0a0800, alpha:0.8 });
    g.rect(0, h-92, w, 4).fill({ color:0x1a1200, alpha:0.6 });
    for (let i=0; i<5; i++) g.rect(0, h-60+i*10, w, 2).fill({ color:0x221800, alpha:0.3 });
    [[80,h-80,50,22,0x1a1200],[250,h-65,35,16,0x241800],[460,h-85,65,26,0x100c00],
     [700,h-70,42,18,0x1e1400],[900,h-75,55,22,0x1a1200],[1100,h-65,38,15,0x241800],
     [1350,h-80,48,20,0x100c00],[1600,h-70,60,24,0x1a1200]].forEach(([x,y,rx,ry,c]) => {
      if (x < w) g.ellipse(x,y,rx,ry).fill(c);
    });
    this.container.addChild(g);
  }

  _buildCoral() {
    const g = new PIXI.Graphics();
    const w = this._w(), h = this._h();
    [[40,0x8B0000,4,60],[150,0xFF4500,3,45],[320,0xFF8C00,5,50],[520,0x006400,4,55],
     [800,0x8B0000,3,40],[1050,0xFF4500,5,52],[1280,0x006400,4,48],[1500,0xFF8C00,3,42]]
    .forEach(([x,color,branches,height]) => {
      if (x < w) this._drawCoral(g, x, h-80, color, branches, height);
    });
    this.container.addChild(g);
  }

  _drawCoral(g, x, y, color, branches, height) {
    g.rect(x-3, y-height, 6, height).fill(color);
    for (let i=0; i<branches; i++) {
      const bh=height*(0.3+i*0.15), bx=i%2===0?1:-1, len=15+i*8;
      g.rect(x+bx*2, y-bh, bx*len, 3).fill(color);
      g.circle(x+bx*(len+2), y-bh+1, 4).fill(color);
    }
    g.circle(x, y-height, 5).fill(color);
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  每帧更新
  // ══════════════════════════════════════════════════════════════════════════

  update(delta) {
    this.time += delta * 0.016;
    const h = this._h(), w = this._w();

    // 原版着色器时间轴驱动
    if (this._waterFilter && this._waterFilter.uniforms) {
      const u = this._waterFilter.uniforms;
      if ('time'  in u) u.time  = this.time;
      if ('uTime' in u) u.uTime = this.time;
      if ('iTime' in u) u.iTime = this.time;  // GLSL 风格
    }

    // 背景图自适应尺寸（窗口变化时）
    if (this._bgSprite) {
      this._bgSprite.width  = w;
      this._bgSprite.height = h;
    }

    // 内置光效动画（着色器未加载时也保持视觉效果）
    this._lightRays.forEach(lr => {
      lr.phase += lr.speed * 0.012;
      lr.gfx.alpha = 0.6 + Math.sin(lr.phase) * 0.4;
    });

    this._caustics.forEach(c => {
      c.phase += c.speed * 0.018;
      c.gfx.scale.set(0.7 + Math.abs(Math.sin(c.phase)) * 0.5);
      c.gfx.alpha = 0.03 + Math.abs(Math.sin(c.phase*0.6)) * 0.07;
      c.gfx.rotation += 0.004 * c.speed;
      c.gfx.x += c.dx; c.gfx.y += c.dy;
      if (c.gfx.x < -80)  c.gfx.x = w+80;
      if (c.gfx.x > w+80) c.gfx.x = -80;
      if (c.gfx.y < -80)  c.gfx.y = h+80;
      if (c.gfx.y > h+80) c.gfx.y = -80;
    });

    this._bubbles.forEach(b => {
      b.wobble += 0.04;
      b.gfx.y -= b.speed;
      b.gfx.x += Math.sin(b.wobble * b.driftS) * 0.5;
      if (b.gfx.y < -20) { b.gfx.y = h+20; b.gfx.x = b.startX+(Math.random()-0.5)*60; }
    });
  }

  onResize() {
    this._drawBg();
    if (this._bgSprite) {
      this._bgSprite.width  = this._w();
      this._bgSprite.height = this._h();
    }
  }
};
