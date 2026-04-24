/**
 * FishFormation.js — 鱼群编队系统（修复版）
 *
 * 修复要点：
 *  - 所有编队通过 fishManager.spawnFormation() 生成（逐条延迟 0.5s 出现）
 *  - 大幅降低触发频率：30~50 秒一次，BOSS 鱼 2 分钟一次
 *  - 编队鱼数量减少：3~5 条
 *  - 遵守 _maxFish 上限，不超出
 */
window.FishFormation = class FishFormation {
  constructor(app, fishManager) {
    this.app         = app;
    this.fishManager = fishManager;
    this._timer      = 0;
    this._interval   = 1800 + Math.random() * 1200;  // 30~50 秒
    this._lastBoss   = 0;
    this._bossInterval = 7200;                         // ~120 秒
  }

  update(delta) {
    this._timer    += delta;
    this._lastBoss += delta;

    if (this._timer >= this._interval) {
      this._timer    = 0;
      this._interval = 1800 + Math.random() * 1200;

      // 屏幕已经够多就跳过
      if (this.fishManager.fishes.length < this.fishManager._maxFish - 3) {
        this._spawnFormation();
      }
    }

    if (this._lastBoss >= this._bossInterval) {
      this._lastBoss = 0;
      if (this.fishManager.fishes.length < this.fishManager._maxFish) {
        this._spawnBoss();
      }
    }
  }

  _spawnFormation() {
    // 编队只用 fish1~fish5（小中型鱼，rarity 1~5）
    const smallTypes = ['fish1','fish2','fish3','fish4','fish5'];
    const typeId     = smallTypes[Math.floor(Math.random() * smallTypes.length)];
    const count      = 3 + Math.floor(Math.random() * 3);  // 3~5 条
    this.fishManager.spawnFormation(typeId, count);
  }

  _spawnBoss() {
    const types = window.GameConfig.fishTypes;
    // BOSS 鱼用 shark1（原版最大鱼）
    this.fishManager.spawnFormation('shark1', 1);

    // 全屏特效
    if (window._game && window._game.screenFX) {
      window._game.screenFX.flash(0xFF8800, 0.25, 0.04);
      window._game.screenFX.shake(5, 0.9);
    }
    console.log('[Formation] BOSS 鱼登场！');
  }
};
