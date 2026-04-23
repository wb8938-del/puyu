# 🎣 捕鱼达人 · 抖音直播版

观众刷礼物获得大炮 → 输入坐标开炮捕鱼 → 积分排行榜

---

## 🚀 快速启动

```bash
# 1. 安装依赖
npm install

# 2. 启动服务器
npm start
# 或开发模式（热重载）
npm run dev

# 3. 打开游戏  http://localhost:3000/
# 4. 打开后台  http://localhost:3000/admin.html
```

---

## 🎮 游戏玩法

| 步骤 | 观众操作 | 系统响应 |
|------|---------|---------|
| 1 | 在直播间刷礼物 | 屏幕随机位置出现炮台，显示头像和昵称 |
| 2 | 在评论区输入坐标 | 炮台瞄准目标立即开炮 |
| 3 | 倒计时结束 | 系统自动瞄准最近的鱼开炮 |

### 坐标输入格式（观众在评论区输入）
```
x:300 y:400      ← 推荐
x=300,y=400
炮:300,400
300,400
```

### 炮弹等级
| 等级 | 名称 | 炮弹数 | 爆炸半径 | 倒计时 |
|------|------|--------|---------|-------|
| Lv.1 | 🟫 铜炮 | 1 | 60px | 30s |
| Lv.2 | ⬜ 银炮 | 2 | 85px | 40s |
| Lv.3 | 🟨 金炮 | 3 | 110px | 50s |
| Lv.4 | 🟧 火焰炮 | 5 | 140px | 60s |
| Lv.5 | 🟪 彩虹炮 | 8 | 180px | 90s |

---

## 🔌 抖音直播 SDK 对接

在你的抖音 SDK 事件回调中接入以下接口：

### 礼物事件
```javascript
// 当有观众送礼物时
tiktokLive.on('gift', async (gift) => {
  await fetch('http://your-server:3000/api/gift', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      viewerId:     gift.user.openId,
      viewerName:   gift.user.nickname,
      viewerAvatar: gift.user.avatarUrl,
      giftName:     gift.giftName,
      giftCount:    gift.count || 1
    })
  });
});
```

### 评论坐标指令
```javascript
// 当有观众发评论时
tiktokLive.on('comment', async (comment) => {
  await fetch('http://your-server:3000/api/comment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      viewerId:   comment.user.openId,
      viewerName: comment.user.nickname,
      comment:    comment.text
    })
  });
});
```

---

## ⚙️ 管理后台功能

访问 `http://localhost:3000/admin.html`

- **礼物配置**：设置礼物名称 → 炮弹等级的映射关系
- **炮弹配置**：调整每个等级的炮弹数、爆炸半径、倒计时、积分倍率
- **测试面板**：手动模拟礼物事件和坐标指令，测试游戏效果
- **积分榜**：查看所有观众的历史积分，支持清空

---

## 📁 文件结构

```
fishing-joy-douyin/
├── server.js           # 后端服务（Express + WebSocket）
├── package.json
├── index.html          # 游戏主页面
├── admin.html          # 管理后台
├── data/               # 数据存储（自动创建）
│   ├── config.json     # 管理员配置
│   └── scores.json     # 积分记录（30天保留）
└── src/
    ├── Config.js               # 全局配置常量
    ├── LiveBridge.js           # WebSocket 客户端
    ├── WaterBackground.js      # 水底场景（焦散光 + 气泡）
    ├── FishManager.js          # 鱼群管理（矢量绘制，兼容原图片）
    ├── RulerUI.js              # 坐标标尺（底部X + 左侧Y）
    ├── ViewerCannon.js         # 单个观众炮台实体
    ├── ViewerCannonManager.js  # 炮台群管理器
    ├── ScorePanel.js           # 积分排行面板
    └── Main.js                 # 游戏主入口
```

---

## 🖼 原始游戏资源兼容

本版本完整保留原游戏视觉资源：
- 若 `images/` 目录中存在鱼的图片，`FishManager` 自动加载
- 若图片不存在，自动 fallback 到矢量绘制（效果相同）
- 背景音乐文件 `loop-01.mp3` 若存在会自动播放

---

## 💡 调试快捷键（游戏页面）

| 按键 | 功能 |
|------|------|
| `1` ~ `5` | 模拟对应等级礼物（出现炮台） |
| `F` | 模拟坐标指令（随机位置开炮） |
