# 🎣 捕鱼达人·抖音直播版 — 完整安装使用手册

> **版本**: v1.0 完整版  
> **技术栈**: Node.js · PixiJS v8 · Tone.js · WebSocket · Express  
> **代码规模**: 前端 15 模块 / 3367 行，后端 312 行

---

## 目录

1. [系统架构](#1-系统架构)
2. [环境要求](#2-环境要求)
3. [安装步骤](#3-安装步骤)
4. [启动运行](#4-启动运行)
5. [管理后台使用](#5-管理后台使用)
6. [游戏玩法说明](#6-游戏玩法说明)
7. [抖音SDK对接](#7-抖音sdk对接)
8. [生产环境部署](#8-生产环境部署)
9. [常见问题](#9-常见问题)
10. [API接口文档](#10-api接口文档)

---

## 1. 系统架构

```
抖音直播间
  │  观众刷礼物 / 发弹幕坐标
  ▼
抖音开放平台 SDK（WebHook 或 JS SDK）
  │  POST /api/gift   POST /api/comment
  ▼
┌─────────────────────────────────────────┐
│         Node.js 游戏服务器               │
│  Express REST API  +  WebSocket Server  │
│  积分存储 (JSON / 30天自动清理)           │
└────────────────┬────────────────────────┘
                 │ ws:// 实时推送
                 ▼
┌─────────────────────────────────────────┐
│         浏览器游戏页面 (PixiJS v8)        │
│  水底背景 │ 鱼群编队 │ 观众炮台           │
│  坐标标尺 │ 礼物动画 │ 积分排行           │
└─────────────────────────────────────────┘
```

**数据流**：
- 观众刷礼物 → 服务器解析礼物等级 → WebSocket推送 → 屏幕随机生成对应等级炮台
- 观众发弹幕坐标 → 服务器解析 → WebSocket推送 → 炮台瞄准开炮 → 积分存储 → 排行榜更新

---

## 2. 环境要求

| 组件 | 最低版本 | 推荐版本 |
|------|---------|---------|
| Node.js | 16.x | 18.x LTS 或 20.x |
| npm | 7.x | 随 Node.js 自带 |
| 操作系统 | Linux / macOS / Windows | Ubuntu 20.04+ |
| 内存 | 256 MB | 512 MB+ |
| 浏览器（游戏页面） | Chrome 90+ | Chrome / Edge 最新版 |

> **注意**：游戏使用 WebGL，需要显卡支持。直播推流电脑通常满足要求。

---

## 3. 安装步骤

### 3.1 下载项目

```bash
# 方式A：解压下载的 zip 包
unzip fishing-joy-douyin.zip
cd fishing-joy-douyin

# 方式B：如果从 Git 仓库克隆
git clone https://your-repo/fishing-joy-douyin.git
cd fishing-joy-douyin
```

### 3.2 安装依赖

```bash
npm install
```

安装完成后 `node_modules/` 目录会包含以下依赖：
- `express` — HTTP 服务器
- `ws` — WebSocket 服务器
- `cors` — 跨域处理
- `uuid` — 唯一ID生成

### 3.3 配置环境变量（可选）

```bash
# 复制模板
cp .env.example .env

# 编辑配置
nano .env
```

`.env` 关键配置项：

```ini
# 服务端口（默认3000）
PORT=3000

# 抖音开放平台（正式对接时填写）
TIKTOK_APP_ID=your_app_id
TIKTOK_APP_SECRET=your_app_secret

# 管理后台密码（留空则不鉴权）
ADMIN_PASSWORD=your_password
```

---

## 4. 启动运行

### 4.1 一键启动（推荐）

```bash
chmod +x start.sh
./start.sh
```

脚本会自动：检查 Node.js 版本 → 安装依赖 → 生成默认配置 → 启动服务

### 4.2 手动启动

```bash
# 开发模式（代码修改后自动重启）
npm run dev

# 生产模式
npm start
```

### 4.3 启动成功标志

```
🎣  抖音直播捕鱼游戏服务器已启动
🎮  游戏页面：  http://localhost:3000/
⚙️   管理后台：  http://localhost:3000/admin.html
🔌  WebSocket： ws://localhost:3000
```

### 4.4 访问地址

| 页面 | 地址 |
|------|------|
| 🎮 游戏主页面 | http://localhost:3000/ |
| ⚙️ 管理后台 | http://localhost:3000/admin.html |
| 📊 API 统计 | http://localhost:3000/api/stats |
| 🏓 心跳检测 | http://localhost:3000/api/ping |

---

## 5. 管理后台使用

访问 `http://localhost:3000/admin.html`

### 5.1 礼物配置页

配置哪种礼物对应哪个等级的炮弹：

| 字段 | 说明 | 示例 |
|------|------|------|
| 礼物名称 | 必须与抖音礼物名称完全一致 | `飞机` |
| 礼物价值 | 抖币单价（仅作记录，不影响逻辑） | `1000` |
| 炮弹等级 | 1~5 级，越高越强 | `5` |

**操作**：修改后点击「💾 保存配置」，配置实时推送到所有游戏页面，**无需刷新**。

### 5.2 炮弹配置页

为每个等级的炮台设置参数：

| 参数 | 说明 | 建议范围 |
|------|------|---------|
| 炮弹数量 | 每次开炮发射的弹丸数 | 1~8 |
| 威力倍数 | 保留字段（视觉影响） | 1~10 |
| 爆炸半径 | 命中判定圆的像素半径 | 60~200 |
| 倒计时 | 未开炮时强制开炮的秒数 | 20~90 |

**积分倍率**：每个等级命中鱼后的积分乘数，建议：
- Lv1: 1x | Lv2: 1.5x | Lv3: 2.5x | Lv4: 4x | Lv5: 7x

### 5.3 测试面板

**无需接入抖音SDK即可测试所有功能**：

1. **模拟礼物**：填入观众ID/昵称，选择礼物名称 → 点击发送 → 游戏页面出现炮台
2. **模拟坐标**：填入观众ID和X/Y坐标 → 点击发送 → 对应炮台开炮
3. **模拟弹幕**：填入弹幕内容（格式见下方）→ 自动解析坐标
4. **批量测试**：一键发送3/5/8个不同观众的礼物，测试满屏效果

### 5.4 实时统计页

自动每30秒刷新：
- 累计玩家数、总开炮次数、总积分
- 今日开炮次数、今日积分
- 当前在线屏幕数、榜首玩家

**游戏控制**：
- 「重置炮台」：清空所有当前炮台，积分保留
- 「完全重置」：清空炮台 + 清空所有积分（⚠️ 不可恢复）

### 5.5 积分榜页

查看所有观众历史积分，数据保留30天自动清理。

---

## 6. 游戏玩法说明

### 6.1 炮台系统

观众刷礼物后，屏幕**随机位置**出现炮台，显示该观众的：
- 头像（圆形裁切）
- 昵称
- 炮弹等级徽章
- 倒计时圆环

| 等级 | 名称 | 颜色 | 炮弹数 | 爆炸半径 | 倒计时 |
|------|------|------|--------|---------|--------|
| Lv.1 | 🟫 铜炮 | 铜色 | 1 | 60px | 30秒 |
| Lv.2 | ⬜ 银炮 | 银色 | 2 | 85px | 40秒 |
| Lv.3 | 🟨 金炮 | 金色 | 3 | 110px | 50秒 |
| Lv.4 | 🟧 火焰炮 | 橙红 | 5 | 140px | 60秒 |
| Lv.5 | 🟪 彩虹炮 | 渐变 | 8 | 180px | 90秒 |

**同一观众再次刷礼物**：若新礼物等级更高，旧炮台被替换为新等级炮台。

### 6.2 坐标瞄准系统

屏幕左侧有 **Y轴标尺**，底部有 **X轴标尺**，刻度每50px一格，每100px显示数字。

观众在直播间评论区输入坐标，格式（支持以下任意一种）：

```
x:300 y:400       ← 推荐格式，最清晰
x=300,y=400
炮:300,400
300,400
开炮 300 400
```

系统自动解析评论中的坐标，炮台立即旋转炮管并开炮。

### 6.3 开炮流程

```
1. 观众刷礼物 → 炮台出现（倒计时开始）
2. 观众看屏幕上的坐标标尺，选择目标鱼所在坐标
3. 观众在评论区发送坐标（如 "x:640 y:360"）
4. 炮台瞄准该坐标立即开炮
5. 命中范围内所有鱼被捕获
6. 积分 = 各鱼基础分 × 炮弹等级倍率
7. 炮台1.2秒后消失，积分计入排行榜
```

**超时处理**：若观众在倒计时结束前未输入坐标：
- 最后5秒：炮台红色闪烁 + 屏幕红色脉动警告
- 倒计时归零：系统自动瞄准距离最近的鱼开炮

### 6.4 连击系统

- 单次开炮命中 **3条及以上**鱼，触发连击显示
- 连击数越高，文字越大，颜色越亮，屏幕震动越强

| 连击 | 显示文字 |
|------|---------|
| 3 | 三连击！ |
| 4 | 四连击！ |
| 5 | 五连击！ |
| 7 | 超级连击！ |
| 10 | ULTRA COMBO!! |
| 15+ | MONSTER COMBO!!! |

### 6.5 鱼群编队

系统每10~16秒随机生成一种鱼群编队，提升观赏性：

| 编队类型 | 描述 |
|---------|------|
| 波浪形 | 8~14条鱼呈正弦波涌入 |
| V字队形 | 9条鱼呈V形穿过屏幕 |
| 圆形汇聚 | 从四周聚拢形成圆圈 |
| 四方乱入 | 12条鱼从屏幕四边同时冲入 |
| 纵列队 | 10条鱼单列跟随同一路径 |

约每60秒出现一次**BOSS鱼**（最大体型，500分），伴随全屏橙色闪光。

### 6.6 积分排行榜

- 右侧实时显示前10名
- 支持切换「今日」/「总榜」
- 显示观众头像、昵称、积分
- 积分保留30天，过期自动清理

### 6.7 调试快捷键（游戏页面，测试用）

| 按键 | 功能 |
|------|------|
| `1` | 模拟观众1送小心心（Lv1炮） |
| `2` | 模拟观众2送音乐盒（Lv2炮） |
| `3` | 模拟观众3送嘉年华（Lv3炮） |
| `4` | 模拟观众4送火箭（Lv4炮） |
| `5` | 模拟观众5送飞机（Lv5炮） |
| `F` | 第一个炮台随机位置开炮 |
| `B` | 触发BOSS鱼出场 |
| `M` | 静音/取消静音 |

---

## 7. 抖音SDK对接

### 7.1 对接方式选择

| 方式 | 适用场景 | 延迟 |
|------|---------|------|
| **WebHook**（推荐） | 有公网服务器 | 100~500ms |
| **JS SDK** | 抖音互动小游戏 | 50~200ms |

### 7.2 WebHook 方式

在抖音开放平台配置 WebHook 回调地址：`http://你的域名:3000/api/gift` 等

在你的服务端回调处理中：

```javascript
// 礼物事件
app.post('/douyin/webhook', async (req, res) => {
  const { event_type, data } = req.body;
  
  if (event_type === 'live_gift') {
    await fetch('http://localhost:3000/api/gift', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        viewerId:     data.user.open_id,       // 必填
        viewerName:   data.user.nickname,      // 可选
        viewerAvatar: data.user.avatar_url,    // 可选
        giftName:     data.gift.describe,      // 必填，要与后台配置的礼物名一致
        giftCount:    data.gift.combo_count || 1
      })
    });
  }
  
  if (event_type === 'live_comment') {
    await fetch('http://localhost:3000/api/comment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        viewerId:   data.user.open_id,
        viewerName: data.user.nickname,
        comment:    data.content   // 系统自动解析坐标指令
      })
    });
  }
  
  res.json({ errcode: 0 });
});
```

### 7.3 JS SDK 方式（抖音互动小游戏）

在 `index.html` 中引入官方 JS SDK：

```html
<script src="https://lf1-cdn-tos.bytegoofy.com/goofy/ttzero/live_sdk/v2/douyin-webcast-sdk.min.js"></script>
```

初始化代码：

```javascript
// 在游戏加载完成后执行
await douyin.authorize({ token: await fetchToken() });

douyin.on('gift', (event) => {
  fetch('/api/gift', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      viewerId:     event.user.openId,
      viewerName:   event.user.nickname,
      viewerAvatar: event.user.avatarUrl,
      giftName:     event.gift.giftName,
      giftCount:    event.gift.giftCount || 1
    })
  });
});

douyin.on('comment', (event) => {
  fetch('/api/comment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      viewerId:   event.user.openId,
      viewerName: event.user.nickname,
      comment:    event.content
    })
  });
});
```

### 7.4 礼物名称对照

**重要**：`giftName` 字段必须与抖音平台的礼物名称完全一致（包括中文字符）。

在管理后台「礼物配置」页面可以随时增删，无需重启服务。

---

## 8. 生产环境部署

### 8.1 使用 PM2 守护进程

```bash
# 安装 PM2
npm install -g pm2

# 启动游戏服务
pm2 start ecosystem.config.js --env production

# 设置开机自启
pm2 startup
pm2 save

# 常用命令
pm2 status          # 查看状态
pm2 logs fishing-joy # 查看日志
pm2 restart fishing-joy # 重启
pm2 stop fishing-joy    # 停止
```

### 8.2 Nginx 反向代理

```bash
# 复制配置文件
sudo cp nginx.conf /etc/nginx/sites-available/fishing-joy

# 修改域名（将 your-domain.com 改为你的域名）
sudo nano /etc/nginx/sites-available/fishing-joy

# 启用配置
sudo ln -s /etc/nginx/sites-available/fishing-joy /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 8.3 申请 HTTPS 证书

```bash
# 安装 Certbot
sudo apt install certbot python3-certbot-nginx

# 申请证书（自动配置 Nginx）
sudo certbot --nginx -d your-domain.com

# 自动续期（添加到 crontab）
0 0 * * * certbot renew --quiet
```

### 8.4 服务器防火墙

```bash
# 开放端口
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
# 注意：3000端口不需要对外开放（Nginx代理）
```

### 8.5 生产部署检查清单

```
□ Node.js 18+ 已安装
□ npm install 完成
□ .env 文件已配置（PORT、TIKTOK_APP_ID 等）
□ PM2 已安装并启动服务
□ Nginx 已配置反向代理
□ HTTPS 证书已申请
□ data/ 目录有写权限（chmod 755 data/）
□ logs/ 目录已创建
□ 防火墙已开放 80/443 端口
□ 抖音开放平台 WebHook 地址已填写
□ 管理后台礼物配置已确认
```

---

## 9. 常见问题

### Q1: 游戏页面显示白屏/黑屏

**原因**：PixiJS 或 Tone.js CDN 加载失败  
**解决**：
1. 检查网络是否能访问 `pixijs.download` 和 `cdnjs.cloudflare.com`
2. 将 CDN 资源下载到本地并修改 `index.html` 中的 src 路径

### Q2: WebSocket 连接失败（状态栏显示「未连接」）

**原因**：服务器未启动或端口被占用  
**解决**：
```bash
# 检查服务是否运行
pm2 status
# 或
lsof -i:3000

# 检查防火墙
sudo ufw status
```

### Q3: 礼物事件收到但不出现炮台

**原因**：礼物名称未在后台配置  
**解决**：
1. 打开管理后台 → 礼物配置
2. 确认 `giftName` 字段与抖音平台礼物名称**完全一致**
3. 保存配置后重试

### Q4: 坐标弹幕不被识别

**确认弹幕格式**（观众发送内容）：
```
✅ x:300 y:400
✅ x=300,y=400
✅ 炮:300,400
✅ 300,400
❌ 瞄准(300,400)     ← 括号不支持
❌ 坐标300 400       ← 前面没有炮/x/y关键字且有汉字会失败
```

**建议**：在直播间屏幕上显示格式提示，引导观众使用 `x:数字 y:数字` 格式。

### Q5: 积分数据丢失

**原因**：`data/scores.json` 被意外删除或权限问题  
**解决**：
```bash
# 确保目录存在且有写权限
mkdir -p data
chmod 755 data
ls -la data/
```

数据保留30天，超期自动清理是正常行为。

### Q6: 多台电脑同时显示游戏（多屏直播）

服务器支持多个 WebSocket 客户端同时连接，所有屏幕实时同步。只需在多台电脑浏览器中打开同一个游戏地址即可。

### Q7: 想保留原游戏的图片资源

将原游戏 `images/` 文件夹复制到项目根目录，鱼的图片会被自动加载：
```
fishing-joy-douyin/
└── images/
    ├── fish_small_01.png
    ├── fish_mid_01.png
    └── ...（与原游戏图片名一致）
```
`FishManager.js` 会优先使用图片，找不到时自动回退到矢量绘制。

---

## 10. API接口文档

**Base URL**: `http://localhost:3000`

### 礼物事件
```
POST /api/gift
Content-Type: application/json

{
  "viewerId":     "openid_xxx",      // 必填，观众唯一ID
  "viewerName":   "用户昵称",         // 可选
  "viewerAvatar": "https://...",     // 可选，头像URL
  "giftName":     "飞机",            // 必填，礼物名称
  "giftCount":    1                  // 可选，默认1
}

响应: { "ok": true, "event": { "cannonLevel": 5, ... } }
```

### 评论坐标指令
```
POST /api/comment
Content-Type: application/json

{
  "viewerId":   "openid_xxx",
  "viewerName": "用户昵称",
  "comment":    "x:300 y:400"     // 包含坐标的评论内容
}

响应: { "ok": true, "parsed": { "x": 300, "y": 400 } }
       { "ok": true, "parsed": null }  // 未识别到坐标
```

### 获取排行榜
```
GET /api/scores

响应: [
  {
    "viewerId": "...",
    "viewerName": "昵称",
    "viewerAvatar": "https://...",
    "totalScore": 12500,
    "todayScore": 3200,
    "fireCount": 15
  },
  ...
]
```

### 获取实时统计
```
GET /api/stats

响应: {
  "totalPlayers": 128,
  "totalFires": 456,
  "totalScore": 892340,
  "todayFires": 38,
  "todayScore": 72100,
  "connectedClients": 3,
  "topPlayer": { "viewerName": "...", "totalScore": 15000 }
}
```

### 获取/保存配置
```
GET  /api/config         → 获取当前配置
POST /api/config         → 保存配置（实时推送到所有游戏页面）
```

### 管理接口
```
GET    /api/admin/scores        → 获取全部积分记录（明细）
DELETE /api/admin/scores        → 清空所有积分
POST   /api/admin/reset         → 重置游戏 { "clearScores": false }
POST   /api/admin/broadcast     → 广播任意消息（调试用）
GET    /api/ping                → 心跳检测
```

---

## 项目文件结构

```
fishing-joy-douyin/
├── server.js               # 后端服务器（Express + WebSocket）
├── index.html              # 游戏主页面
├── admin.html              # 管理后台
├── package.json            # npm 依赖
├── ecosystem.config.js     # PM2 配置
├── nginx.conf              # Nginx 反向代理配置
├── start.sh                # 一键启动脚本
├── .env.example            # 环境变量模板
├── README.md               # 项目说明
├── INSTALL_GUIDE.md        # 本手册
├── data/
│   ├── config.json         # 礼物/炮弹配置（可通过后台修改）
│   └── scores.json         # 积分记录（30天滚动）
└── src/
    ├── Config.js           # 全局配置常量
    ├── LiveBridge.js       # WebSocket 客户端
    ├── AudioManager.js     # Tone.js 音效引擎
    ├── WaterBackground.js  # 水底场景（焦散光/气泡/珊瑚）
    ├── FishManager.js      # 鱼群管理（矢量绘制，兼容原图片）
    ├── FishFormation.js    # 鱼群编队（5种队形+BOSS鱼）
    ├── RulerUI.js          # 坐标标尺（X轴+Y轴）
    ├── ViewerCannon.js     # 单个观众炮台实体
    ├── ViewerCannonManager.js # 炮台群管理器
    ├── ScorePanel.js       # 积分排行面板（头像+今日/总榜）
    ├── GiftNotification.js # 礼物全屏通知动画
    ├── ScreenEffects.js    # 屏幕震动/闪光/连击/积分飘字
    ├── LiveHUD.js          # 顶部直播状态栏
    ├── TikTokSDK.js        # 抖音SDK对接封装
    └── Main.js             # 游戏主入口
```

---

*© 2024 捕鱼达人·抖音直播版 | 基于 ggemu-fishing-joy 改造*
