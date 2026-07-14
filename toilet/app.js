/**
 * トイレいけるかな？
 * おしっこのれんしゅう — ステップ式トイレ練習ゲーム
 */

document.addEventListener('DOMContentLoaded', () => {
  const TOTAL_STEPS = 5;
  const STICKER_KEY = 'toilet-stickers';

  let activeStep = 1;
  let stepDone = false;
  let advanceTimer = null;

  // --- 音声 ---
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

  function resumeAudio() {
    if (audioCtx.state === 'suspended') audioCtx.resume();
  }

  function playTone(freq, type, duration, volume = 0.1) {
    resumeAudio();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    gain.gain.setValueAtTime(volume, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
  }

  function playTap() {
    playTone(320, 'triangle', 0.1, 0.12);
  }

  function playSuccess() {
    playTone(523.25, 'sine', 0.25, 0.1);
    setTimeout(() => playTone(659.25, 'sine', 0.3, 0.1), 120);
    setTimeout(() => playTone(783.99, 'sine', 0.35, 0.1), 240);
  }

  function playFlush() {
    resumeAudio();
    const bufferSize = audioCtx.sampleRate * 0.9;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      const t = i / audioCtx.sampleRate;
      data[i] = (Math.random() * 2 - 1) * Math.exp(-t * 2.2);
    }
    const noise = audioCtx.createBufferSource();
    noise.buffer = buffer;
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 900;
    const gain = audioCtx.createGain();
    gain.gain.value = 0.12;
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(audioCtx.destination);
    noise.start();
  }

  function playWater() {
    playTone(480, 'sine', 0.08, 0.05);
    setTimeout(() => playTone(520, 'sine', 0.08, 0.04), 60);
  }

  // --- DOM ---
  const menuScreen = document.getElementById('menu-screen');
  const gameContainer = document.getElementById('game-container');
  const footerMessage = document.getElementById('footer-message');
  const restartBtn = document.getElementById('restart-btn');
  const backToMenuBtn = document.getElementById('back-to-menu-btn');
  const stepIndicators = document.querySelectorAll('.step-indicator');
  const stepSections = document.querySelectorAll('.step-section');

  const signBtn = document.getElementById('sign-btn');
  const tummySign = document.getElementById('tummy-sign');
  const buddy = document.getElementById('buddy');
  const buddyDrag = document.getElementById('buddy-drag');
  const toiletTarget = document.getElementById('toilet-target');
  const pants = document.getElementById('pants');
  const buddySit = document.getElementById('buddy-sit');
  const toiletEl = document.getElementById('toilet');
  const peeStream = document.getElementById('pee-stream');
  const flushBtn = document.getElementById('flush-btn');
  const flushWater = document.getElementById('flush-water');
  const soapBtn = document.getElementById('soap-btn');
  const scrubBtn = document.getElementById('scrub-btn');
  const rinseBtn = document.getElementById('rinse-btn');
  const dryBtn = document.getElementById('dry-btn');
  const hands = document.getElementById('hands');
  const water = document.getElementById('water');
  const faucet = document.getElementById('faucet');
  const bubbles = document.getElementById('bubbles');
  const confetti = document.getElementById('confetti');
  const stickerCountEl = document.getElementById('sticker-count');

  const GUIDE = {
    1: 'おなかが もじもじ！ タップしてね',
    2: 'うさぎを トイレまで ひっぱってね',
    3: 'うさぎを トイレに のせてね',
    4: 'レバーを タップして みずを ながそう',
    5: 'せっけんで てを あらおう',
    clear: 'すごい！ ひとりで できたね',
  };

  function updateMessage(msg) {
    footerMessage.textContent = msg;
  }

  function setGuide(step, text) {
    if (step !== 'clear') {
      const el = document.getElementById(`guide-${step}`);
      if (el) el.textContent = text;
    }
    updateMessage(text);
  }

  function getStickerCount() {
    const n = parseInt(localStorage.getItem(STICKER_KEY) || '0', 10);
    return Number.isFinite(n) && n > 0 ? n : 0;
  }

  function addSticker() {
    const next = getStickerCount() + 1;
    localStorage.setItem(STICKER_KEY, String(next));
    return next;
  }

  function clearAdvanceTimer() {
    if (advanceTimer) {
      clearTimeout(advanceTimer);
      advanceTimer = null;
    }
  }

  /** ステップ完了 → 少し待って自動で次へ（つぎへボタンなし） */
  function showStepDone(delayMs = 1000) {
    if (stepDone) return;
    stepDone = true;
    playSuccess();
    clearAdvanceTimer();
    advanceTimer = setTimeout(() => {
      advanceTimer = null;
      if (activeStep === TOTAL_STEPS) {
        goToStep('clear');
      } else if (typeof activeStep === 'number' && activeStep < TOTAL_STEPS) {
        goToStep(activeStep + 1);
      }
    }, delayMs);
  }

  function goToStep(stepNum) {
    clearAdvanceTimer();
    activeStep = stepNum;
    stepDone = false;
    restartBtn.style.display = 'none';

    stepSections.forEach((sec) => {
      const s = sec.dataset.step;
      const isClear = stepNum === 'clear';
      const match = isClear ? s === 'clear' : String(s) === String(stepNum);
      sec.classList.toggle('active', match);
    });

    stepIndicators.forEach((ind) => {
      const n = Number(ind.dataset.step);
      if (stepNum === 'clear') {
        ind.classList.add('done');
        ind.classList.remove('active');
      } else {
        ind.classList.toggle('active', n === stepNum);
        ind.classList.toggle('done', n < stepNum);
      }
    });

    if (stepNum === 'clear') {
      setGuide('clear', GUIDE.clear);
      spawnConfetti();
      const total = addSticker();
      stickerCountEl.textContent = `これまでの シール：${total} まい`;
      restartBtn.style.display = 'inline-block';
      playSuccess();
      return;
    }

    setGuide(stepNum, GUIDE[stepNum]);
    resetStep(stepNum);
  }

  function resetStep(stepNum) {
    if (stepNum === 1) resetStep1();
    if (stepNum === 2) resetStep2();
    if (stepNum === 3) resetStep3();
    if (stepNum === 4) resetStep4();
    if (stepNum === 5) resetStep5();
  }

  function resetAll() {
    clearAdvanceTimer();
    if (peeTimer) {
      clearTimeout(peeTimer);
      peeTimer = null;
    }
    resetStep1();
    resetStep2();
    resetStep3();
    resetStep4();
    resetStep5();
    confetti.innerHTML = '';
  }

  // --- Step 1: きづく ---
  function resetStep1() {
    signBtn.classList.remove('done');
    signBtn.textContent = 'もじもじ…';
    tummySign.classList.add('ready');
    buddy.dataset.pose = 'wiggle';
  }

  function completeStep1() {
    if (stepDone || activeStep !== 1) return;
    playTap();
    signBtn.classList.add('done');
    signBtn.textContent = 'トイレに いきたい！';
    tummySign.classList.remove('ready');
    buddy.dataset.pose = 'happy';
    setGuide(1, 'きづけたね！');
    showStepDone(900);
  }

  signBtn.addEventListener('click', completeStep1);
  tummySign.addEventListener('click', completeStep1);
  tummySign.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      completeStep1();
    }
  });

  // --- Step 2: いく（ドラッグ） ---
  let dragState = {
    dragging: false,
    startX: 0,
    originLeft: 8,
    left: 8,
  };

  function resetStep2() {
    dragState.dragging = false;
    dragState.left = 8;
    buddyDrag.style.left = '8px';
    buddyDrag.style.top = '50%';
    buddyDrag.style.transform = 'translateY(-50%)';
    buddyDrag.classList.remove('dragging');
    toiletTarget.classList.remove('highlight');
  }

  function getPathBounds() {
    const area = buddyDrag.parentElement.getBoundingClientRect();
    const buddyW = buddyDrag.offsetWidth;
    const targetRect = toiletTarget.getBoundingClientRect();
    const maxLeft = targetRect.left - area.left - buddyW * 0.35;
    return { area, buddyW, maxLeft: Math.max(40, maxLeft) };
  }

  function isNearToilet() {
    return isOverlappingLoose(buddyDrag, toiletTarget, 20);
  }

  function isOverlappingLoose(elA, elB, pad = 15) {
    const a = elA.getBoundingClientRect();
    const b = elB.getBoundingClientRect();
    return !(
      a.right < b.left - pad ||
      a.left > b.right + pad ||
      a.bottom < b.top - pad ||
      a.top > b.bottom + pad
    );
  }

  function completeStep2() {
    if (stepDone || activeStep !== 2) return;
    toiletTarget.classList.add('highlight');
    const bounds = getPathBounds();
    buddyDrag.style.left = `${bounds.maxLeft}px`;
    buddyDrag.dataset.pose = 'happy';
    setGuide(2, 'トイレに ついたよ！');
    showStepDone(900);
  }

  buddyDrag.addEventListener('pointerdown', (e) => {
    if (activeStep !== 2 || stepDone) return;
    e.preventDefault();
    resumeAudio();
    playTap();
    dragState.dragging = true;
    dragState.startX = e.clientX;
    dragState.originLeft = dragState.left;
    buddyDrag.classList.add('dragging');
    buddyDrag.setPointerCapture(e.pointerId);
  });

  buddyDrag.addEventListener('pointermove', (e) => {
    if (!dragState.dragging) return;
    const bounds = getPathBounds();
    const dx = e.clientX - dragState.startX;
    let next = dragState.originLeft + dx;
    next = Math.max(8, Math.min(bounds.maxLeft, next));
    dragState.left = next;
    buddyDrag.style.left = `${next}px`;
    toiletTarget.classList.toggle('highlight', isNearToilet());
  });

  buddyDrag.addEventListener('pointerup', (e) => {
    if (!dragState.dragging) return;
    dragState.dragging = false;
    buddyDrag.classList.remove('dragging');
    try {
      buddyDrag.releasePointerCapture(e.pointerId);
    } catch (_) {
      /* ignore */
    }
    if (isNearToilet()) {
      completeStep2();
    }
  });

  // タップでもトイレドアへ（小さい子向けフォールバック）
  toiletTarget.addEventListener('click', () => {
    if (activeStep !== 2 || stepDone) return;
    playTap();
    completeStep2();
  });

  // --- Step 3: すわる（ドラッグでトイレにのせる） ---
  let seated = false;
  let peeTimer = null;
  let sitDrag = {
    dragging: false,
    startX: 0,
    startY: 0,
    originLeft: 0,
    originBottom: 20,
    left: 0,
    bottom: 20,
  };

  function placeBuddySit(left, bottom) {
    sitDrag.left = left;
    sitDrag.bottom = bottom;
    buddySit.style.left = `${left}px`;
    buddySit.style.bottom = `${bottom}px`;
    buddySit.style.transform = '';
  }

  function resetStep3() {
    seated = false;
    if (peeTimer) {
      clearTimeout(peeTimer);
      peeTimer = null;
    }
    pants.classList.remove('down');
    pants.classList.add('up');
    buddySit.classList.remove('on-toilet', 'dragging');
    buddySit.dataset.pose = 'stand';
    placeBuddySit(0, 20);
    toiletEl.classList.remove('highlight');
    peeStream.hidden = true;
  }

  function isNearSitToilet() {
    return isOverlappingLoose(buddySit, toiletEl, 24);
  }

  function clampSitPos(left, bottom) {
    const stage = buddySit.parentElement;
    const maxL = Math.max(0, stage.clientWidth - buddySit.offsetWidth);
    const maxB = Math.max(0, stage.clientHeight - buddySit.offsetHeight * 0.55);
    return {
      left: Math.max(0, Math.min(maxL, left)),
      bottom: Math.max(0, Math.min(maxB, bottom)),
    };
  }

  function startPee() {
    peeStream.hidden = false;
    setGuide(3, 'しゅわしゅわ… がんばってるね');
    peeTimer = setTimeout(() => {
      peeStream.hidden = true;
      buddySit.dataset.pose = 'happy';
      pants.classList.remove('down');
      pants.classList.add('up');
      setGuide(3, 'できた！');
      showStepDone(1000);
    }, 1800);
  }

  function doSit() {
    if (activeStep !== 3 || seated || stepDone) return;
    playTap();
    seated = true;
    sitDrag.dragging = false;
    buddySit.classList.remove('dragging');
    // インライン位置を消して、CSS の便座上レイアウトへ
    buddySit.style.left = '';
    buddySit.style.bottom = '';
    buddySit.style.transform = '';
    buddySit.classList.add('on-toilet');
    buddySit.dataset.pose = 'happy';
    pants.classList.add('down');
    pants.classList.remove('up');
    toiletEl.classList.add('highlight');
    setGuide(3, 'すわれた！');
    startPee();
  }

  buddySit.addEventListener('pointerdown', (e) => {
    if (activeStep !== 3 || seated || stepDone) return;
    e.preventDefault();
    resumeAudio();
    playTap();
    sitDrag.dragging = true;
    sitDrag.startX = e.clientX;
    sitDrag.startY = e.clientY;
    sitDrag.originLeft = sitDrag.left;
    sitDrag.originBottom = sitDrag.bottom;
    buddySit.classList.add('dragging');
    buddySit.setPointerCapture(e.pointerId);
  });

  buddySit.addEventListener('pointermove', (e) => {
    if (!sitDrag.dragging || seated) return;
    const dx = e.clientX - sitDrag.startX;
    const dy = e.clientY - sitDrag.startY;
    // 画面上に動かす = bottom を増やす
    const next = clampSitPos(sitDrag.originLeft + dx, sitDrag.originBottom - dy);
    placeBuddySit(next.left, next.bottom);
    toiletEl.classList.toggle('highlight', isNearSitToilet());
  });

  buddySit.addEventListener('pointerup', (e) => {
    if (!sitDrag.dragging) return;
    sitDrag.dragging = false;
    buddySit.classList.remove('dragging');
    try {
      buddySit.releasePointerCapture(e.pointerId);
    } catch (_) {
      /* ignore */
    }
    if (isNearSitToilet()) {
      doSit();
    } else {
      toiletEl.classList.remove('highlight');
    }
  });

  // タップでもトイレにすわれる（小さい子向け）
  toiletEl.addEventListener('click', () => {
    if (activeStep !== 3 || seated || stepDone) return;
    playTap();
    doSit();
  });

  // --- Step 4: ながす ---
  function resetStep4() {
    flushBtn.classList.remove('done');
    flushWater.classList.remove('active');
  }

  flushBtn.addEventListener('click', () => {
    if (activeStep !== 4 || stepDone) return;
    playFlush();
    flushBtn.classList.add('done');
    flushWater.classList.remove('active');
    // reflow for re-trigger
    void flushWater.offsetWidth;
    flushWater.classList.add('active');
    setGuide(4, 'ジャー！ きれいになったよ');
    setTimeout(() => {
      if (activeStep === 4 && !stepDone) {
        showStepDone(700);
      }
    }, 900);
  });

  // --- Step 5: あらう ---
  let washPhase = 'soap'; // soap → scrub → rinse → dry → done

  function resetStep5() {
    washPhase = 'soap';
    hands.dataset.state = 'dry';
    water.classList.remove('on');
    faucet.classList.remove('on');
    bubbles.innerHTML = '';
    [soapBtn, scrubBtn, rinseBtn, dryBtn].forEach((btn) => {
      btn.classList.remove('done');
      btn.disabled = true;
    });
    soapBtn.disabled = false;
  }

  function spawnBubbles(count = 8) {
    const rect = bubbles.getBoundingClientRect();
    for (let i = 0; i < count; i++) {
      const b = document.createElement('span');
      const size = 8 + Math.random() * 14;
      b.style.width = `${size}px`;
      b.style.height = `${size}px`;
      b.style.left = `${10 + Math.random() * 80}%`;
      b.style.bottom = `${10 + Math.random() * 40}%`;
      b.style.animationDuration = `${0.8 + Math.random() * 0.6}s`;
      bubbles.appendChild(b);
      setTimeout(() => b.remove(), 1400);
    }
  }

  soapBtn.addEventListener('click', () => {
    if (activeStep !== 5 || washPhase !== 'soap' || stepDone) return;
    playTap();
    washPhase = 'scrub';
    hands.dataset.state = 'soapy';
    soapBtn.classList.add('done');
    soapBtn.disabled = true;
    scrubBtn.disabled = false;
    spawnBubbles(6);
    setGuide(5, 'ごしごし あらおう');
  });

  scrubBtn.addEventListener('click', () => {
    if (activeStep !== 5 || washPhase !== 'scrub' || stepDone) return;
    playTap();
    washPhase = 'rinse';
    hands.dataset.state = 'scrub';
    scrubBtn.classList.add('done');
    scrubBtn.disabled = true;
    rinseBtn.disabled = false;
    spawnBubbles(10);
    setTimeout(() => {
      if (hands.dataset.state === 'scrub') hands.dataset.state = 'soapy';
    }, 900);
    setGuide(5, 'みずで すすごう');
  });

  rinseBtn.addEventListener('click', () => {
    if (activeStep !== 5 || washPhase !== 'rinse' || stepDone) return;
    playWater();
    washPhase = 'dry';
    hands.dataset.state = 'wet';
    water.classList.add('on');
    faucet.classList.add('on');
    rinseBtn.classList.add('done');
    rinseBtn.disabled = true;
    dryBtn.disabled = false;
    setGuide(5, 'タオルで ふこう');
  });

  dryBtn.addEventListener('click', () => {
    if (activeStep !== 5 || washPhase !== 'dry' || stepDone) return;
    playTap();
    washPhase = 'done';
    hands.dataset.state = 'dry';
    water.classList.remove('on');
    faucet.classList.remove('on');
    dryBtn.classList.add('done');
    dryBtn.disabled = true;
    setGuide(5, 'てが きれい！ やったね');
    showStepDone(800);
  });

  // --- クリア演出 ---
  function spawnConfetti() {
    confetti.innerHTML = '';
    const colors = ['#4fc3f7', '#ffb74d', '#81c784', '#f48fb1', '#fff176', '#ce93d8'];
    for (let i = 0; i < 36; i++) {
      const bit = document.createElement('i');
      bit.style.left = `${Math.random() * 100}%`;
      bit.style.background = colors[i % colors.length];
      bit.style.animationDuration = `${1.4 + Math.random() * 1.4}s`;
      bit.style.animationDelay = `${Math.random() * 0.4}s`;
      confetti.appendChild(bit);
    }
  }

  // --- ナビ ---
  restartBtn.addEventListener('click', () => {
    resumeAudio();
    playSuccess();
    resetAll();
    goToStep(1);
  });

  backToMenuBtn.addEventListener('click', () => {
    gameContainer.style.display = 'none';
    menuScreen.style.display = 'flex';
    resetAll();
    updateMessage('いっしょに れんしゅうしよう！');
    restartBtn.style.display = 'none';
  });

  document.querySelectorAll('.mode-card').forEach((card) => {
    card.addEventListener('click', () => {
      resumeAudio();
      playSuccess();
      menuScreen.style.display = 'none';
      gameContainer.style.display = 'flex';
      resetAll();
      goToStep(1);
    });
  });
});
