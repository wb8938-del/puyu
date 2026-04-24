/**
 * LiveHUD.js — 顶部直播状态栏
 * 显示：直播间名称 | 在线观众数 | 活跃炮台数 | 今日总积分 | 静音按钮 | 连接状态
 */
window.LiveHUD = class LiveHUD {
  constructor(app, cannonMgr) {
    this.app       = app;
    this.cannonMgr = cannonMgr;
    this.container = new PIXI.Container();

    this._bgGfx     = new PIXI.Graphics();
    this._items     = {};   // key → Text
    this._totalScore = 0;
    this._fishCaught = 0;
    this._connected  = false;
    this._muted      = false;

    this.container.addChild(this._bgGfx);
    this._build();
  }

  get _h() { return 38; }
  get _w() { return this.app.screen.width; }

  _build() {
    this._drawBg();

    // ── 直播标志 ────────────────────────────────────────────────────────────
    this._liveDot = new PIXI.Graphics();
    this.container.addChild(this._liveDot);

    this._liveLabel = this._makeText('🔴 LIVE', '#FF2244', 13, 700);
    this._liveLabel.x = 10;
    this._liveLabel.y = this._h / 2;
    this._liveLabel.anchor.set(0, 0.5);
    this.container.addChild(this._liveLabel);

    // ── 状态指示器（从左到右排列）──────────────────────────────────────────
    this._statItems = [
      { key: 'cannons', icon: '💣', label: '炮台', value: '0',  x: 105 },
      { key: 'fish',    icon: '🐟', label: '已捕', value: '0',  x: 210 },
      { key: 'score',   icon: '⭐', label: '总分', value: '0',  x: 315 },
    ];

    this._statTexts = {};
    this._statItems.forEach(item => {
      const t = this._makeText(`${item.icon} ${item.label}: ${item.value}`, '#c0e8ff', 12, 400);
      t.x = item.x;
      t.y = this._h / 2;
      t.anchor.set(0, 0.5);
      this.container.addChild(t);
      this._statTexts[item.key] = t;
    });

    // ── 连接状态（右侧）──────────────────────────────────────────────────
    this._connText = this._makeText('● 未连接', '#FF4444', 12, 600);
    this._connText.anchor.set(1, 0.5);
    this._connText.y = this._h / 2;
    this.container.addChild(this._connText);

    // ── 静音按钮 ──────────────────────────────────────────────────────────
    this._muteBtn = new PIXI.Container();
    this._muteBg  = new PIXI.Graphics();
    this._muteBg.roundRect(0, 0, 40, 24, 5).fill({ color: 0x1a3a5c, alpha: 0.9 });
    this._muteBg.roundRect(0, 0, 40, 24, 5).stroke({ color: 0x00d4ff, width: 1, alpha: 0.5 });
    this._muteIcon = this._makeText('🔊', '#ffffff', 14, 400);
    this._muteIcon.anchor.set(0.5);
    this._muteIcon.x = 20;
    this._muteIcon.y = 12;
    this._muteBtn.addChild(this._muteBg, this._muteIcon);
    this._muteBtn.y = (this._h - 24) / 2;
    this._muteBtn.cursor = 'pointer';
    this._muteBtn.interactive = true;
    this._muteBtn.on('pointerdown', () => this._toggleMute());
    this.container.addChild(this._muteBtn);

    this._positionRight();
  }

  _positionRight() {
    const w = this._w;
    this._connText.x  = w - 90;
    this._muteBtn.x   = w - 55;
  }

  _drawBg() {
    const g = this._bgGfx;
    const w = this._w, h = this._h;
    g.clear();
    g.rect(0, 0, w, h).fill({ color: 0x000d1a, alpha: 0.82 });
    g.rect(0, h - 1, w, 1).fill({ color: 0x00d4ff, alpha: 0.4 });
    // 左侧红色直播条
    g.rect(0, 0, 4, h).fill(0xFF2244);
  }

  _makeText(txt, fill, size, weight = 400) {
    return new PIXI.Text({
      text: txt,
      style: { fill, fontSize: size, fontWeight: String(weight), fontFamily: 'Microsoft YaHei, system-ui' }
    });
  }

  // ── 更新数据 ──────────────────────────────────────────────────────────────
  setConnected(ok) {
    this._connected = ok;
    this._connText.text  = ok ? '● 已连接' : '● 未连接';
    this._connText.style = { fill: ok ? '#00e676' : '#FF4444', fontSize: 12, fontWeight: '600' };
  }

  addScore(score) {
    this._totalScore += score;
    this._updateStats();
  }

  addFish(count = 1) {
    this._fishCaught += count;
    this._updateStats();
  }

  _updateStats() {
    const active = this.cannonMgr ? this.cannonMgr.activeCannons : 0;
    this._statTexts.cannons.text = `💣 炮台: ${active}`;
    this._statTexts.fish.text    = `🐟 已捕: ${this._fishCaught}`;
    this._statTexts.score.text   = `⭐ 总分: ${this._fmt(this._totalScore)}`;
  }

  _fmt(n) {
    return n >= 10000 ? (n / 10000).toFixed(1) + '万' : String(n);
  }

  _toggleMute() {
    this._muted = !this._muted;
    this._muteIcon.text = this._muted ? '🔇' : '🔊';
    window.AudioManager && window.AudioManager.toggleMute();
  }

  // ── 每帧更新 ──────────────────────────────────────────────────────────────
  update(delta) {
    // 直播红点脉动
    if (!this._dotTick) this._dotTick = 0;
    this._dotTick += 0.05;
    this._liveLabel.alpha = 0.7 + Math.sin(this._dotTick) * 0.3;

    // 活跃炮台数实时刷新（null 保护）
    if (this.cannonMgr && this._statTexts && this._statTexts.cannons) {
      this._statTexts.cannons.text = `💣 炮台: ${this.cannonMgr.activeCannons}`;
    }
  }

  onResize() {
    this._drawBg();
    this._positionRight();
  }
};
