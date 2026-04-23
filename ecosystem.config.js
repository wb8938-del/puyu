// PM2 进程管理配置
// 安装 PM2：npm install -g pm2
// 启动：  pm2 start ecosystem.config.js
// 重启：  pm2 restart fishing-joy
// 日志：  pm2 logs fishing-joy
// 开机自启：pm2 startup && pm2 save

module.exports = {
  apps: [
    {
      name:        'fishing-joy',
      script:      'server.js',
      cwd:         __dirname,
      instances:   1,           // 单实例（WebSocket 不支持多实例共享内存，需 Redis 适配器才可扩展）
      exec_mode:   'fork',
      watch:       false,
      max_memory_restart: '300M',

      env: {
        NODE_ENV: 'production',
        PORT:     3000,
      },
      env_development: {
        NODE_ENV: 'development',
        PORT:     3000,
      },

      // 日志
      out_file:   './logs/out.log',
      error_file: './logs/error.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss',

      // 自动重启策略
      autorestart:      true,
      restart_delay:    3000,
      max_restarts:     10,
      min_uptime:       '10s',
    }
  ]
};
