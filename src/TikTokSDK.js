/**
 * TikTokSDK.js — 抖音直播开放平台 SDK 对接封装
 *
 * 使用方式：
 *  1. 将本文件放到你的抖音互动小游戏项目中
 *  2. 按注释说明填入 appId 和 appSecret
 *  3. 调用 TikTokSDK.init() 即可自动将礼物/评论事件推送到游戏服务器
 *
 * 官方文档：https://developer.open-douyin.com/docs/resource/zh-CN/interaction/develop/
 */

// ════════════════════════════════════════════════════════════════════════════════
//  环境检测：Node.js 服务端 SDK 接入示例
//  安装依赖：npm install @douyin-microapp/openapi axios
// ════════════════════════════════════════════════════════════════════════════════

/*
// server-tiktok.js  (与 server.js 同级，独立进程或 require 集成)

const axios  = require('axios');
const crypto = require('crypto');

// ───────────── 配置区 ─────────────────────────────────────────────────────────
const GAME_SERVER = 'http://localhost:3000';   // 游戏服务器地址（内网或同机）
const TIKTOK_APP_ID     = 'YOUR_APP_ID';       // 抖音开放平台 AppID
const TIKTOK_APP_SECRET = 'YOUR_APP_SECRET';   // AppSecret（勿提交到 git）
// ──────────────────────────────────────────────────────────────────────────────

// ── 工具：转发礼物事件到游戏服务器 ─────────────────────────────────────────────
async function forwardGift({ openId, nickname, avatarUrl, giftName, count }) {
  try {
    await axios.post(`${GAME_SERVER}/api/gift`, {
      viewerId:     openId,
      viewerName:   nickname,
      viewerAvatar: avatarUrl,
      giftName,
      giftCount:    count || 1,
    });
  } catch (e) {
    console.error('[TikTok→Game] 礼物转发失败:', e.message);
  }
}

// ── 工具：转发评论到游戏服务器（自动解析坐标指令）──────────────────────────────
async function forwardComment({ openId, nickname, text }) {
  try {
    await axios.post(`${GAME_SERVER}/api/comment`, {
      viewerId:   openId,
      viewerName: nickname,
      comment:    text,
    });
  } catch (e) {
    console.error('[TikTok→Game] 评论转发失败:', e.message);
  }
}

// ── 方案A：WebHook 接入（推荐服务端场景）──────────────────────────────────────
//
// 在抖音开放平台配置你的 WebHook URL：
//   http://your-public-server.com/tiktok/webhook
//
const express = require('express');
const hookApp = express();
hookApp.use(express.json());

hookApp.post('/tiktok/webhook', async (req, res) => {
  const { event_type, data, timestamp, nonce, msg_signature } = req.body;

  // ① 验签（防伪）
  const params   = [TIKTOK_APP_SECRET, timestamp, nonce].sort().join('');
  const expected = crypto.createHash('sha256').update(params).digest('hex');
  if (msg_signature !== expected) {
    return res.status(403).json({ message: '签名验证失败' });
  }

  // ② 处理事件
  switch (event_type) {
    case 'live_gift': {
      const { user, gift } = data;
      await forwardGift({
        openId:    user.open_id,
        nickname:  user.nickname,
        avatarUrl: user.avatar_url,
        giftName:  gift.describe,  // 礼物名称
        count:     gift.combo_count || 1,
      });
      break;
    }
    case 'live_comment': {
      const { user, content } = data;
      await forwardComment({
        openId:   user.open_id,
        nickname: user.nickname,
        text:     content,
      });
      break;
    }
  }

  res.json({ errcode: 0 });
});

hookApp.listen(3001, () => {
  console.log('[TikTok WebHook] 监听端口 3001');
});

// ── 方案B：抖音互动小游戏 JS SDK（小游戏内 H5 直接接入）───────────────────────
//
// 在 index.html 中引入官方 JS SDK：
// <script src="https://lf1-cdn-tos.bytegoofy.com/goofy/ttzero/live_sdk/v2/douyin-webcast-sdk.min.js"></script>
//
// 然后使用以下代码：

async function initTikTokJSBridge() {
  if (typeof douyin === 'undefined') {
    console.warn('[TikTok JS SDK] SDK 未加载，请检查 script 标签');
    return;
  }

  // 鉴权
  const token = await fetchTokenFromYourServer();
  await douyin.authorize({ token });

  // ── 礼物事件 ──────────────────────────────────────────────────────────────
  douyin.on('gift', (event) => {
    const { user, gift } = event;
    fetch('/api/gift', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        viewerId:     user.openId,
        viewerName:   user.nickname,
        viewerAvatar: user.avatarUrl,
        giftName:     gift.giftName,
        giftCount:    gift.giftCount || 1,
      })
    });
  });

  // ── 评论事件 ──────────────────────────────────────────────────────────────
  douyin.on('comment', (event) => {
    const { user, content } = event;
    fetch('/api/comment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        viewerId:   user.openId,
        viewerName: user.nickname,
        comment:    content,
      })
    });
  });

  // ── 观众进场 ──────────────────────────────────────────────────────────────
  douyin.on('enter', (event) => {
    console.log(`[欢迎] ${event.user.nickname} 进入直播间`);
  });

  console.log('[TikTok JS SDK] 初始化完成');
}

async function fetchTokenFromYourServer() {
  const res = await fetch('/api/tiktok-token');
  const { access_token } = await res.json();
  return access_token;
}

*/

// ════════════════════════════════════════════════════════════════════════════════
//  前端模拟对象（游戏页面在未接入真实SDK时使用，避免报错）
// ════════════════════════════════════════════════════════════════════════════════
window.TikTokSDK = {
  /**
   * 初始化 SDK
   * 在真实环境中替换此函数为上方注释中的实现
   */
  async init() {
    console.log('[TikTokSDK] 运行在模拟模式（请接入真实抖音SDK）');
    // 在真实接入后，礼物/评论会通过 server.js WebHook 转发到 WebSocket
    // 前端无需改动，游戏自动通过 LiveBridge 接收事件
  },

  /**
   * 手动触发礼物事件（测试用）
   * 等同于 POST /api/gift
   */
  async mockGift(viewerId, viewerName, giftName, level) {
    const res = await fetch(`${window.GameConfig.apiBase}/gift`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        viewerId,
        viewerName,
        viewerAvatar: `https://api.dicebear.com/7.x/fun-emoji/svg?seed=${viewerId}`,
        giftName,
        giftCount: 1,
      })
    });
    return res.json();
  },

  /**
   * 手动触发坐标指令（测试用）
   * 等同于 POST /api/comment
   */
  async mockAim(viewerId, viewerName, x, y) {
    const res = await fetch(`${window.GameConfig.apiBase}/comment`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ viewerId, viewerName, comment: `x:${x} y:${y}` })
    });
    return res.json();
  }
};
