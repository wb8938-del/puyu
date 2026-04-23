/**
 * FishFormation.js — 鱼群编队系统
 * 定期生成精彩的鱼群编队：波浪形、V形、圆形、闪入等
 * 与 FishManager 配合工作，提升视觉观赏性
 */
window.FishFormation = class FishFormation {
  constructor(app, fishManager) {
    this.app         = app;
    this.fishManager = fishManager;
    this._timer      = 0;
    this._interval   = 600 + Math.random() * 400;  // 10~16秒随机一次编队
    this._formations = ['wave', 'vshape', 'circle', 'scatter', 'convoy'];
    this._lastBoss   = 0;
    this._bossInterval = 3600;   // 约60秒一次BOSS鱼
  }

  // ── 每帧调用 ──────────────────────────────────────────────────────────────
  update(delta) {
    this._timer += delta;
    this._lastBoss += delta;

    if (this._timer >= this._interval) {
      this._timer = 0;
      this._interval = 500 + Math.random() * 600;
      this._spawnFormation();
    }

    if (this._lastBoss >= this._bossInterval) {
      this._lastBoss = 0;
      this._spawnBoss();
    }
  }

  // ── 随机选择一种编队 ──────────────────────────────────────────────────────
  _spawnFormation() {
    const type = this._formations[Math.floor(Math.random() * this._formations.length)];
    const configs = window.GameConfig.fishTypes;

    // 优先选中等体型的鱼
    const pool = configs.filter(t => t.size <= 1.2);
    const typeData = pool[Math.floor(Math.random() * pool.length)];

    switch (type) {
      case 'wave':    this._wave(typeData);    break;
      case 'vshape':  this._vshape(typeData);  break;
      case 'circle':  this._circleFormation(typeData); break;
      case 'scatter': this._scatter(typeData); break;
      case 'convoy':  this._convoy(typeData);  break;
    }
  }

  _w() { return this.app.screen.width; }
  _h() { return this.app.screen.height; }

  // ── 波浪形（从左侧涌入）──────────────────────────────────────────────────
  _wave(typeData) {
    const count = 8 + Math.floor(Math.random() * 6);
    const w = this._w(), h = this._h();
    const centerY = 150 + Math.random() * (h - 300);
    const amplitude = 60 + Math.random() * 60;
    const wavelength = 80 + Math.random() * 40;

    for (let i = 0; i < count; i++) {
      const startX = -80 - i * 70;
      const startY = centerY + Math.sin(i / wavelength * Math.PI * 2) * amplitude;

      const fish = this.fishManager._createFish(typeData, startX, startY);
      // 为编队鱼设置一致的横向路径
      fish.path = [
        { x: startX, y: startY },
        { x: w * 0.3, y: centerY + Math.sin(0.3) * amplitude },
        { x: w * 0.7, y: centerY + Math.sin(0.7) * amplitude },
        { x: w + 80,  y: startY },
      ];
      fish.pathSpeed = 0.006 + Math.random() * 0.002;
      this.fishManager.fishes.push(fish);
      this.fishManager.container.addChild(fish.container);
    }
  }

  // ── V形队 ──────────────────────────────────────────────────────────────
  _vshape(typeData) {
    const count  = 9;
    const w = this._w(), h = this._h();
    const startX = -100;
    const centerY = h * 0.3 + Math.random() * h * 0.4;
    const spacing = 45;

    for (let i = 0; i < count; i++) {
      // 计算V形偏移
      const arm  = i < count / 2 ? i : count - 1 - i;
      const side = i < count / 2 ? -1 : 1;
      const ox   = arm * 40;
      const oy   = arm * spacing * side;

      const fish = this.fishManager._createFish(typeData, startX - ox, centerY + oy);
      fish.path = [
        { x: startX - ox, y: centerY + oy },
        { x: w * 0.5,     y: centerY + oy * 0.5 },
        { x: w + 100,     y: centerY },
      ];
      fish.pathSpeed = 0.007;
      this.fishManager.fishes.push(fish);
      this.fishManager.container.addChild(fish.container);
    }
  }

  // ── 圆形编队（从屏幕外一起冲入）─────────────────────────────────────────
  _circleFormation(typeData) {
    const count  = 8;
    const w = this._w(), h = this._h();
    const cx = w * (0.3 + Math.random() * 0.4);
    const cy = h * (0.3 + Math.random() * 0.4);
    const r  = 80 + Math.random() * 50;

    for (let i = 0; i < count; i++) {
      const angle  = (i / count) * Math.PI * 2;
      const startX = cx + Math.cos(angle) * (w * 0.7);
      const startY = cy + Math.sin(angle) * (h * 0.7);
      const fishX  = cx + Math.cos(angle) * r;
      const fishY  = cy + Math.sin(angle) * r;

      const fish = this.fishManager._createFish(typeData, startX, startY);
      fish.path = [
        { x: startX, y: startY },
        { x: fishX, y: fishY },
        // 绕圈游动
        { x: cx + Math.cos(angle + Math.PI) * r, y: cy + Math.sin(angle + Math.PI) * r },
        { x: w + 100, y: cy },
      ];
      fish.pathSpeed = 0.006;
      this.fishManager.fishes.push(fish);
      this.fishManager.container.addChild(fish.container);
    }
  }

  // ── 乱入（从屏幕各角同时涌入）───────────────────────────────────────────
  _scatter(typeData) {
    const count = 12;
    const w = this._w(), h = this._h();

    for (let i = 0; i < count; i++) {
      const side = i % 4;
      let startX, startY;
      switch (side) {
        case 0: startX = -60; startY = Math.random() * h; break;
        case 1: startX = w + 60; startY = Math.random() * h; break;
        case 2: startX = Math.random() * w; startY = -60; break;
        default: startX = Math.random() * w; startY = h + 60;
      }

      const fish = this.fishManager._createFish(typeData, startX, startY);
      const mx = w * 0.2 + Math.random() * w * 0.6;
      const my = h * 0.2 + Math.random() * h * 0.6;
      fish.path = [
        { x: startX, y: startY },
        { x: mx, y: my },
        { x: mx + (Math.random() - 0.5) * w * 0.4, y: my + (Math.random() - 0.5) * h * 0.3 },
      ];
      fish.pathSpeed = 0.007 + Math.random() * 0.005;
      this.fishManager.fishes.push(fish);
      this.fishManager.container.addChild(fish.container);
    }
  }

  // ── 纵队（一条鱼跟着前一条）─────────────────────────────────────────────
  _convoy(typeData) {
    const count = 10;
    const w = this._w(), h = this._h();
    const pathY = 120 + Math.random() * (h - 300);

    // 所有鱼共用同一条弯曲路径，只是在不同起始位置
    const waypoints = [
      { x: -100,    y: pathY },
      { x: w * 0.2, y: pathY + (Math.random() - 0.5) * 100 },
      { x: w * 0.5, y: pathY + (Math.random() - 0.5) * 120 },
      { x: w * 0.8, y: pathY + (Math.random() - 0.5) * 80 },
      { x: w + 100, y: pathY },
    ];

    for (let i = 0; i < count; i++) {
      const offset = i * 70;
      const fish   = this.fishManager._createFish(typeData, -100 - offset, pathY);
      fish.path = waypoints.map(p => ({ x: p.x - offset * 0.3, y: p.y }));
      fish.pathSpeed = 0.008;
      this.fishManager.fishes.push(fish);
      this.fishManager.container.addChild(fish.container);
    }
  }

  // ── BOSS 鱼出场（全屏公告 + 闪光入场）───────────────────────────────────
  _spawnBoss() {
    const types   = window.GameConfig.fishTypes;
    const boss    = types[types.length - 1];  // 最大的鱼
    const w = this._w(), h = this._h();

    // 随机从左或右出场
    const fromRight = Math.random() > 0.5;
    const startX    = fromRight ? w + 150 : -150;
    const startY    = 150 + Math.random() * (h - 350);

    const fish = this.fishManager._createFish(boss, startX, startY);
    fish.path = [
      { x: startX, y: startY },
      { x: w * 0.5, y: startY + (Math.random() - 0.5) * 100 },
      { x: fromRight ? -150 : w + 150, y: startY + (Math.random() - 0.5) * 80 },
    ];
    fish.pathSpeed = 0.004;
    this.fishManager.fishes.push(fish);
    this.fishManager.container.addChild(fish.container);

    // 触发全局通知
    if (window._game && window._game.screenFX) {
      window._game.screenFX.flash(0xFF8800, 0.3, 0.04);
      window._game.screenFX.shake(5, 0.9);
    }
    console.log('[Formation] BOSS鱼出场！');
  }
};
