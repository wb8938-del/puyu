/**
 * ViewerCannon.js — 单个观众大炮实体
 * 根据礼物等级显示不同外观的炮台，支持倒计时、瞄准、开炮动画
 */
window.ViewerCannon = class ViewerCannon {
  /**
   * @param {object} opts
   *   viewerId, viewerName, viewerAvatar, cannonLevel, cannonConfig, app, onFire, onExpire
   */
  constructor(opts) {
    this.app          = opts.app;
    this.viewerId     = opts.viewerId;
    this.viewerName   = opts.viewerName;
    this.viewerAvatar = opts.viewerAvatar;
    this.level        = opts.cannonLevel;
    this.config       = opts.cannonConfig || window.GameConfig.cannonLevels[this.level];
    this.onFire       = opts.onFire   || (() => {});
    this.onExpire     = opts.onExpire || (() => {});

    this.aimX = null;
    this.aimY = null;
    this.fired    = false;
    this.removing = false;

    this._timeLeft  = this.config.timeout;   // 秒
    this._frameAcc  = 0;
    this._wobble    = 0;
    this._particles = [];

    this.container = new PIXI.Container();
    this._fxLayer  = opts.fxLayer || null;  // 专用特效层（子弹/闪光）
    this._build();
  }

  // ════════════════════════════════════════════════════════════════════════════
  //  构建 UI
  // ════════════════════════════════════════════════════════════════════════════
  _build() {
    // 层级结构
    this._glowLayer  = new PIXI.Container();
    this._bodyLayer  = new PIXI.Container();
    this._infoLayer  = new PIXI.Container();
    this._partLayer  = new PIXI.Container();
    this.container.addChild(this._glowLayer, this._bodyLayer, this._infoLayer, this._partLayer);

    this._drawGlow();
    this._drawCannonBody();
    this._drawAvatar();
    this._drawInfoLabel();
    this._drawTimer();

    // 出现动画
    this.container.scale.set(0.1);
    this.container.alpha = 0;
    this._appearing = true;
    this._appearTimer = 0;
  }

  get _color() { return this.config.color || 0xCD7F32; }
  get _glowColor() { return typeof this.config.glowColor === 'string'
    ? parseInt(this.config.glowColor.replace('#', ''), 16)
    : (this.config.glowColor || 0xFF9A00); }

  // ── 发光底座 ────────────────────────────────────────────────────────────────
  _drawGlow() {
    const g     = new PIXI.Graphics();
    const r     = 55 + this.level * 8;
    const color = this._glowColor;

    // 外层模糊光晕（多圈渐隐圆）
    for (let i = 4; i >= 1; i--) {
      g.circle(0, 0, r * i * 0.5)
       .fill({ color, alpha: 0.06 / i });
    }
    g.circle(0, 0, r).fill({ color, alpha: 0.12 });

    g.filters = [new PIXI.BlurFilter(10 + this.level * 3)];
    this._glowLayer.addChild(g);
    this._glowGfx = g;
  }

  // ── 炮身 ────────────────────────────────────────────────────────────────────
  _drawCannonBody() {
    const g = new PIXI.Graphics();
    const c = this._color;
    const s = 0.8 + this.level * 0.15;  // 等级越高越大

    // 炮台底座
    g.ellipse(0, 18, 38 * s, 12 * s).fill({ color: this._darken(c, 0.5), alpha: 1 });
    g.ellipse(0, 16, 34 * s, 10 * s).fill(this._darken(c, 0.6));

    // 炮身主体（圆柱）
    g.roundRect(-16 * s, -20 * s, 32 * s, 36 * s, 8 * s).fill(c);
    // 高光
    g.roundRect(-14 * s, -18 * s, 10 * s, 30 * s, 6 * s)
     .fill({ color: 0xffffff, alpha: 0.15 });

    // 炮管（指向上方，开炮时旋转）
    this._barrel = new PIXI.Graphics();
    this._barrel.roundRect(-6 * s, -50 * s, 12 * s, 40 * s, 4 * s)
                .fill(this._darken(c, 0.7));
    this._barrel.roundRect(-4 * s, -48 * s, 5 * s, 36 * s, 3 * s)
                .fill({ color: 0xffffff, alpha: 0.1 });
    // 炮口
    this._barrel.ellipse(0, -50 * s, 8 * s, 4 * s).fill(this._darken(c, 0.4));

    // 等级装饰星星（手动绘制多边形，兼容 PixiJS v8）
    for (let i = 0; i < this.level; i++) {
      const sx = (-10 + i * 5) * s;
      const sy = -5 * s;
      const outerR = 5 * s * 0.4;
      const innerR = 2 * s * 0.4;
      const pts    = [];
      for (let p = 0; p < 10; p++) {
        const a = (p / 10) * Math.PI * 2 - Math.PI / 2;
        const r2 = p % 2 === 0 ? outerR : innerR;
        pts.push(sx + Math.cos(a) * r2, sy + Math.sin(a) * r2);
      }
      g.poly(pts).fill(0xFFD700);
    }

    // 特殊等级效果
    if (this.level >= 4) {
      // 火焰色边框
      g.roundRect(-16 * s, -20 * s, 32 * s, 36 * s, 8 * s)
       .stroke({ color: this._glowColor, width: 2 });
    }
    if (this.level >= 5) {
      // 彩虹外框（动画在update里处理）
      this._rainbowBorder = new PIXI.Graphics();
      this._bodyLayer.addChild(this._rainbowBorder);
    }

    this._bodyLayer.addChild(g, this._barrel);
    this._cannonGfx = g;
    this._cannonScale = s;
  }

  // ── 观众头像 ────────────────────────────────────────────────────────────────
  _drawAvatar() {
    const r     = 22 + this.level * 2;
    const mask  = new PIXI.Graphics();
    const color = this._color;

    // 头像圆形边框
    const border = new PIXI.Graphics();
    border.circle(0, 0, r + 3).fill(color);
    border.y = -65;
    this._infoLayer.addChild(border);

    // 加载头像图片（如果是 URL）
    this._avatarContainer = new PIXI.Container();
    this._avatarContainer.y = -65;
    this._infoLayer.addChild(this._avatarContainer);

    PIXI.Assets.load(this.viewerAvatar)
      .then(tex => {
        const sprite = new PIXI.Sprite(tex);
        sprite.anchor.set(0.5);
        sprite.width  = r * 2;
        sprite.height = r * 2;
        // 圆形遮罩
        const m = new PIXI.Graphics();
        m.circle(0, 0, r).fill(0xffffff);
        sprite.mask = m;
        this._avatarContainer.addChild(m, sprite);
      })
      .catch(() => {
        // 头像加载失败，显示首字母圆
        const bg = new PIXI.Graphics();
        bg.circle(0, 0, r).fill(color);
        const initial = new PIXI.Text({
          text: (this.viewerName[0] || '?').toUpperCase(),
          style: { fill: '#ffffff', fontSize: r, fontWeight: 'bold' }
        });
        initial.anchor.set(0.5);
        this._avatarContainer.addChild(bg, initial);
      });
  }

  // ── 用户名 + 炮等级标签 ─────────────────────────────────────────────────────
  _drawInfoLabel() {
    // 用户名
    this._nameLabel = new PIXI.Text({
      text: this._truncate(this.viewerName, 8),
      style: {
        fill: '#ffffff', fontSize: 12, fontWeight: 'bold',
        stroke: { color: '#000000', width: 2 },
        dropShadow: { color: '#000000', blur: 4, distance: 0 }
      }
    });
    this._nameLabel.anchor.set(0.5, 0);
    this._nameLabel.y = -38;
    this._infoLayer.addChild(this._nameLabel);

    // 炮等级徽章
    const levelColors = ['', '#CD7F32', '#C0C0C0', '#FFD700', '#FF4500', '#FF00FF'];
    const badge = new PIXI.Graphics();
    badge.roundRect(-20, -32, 40, 16, 5).fill({ color: 0x000000, alpha: 0.6 });
    badge.roundRect(-20, -32, 40, 16, 5).stroke({ color: parseInt((levelColors[this.level] || '#fff').replace('#', ''), 16), width: 1 });
    this._infoLayer.addChild(badge);

    const lvText = new PIXI.Text({
      text: `Lv.${this.level} ${this.config.name}`,
      style: { fill: levelColors[this.level] || '#ffffff', fontSize: 10, fontWeight: 'bold' }
    });
    lvText.anchor.set(0.5);
    lvText.y = -24;
    this._infoLayer.addChild(lvText);
  }

  // ── 倒计时计时器 ────────────────────────────────────────────────────────────
  _drawTimer() {
    this._timerContainer = new PIXI.Container();
    this._timerContainer.y = 40;
    this._infoLayer.addChild(this._timerContainer);

    this._timerBg = new PIXI.Graphics();
    this._timerContainer.addChild(this._timerBg);

    this._timerText = new PIXI.Text({
      text: String(this._timeLeft),
      style: { fill: '#ffffff', fontSize: 14, fontWeight: 'bold' }
    });
    this._timerText.anchor.set(0.5);
    this._timerContainer.addChild(this._timerText);

    this._updateTimer();
  }

  _updateTimer() {
    const g       = this._timerBg;
    const timeout = this.config.timeout;
    const ratio   = this._timeLeft / timeout;
    const r       = 18;
    const color   = ratio > 0.5 ? 0x00ff88 : ratio > 0.25 ? 0xFFAA00 : 0xFF2200;

    g.clear();
    // 背景圆
    g.circle(0, 0, r).fill({ color: 0x000000, alpha: 0.6 });
    // 进度弧（用多段线模拟）
    const startAngle = -Math.PI / 2;
    const endAngle   = startAngle + Math.PI * 2 * ratio;
    const segments   = 32;
    const points     = [];
    for (let i = 0; i <= segments; i++) {
      const a = startAngle + (endAngle - startAngle) * (i / segments);
      points.push(Math.cos(a) * (r - 3), Math.sin(a) * (r - 3));
    }
    if (points.length > 2) {
      g.poly(points).stroke({ color, width: 4, alpha: 0.9 });
    }

    this._timerText.text  = String(Math.ceil(this._timeLeft));
    this._timerText.style = { fill: color === 0xFF2200 ? '#FF2200' : '#ffffff', fontSize: 14, fontWeight: 'bold' };
  }

  // ════════════════════════════════════════════════════════════════════════════
  //  设置瞄准目标
  // ════════════════════════════════════════════════════════════════════════════
  setAim(x, y) {
    if (this.fired || this.removing) return;
    this.aimX = x;
    this.aimY = y;
    // 旋转炮管朝向目标
    if (this._barrel) {
      const dx = x - this.container.x;
      const dy = y - this.container.y;
      const angle = Math.atan2(dy, dx) + Math.PI / 2;
      this._targetBarrelAngle = angle;
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  //  开炮
  // ════════════════════════════════════════════════════════════════════════════
  fire(fishManager) {
    if (this.fired || this.removing) return;
    this.fired = true;

    const targetX = this.aimX != null ? this.aimX : this.container.x + (Math.random() - 0.5) * 200;
    const targetY = this.aimY != null ? this.aimY : this.container.y - 100;

    // 炮管后坐动画
    this._recoil = true;
    this._recoilTimer = 0;

    // 开炮音效
    if (window.AudioManager && window.AudioManager.ready) {
      window.AudioManager.playFire(this.level);
    }

    // 炮口闪光
    this._muzzleFlash();

    // 弹丸数量
    const bulletCount = this.config.bulletCount;
    const spreadAngle = Math.PI / 8;
    const bullets     = [];

    for (let i = 0; i < bulletCount; i++) {
      const angleOffset = bulletCount > 1
        ? (i / (bulletCount - 1) - 0.5) * spreadAngle
        : 0;
      bullets.push({ targetX: targetX + Math.sin(angleOffset) * 60, targetY });
    }

    // 命中判定
    const radius    = this.config.radius;
    const multiplier = window.GameConfig.scoreMultipliers[this.level] || 1;
    const hits      = fishManager.hitTest(targetX, targetY, radius);
    let   totalScore = 0;
    hits.forEach(fish => {
      totalScore += fishManager.killFish(fish, multiplier);
    });

    // 弹道特效粒子
    bullets.forEach(b => this._fireBullet(b.targetX, b.targetY));

    // 冲击波圈
    this._shockwave(targetX, targetY, radius);

    // 回调
    this.onFire({
      viewerId:    this.viewerId,
      viewerName:  this.viewerName,
      viewerAvatar: this.viewerAvatar,
      cannonLevel: this.level,
      targetX, targetY,
      fishCaught:  hits.length,
      score:       totalScore
    });

    // 延迟移除炮台
    setTimeout(() => this._startRemoving(), 1200);
  }

  _fireBullet(tx, ty) {
    const bullet  = new PIXI.Graphics();
    const color   = this._glowColor;
    const fxLayer = this._fxLayer || this.container.parent;
    if (!fxLayer) return;
    bullet.circle(0, 0, 5 + this.level).fill(color);
    bullet.circle(0, 0, 3).fill(0xFFFFFF);
    bullet.x = this.container.x;
    bullet.y = this.container.y - 30;
    fxLayer.addChild(bullet);

    const dx  = tx - bullet.x;
    const dy  = ty - bullet.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const speed = 18 + this.level * 3;
    const steps = dist / speed;
    let step    = 0;

    const tick = this.app.ticker.add(() => {
      step++;
      bullet.x += dx / steps;
      bullet.y += dy / steps;
      bullet.alpha = 1 - step / steps * 0.5;
      // 拖尾
      const trail = new PIXI.Graphics();
      trail.circle(0, 0, 2 + this.level * 0.5).fill({ color, alpha: 0.3 });
      trail.x = bullet.x;
      trail.y = bullet.y;
      bullet.parent && bullet.parent.addChild(trail);
      setTimeout(() => trail.parent && trail.parent.removeChild(trail), 150);

      if (step >= steps) {
        this.app.ticker.remove(tick);
        if (bullet.parent) bullet.parent.removeChild(bullet);
      }
    });
    this._particles.push(bullet);
  }

  _muzzleFlash() {
    const flash  = new PIXI.Graphics();
    const color  = this._glowColor;
    const pts    = 8;
    const outerR = 25 + this.level * 5;
    const innerR = 10;
    // 手动绘制星形（PixiJS v8 无 star() API）
    const polyPts = [];
    for (let p = 0; p < pts * 2; p++) {
      const a  = (p / (pts * 2)) * Math.PI * 2 - Math.PI / 2;
      const r2 = p % 2 === 0 ? outerR : innerR;
      polyPts.push(Math.cos(a) * r2, Math.sin(a) * r2);
    }
    flash.poly(polyPts).fill(color);
    flash.circle(0, 0, innerR * 1.2).fill(0xFFFFFF);
    // 挂到专用 FX 层（由 cannonMgr 传入）或回退到 parent
    const fxLayer = this._fxLayer || (this.container.parent);
    if (!fxLayer) return;
    flash.x = this.container.x;
    flash.y = this.container.y - 50;
    fxLayer.addChild(flash);
    let t = 0;
    const tick = this.app.ticker.add(() => {
      t++;
      flash.alpha = 1 - t / 14;
      flash.scale.set(1 + t * 0.14);
      if (t >= 14) {
        this.app.ticker.remove(tick);
        if (flash.parent) flash.parent.removeChild(flash);
      }
    });
  }

  _shockwave(x, y, maxR) {
    const g       = new PIXI.Graphics();
    const fxLayer = this._fxLayer || this.container.parent;
    if (!fxLayer) return;
    g.x = x;
    g.y = y;
    fxLayer.addChild(g);
    let r = 10, t = 0, total = 25;
    const tick = this.app.ticker.add(() => {
      t++;
      r = maxR * (t / total);
      g.clear();
      g.circle(0, 0, r).stroke({ color: this._glowColor, width: 2, alpha: 1 - t / total });
      g.circle(0, 0, r * 0.6).fill({ color: this._glowColor, alpha: 0.05 * (1 - t / total) });
      if (t >= total) {
        this.app.ticker.remove(tick);
        g.parent && g.parent.removeChild(g);
      }
    });
  }

  _startRemoving() {
    this.removing = true;
    this._removeTimer = 0;
  }

  // ════════════════════════════════════════════════════════════════════════════
  //  每帧更新
  // ════════════════════════════════════════════════════════════════════════════
  update(delta) {
    this._wobble += 0.04;

    // 出现动画
    if (this._appearing) {
      this._appearTimer += delta;
      const p = Math.min(this._appearTimer / 20, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      this.container.scale.set(eased);
      this.container.alpha = p;
      if (p >= 1) this._appearing = false;
    }

    // 移除动画
    if (this.removing) {
      this._removeTimer = (this._removeTimer || 0) + delta;
      const p = Math.min(this._removeTimer / 25, 1);
      this.container.scale.set(1 - p);
      this.container.alpha = 1 - p;
      return;
    }

    // 倒计时
    if (!this.fired) {
      this._frameAcc += delta;
      if (this._frameAcc >= 60) {  // 每秒
        this._frameAcc = 0;
        this._timeLeft = Math.max(0, this._timeLeft - 1);
        this._updateTimer();

        const urgent = this._timeLeft <= 5;

        // 倒计时音效
        if (window.AudioManager && window.AudioManager.ready) {
          window.AudioManager.playTick(urgent);
        }

        // 最后5秒：红色脉动警告特效
        if (urgent) {
          const sfx = window._game && window._game.screenFX;
          if (sfx) sfx.urgentPulse();
          // 炮台自身红色闪烁
          if (this._cannonGfx) {
            this._cannonGfx.tint = (this._timeLeft % 2 === 0) ? 0xFF4444 : 0xFFFFFF;
          }
        }

        if (this._timeLeft <= 0) {
          if (this._cannonGfx) this._cannonGfx.tint = 0xFFFFFF;
          this.onExpire({ viewerId: this.viewerId, cannon: this });
          return;
        }
      }
    }

    // 炮管缓慢指向目标
    if (this._barrel && this._targetBarrelAngle != null) {
      const diff = this._targetBarrelAngle - this._barrel.rotation;
      this._barrel.rotation += diff * 0.1;
    }

    // 后坐力动画
    if (this._recoil) {
      this._recoilTimer++;
      const offset = Math.sin(this._recoilTimer * 0.4) * 5 * Math.exp(-this._recoilTimer * 0.15);
      if (this._barrel) this._barrel.y = offset;
      if (this._recoilTimer > 30) this._recoil = false;
    }

    // 发光脉动
    if (this._glowGfx) {
      this._glowGfx.scale.set(0.85 + Math.sin(this._wobble * 0.8) * 0.15);
    }

    // 等级5：彩虹色边框
    if (this._rainbowBorder) {
      this._rainbowBorder.clear();
      const hue = (Date.now() % 3000) / 3000;
      const c   = this._hsvToHex(hue, 1, 1);
      this._rainbowBorder.roundRect(-22, -22, 44, 44, 10).stroke({ color: c, width: 3 });
    }

    // 整体微弱浮动
    this.container.y += Math.sin(this._wobble * 0.5) * 0.3;
  }

  get isDone() {
    return this.removing && (this._removeTimer || 0) >= 25;
  }

  // ── 工具 ────────────────────────────────────────────────────────────────────
  _darken(color, factor) {
    const r = Math.floor(((color >> 16) & 0xff) * factor);
    const g = Math.floor(((color >> 8) & 0xff) * factor);
    const b = Math.floor((color & 0xff) * factor);
    return (r << 16) | (g << 8) | b;
  }

  _hsvToHex(h, s, v) {
    let r, g, b;
    const i = Math.floor(h * 6);
    const f = h * 6 - i;
    const p = v * (1 - s), q = v * (1 - f * s), t = v * (1 - (1 - f) * s);
    switch (i % 6) {
      case 0: r=v; g=t; b=p; break;
      case 1: r=q; g=v; b=p; break;
      case 2: r=p; g=v; b=t; break;
      case 3: r=p; g=q; b=v; break;
      case 4: r=t; g=p; b=v; break;
      default: r=v; g=p; b=q;
    }
    return (Math.round(r*255) << 16) | (Math.round(g*255) << 8) | Math.round(b*255);
  }

  _truncate(str, maxLen) {
    return str && str.length > maxLen ? str.slice(0, maxLen) + '…' : str;
  }
};
