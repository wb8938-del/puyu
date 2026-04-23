/**
 * LiveBridge.js — WebSocket 客户端
 * 负责接收服务器推送的礼物事件、坐标指令、排行榜更新
 */
window.LiveBridge = (function () {
  let _ws       = null;
  let _handlers = {};
  let _retryDelay = 2000;
  let _maxRetry   = 10;
  let _retryCount = 0;

  function on(type, fn) {
    if (!_handlers[type]) _handlers[type] = [];
    _handlers[type].push(fn);
  }

  function emit(type, data) {
    (_handlers[type] || []).forEach(fn => fn(data));
  }

  function connect() {
    const url = window.GameConfig.serverUrl;
    console.log(`[LiveBridge] 连接 ${url}`);

    _ws = new WebSocket(url);

    _ws.onopen = () => {
      console.log('[LiveBridge] 已连接');
      _retryCount = 0;
      _retryDelay = 2000;
      emit('connected', {});
    };

    _ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        emit(msg.type, msg);
        emit('*', msg);   // 通配符监听
      } catch (err) {
        console.warn('[LiveBridge] 消息解析失败', err);
      }
    };

    _ws.onclose = () => {
      emit('disconnected', {});
      if (_retryCount < _maxRetry) {
        _retryCount++;
        console.log(`[LiveBridge] 断开，${_retryDelay / 1000}s 后重连… (${_retryCount}/${_maxRetry})`);
        setTimeout(connect, _retryDelay);
        _retryDelay = Math.min(_retryDelay * 1.5, 15000);
      }
    };

    _ws.onerror = (err) => {
      console.error('[LiveBridge] 错误', err);
    };
  }

  // 模拟礼物（测试用，生产环境删除）
  function simulateGift(viewerId, viewerName, giftName) {
    const cfg    = window.GameConfig;
    const level  = Math.floor(Math.random() * 5) + 1;
    const canCfg = cfg.cannonLevels[level];
    emit('gift', {
      type: 'gift',
      id: 'mock-' + Date.now(),
      viewerId,
      viewerName,
      viewerAvatar: `https://api.dicebear.com/7.x/fun-emoji/svg?seed=${viewerId}`,
      giftName: giftName || '测试礼物',
      giftCount: 1,
      cannonLevel: level,
      cannonConfig: canCfg,
      timestamp: Date.now()
    });
  }

  // 模拟坐标指令（测试用）
  function simulateCoordinate(viewerId, viewerName, x, y) {
    emit('coordinate', { type: 'coordinate', viewerId, viewerName, x, y, timestamp: Date.now() });
  }

  return { on, connect, simulateGift, simulateCoordinate };
})();
