/**
 * 抖音直播捕鱼游戏 - 后端服务器
 * 功能：礼物事件接收 | WebSocket 实时推送 | 积分存储(1个月) | 管理员配置
 */

const express = require('express');
const http    = require('http');
const WebSocket = require('ws');
const fs      = require('fs');
const path    = require('path');
const cors    = require('cors');
const { v4: uuidv4 } = require('uuid');

const app    = express();
const server = http.createServer(app);
const wss    = new WebSocket.Server({ server });

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));   // 静态文件服务

// ── 数据目录 ───────────────────────────────────────────────────────────────────
const DATA_DIR    = path.join(__dirname, 'data');
const CONFIG_FILE = path.join(DATA_DIR, 'config.json');
const SCORES_FILE = path.join(DATA_DIR, 'scores.json');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// ── 默认配置 ───────────────────────────────────────────────────────────────────
const DEFAULT_CONFIG = {
  giftMappings: [
    { giftName: '小心心',   giftValue: 1,    cannonLevel: 1 },
    { giftName: '玫瑰',     giftValue: 1,    cannonLevel: 1 },
    { giftName: '抖音',     giftValue: 5,    cannonLevel: 1 },
    { giftName: '音乐盒',   giftValue: 10,   cannonLevel: 2 },
    { giftName: '嘉年华',   giftValue: 100,  cannonLevel: 3 },
    { giftName: '火箭',     giftValue: 500,  cannonLevel: 4 },
    { giftName: '飞机',     giftValue: 1000, cannonLevel: 5 },
    { giftName: '游轮',     giftValue: 2000, cannonLevel: 5 },
  ],
  cannonLevels: {
    1: { name: '铜炮', bulletCount: 1, power: 1,  radius: 60,  color: '#CD7F32', glowColor: '#FF9A00', timeout: 30 },
    2: { name: '银炮', bulletCount: 2, power: 2,  radius: 85,  color: '#C0C0C0', glowColor: '#FFFFFF', timeout: 40 },
    3: { name: '金炮', bulletCount: 3, power: 4,  radius: 110, color: '#FFD700', glowColor: '#FFFF00', timeout: 50 },
    4: { name: '火焰炮', bulletCount: 5, power: 7,radius: 140, color: '#FF4500', glowColor: '#FF0000', timeout: 60 },
    5: { name: '彩虹炮', bulletCount: 8, power: 10,radius:180, color: '#FF00FF', glowColor: '#00FFFF', timeout: 90 }
  },
  scoreMultipliers: { 1: 1, 2: 1.5, 3: 2.5, 4: 4, 5: 7 },
  maxCannonsOnScreen: 8,
  autoFireOnTimeout: true
};

// ── 工具函数 ───────────────────────────────────────────────────────────────────
function readJSON(file, fallback) {
  try {
    if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (_) {}
  return typeof fallback === 'function' ? fallback() : fallback;
}

function writeJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}

// ── 分数清理（保留30天）─────────────────────────────────────────────────────────
function cleanupOldScores() {
  const scores = readJSON(SCORES_FILE, []);
  const cutoff  = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const cleaned = scores.filter(s => s.timestamp > cutoff);
  if (cleaned.length !== scores.length) {
    writeJSON(SCORES_FILE, cleaned);
    console.log(`[清理] 删除 ${scores.length - cleaned.length} 条过期积分记录`);
  }
}

cleanupOldScores();
setInterval(cleanupOldScores, 24 * 60 * 60 * 1000);

// ── WebSocket 广播 ─────────────────────────────────────────────────────────────
const clients = new Set();

wss.on('connection', ws => {
  clients.add(ws);
  console.log(`[WS] 客户端连接，当前共 ${clients.size} 个`);

  // 新连接时推送当前配置
  ws.send(JSON.stringify({ type: 'config', data: readJSON(CONFIG_FILE, DEFAULT_CONFIG) }));

  ws.on('close', () => { clients.delete(ws); });
  ws.on('error', () => { clients.delete(ws); });
});

function broadcast(msg) {
  const str = JSON.stringify(msg);
  clients.forEach(ws => {
    if (ws.readyState === WebSocket.OPEN) ws.send(str);
  });
}

// ── 工具：构建排行榜 ─────────────────────────────────────────────────────────────
function buildLeaderboard(scores) {
  const today  = new Date(); today.setHours(0,0,0,0);
  const agg    = {};
  scores.forEach(s => {
    if (!agg[s.viewerId]) {
      agg[s.viewerId] = {
        viewerId:    s.viewerId,
        viewerName:  s.viewerName,
        viewerAvatar: s.viewerAvatar,
        totalScore:  0,
        todayScore:  0,
        fireCount:   0,
        lastActive:  0,
      };
    }
    agg[s.viewerId].totalScore += s.score;
    agg[s.viewerId].fireCount  += 1;
    agg[s.viewerId].lastActive  = Math.max(agg[s.viewerId].lastActive, s.timestamp);
    if (s.timestamp >= today.getTime()) {
      agg[s.viewerId].todayScore += s.score;
    }
  });
  return Object.values(agg).sort((a, b) => b.totalScore - a.totalScore);
}

// ════════════════════════════════════════════════════════════════════════════════
//  REST API
// ════════════════════════════════════════════════════════════════════════════════

// ── 配置 ───────────────────────────────────────────────────────────────────────
app.get('/api/config', (req, res) => {
  res.json(readJSON(CONFIG_FILE, DEFAULT_CONFIG));
});

app.post('/api/config', (req, res) => {
  const config = req.body;
  if (!config || !config.giftMappings) return res.status(400).json({ error: '配置格式错误' });
  writeJSON(CONFIG_FILE, config);
  broadcast({ type: 'config', data: config });
  res.json({ ok: true });
});

// ── 礼物事件（来自抖音SDK或管理员手动触发）───────────────────────────────────────────
app.post('/api/gift', (req, res) => {
  const { viewerId, viewerName, viewerAvatar, giftName, giftCount = 1 } = req.body;
  if (!viewerId || !giftName) return res.status(400).json({ error: '缺少必要字段' });

  const config  = readJSON(CONFIG_FILE, DEFAULT_CONFIG);
  const mapping = config.giftMappings.find(m => m.giftName === giftName);
  const cannonLevel = mapping ? mapping.cannonLevel : 1;

  const event = {
    type: 'gift',
    id: uuidv4(),
    viewerId,
    viewerName:   viewerName  || `用户${viewerId.slice(-4)}`,
    viewerAvatar: viewerAvatar || `https://api.dicebear.com/7.x/fun-emoji/svg?seed=${viewerId}`,
    giftName,
    giftCount,
    cannonLevel,
    cannonConfig: config.cannonLevels[cannonLevel] || config.cannonLevels[1],
    timestamp: Date.now()
  };

  broadcast(event);
  console.log(`[礼物] ${event.viewerName} 送出 ${giftName} → 等级${cannonLevel}炮`);
  res.json({ ok: true, event });
});

// ── 弹幕坐标指令（来自抖音评论）──────────────────────────────────────────────────
app.post('/api/comment', (req, res) => {
  const { viewerId, viewerName, comment } = req.body;
  if (!viewerId || !comment) return res.status(400).json({ error: '缺少字段' });

  // 支持格式：
  //   "x:300 y:450"  "x=300,y=450"  "300 450"  "炮:300,450"  "开炮300,450"
  const match =
    comment.match(/[xX][=:]\s*(\d+)[,\s]+[yY][=:]\s*(\d+)/) ||
    comment.match(/[炮开火][:：]?\s*(\d+)[,，\s]+(\d+)/)      ||
    comment.match(/^(\d+)[,，\s]+(\d+)$/);

  if (match) {
    const event = {
      type: 'coordinate',
      viewerId,
      viewerName: viewerName || viewerId,
      x: parseInt(match[1]),
      y: parseInt(match[2]),
      timestamp: Date.now()
    };
    broadcast(event);
    console.log(`[坐标] ${viewerName} → (${event.x}, ${event.y})`);
    res.json({ ok: true, parsed: { x: event.x, y: event.y } });
  } else {
    res.json({ ok: true, parsed: null });
  }
});

// ── 积分 ───────────────────────────────────────────────────────────────────────
app.get('/api/scores', (req, res) => {
  const scores = readJSON(SCORES_FILE, []);
  res.json(buildLeaderboard(scores).slice(0, 50));
});

app.post('/api/scores', (req, res) => {
  const { viewerId, viewerName, viewerAvatar, score, cannonLevel, fishCaught } = req.body;
  if (!viewerId || score == null) return res.status(400).json({ error: '缺少字段' });

  const scores = readJSON(SCORES_FILE, []);
  const record = { viewerId, viewerName, viewerAvatar, score, cannonLevel, fishCaught, timestamp: Date.now() };
  scores.push(record);
  writeJSON(SCORES_FILE, scores);

  const leaderboard = buildLeaderboard(scores).slice(0, 10);
  broadcast({ type: 'leaderboard', data: leaderboard });
  console.log(`[积分] ${viewerName} +${score}分 (Lv${cannonLevel})`);
  res.json({ ok: true });
});

// ── 管理员接口 ─────────────────────────────────────────────────────────────────
app.get('/api/admin/scores', (req, res) => {
  const scores = readJSON(SCORES_FILE, []);
  res.json(scores.sort((a, b) => b.timestamp - a.timestamp));
});

app.delete('/api/admin/scores', (req, res) => {
  writeJSON(SCORES_FILE, []);
  broadcast({ type: 'leaderboard', data: [] });
  res.json({ ok: true });
});

// 手动广播任意事件（管理员调试用）
app.post('/api/admin/broadcast', (req, res) => {
  broadcast(req.body);
  res.json({ ok: true });
});

// ── 游戏统计快照（直播复盘用）──────────────────────────────────────────────────
app.get('/api/stats', (req, res) => {
  const scores = readJSON(SCORES_FILE, []);
  const lb     = buildLeaderboard(scores);
  const today  = new Date();
  today.setHours(0,0,0,0);
  const todayScores = scores.filter(s => s.timestamp >= today.getTime());

  res.json({
    totalPlayers:    lb.length,
    totalFires:      scores.length,
    totalScore:      scores.reduce((a,b) => a + (b.score || 0), 0),
    todayFires:      todayScores.length,
    todayScore:      todayScores.reduce((a,b) => a + (b.score || 0), 0),
    topPlayer:       lb[0] || null,
    connectedClients: clients.size,
  });
});

// ── 游戏重置（清空炮台 + 可选清分）──────────────────────────────────────────────
app.post('/api/admin/reset', (req, res) => {
  const { clearScores = false } = req.body || {};
  broadcast({ type: 'reset', clearScores });
  if (clearScores) {
    writeJSON(SCORES_FILE, []);
    broadcast({ type: 'leaderboard', data: [] });
  }
  console.log(`[管理] 游戏重置 (clearScores=${clearScores})`);
  res.json({ ok: true });
});

// ── 心跳（前端检测连接状态）──────────────────────────────────────────────────────
app.get('/api/ping', (req, res) => {
  res.json({ ok: true, time: Date.now(), clients: clients.size });
});

// ── 抖音 access_token 代理（防止前端暴露 AppSecret）──────────────────────────────
// 生产环境：将 AppId/AppSecret 写入 .env，此接口用于 TikTokSDK.js 的 fetchTokenFromYourServer()
app.get('/api/tiktok-token', async (req, res) => {
  const appId     = process.env.TIKTOK_APP_ID;
  const appSecret = process.env.TIKTOK_APP_SECRET;
  if (!appId || !appSecret) {
    return res.status(501).json({ error: '未配置 TIKTOK_APP_ID / TIKTOK_APP_SECRET' });
  }
  try {
    // 抖音开放平台获取 access_token 接口
    const axios = require('axios');
    const resp  = await axios.post('https://open.douyin.com/oauth/client_token/', {
      client_key:    appId,
      client_secret: appSecret,
      grant_type:    'client_credential',
    });
    const data = resp.data.data;
    res.json({ access_token: data.access_token, expires_in: data.expires_in });
  } catch (e) {
    console.error('[Token] 获取失败:', e.message);
    res.status(500).json({ error: '获取 token 失败', detail: e.message });
  }
});

// ── 启动 ───────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log('');
  console.log('🎣  抖音直播捕鱼游戏服务器已启动');
  console.log(`🎮  游戏页面：  http://localhost:${PORT}/`);
  console.log(`⚙️   管理后台：  http://localhost:${PORT}/admin.html`);
  console.log(`🔌  WebSocket： ws://localhost:${PORT}`);
  console.log('');
  console.log('── 抖音SDK对接说明 ─────────────────────────────────────');
  console.log('礼物事件: POST /api/gift   { viewerId, viewerName, viewerAvatar, giftName }');
  console.log('评论指令: POST /api/comment { viewerId, viewerName, comment }');
  console.log('坐标格式: "x:300 y:450" | "300,450" | "炮:300,450"');
  console.log('──────────────────────────────────────────────────────');
});
