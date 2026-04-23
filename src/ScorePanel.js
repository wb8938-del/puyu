/**
 * ScorePanel.js — 积分排行面板（右侧）完整版
 * 功能：实时排行榜 | 观众头像圆形裁切 | 今日/总分切换 | 异步头像加载
 */
window.ScorePanel = class ScorePanel {
  constructor(app) {
    this.app         = app;
    this.container   = new PIXI.Container();
    this._scores     = new Map();  // viewerId → { name, avatar, total, today }
    this._mode       = 'total';    // 'total' | 'today'
    this._todayStart = this._dayStart();
    this._rowsContainer = null;
    this._btnToday = null;
    this._btnTotal = null;

    this._build();
    this._loadFromServer();
  }

  _dayStart() {
    const d = new Date(); d.setHours(0,0,0,0); return d.getTime();
  }

  get _pw() { return 230; }
  get _ph() { return 360; }
  get _px() { return this.app.screen.width - this._pw - 10; }
  get _py() { return 46; }

  // ── 初始构建 ────────────────────────────────────────────────────────────────
  _build() {
    this._bg   = new PIXI.Graphics();
    this._body = new PIXI.Container();
    this.container.addChild(this._bg, this._body);
    this._drawBg();
    this._buildHeader();
    this._buildRowsArea();
  }

  _drawBg() {
    const g = this._bg;
    const { _px:px, _py:py, _pw:pw, _ph:ph } = this;
    g.clear();
    g.roundRect(px, py, pw, ph, 12).fill({ color: 0x000d1a, alpha: 0.82 });
    g.roundRect(px, py, pw, ph, 12).stroke({ color: 0x00d4ff, width: 1, alpha: 0.35 });
    g.roundRect(px, py, pw, 34, 12).fill({ color: 0x001a40, alpha: 0.95 });
    g.rect(px, py + 22, pw, 12).fill({ color: 0x001a40, alpha: 0.95 });
  }

  _buildHeader() {
    const { _px:px, _py:py, _pw:pw } = this;

    this._titleText = new PIXI.Text({ text: '🏆 排行榜',
      style: { fill:'#FFD700', fontSize:14, fontWeight:'bold',
               fontFamily:'Microsoft YaHei, system-ui' } });
    this._titleText.x = px + 10; this._titleText.y = py + 8;
    this._body.addChild(this._titleText);

    this._btnToday = this._makeTabBtn('今日', px + pw - 90, py + 7, false);
    this._btnTotal = this._makeTabBtn('总榜', px + pw - 45, py + 7, true);
    this._body.addChild(this._btnToday, this._btnTotal);
  }

  _makeTabBtn(label, x, y, active) {
    const btn = new PIXI.Container();
    const bg  = new PIXI.Graphics();
    const clr = active ? 0x00d4ff : 0x1a3a5c;
    bg.roundRect(0, 0, 38, 20, 5).fill({ color: clr, alpha: active ? 0.9 : 0.7 });
    const txt = new PIXI.Text({ text: label,
      style: { fill: active ? '#000000':'#5580a0', fontSize:11, fontWeight:'bold' } });
    txt.anchor.set(0.5); txt.x = 19; txt.y = 10;
    btn.addChild(bg, txt);
    btn.x = x; btn.y = y;
    btn.cursor = 'pointer'; btn.interactive = true;
    btn._bg = bg; btn._txt = txt; btn._label = label;
    btn.on('pointerdown', () => this._switchMode(label === '今日' ? 'today' : 'total'));
    return btn;
  }

  _switchMode(mode) {
    this._mode = mode;
    [this._btnToday, this._btnTotal].forEach(btn => {
      const isActive = (btn._label === '今日' && mode === 'today') ||
                       (btn._label === '总榜' && mode === 'total');
      btn._bg.clear();
      btn._bg.roundRect(0, 0, 38, 20, 5)
             .fill({ color: isActive ? 0x00d4ff : 0x1a3a5c, alpha: isActive ? 0.9 : 0.7 });
      btn._txt.style = { fill: isActive ? '#000000':'#5580a0', fontSize:11, fontWeight:'bold' };
    });
    this._refreshRows();
  }

  _buildRowsArea() {
    const { _px:px, _py:py, _pw:pw, _ph:ph } = this;
    const rowsY = py + 38;
    const rowsH = ph - 38;

    if (this._rowsContainer) this._body.removeChild(this._rowsContainer);

    this._rowsContainer = new PIXI.Container();
    this._rowsContainer.x = px;
    this._rowsContainer.y = rowsY;
    this._body.addChild(this._rowsContainer);

    const mask = new PIXI.Graphics();
    mask.rect(px, rowsY, pw, rowsH).fill(0xffffff);
    this._rowsContainer.mask = mask;
    this._body.addChild(mask);
    this._maskGfx = mask;

    this._refreshRows();
  }

  // ── 排行行渲染 ──────────────────────────────────────────────────────────────
  _refreshRows() {
    if (!this._rowsContainer) return;
    this._rowsContainer.removeChildren();

    const sorted = Array.from(this._scores.values())
      .map(e => ({ ...e, display: this._mode === 'today' ? (e.today || 0) : e.total }))
      .sort((a, b) => b.display - a.display)
      .slice(0, 10);

    const pw       = this._pw;
    const rowH     = 30;
    const rankEmoji = ['🥇','🥈','🥉'];
    const rankColor = [0xFFD700, 0xC0C0C0, 0xCD7F32];

    sorted.forEach((entry, idx) => {
      const row = new PIXI.Container();
      row.y = idx * rowH;

      // 背景
      const rowBg = new PIXI.Graphics();
      rowBg.rect(0, 0, pw, rowH - 1)
           .fill({ color: idx % 2 === 0 ? 0x001020 : 0x000d1a, alpha: 0.6 });
      row.addChild(rowBg);

      // 排名
      const rankTxt = new PIXI.Text({ text: idx < 3 ? rankEmoji[idx] : String(idx+1),
        style: { fill: idx < 3 ? rankColor[idx] : 0x5580a0,
                 fontSize: idx < 3 ? 14 : 11,
                 fontFamily: 'Microsoft YaHei, system-ui' } });
      rankTxt.anchor.set(0, 0.5); rankTxt.x = 5; rankTxt.y = rowH/2;
      row.addChild(rankTxt);

      // 头像
      const avatarR = 11;
      const avatarX = 34;
      const avatarBg = new PIXI.Graphics();
      avatarBg.circle(avatarX, rowH/2, avatarR).fill(rankColor[idx] || 0x1a5c8c);
      row.addChild(avatarBg);

      const initTxt = new PIXI.Text({ text: (entry.name||'?')[0].toUpperCase(),
        style: { fill:'#ffffff', fontSize:10, fontWeight:'bold' } });
      initTxt.anchor.set(0.5); initTxt.x = avatarX; initTxt.y = rowH/2;
      row.addChild(initTxt);

      if (entry.avatar) {
        PIXI.Assets.load(entry.avatar).then(tex => {
          const sp = new PIXI.Sprite(tex);
          sp.width = avatarR*2; sp.height = avatarR*2;
          sp.anchor.set(0.5); sp.x = avatarX; sp.y = rowH/2;
          const msk = new PIXI.Graphics();
          msk.circle(avatarX, rowH/2, avatarR).fill(0xffffff);
          sp.mask = msk;
          row.addChild(msk, sp);
          initTxt.visible = false;
        }).catch(() => {});
      }

      // 名称
      const nameTxt = new PIXI.Text({
        text: this._trunc(entry.name || '匿名', 6),
        style: { fill: idx === 0 ? '#FFD700' : '#c0e0ff', fontSize:12,
                 fontFamily:'Microsoft YaHei, system-ui' }
      });
      nameTxt.anchor.set(0, 0.5);
      nameTxt.x = avatarX + avatarR + 4; nameTxt.y = rowH/2;
      row.addChild(nameTxt);

      // 积分
      const scoreTxt = new PIXI.Text({
        text: this._fmt(entry.display),
        style: { fill: idx < 3 ? rankColor[idx] : '#88ccff',
                 fontSize:12, fontWeight:'bold',
                 fontFamily:'Microsoft YaHei, system-ui' }
      });
      scoreTxt.anchor.set(1, 0.5); scoreTxt.x = pw - 6; scoreTxt.y = rowH/2;
      row.addChild(scoreTxt);

      // 入场动画（从右侧滑入）
      row.x = 60; row.alpha = 0;
      const delay = idx * 40;
      let t = 0;
      const anim = this.app.ticker.add(() => {
        t++;
        if (t < delay) return;
        const p = Math.min((t - delay) / 15, 1);
        const ease = 1 - Math.pow(1 - p, 3);
        row.x    = 60 * (1 - ease);
        row.alpha = p;
        if (p >= 1) this.app.ticker.remove(anim);
      });

      this._rowsContainer.addChild(row);
    });

    if (sorted.length === 0) {
      const empty = new PIXI.Text({ text: '暂无数据\n刷礼物参与游戏！',
        style: { fill:'#3a5a7c', fontSize:13, align:'center',
                 fontFamily:'Microsoft YaHei, system-ui' } });
      empty.anchor.set(0.5, 0); empty.x = this._pw/2; empty.y = 30;
      this._rowsContainer.addChild(empty);
    }
  }

  // ── 添加积分 ─────────────────────────────────────────────────────────────────
  addScore(viewerId, viewerName, viewerAvatar, score) {
    const isToday = true;
    const ex = this._scores.get(viewerId);
    if (ex) {
      ex.total += score;
      ex.today  = (ex.today || 0) + score;
      ex.name   = viewerName;
      if (viewerAvatar) ex.avatar = viewerAvatar;
    } else {
      this._scores.set(viewerId, { name:viewerName, avatar:viewerAvatar, total:score, today:score });
    }
    this._refreshRows();
  }

  // ── 服务器全量更新 ────────────────────────────────────────────────────────
  onLeaderboardUpdate(data) {
    if (!data) return;
    this._scores.clear();
    data.forEach(e => {
      this._scores.set(e.viewerId, {
        name: e.viewerName, avatar: e.viewerAvatar,
        total: e.totalScore || 0, today: e.todayScore || 0,
      });
    });
    this._refreshRows();
  }

  async _loadFromServer() {
    try {
      const res  = await fetch(`${window.GameConfig.apiBase}/scores`);
      const data = await res.json();
      this.onLeaderboardUpdate(data);
    } catch (_) {}
  }

  onResize() {
    this._drawBg();
    this._titleText.x = this._px + 10;
    this._titleText.y = this._py + 8;
    if (this._btnToday) { this._btnToday.x = this._px + this._pw - 90; this._btnToday.y = this._py + 7; }
    if (this._btnTotal) { this._btnTotal.x = this._px + this._pw - 45; this._btnTotal.y = this._py + 7; }
    this._buildRowsArea();
  }

  _fmt(n)        { return n >= 10000 ? (n/10000).toFixed(1)+'万' : String(n); }
  _trunc(s, max) { return s && s.length > max ? s.slice(0,max)+'…' : (s || ''); }
};
