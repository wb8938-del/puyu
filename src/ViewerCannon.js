
    // 炮身水平摇晃
    const swayAmount = 0.4;
    this.container.x += Math.sin(this._wobble * 0.3) * swayAmount;

    // 开火时剧烈抖动
    if (this._recoil && this._recoilTimer > 0) {
      this.container.x += (Math.random() - 0.5) * 3;
      this.container.y += (Math.random() - 0.5) * 2;
    }
