/**
 * GiftNotification.js — 礼物到达全屏动画
 * 当观众刷礼物时在屏幕中央显示华丽的通知动画
 */
window.GiftNotification = class GiftNotification {
  constructor(app) {
    this.app       = app;
    this.container = new PIXI.Container();
    this._queue    = [];     // 通知队列
    this._current  = null;  // 当前正在播放的通知
    this._playing  = false;
  }

  // ── 加入队列 ───────────────────────────────────────────────────────────────
  show(evt) {
    this._queue.push(evt);
    if (!this._playing) this._playNext();
  }

  _playNext() {
    if (this._queue.length === 0) { this._playing = false; return; }
    this._playing = true;
    const evt = this._queue.shift();
    this._playNotification(evt);
  }

  // ── 播放单条通知 ──────────────────────────────────────────────────────────
  _playNotification(evt) {
    const { viewerName, giftName, cannonLevel } = evt;
    const w = this.app.screen.width;
    const h = this.app.screen.height;

    const levelColors = [0xffffff, 0xCD7F32, 0xC0C0C0, 0xFFD700, 0xFF4500, 0xFF00FF];
    const color       = levelColors[cannonLevel] || 0xffffff;
    const hexColor    = '#' + color.toString(16).padStart(6, '0');

    const wrap = new PIXI.Container();
    wrap.x = w / 2;
    wrap.y = h / 2;
    this.container.addChild(wrap);

    // ── 背景光晕 ──────────────────────────────────────────────────────────
    const glow = new PIXI.Graphics();
    glow.circle(0, 0, 200).fill({ color, alpha: 0.08 });
    glow.circle(0, 0, 140).fill({ color, alpha: 0.12 });
    glow.circle(0, 0, 90).fill({ color, alpha: 0.18 });
    const blurFilter = new PIXI.BlurFilter(20);
    glow.filters = [blurFilter];
    wrap.addChild(glow);

    // ── 中央礼物图标（等级星爆）──────────────────────────────────────────
    const icon = new PIXI.Graphics();
    this._drawStarburst(icon, 0, 0, 70, cannonLevel, color);
    wrap.addChild(icon);

    // ── 礼物名称 ──────────────────────────────────────────────────────────
    const giftLabel = new PIXI.Text({
      text: giftName,
      style: {
        fill: hexColor, fontSize: 32, fontWeight: 'bold',
        stroke: { color: '#000000', width: 4 },
        dropShadow: { color: '#000000', blur: 8, distance: 0 },
      }
    });
    giftLabel.anchor.set(0.5);
    giftLabel.y = -85;
    wrap.addChild(giftLabel);

    // ── 观众名称 ──────────────────────────────────────────────────────────
    const nameLabel = new PIXI.Text({
      text: `${viewerName} 送出了`,
      style: {
        fill: '#ffffff', fontSize: 18, fontWeight: '500',
        stroke: { color: '#000000', width: 3 },
        dropShadow: { color: '#000000', blur: 6, distance: 0 },
      }
    });
    nameLabel.anchor.set(0.5);
    nameLabel.y = -115;
    wrap.addChild(nameLabel);

    // ── 炮弹等级文字 ──────────────────────────────────────────────────────
    const lvNames = ['', '铜炮', '银炮', '金炮', '火焰炮', '彩虹炮'];
    const lvLabel = new PIXI.Text({
      text: `获得 Lv.${cannonLevel} ${lvNames[cannonLevel] || ''} 🎯`,
      style: {
        fill: hexColor, fontSize: 22, fontWeight: 'bold',
        stroke: { color: '#000000', width: 3 },
      }
    });
    lvLabel.anchor.set(0.5);
    lvLabel.y = 88;
    wrap.addChild(lvLabel);

    // ── 粒子爆炸 ──────────────────────────────────────────────────────────
    this._spawnParticles(wrap, color, cannonLevel);

    // ── 动画序列 ──────────────────────────────────────────────────────────
    wrap.scale.set(0.3);
    wrap.alpha = 0;

    let frame = 0;
    const totalFrames = 120 + cannonLevel * 10;  // 持续时长按等级增加

    const tick = this.app.ticker.add(() => {
      frame++;

      // 进场（0-20帧）
      if (frame <= 20) {
        const p    = frame / 20;
        const ease = 1 - Math.pow(1 - p, 4);  // easeOutQuart
        wrap.scale.set(0.3 + ease * 0.7);
        wrap.alpha = p;
        icon.rotation += 0.05;
      }
      // 停留（20 ~ totalFrames-25帧）
      else if (frame <= totalFrames - 25) {
        wrap.scale.set(1);
        wrap.alpha = 1;
        icon.rotation += 0.02;
        glow.scale.set(0.9 + Math.sin(frame * 0.08) * 0.1);
      }
      // 退场（最后25帧）
      else {
        const p    = (frame - (totalFrames - 25)) / 25;
        const ease = p * p;
        wrap.scale.set(1 + ease * 0.3);
        wrap.alpha = 1 - ease;
      }

      if (frame >= totalFrames) {
        this.app.ticker.remove(tick);
        this.container.removeChild(wrap);
        this._playNext();
      }
    });

    this._current = { wrap, tick };

    // 播放音效
    window.AudioManager && window.AudioManager.playGiftArrival(cannonLevel);
  }

  // ── 星爆图案 ──────────────────────────────────────────────────────────────
  _drawStarburst(g, cx, cy, r, level, color) {
    const points = 6 + level * 2;
    for (let i = 0; i < points; i++) {
      const a1 = (i / points) * Math.PI * 2 - Math.PI / 2;
      const a2 = ((i + 0.5) / points) * Math.PI * 2 - Math.PI / 2;
      const outerX1 = cx + Math.cos(a1) * r;
      const outerY1 = cy + Math.sin(a1) * r;
      const innerX  = cx + Math.cos(a2) * r * 0.45;
      const innerY  = cy + Math.sin(a2) * r * 0.45;
      const a3      = ((i + 1) / points) * Math.PI * 2 - Math.PI / 2;
      const outerX2 = cx + Math.cos(a3) * r;
      const outerY2 = cy + Math.sin(a3) * r;
      g.poly([cx, cy, outerX1, outerY1, innerX, innerY, outerX2, outerY2])
       .fill(color);
    }
    // 中心圆
    g.circle(cx, cy, r * 0.4).fill(0xffffff);
    g.circle(cx, cy, r * 0.25).fill(color);
  }

  // ── 粒子爆炸效果 ──────────────────────────────────────────────────────────
  _spawnParticles(parent, color, level) {
    const count = 12 + level * 6;
    const particles = [];

    for (let i = 0; i < count; i++) {
      const p = new PIXI.Graphics();
      const r = 3 + Math.random() * 6;

      // 交替圆形和菱形粒子
      if (i % 2 === 0) {
        p.circle(0, 0, r).fill(color);
      } else {
        p.poly([0, -r*1.5, r, 0, 0, r*1.5, -r, 0]).fill(0xFFFFFF);
      }

      const angle  = (i / count) * Math.PI * 2 + Math.random() * 0.3;
      const speed  = 3 + Math.random() * (2 + level);
      const vx     = Math.cos(angle) * speed;
      const vy     = Math.sin(angle) * speed;
      const life   = 40 + Math.random() * 30;
      particles.push({ gfx: p, vx, vy, life, maxLife: life });
      parent.addChild(p);
    }

    let frame = 0;
    const tick = this.app.ticker.add(() => {
      frame++;
      for (let i = particles.length - 1; i >= 0; i--) {
        const pt = particles[i];
        pt.life--;
        pt.gfx.x  += pt.vx;
        pt.gfx.y  += pt.vy;
        pt.vy     += 0.15;  // 重力
        pt.gfx.alpha = pt.life / pt.maxLife;
        pt.gfx.rotation += 0.1;
        if (pt.life <= 0) {
          parent.removeChild(pt.gfx);
          particles.splice(i, 1);
        }
      }
      if (particles.length === 0) this.app.ticker.remove(tick);
    });
  }
};
