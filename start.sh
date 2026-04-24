#!/usr/bin/env bash
# start.sh — 一键启动脚本
# 用法：chmod +x start.sh && ./start.sh

set -e
cd "$(dirname "$0")"

echo ""
echo "🎣  捕鱼达人 · 抖音直播版"
echo "══════════════════════════"

# ── 检查 Node.js ──────────────────────────────────────────────────────────────
if ! command -v node &> /dev/null; then
  echo "❌  未检测到 Node.js，请先安装：https://nodejs.org (推荐 v18+)"
  exit 1
fi

NODE_VER=$(node -e "console.log(process.versions.node.split('.')[0])")
if [ "$NODE_VER" -lt 16 ]; then
  echo "❌  Node.js 版本过低（当前 v$NODE_VER，需要 v16+）"
  exit 1
fi
echo "✅  Node.js $(node -v)"

# ── 安装依赖 ──────────────────────────────────────────────────────────────────
if [ ! -d "node_modules" ]; then
  echo "📦  正在安装依赖..."
  npm install --production
fi

# ── 加载 .env ─────────────────────────────────────────────────────────────────
if [ -f ".env" ]; then
  export $(grep -v '^#' .env | xargs)
  echo "✅  已加载 .env 配置"
else
  echo "⚠️   未找到 .env 文件，使用默认配置（可复制 .env.example 修改）"
fi

# ── 创建必要目录 ──────────────────────────────────────────────────────────────
mkdir -p data logs

# ── 初始化默认配置（首次运行）──────────────────────────────────────────────────
if [ ! -f "data/config.json" ]; then
  echo "📝  生成默认配置文件 data/config.json..."
  node -e "
  const fs  = require('fs');
  const cfg = require('./server.js');
  " 2>/dev/null || node -e "
  const fs  = require('fs');
  const def = {
    giftMappings: [
      {giftName:'小心心',giftValue:1,cannonLevel:1},
      {giftName:'玫瑰',giftValue:1,cannonLevel:1},
      {giftName:'抖音',giftValue:5,cannonLevel:1},
      {giftName:'音乐盒',giftValue:10,cannonLevel:2},
      {giftName:'嘉年华',giftValue:100,cannonLevel:3},
      {giftName:'火箭',giftValue:500,cannonLevel:4},
      {giftName:'飞机',giftValue:1000,cannonLevel:5},
      {giftName:'游轮',giftValue:2000,cannonLevel:5}
    ],
    cannonLevels:{
      1:{name:'铜炮',bulletCount:1,power:1,radius:60,color:'#CD7F32',glowColor:'#FF9A00',timeout:30},
      2:{name:'银炮',bulletCount:2,power:2,radius:85,color:'#C0C0C0',glowColor:'#FFFFFF',timeout:40},
      3:{name:'金炮',bulletCount:3,power:4,radius:110,color:'#FFD700',glowColor:'#FFFF00',timeout:50},
      4:{name:'火焰炮',bulletCount:5,power:7,radius:140,color:'#FF4500',glowColor:'#FF0000',timeout:60},
      5:{name:'彩虹炮',bulletCount:8,power:10,radius:180,color:'#FF00FF',glowColor:'#00FFFF',timeout:90}
    },
    scoreMultipliers:{1:1,2:1.5,3:2.5,4:4,5:7},
    maxCannonsOnScreen:8,
    autoFireOnTimeout:true
  };
  fs.writeFileSync('data/config.json', JSON.stringify(def, null, 2));
  console.log('Default config created.');
  "
fi

PORT="${PORT:-3000}"
echo ""
echo "🚀  启动游戏服务器（端口 $PORT）..."
echo "🎮  游戏页面：  http://localhost:$PORT/"
echo "⚙️   管理后台：  http://localhost:$PORT/admin.html"
echo ""

# ── 启动 ──────────────────────────────────────────────────────────────────────
if command -v pm2 &> /dev/null; then
  echo "检测到 PM2，以守护进程方式启动..."
  pm2 start ecosystem.config.js --env production
  pm2 logs fishing-joy --lines 30
else
  echo "以前台模式启动（Ctrl+C 停止）..."
  node server.js
fi
