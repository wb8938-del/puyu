/**
 * Main.js — 游戏主入口 (完整版)
 * 整合：水底背景 | 鱼群 | 编队系统 | 坐标标尺 | 观众炮台 | 积分面板
 *       礼物通知 | 屏幕特效 | 顶部HUD | 音效 | WebSocket桥接
 */
(async function () {
  // ── PixiJS v8 应用初始化 ─────────────────────────────────────────────────────
  const app = new PIXI.Application();
  await app.init({
    resizeTo:        window,
    backgroundColor: 0x000820,
    antialias:       true,
    resolution:      Math.min(window.devicePixelRatio || 1, 2),
    autoDensity:     true,
  });
  document.getElementById('game-container').appendChild(app.canvas);

  // ── 层级结构（从下到上）──────────────────────────────────────────────────────
  const gameStage = new PIXI.Container();   // 可整体震动的舞台
  const layerBg   = new PIXI.Container();
  const layerFish = new PIXI.Container();
  const layerFX   = new PIXI.Container();   // 特效/粒子（鱼层之上）
  const layerCannon  = new PIXI.Container();
  const layerUI      = new PIXI.Container();
  const layerTop     = new PIXI.Container(); // 最顶层：全屏通知、遮罩

  app.stage.addChild(gameStage, layerTop);
  gameStage.addChild(layerBg, layerFish, layerFX, layerCannon, layerUI);

  // ── 初始化各系统 ─────────────────────────────────────────────────────────────
  const waterBg     = new window.WaterBackground(app);
  const fishMgr     = new window.FishManager(app);
  const fishForm    = new window.FishFormation(app, fishMgr);
  const ruler       = new window.RulerUI(app);
  const scorePanel  = new window.ScorePanel(app);
  const cannonMgr   = new window.ViewerCannonManager(app, fishMgr, ruler, scorePanel);
  const giftNotif   = new window.GiftNotification(app);
  const screenFX    = new window.ScreenEffects(app, gameStage);
  const liveHUD     = new window.LiveHUD(app, cannonMgr);

  layerBg.addChild(waterBg.container);
  layerFish.addChild(fishMgr.container);
  layerCannon.addChild(cannonMgr.container);
  layerUI.addChild(ruler.container, scorePanel.container, screenFX.container);
  layerTop.addChild(giftNotif.container, liveHUD.container);

  // 把 HUD 钉在最顶部
  liveHUD.container.y = 0;

  // ── 暴露全局引用供各子模块使用 ───────────────────────────────────────────────
  window._game = { app, waterBg, fishMgr, fishForm, ruler, scorePanel,
                   cannonMgr, giftNotif, screenFX, liveHUD };

  // ── 音频初始化（首次用户交互后启动）──────────────────────────────────────────
  const startAudio = async () => {
    await window.AudioManager.init();
    window.AudioManager.startBGM();
    document.removeEventListener('pointerdown', startAudio);
    document.removeEventListener('keydown',     startAudio);
  };
  document.addEventListener('pointerdown', startAudio, { once: true });
  document.addEventListener('keydown',     startAudio, { once: true });

  // ── WebSocket 事件桥接 ──────────────────────────────────────────────────────
  window.LiveBridge.on('connected', () => {
    liveHUD.setConnected(true);
  });

  window.LiveBridge.on('disconnected', () => {
    liveHUD.setConnected(false);
  });

  window.LiveBridge.on('config', (msg) => {
    if (!msg.data) return;
    const d = msg.data;
    if (d.cannonLevels)       window.GameConfig.cannonLevels       = d.cannonLevels;
    if (d.maxCannonsOnScreen) window.GameConfig.maxCannonsOnScreen = d.maxCannonsOnScreen;
    if (d.scoreMultipliers)   window.GameConfig.scoreMultipliers   = d.scoreMultipliers;
    console.log('[Config] 已从服务器更新配置');
  });

  window.LiveBridge.on('gift', (evt) => {
    // 全屏礼物通知动画
    giftNotif.show(evt);
    // 屏幕轻震
    screenFX.flash(window.GameConfig.cannonLevels[evt.cannonLevel]?.glowColor || 0xFFFFFF, 0.12, 0.06);
    // 创建炮台
    cannonMgr.onGiftEvent(evt);
    // 音效
    window.AudioManager && window.AudioManager.playGiftArrival && window.AudioManager.playGiftArrival(evt.cannonLevel);
  });

  window.LiveBridge.on('coordinate', (evt) => {
    cannonMgr.onCoordinateEvent(evt);
    // 炮击音效在 ViewerCannon.fire() 内部触发
    window.AudioManager && window.AudioManager.playFire(
      cannonMgr._cannons.get(evt.viewerId)?.level || 1
    );
  });

  window.LiveBridge.on('leaderboard', (msg) => {
    scorePanel.onLeaderboardUpdate(msg.data);
  });

  window.LiveBridge.on('reset', (msg) => {
    // 管理员重置：清空所有炮台
    cannonMgr._cannons.forEach((cannon) => {
      cannon._startRemoving();
    });
    setTimeout(() => cannonMgr._cannons.clear(), 1500);
    if (msg.clearScores) {
      scorePanel.onLeaderboardUpdate([]);
      liveHUD._totalScore = 0;
      liveHUD._fishCaught = 0;
    }
    screenFX.flash(0x00d4ff, 0.3, 0.04);
    console.log('[重置] 游戏已重置');
  });

  window.LiveBridge.connect();

  // ── 游戏主循环 ───────────────────────────────────────────────────────────────
  app.ticker.add((ticker) => {
    const delta = ticker.deltaTime;
    waterBg.update(delta);
    fishMgr.update(delta);
    fishForm.update(delta);
    cannonMgr.update(delta);
    screenFX.update(delta);
    liveHUD.update(delta);
  });

  // ── 窗口缩放 ─────────────────────────────────────────────────────────────────
  window.addEventListener('resize', () => {
    waterBg.onResize();
    ruler.onResize();
    scorePanel.onResize();
    screenFX.onResize();
    liveHUD.onResize();
  });

  // ── 移除加载遮罩 ─────────────────────────────────────────────────────────────
  setTimeout(() => {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
      overlay.style.opacity = '0';
      setTimeout(() => overlay.remove(), 800);
    }
  }, 1200);

  // ── 调试快捷键（开发测试，生产环境可移除）────────────────────────────────────
  window.addEventListener('keydown', (e) => {
    // 数字 1-5：模拟对应等级礼物
    if (e.key >= '1' && e.key <= '5') {
      const gifts = ['小心心', '音乐盒', '嘉年华', '火箭', '飞机'];
      const id    = 'test_' + e.key + '_' + Date.now();
      window.LiveBridge.simulateGift(id, `测试用户${e.key}号`, gifts[+e.key - 1]);
    }
    // F：第一个炮台随机坐标开炮
    if (e.key === 'f' || e.key === 'F') {
      const viewerId = Array.from(cannonMgr._cannons.keys())[0];
      if (viewerId) {
        const x = Math.floor(Math.random() * (app.screen.width - 200) + 100);
        const y = Math.floor(Math.random() * (app.screen.height - 200) + 100);
        window.LiveBridge.simulateCoordinate(viewerId, '测试用户', x, y);
      }
    }
    // B：触发 BOSS 鱼（测试编队系统）
    if (e.key === 'b' || e.key === 'B') {
      fishForm._spawnBoss();
    }
    // M：静音切换
    if (e.key === 'm' || e.key === 'M') {
      window.AudioManager && window.AudioManager.toggleMute();
    }
  });

  console.log('🎣 捕鱼达人抖音直播版 已启动');
  console.log('快捷键: 1-5=模拟礼物 | F=开炮 | B=BOSS鱼 | M=静音');
})();
