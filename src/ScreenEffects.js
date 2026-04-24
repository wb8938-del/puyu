/**
 * ScreenEffects.js — 屏幕特效管理器
 * 处理：屏幕震动 | 全屏闪光 | 连击计数显示 | 分数弹出数字 | 爆炸光环
 */
window.ScreenEffects = class ScreenEffects {
  constructor(app, stage) {
    this.app       = app;
    this.stage     = stage;   // 整体 stage，震动时移动它
    this._overlay  = new PIXI.Container();    // 最顶层覆盖效果
    this._floats   = new PIXI.Container();    // 飘动积分数字
    this._comboWrap= new PIXI.Container();    // 连击UI
    this.container = new PIXI.Container();
    this.container.addChild(this._overlay, this._floats, this._comboWrap);

    this._shakeX = 0;
    this._shakeY = 0;
    this._shakeDecay = 0;
    this._shakeIntensity = 0;

    this._comboCount  = 0;
    this._comboTimer  = 0;
    this._comboResetFrames = 120;  // 2秒无连击则重置
    this._comboLabel  = null;

    this._flashGfx = new PIXI.Graphics();
    this._flashAlpha = 0;
    this._overlay.addChild(this._flashGfx);

    this._buildComboUI();
  }

  // ════════════════════════════════════════════════════════════════════════════
  //  屏幕震动
  // ════════════════════════════════════════════════════════════════════════════
  shake(intensity = 8, decay = 0.85) {
    this._shakeIntensity = intensity;
    this._shakeDecay     = decay;
  }

  // ════════════════════════════════════════════════════════════════════════════
  //  全屏闪光
  // ════════════════════════════════════════════════════════════════════════════
  flash(color = 0xFFFFFF, alpha = 0.4, decay = 0.08) {
    const w = this.app.screen.width;
    const h = this.app.screen.height;
    this._flashGfx.clear();
    this._flashGfx.rect(0, 0, w, h).fill(color);
    this._flashAlpha   = alpha;
    this._flashDecay   = decay;
    this._flashGfx.alpha = alpha;
  }

  // ════════════════════════════════════════════════════════════════════════════
  //  连击系统
  // ════════════════════════════════════════════════════════════════════════════
  _buildComboUI() {
    this._comboLabel = new PIXI.Text({
      text: '',
      style: {
        fill: '#FFD700', fontSize: 48, fontWeight: 'bold',
        stroke: { color: '#FF6600', width: 5 },
        dropShadow: { color: '#000000', blur: 10, distance: 0 },
      }
    });
    this._comboLabel.anchor.set(0.5);
    this._comboLabel.x = this.app.screen.width / 2;
    this._comboLabel.y = this.app.screen.height * 0.35;
    this._comboLabel.alpha = 0;
    this._comboWrap.addChild(this._comboLabel);

    this._comboSubLabel = new PIXI.Text({
      text: '',
      style: { fill: '#ffffff', fontSize: 20, fontWeight: 'bold',
               stroke: { color: '#FF6600', width: 3 } }
    });
    this._comboSubLabel.anchor.set(0.5);
    this._comboSubLabel.x = this._comboLabel.x;
    this._comboSubLabel.y = this._comboLabel.y + 55;
    this._comboSubLabel.alpha = 0;
    this._comboWrap.addChild(this._comboSubLabel);
  }

  addCombo(count = 1) {
    this._comboCount += count;
    this._comboTimer  = 0;

    if (this._comboCount >= 3) {
      const comboTexts  = {3:'三连击！',4:'四连击！',5:'五连击！',7:'超级连击！',10:'ULTRA COMBO!!',15:'MONSTER COMBO!!!',20:'GOD-LIKE!!!'};
      const displayText = comboTexts[this._comboCount] || (this._comboCount >= 5 ? `${this._comboCount}连击！` : null);

      if (displayText) {
        this._comboLabel.text  = displayText;
        this._comboLabel.alpha = 1;
        this._comboLabel.scale.set(0.5);
        this._comboSubLabel.text  = `×${this._comboCount}`;
        this._comboSubLabel.alpha = 1;

        // 弹跳动画
        let t = 0;
        const tick = this.app.ticker.add(() => {
          t++;
          const scale = 1 + Math.sin(t * 0.3) * 0.1 * Math.exp(-t * 0.03);
          this._comboLabel.scale.set(Math.min(1.5, 0.5 + t * 0.06));
          if (t > 20) this._comboLabel.scale.set(1 + Math.sin(t * 0.2) * 0.05);
          if (t > 80) {
            this._comboLabel.alpha -= 0.03;
            this._comboSubLabel.alpha -= 0.03;
          }
          if (t > 115) {
            this.app.ticker.remove(tick);
            this._comboLabel.alpha = 0;
            this._comboSubLabel.alpha = 0;
          }
        });

        window.AudioManager && window.AudioManager.playCombo(this._comboCount);
        this.shake(4 + Math.min(this._comboCount, 10) * 0.5);
      }
    }
  }

  resetCombo() {
    this._comboCount = 0;
    this._comboLabel.alpha = 0;
    this._comboSubLabel.alpha = 0;
  }

  // ════════════════════════════════════════════════════════════════════════════
  //  飘动积分数字
  // ════════════════════════════════════════════════════════════════════════════
  showScore(score, x, y, color = 0xFFD700) {
    const hexColor = '#' + color.toString(16).padStart(6, '0');
    const label = new PIXI.Text({
      text: `+${score}`,
      style: {
        fill: hexColor,
        fontSize: Math.min(14 + Math.log(score + 1) * 5, 48),
        fontWeight: 'bold',
        stroke: { color: '#000000', width: 3 },
        dropShadow: { color: '#000000', blur: 4, distance: 0 },
      }
    });
    label.anchor.set(0.5);
    label.x = x;
    label.y = y;
    label.alpha = 1;
    this._floats.addChild(label);

    let t = 0;
    const tick = this.app.ticker.add(() => {
      t++;
      label.y   -= 1.2;
      label.x   += Math.sin(t * 0.1) * 0.5;
      if (t > 30) label.alpha -= 0.04;
      label.scale.set(1 + Math.sin(t * 0.15) * 0.08);
      if (t > 55) {
        this.app.ticker.remove(tick);
        this._floats.removeChild(label);
      }
    });
  }

  // ════════════════════════════════════════════════════════════════════════════
  //  "倒计时紧急"特效（最后5秒红色脉动）
  // ════════════════════════════════════════════════════════════════════════════
  urgentPulse() {
    this.flash(0xFF0000, 0.08, 0.06);
    window.AudioManager && window.AudioManager.playTick(true);
  }

  // ════════════════════════════════════════════════════════════════════════════
  //  每帧更新
  // ════════════════════════════════════════════════════════════════════════════
  update(delta) {
    // 屏幕震动
    if (this._shakeIntensity > 0.5) {
      const angle = Math.random() * Math.PI * 2;
      this._shakeX = Math.cos(angle) * this._shakeIntensity;
      this._shakeY = Math.sin(angle) * this._shakeIntensity;
      this.stage.x = this._shakeX;
      this.stage.y = this._shakeY;
      this._shakeIntensity *= this._shakeDecay;
    } else if (this._shakeIntensity > 0) {
      this.stage.x = 0;
      this.stage.y = 0;
      this._shakeIntensity = 0;
    }

    // 闪光衰减
    if (this._flashAlpha > 0) {
      this._flashAlpha -= this._flashDecay || 0.05;
      this._flashGfx.alpha = Math.max(0, this._flashAlpha);
    }

    // 连击超时重置
    if (this._comboCount > 0) {
      this._comboTimer += delta;
      if (this._comboTimer >= this._comboResetFrames) {
        this.resetCombo();
      }
    }
  }

  onResize() {
    if (this._comboLabel) {
      this._comboLabel.x    = this.app.screen.width / 2;
      this._comboLabel.y    = this.app.screen.height * 0.35;
    }
    if (this._comboSubLabel) {
      this._comboSubLabel.x = this.app.screen.width / 2;
      this._comboSubLabel.y = this.app.screen.height * 0.35 + 55;
    }
    // Redraw flash background for new size
    if (this._flashGfx) {
      this._flashGfx.clear();
    }
  }
};
