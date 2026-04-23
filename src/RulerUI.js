/**
 * RulerUI.js — 屏幕坐标标尺
 * 底部（X轴）+ 左侧（Y轴）刻度尺，帮助观众输入炮台坐标
 */
window.RulerUI = class RulerUI {
  constructor(app) {
    this.app       = app;
    this.container = new PIXI.Container();

    this._xGfx    = new PIXI.Graphics();   // 底部横向标尺
    this._yGfx    = new PIXI.Graphics();   // 左侧纵向标尺
    this._xLabels = new PIXI.Container();
    this._yLabels = new PIXI.Container();
    this._crosshair = new PIXI.Graphics();  // 瞄准十字线（全屏辅助线）

    this.container.addChild(this._xGfx, this._yGfx, this._xLabels, this._yLabels, this._crosshair);

    this.draw();
  }

  get thickness() { return window.GameConfig.ruler.thickness; }

  draw() {
    this._drawXRuler();
    this._drawYRuler();
  }

  _drawXRuler() {
    const g    = this._xGfx;
    const cfg  = window.GameConfig.ruler;
    const w    = this.app.screen.width;
    const h    = this.app.screen.height;
    const th   = this.thickness;

    g.clear();
    // 标尺背景
    g.rect(th, h - th, w - th, th)
     .fill({ color: 0x000d1a, alpha: cfg.bgAlpha });
    g.rect(th, h - th, w - th, 1)
     .fill({ color: cfg.color, alpha: 0.9 });

    // 清空旧标签
    this._xLabels.removeChildren();

    const tickEvery  = cfg.tickEvery;
    const labelEvery = cfg.labelEvery;

    for (let px = 0; px <= w - th; px += tickEvery) {
      const isLabel = px % labelEvery === 0;
      const tickH   = isLabel ? th * 0.6 : th * 0.35;
      g.rect(th + px - 0.5, h - th, 1, tickH)
       .fill({ color: cfg.color, alpha: isLabel ? 1 : 0.5 });

      if (isLabel) {
        const label = new PIXI.Text({
          text: String(px),
          style: { fill: '#00e5ff', fontSize: 11, fontFamily: 'Consolas, monospace' }
        });
        label.anchor.set(0.5, 0);
        label.x = th + px;
        label.y = h - th + 3;
        this._xLabels.addChild(label);
      }
    }

    // 标尺角标 X
    const xLabel = new PIXI.Text({ text: 'X', style: { fill: '#ff6600', fontSize: 13, fontWeight: 'bold' } });
    xLabel.x = th + 4;
    xLabel.y = h - th + th * 0.1;
    this._xLabels.addChild(xLabel);
  }

  _drawYRuler() {
    const g    = this._yGfx;
    const cfg  = window.GameConfig.ruler;
    const h    = this.app.screen.height;
    const th   = this.thickness;

    g.clear();
    // 标尺背景
    g.rect(0, 0, th, h - th)
     .fill({ color: 0x000d1a, alpha: cfg.bgAlpha });
    g.rect(th - 1, 0, 1, h - th)
     .fill({ color: cfg.color, alpha: 0.9 });

    this._yLabels.removeChildren();

    const tickEvery  = cfg.tickEvery;
    const labelEvery = cfg.labelEvery;

    for (let py = 0; py <= h - th; py += tickEvery) {
      const isLabel = py % labelEvery === 0;
      const tickW   = isLabel ? th * 0.6 : th * 0.35;
      g.rect(th - tickW, py, tickW, 1)
       .fill({ color: cfg.color, alpha: isLabel ? 1 : 0.5 });

      if (isLabel) {
        const label = new PIXI.Text({
          text: String(py),
          style: { fill: '#00e5ff', fontSize: 11, fontFamily: 'Consolas, monospace' }
        });
        label.anchor.set(1, 0.5);
        label.x = th - 4;
        label.y = py;
        this._yLabels.addChild(label);
      }
    }

    // 角落 Y 标签
    const yLabel = new PIXI.Text({ text: 'Y', style: { fill: '#ff6600', fontSize: 13, fontWeight: 'bold' } });
    yLabel.x = 4;
    yLabel.y = 4;
    this._yLabels.addChild(yLabel);

    // 左上角背景块
    g.rect(0, h - th, th, th).fill({ color: 0x000820, alpha: 0.9 });
    const origin = new PIXI.Text({ text: '0,0', style: { fill: '#00e5ff', fontSize: 10 } });
    origin.x = 2;
    origin.y = h - th + 2;
    this._yLabels.addChild(origin);
  }

  // 显示瞄准十字线
  showAimLine(x, y, color = 0x00ff88) {
    const g  = this._crosshair;
    const w  = this.app.screen.width;
    const h  = this.app.screen.height;
    const th = this.thickness;

    g.clear();
    // 横线
    g.rect(th, y - 0.5, w - th, 1).fill({ color, alpha: 0.4 });
    // 竖线
    g.rect(x + th - 0.5, 0, 1, h - th).fill({ color, alpha: 0.4 });
    // 中心圆
    g.circle(x + th, y, 8).fill({ color, alpha: 0.7 });
    g.circle(x + th, y, 14).stroke({ color, width: 1.5, alpha: 0.5 });
  }

  clearAimLine() {
    this._crosshair.clear();
  }

  // 坐标转换（游戏坐标 → 屏幕坐标，减去标尺偏移）
  toScreenX(gameX) { return gameX + this.thickness; }
  toScreenY(gameY) { return gameY; }

  // 观众输入的坐标 → 游戏内坐标（减去标尺厚度）
  fromInputX(inputX) { return inputX; }  // 观众输入坐标即游戏坐标
  fromInputY(inputY) { return inputY; }

  onResize() { this.draw(); }
};
