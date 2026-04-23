/**
 * AudioManager.js — 游戏音效管理器
 * 使用 Tone.js 合成音效（无需外部音效文件），可选加载原游戏 BGM
 */
window.AudioManager = (function () {
  let _ready    = false;
  let _muted    = false;
  let _bgmPlayer = null;
  let _bgmStarted = false;

  // ── 合成器池（复用避免创建开销）───────────────────────────────────────────
  const _synths = {
    fire:    null,
    catch:   null,
    ui:      null,
    big:     null,
    miss:    null,
    tick:    null,
    gift:    null,
  };

  // ── 初始化（需要用户交互后才能启动 AudioContext）─────────────────────────
  async function init() {
    if (_ready) return;
    try {
      await Tone.start();

      // ── 炮击音效 ──────────────────────────────────────────────────────────
      _synths.fire = new Tone.MembraneSynth({
        pitchDecay: 0.08, octaves: 6,
        envelope: { attack: 0.001, decay: 0.35, sustain: 0, release: 0.1 },
        volume: -8
      }).toDestination();

      // ── 捕鱼音效（清脆） ──────────────────────────────────────────────────
      _synths.catch = new Tone.MetalSynth({
        frequency: 400, envelope: { attack: 0.001, decay: 0.3, release: 0.01 },
        harmonicity: 5.1, modulationIndex: 32, resonance: 4000, octaves: 1.5,
        volume: -14
      }).toDestination();

      // ── UI提示音 ──────────────────────────────────────────────────────────
      _synths.ui = new Tone.Synth({
        oscillator: { type: 'triangle' },
        envelope: { attack: 0.005, decay: 0.1, sustain: 0.3, release: 0.2 },
        volume: -18
      }).toDestination();

      // ── 大鱼/BOSS捕获 ────────────────────────────────────────────────────
      _synths.big = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'sawtooth' },
        envelope: { attack: 0.02, decay: 0.4, sustain: 0.1, release: 0.5 },
        volume: -10
      }).toDestination();

      // ── 未命中音效 ───────────────────────────────────────────────────────
      _synths.miss = new Tone.Synth({
        oscillator: { type: 'square' },
        envelope: { attack: 0.001, decay: 0.2, sustain: 0, release: 0.05 },
        volume: -20
      }).toDestination();

      // ── 倒计时滴答 ───────────────────────────────────────────────────────
      _synths.tick = new Tone.Synth({
        oscillator: { type: 'sine' },
        envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.01 },
        volume: -22
      }).toDestination();

      // ── 礼物到达音效（欢快上扬音阶）──────────────────────────────────────
      _synths.gift = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'sine' },
        envelope: { attack: 0.01, decay: 0.3, sustain: 0.1, release: 0.4 },
        volume: -12
      }).toDestination();

      // ── 背景音乐（尝试加载原游戏音频）───────────────────────────────────
      _tryLoadBGM();

      _ready = true;
      console.log('[Audio] Tone.js 初始化完成');
    } catch (e) {
      console.warn('[Audio] 初始化失败:', e);
    }
  }

  async function _tryLoadBGM() {
    try {
      _bgmPlayer = new Tone.Player({
        url: 'loop-01.mp3',
        loop: true,
        volume: -18,
        autostart: false,
      }).toDestination();
    } catch (_) {
      // 没有 BGM 文件，用合成器生成环境音
      _buildAmbientBGM();
    }
  }

  // ── 合成水底环境音（无 BGM 文件时的 fallback）───────────────────────────
  function _buildAmbientBGM() {
    const reverb = new Tone.Reverb({ decay: 6, wet: 0.7 }).toDestination();
    const chorus = new Tone.Chorus(2, 2.5, 0.5).connect(reverb).start();
    const delay  = new Tone.FeedbackDelay('8n', 0.3).connect(chorus);

    const ambient = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'sine' },
      envelope: { attack: 2, decay: 1, sustain: 0.8, release: 3 },
      volume: -28,
    }).connect(delay);

    // 水底氛围和弦序列
    const chords = [
      ['C2','G2','E3'], ['F2','C3','A3'], ['G2','D3','B3'], ['A2','E3','C4']
    ];
    let ci = 0;
    const loop = new Tone.Loop(() => {
      ambient.triggerAttackRelease(chords[ci % chords.length], '4n');
      ci++;
    }, '2n');

    _bgmPlayer = { start: () => { Tone.Transport.start(); loop.start(0); }, stop: () => loop.stop() };
  }

  // ── 开始 BGM ─────────────────────────────────────────────────────────────
  function startBGM() {
    if (!_ready || _bgmStarted || _muted) return;
    try {
      if (_bgmPlayer && typeof _bgmPlayer.start === 'function') {
        _bgmPlayer.start();
        _bgmStarted = true;
      }
    } catch (e) { console.warn('[Audio] BGM 启动失败', e); }
  }

  // ── 炮击音效（根据等级变化音调）─────────────────────────────────────────
  function playFire(level = 1) {
    if (!_ready || _muted) return;
    try {
      const note = ['C1', 'A1', 'G1', 'E1', 'C1'][level - 1] || 'C1';
      _synths.fire.triggerAttackRelease(note, '8n');
      // 高等级额外音效
      if (level >= 4) {
        setTimeout(() => _synths.big.triggerAttackRelease(['C3','E3','G3'], '16n'), 80);
      }
    } catch (_) {}
  }

  // ── 捕鱼音效（按鱼的大小变化音调）───────────────────────────────────────
  function playCatch(fishScore) {
    if (!_ready || _muted) return;
    try {
      if (fishScore >= 500) {
        // BOSS 鱼
        _synths.big.triggerAttackRelease(['C4','E4','G4','C5'], '8n');
        setTimeout(() => _synths.big.triggerAttackRelease(['E4','G4','B4'], '8n'), 150);
        setTimeout(() => _synths.big.triggerAttackRelease(['G4','B4','D5'], '8n'), 300);
      } else if (fishScore >= 150) {
        // 大鱼
        _synths.big.triggerAttackRelease(['C3','E3','G3'], '16n');
      } else {
        // 小鱼
        const freq = 300 + fishScore * 2;
        _synths.catch.triggerAttackRelease(freq, '16n');
      }
    } catch (_) {}
  }

  // ── 连击音效（连击数越大音调越高）───────────────────────────────────────
  function playCombo(comboCount) {
    if (!_ready || _muted) return;
    try {
      const notes = ['C4','E4','G4','B4','D5','F5','A5'];
      const note  = notes[Math.min(comboCount - 2, notes.length - 1)];
      _synths.ui.triggerAttackRelease(note, '16n');
    } catch (_) {}
  }

  // ── 礼物到达音效（欢快上扬音阶） ─────────────────────────────────────────
  function playGiftArrival(level = 1) {
    if (!_ready || _muted) return;
    try {
      const scales = {
        1: [['C4','0:0'],['E4','0:0:2'],['G4','0:1']],
        2: [['C4','0:0'],['E4','0:0:1'],['G4','0:0:2'],['C5','0:1']],
        3: [['C4','0:0'],['E4','0:0:1'],['G4','0:0:2'],['B4','0:1'],['D5','0:1:2']],
        4: [['C4','0:0'],['E4','0:0:1'],['G4','0:0:2'],['C5','0:1'],['E5','0:1:2'],['G5','0:2']],
        5: [['C4','0:0'],['E4','0:0:1'],['G4','0:0:2'],['C5','0:1'],['E5','0:1:2'],['G5','0:2'],['C6','0:3']],
      };
      const notes = scales[level] || scales[1];
      notes.forEach(([note, time]) => {
        _synths.gift.triggerAttackRelease(note, '16n', Tone.now() + Tone.Time(time).toSeconds());
      });
    } catch (_) {}
  }

  // ── 倒计时警告音 ─────────────────────────────────────────────────────────
  function playTick(urgent = false) {
    if (!_ready || _muted) return;
    try {
      _synths.tick.triggerAttackRelease(urgent ? 'G4' : 'C4', '32n');
    } catch (_) {}
  }

  // ── 未命中 ───────────────────────────────────────────────────────────────
  function playMiss() {
    if (!_ready || _muted) return;
    try {
      _synths.miss.triggerAttackRelease('C2', '16n');
    } catch (_) {}
  }

  // ── UI 点击音 ────────────────────────────────────────────────────────────
  function playUI(note = 'G4') {
    if (!_ready || _muted) return;
    try { _synths.ui.triggerAttackRelease(note, '32n'); } catch (_) {}
  }

  // ── 停止 BGM ────────────────────────────────────────────────────────────────
  function stopBGM() {
    if (!_bgmPlayer) return;
    try {
      if (typeof _bgmPlayer.stop === 'function') _bgmPlayer.stop();
      _bgmStarted = false;
    } catch (_) {}
  }

  // ── 动态调整 BGM 音量 ─────────────────────────────────────────────────────
  function setBGMVolume(db) {
    if (_bgmPlayer && _bgmPlayer.volume != null) {
      _bgmPlayer.volume.value = db;
    }
  }

  // ── 静音切换 ─────────────────────────────────────────────────────────────
  function toggleMute() {
    _muted = !_muted;
    if (_bgmPlayer && _bgmPlayer.volume != null) {
      _bgmPlayer.volume.value = _muted ? -Infinity : -18;
    }
    return _muted;
  }

  return {
    init, startBGM, stopBGM, setBGMVolume,
    playFire, playCatch, playCombo, playGiftArrival,
    playTick, playMiss, playUI, toggleMute,
    get ready() { return _ready; },
    get muted()  { return _muted; },
  };
})();
