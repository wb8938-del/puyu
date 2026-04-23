/**
 * ViewerCannonManager.js — 观众大炮管理器
 * 控制屏幕上所有观众炮台的创建、瞄准、开炮、清理
 */
window.ViewerCannonManager = class ViewerCannonManager {
  constructor(app, fishManager, ruler, scorePanel) {
    this.app          = app;
    this.fishManager  = fishManager;
    this.ruler        = ruler;
    this.scorePanel   = scorePanel;
    this.container    = new PIXI.Container();

    // 子弹/特效专用层（在炮台层之上）
    this._fxLayer  = new PIXI.Container();
    // viewerId → ViewerCannon
    this._cannons  = new Map();
    // 通知队列（弹幕消息）
    this._notices  = new PIXI.Container();
    this.container.addChild(this._fxLayer, this._notices);
  }

  // ── 礼物事件 → 创建/升级炮台 ──────────────────────────────────────────────
  onGiftEvent(evt) {
    const { viewerId, viewerName, viewerAvatar, cannonLevel, cannonConfig } = evt;
    const max = window.GameConfig.maxCannonsOnScreen || 8;

    let cannon = this._cannons.get(viewerId);

    if (cannon && !cannon.fired && !cannon.removing) {
      // 已有炮台：若新礼物等级更高则升级（目前实现：重新创建）
      if (cannonLevel > cannon.level) {
        this._removeCannon(viewerId, false);
        cannon = null;
      }
    }

    if (!cannon || cannon.fired || cannon.removing) {
      // 超过上限，移除等级最低的旧炮
      if (this._cannons.size >= max) {
        this._removeLowestLevel();
      }

      // 计算随机位置（避开标尺区域和其他炮台）
      const pos = this._findCannonPosition();

      cannon = new window.ViewerCannon({
        app:         this.app,
        viewerId,
        viewerName,
        viewerAvatar,
        cannonLevel,
        cannonConfig: cannonConfig || window.GameConfig.cannonLevels[cannonLevel],
        fxLayer:     this._fxLayer,   // 子弹/闪光专用层
        onFire:   (info) => this._onCannonFired(info),
        onExpire: (info) => this._onCannonExpired(info),
      });

      cannon.container.x = pos.x;
      cannon.container.y = pos.y;
      this.container.addChild(cannon.container);
      this._cannons.set(viewerId, cannon);

      // 通知弹幕
      this._showNotice(`🎁 ${viewerName} 刷了 ${evt.giftName}，获得Lv.${cannonLevel}炮！`, cannonLevel);
    }
  }

  // ── 坐标指令 → 设置瞄准 ───────────────────────────────────────────────────
  onCoordinateEvent(evt) {
    const { viewerId, viewerName, x, y } = evt;
    const cannon = this._cannons.get(viewerId);

    if (!cannon || cannon.fired || cannon.removing) {
      // 没有炮台，忽略
      return;
    }

    // 把输入坐标转换到游戏坐标（偏移标尺厚度）
    const gx = x + this.ruler.thickness;
    const gy = y;

    // 校验范围
    const w = this.app.screen.width, h = this.app.screen.height;
    if (gx < 0 || gx > w || gy < 0 || gy > h - this.ruler.thickness) {
      this._showNotice(`⚠️ ${viewerName} 坐标超出范围 (${x}, ${y})`, 1);
      return;
    }

    cannon.setAim(gx, gy);
    this.ruler.showAimLine(x, y, cannon._glowColor);

    // 立即开炮
    cannon.fire(this.fishManager);
    this._showNotice(`💥 ${viewerName} 在 (${x}, ${y}) 开炮！`, cannon.level);

    setTimeout(() => {
      this.ruler.clearAimLine();
      this._cannons.delete(viewerId);
    }, 1500);
  }

  // ── 开炮回调 ──────────────────────────────────────────────────────────────
  _onCannonFired(info) {
    // 保存积分到服务器
    fetch(`${window.GameConfig.apiBase}/scores`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        viewerId:    info.viewerId,
        viewerName:  info.viewerName,
        viewerAvatar: info.viewerAvatar,
        score:       info.score,
        cannonLevel: info.cannonLevel,
        fishCaught:  info.fishCaught
      })
    }).catch(console.error);

    if (info.score > 0) {
      this._showNotice(`🐟 ${info.viewerName} 捕获${info.fishCaught}条鱼，得${info.score}分！`, info.cannonLevel);

      // 屏幕特效 & 音效
      const fx = window._game && window._game.screenFX;
      if (fx) {
        fx.addCombo(info.fishCaught);
        fx.showScore(info.score, info.targetX, info.targetY);
        if (info.cannonLevel >= 4) fx.flash(0xFFAA00, 0.2, 0.05);
        fx.shake(3 + info.cannonLevel * 1.5, 0.82);
      }
      const hud = window._game && window._game.liveHUD;
      if (hud) { hud.addScore(info.score); hud.addFish(info.fishCaught); }
      window.AudioManager && window.AudioManager.playCatch(
        Math.floor(info.score / Math.max(1, info.fishCaught))
      );
    } else {
      this._showNotice(`💨 ${info.viewerName} 炮打空了！`, 1);
      window.AudioManager && window.AudioManager.playMiss();
    }

    // 更新本地排行
    this.scorePanel && this.scorePanel.addScore(info.viewerId, info.viewerName, info.viewerAvatar, info.score);
  }

  // ── 超时未开炮 ────────────────────────────────────────────────────────────
  _onCannonExpired(info) {
    const cannon = this._cannons.get(info.viewerId);
    if (!cannon) return;

    // 自动瞄准最近的鱼并开炮
    const fishes = this.fishManager.getFishes();
    if (fishes.length > 0) {
      let nearest = fishes[0];
      let minDist = Infinity;
      fishes.forEach(f => {
        const dx   = f.container.x - cannon.container.x;
        const dy   = f.container.y - cannon.container.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < minDist) { minDist = dist; nearest = f; }
      });
      cannon.setAim(nearest.container.x, nearest.container.y);
    }

    cannon.fire(this.fishManager);
    this._showNotice(`⏰ ${info.viewerId.slice(-6)} 超时，系统自动开炮！`, cannon.level);

    setTimeout(() => {
      this._cannons.delete(info.viewerId);
      this.ruler.clearAimLine();
    }, 1500);
  }

  // ── 移除炮台 ──────────────────────────────────────────────────────────────
  _removeCannon(viewerId, animate = true) {
    const cannon = this._cannons.get(viewerId);
    if (!cannon) return;
    if (animate) cannon._startRemoving();
    else this.container.removeChild(cannon.container);
    this._cannons.delete(viewerId);
  }

  _removeLowestLevel() {
    let lowestId = null, lowestLv = 999;
    this._cannons.forEach((cannon, id) => {
      if (!cannon.fired && cannon.level < lowestLv) {
        lowestLv = cannon.level;
        lowestId = id;
      }
    });
    if (lowestId) this._removeCannon(lowestId, true);
  }

  // ── 炮台位置随机分配（不重叠）──────────────────────────────────────────────
  _findCannonPosition() {
    const w   = this.app.screen.width;
    const h   = this.app.screen.height;
    const th  = this.ruler ? this.ruler.thickness : 36;
    const pad = 80;

    let best = { x: th + pad + Math.random() * (w - th - pad * 2), y: pad + Math.random() * (h - th - pad * 2) };
    let maxDist = -1;

    // 多次采样，选离其他炮最远的位置
    for (let attempt = 0; attempt < 20; attempt++) {
      const cx = th + pad + Math.random() * (w - th - pad * 2);
      const cy = pad + Math.random() * (h - th - pad * 2);
      let minD = Infinity;

      this._cannons.forEach(c => {
        const dx = c.container.x - cx;
        const dy = c.container.y - cy;
        minD = Math.min(minD, Math.sqrt(dx * dx + dy * dy));
      });

      if (minD === Infinity || minD > maxDist) {
        maxDist = minD;
        best    = { x: cx, y: cy };
      }
    }
    return best;
  }

  // ── 弹幕通知（屏幕上方飘字）──────────────────────────────────────────────
  _showNotice(text, level = 1) {
    const levelColors = ['#ffffff', '#FF9A00', '#C0C0C0', '#FFD700', '#FF4500', '#FF00FF'];
    const color       = levelColors[Math.min(level, 5)] || '#ffffff';
    const label       = new PIXI.Text({
      text,
      style: {
        fill: color, fontSize: 16, fontWeight: 'bold',
        stroke: { color: '#000000', width: 3 },
        dropShadow: { color: '#000000', blur: 6, distance: 0 }
      }
    });
    label.anchor.set(0.5, 0);
    label.x = this.app.screen.width / 2;
    label.y = 20 + this._notices.children.length * 26;
    label.alpha = 0;
    this._notices.addChild(label);

    let t = 0;
    const tick = this.app.ticker.add(() => {
      t++;
      if (t < 10) label.alpha = t / 10;
      else if (t > 100) label.alpha = Math.max(0, 1 - (t - 100) / 20);
      label.y -= 0.3;
      if (t >= 120) {
        this.app.ticker.remove(tick);
        this._notices.removeChild(label);
      }
    });
  }

  // ── 每帧更新 ──────────────────────────────────────────────────────────────
  update(delta) {
    this._cannons.forEach((cannon, id) => {
      cannon.update(delta);
      if (cannon.isDone) {
        this.container.removeChild(cannon.container);
        this._cannons.delete(id);
      }
    });
  }

  get activeCannons() { return this._cannons.size; }
};
