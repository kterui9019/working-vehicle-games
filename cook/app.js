/**
 * おうちでコックさん
 * ハンバーグ & オムライス & ピザ ゲームロジック
 */

document.addEventListener('DOMContentLoaded', () => {
  let currentRecipe = null;
  let activeStep = 1;

  // --- 音声 ---
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

  function playTone(freq, type, duration, volume = 0.1) {
    if (audioCtx.state === 'suspended') audioCtx.resume();
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

  function playChopSound() { playTone(120, 'triangle', 0.15, 0.2); }
  function playPatSound() { playTone(180, 'triangle', 0.1, 0.15); }
  function playSuccessSound() {
    playTone(523.25, 'sine', 0.3, 0.1);
    setTimeout(() => playTone(659.25, 'sine', 0.4, 0.1), 150);
  }

  let sizzleNode = null;
  function startSizzleSound() {
    if (sizzleNode) return;
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const bufferSize = audioCtx.sampleRate * 2;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const noise = audioCtx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 4000;
    filter.Q.value = 1.0;
    const gain = audioCtx.createGain();
    gain.gain.value = 0.02;
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(audioCtx.destination);
    noise.start();
    sizzleNode = { noise, gain };
  }

  function stopSizzleSound() {
    if (sizzleNode) {
      sizzleNode.noise.stop();
      sizzleNode.noise.disconnect();
      sizzleNode.gain.disconnect();
      sizzleNode = null;
    }
  }

  // --- 共通UI ---
  const menuScreen = document.getElementById('menu-screen');
  const gameContainer = document.getElementById('game-container');
  const footerMessage = document.getElementById('footer-message');
  const nextBtn = document.getElementById('next-step-btn');
  const restartBtn = document.getElementById('restart-btn');
  const backToMenuBtn = document.getElementById('back-to-menu-btn');
  const stepIndicators = document.querySelectorAll('.step-indicator');
  const hamburgerGame = document.getElementById('hamburger-game');
  const omuriceGame = document.getElementById('omurice-game');
  const pizzaGame = document.getElementById('pizza-game');

  const STEP_LABELS = {
    hamburger: ['じゅんび', 'やく', 'もりつけ'],
    omurice: ['チキンライス', 'たまご', 'かざり'],
    pizza: ['きじ', 'のせる', 'やく']
  };

  const RECIPE_TITLES = {
    hamburger: 'ハンバーグをつくろう',
    omurice: 'オムライスをつくろう',
    pizza: 'ピザをつくろう'
  };

  function getRecipeGameEl() {
    if (currentRecipe === 'hamburger') return hamburgerGame;
    if (currentRecipe === 'omurice') return omuriceGame;
    return pizzaGame;
  }

  function getRecipeModule() {
    if (currentRecipe === 'hamburger') return HamburgerGame;
    if (currentRecipe === 'omurice') return OmuriceGame;
    return PizzaGame;
  }

  function showActiveRecipeGame() {
    hamburgerGame.style.display = currentRecipe === 'hamburger' ? 'block' : 'none';
    omuriceGame.style.display = currentRecipe === 'omurice' ? 'block' : 'none';
    pizzaGame.style.display = currentRecipe === 'pizza' ? 'block' : 'none';
  }

  function initDraggable(el, callbacks = {}) {
    let startX = 0, startY = 0, currentX = 0, currentY = 0, isDragging = false;
    let rafId = null;

    const applyTransform = () => {
      rafId = null;
      el.style.transform = `translate(${currentX}px, ${currentY}px) scale(1.1)`;
    };

    el.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      if (audioCtx.state === 'suspended') audioCtx.resume();
      isDragging = true;
      startX = e.clientX - currentX;
      startY = e.clientY - currentY;
      el.classList.add('dragging');
      el.style.willChange = 'transform';
      if (callbacks.onStart) callbacks.onStart(el);
      el.setPointerCapture(e.pointerId);
    });

    el.addEventListener('pointermove', (e) => {
      if (!isDragging) return;
      currentX = e.clientX - startX;
      currentY = e.clientY - startY;
      if (callbacks.onDrag) callbacks.onDrag(el, e.clientX, e.clientY);
      if (!rafId) {
        rafId = requestAnimationFrame(applyTransform);
      }
    });

    el.addEventListener('pointerup', (e) => {
      if (!isDragging) return;
      isDragging = false;
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      el.style.willChange = '';
      el.classList.remove('dragging');
      el.releasePointerCapture(e.pointerId);
      let accepted = false;
      if (callbacks.onEnd) accepted = callbacks.onEnd(el, e.clientX, e.clientY);
      if (!accepted) {
        el.style.transition = 'transform 0.3s cubic-bezier(0.25, 1, 0.5, 1)';
        el.style.transform = '';
        currentX = 0;
        currentY = 0;
        setTimeout(() => { el.style.transition = ''; }, 300);
      }
    });
  }

  function isOverlapping(elA, elB) {
    const rectA = elA.getBoundingClientRect();
    const rectB = elB.getBoundingClientRect();
    return !(rectA.right < rectB.left || rectA.left > rectB.right ||
             rectA.bottom < rectB.top || rectA.top > rectB.bottom);
  }

  function isOverlappingLoose(elA, elB, opts = {}) {
    const { topTolerance = 40, generalTolerance = 15 } = opts;
    const rectA = elA.getBoundingClientRect();
    const rectB = elB.getBoundingClientRect();
    return !(rectA.right < rectB.left - generalTolerance ||
             rectA.left > rectB.right + generalTolerance ||
             rectA.bottom < rectB.top - topTolerance ||
             rectA.top > rectB.bottom + generalTolerance);
  }

  function updateMessage(msg) { footerMessage.textContent = msg; }

  function getStepSections() {
    return getRecipeGameEl().querySelectorAll('.step-section');
  }

  function goToStep(stepNum) {
    if (stepNum < 1 || stepNum > 3) return;
    activeStep = stepNum;
    const sections = getStepSections();
    sections.forEach((sec, idx) => {
      sec.classList.toggle('active', idx + 1 === stepNum);
    });
    stepIndicators.forEach((ind, idx) => {
      ind.classList.toggle('active', idx + 1 === stepNum);
    });
    nextBtn.style.display = 'none';
    getRecipeModule().onStep(stepNum);
  }

  nextBtn.addEventListener('click', () => {
    playSuccessSound();
    goToStep(activeStep + 1);
  });

  // --- メニュー ---
  document.querySelectorAll('.recipe-card').forEach(card => {
    card.addEventListener('click', () => {
      if (audioCtx.state === 'suspended') audioCtx.resume();
      playSuccessSound();
      currentRecipe = card.dataset.recipe;
      menuScreen.style.display = 'none';
      gameContainer.style.display = 'flex';
      showActiveRecipeGame();
      const labels = STEP_LABELS[currentRecipe];
      stepIndicators.forEach((ind, i) => {
        ind.querySelector('.step-text').textContent = labels[i];
      });
      document.getElementById('game-title').textContent = RECIPE_TITLES[currentRecipe];
      restartBtn.style.display = 'none';
      getRecipeModule().reset();
      goToStep(1);
    });
  });

  backToMenuBtn.addEventListener('click', () => {
    stopSizzleSound();
    gameContainer.style.display = 'none';
    menuScreen.style.display = 'flex';
    updateMessage('なにを つくる？');
    restartBtn.style.display = 'none';
    currentRecipe = null;
  });

  restartBtn.addEventListener('click', () => {
    getRecipeModule().reset();
    restartBtn.style.display = 'none';
    playSuccessSound();
    goToStep(1);
  });

  // ==========================================
  // ハンバーグ
  // ==========================================
  const HamburgerGame = (() => {
    const state = {
      onionCutCount: 0, onionCutLimit: 5, onionCutDone: false,
      addedIngredients: new Set(),
      requiredIngredients: ['ing-meat', 'ing-onion', 'ing-egg', 'ing-breadcrumbs'],
      kneadProgress: 0, kneadDone: false,
      pattyShapeCount: 0, pattyShapeLimit: 6, pattyShapeDone: false,
      pattyCookSide: 'front',
      pattyCookProgress: { front: 0, back: 0 },
      pattyCookTimer: null, pattyCookDone: false,
      pattyPlacedOnPan: false, pattyPlacedOnPlate: false,
      selectedSauce: 'ketchup', placedToppingsCount: 0,
      step2Initialized: false, step3Initialized: false
    };

    let step2InitDone = false;
    let step3InitDone = false;

    const onionEl = document.getElementById('onion');
    const ingOnionEl = document.getElementById('ing-onion');
    const mixingBowlEl = document.getElementById('mixing-bowl');
    const bowlInsideEl = document.getElementById('bowl-inside');
    const kneadAreaEl = document.getElementById('knead-area');
    const kneadBowlEl = document.getElementById('knead-bowl');
    const meatDoughEl = document.getElementById('meat-dough');
    const shapeAreaEl = document.getElementById('shape-area');
    const rawPattyEl = document.getElementById('raw-patty');
    const pattyToCookEl = document.getElementById('patty-to-cook');
    const fryingPanEl = document.getElementById('frying-pan');
    const panInsideEl = document.getElementById('pan-inside');
    const stoveFireEl = document.getElementById('stove-fire');
    const restingPlateEl = document.getElementById('resting-plate');
    const restingPlateInsideEl = document.getElementById('resting-plate-inside');
    const finalPlateEl = document.getElementById('final-plate');
    const finalPlateInsideEl = document.getElementById('final-plate-inside');
    const sauceCanvas = document.getElementById('sauce-canvas');
    const ingredients = document.querySelectorAll('#hamburger-game .draggable-ingredient');
    const toppings = document.querySelectorAll('#hamburger-game .draggable-topping');
    const sauceBottles = document.querySelectorAll('#hamburger-game .sauce-bottle');

    let activePattyEl = null;
    let canvasCtx = null;
    let isDrawingSauce = false;
    let kneadInitDone = false;
    let shapeInitDone = false;

    function getAddedClass(id) {
      const map = { 'ing-meat': 'added-meat', 'ing-onion': 'added-onion',
                    'ing-egg': 'added-egg', 'ing-breadcrumbs': 'added-breadcrumbs' };
      return map[id] || '';
    }

    let step1Initialized = false;

    function initStep1() {
      if (step1Initialized) return;
      step1Initialized = true;

      onionEl.addEventListener('click', () => {
        if (state.onionCutDone) return;
        state.onionCutCount++;
        playChopSound();
        onionEl.style.transform = 'scale(0.9) translateY(10px)';
        setTimeout(() => { onionEl.style.transform = ''; }, 100);

        const onionBody = onionEl.querySelector('.onion-body');
        const onionPieces = onionEl.querySelector('.onion-pieces');

        if (state.onionCutCount === 1) {
          onionBody.style.borderRadius = '50% 10% 10% 50% / 50% 50% 50% 50%';
          onionBody.style.width = '45%';
          onionBody.style.left = '0%';
          const rightHalf = document.createElement('div');
          rightHalf.className = 'onion-body';
          rightHalf.style.cssText = 'position:absolute;top:0;left:55%;width:45%;border-radius:10% 50% 50% 10% / 50% 50% 50% 50%';
          onionEl.appendChild(rightHalf);
          updateMessage('トントン！もっと きろう');
        } else if (state.onionCutCount === 3) {
          onionEl.querySelectorAll('.onion-body').forEach(el => el.style.display = 'none');
          onionPieces.style.display = 'block';
          const onionW = onionEl.clientWidth || 100;
          onionPieces.innerHTML = '';
          for (let i = 0; i < 15; i++) {
            const p = document.createElement('div');
            p.className = 'onion-piece';
            p.style.width = `${onionW * 0.08 + Math.random() * (onionW * 0.08)}px`;
            p.style.height = `${onionW * 0.06 + Math.random() * (onionW * 0.06)}px`;
            p.style.left = `${onionW * 0.1 + Math.random() * (onionW * 0.7)}px`;
            p.style.top = `${onionW * 0.1 + Math.random() * (onionW * 0.7)}px`;
            p.style.transform = `rotate(${Math.random() * 360}deg)`;
            onionPieces.appendChild(p);
          }
          updateMessage('あとすこし！トントン！');
        } else if (state.onionCutCount >= state.onionCutLimit) {
          state.onionCutDone = true;
          playSuccessSound();
          updateMessage('たまねぎが きれた！ボウルにいれよう');
          onionEl.style.transition = 'all 0.5s ease';
          onionEl.style.opacity = '0';
          onionEl.style.transform = 'scale(0)';
          ingOnionEl.style.display = 'flex';
          ingOnionEl.style.opacity = '0';
          ingOnionEl.style.transform = 'scale(0)';
          setTimeout(() => {
            ingOnionEl.style.transition = 'all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
            ingOnionEl.style.opacity = '1';
            ingOnionEl.style.transform = 'scale(1)';
          }, 300);
        }
      });

      ingredients.forEach(ing => {
        initDraggable(ing, {
          onEnd: (el) => {
            if (isOverlapping(el, mixingBowlEl)) {
              const id = el.id;
              state.addedIngredients.add(id);
              playTone(330, 'sine', 0.2, 0.15);
              const bowlItem = document.createElement('div');
              bowlItem.className = `added-ingredient ${getAddedClass(id)}`;
              bowlItem.style.left = `${15 + Math.random() * 30}%`;
              bowlItem.style.top = `${15 + Math.random() * 30}%`;
              bowlInsideEl.appendChild(bowlItem);
              el.style.display = 'none';
              const leftCount = state.requiredIngredients.filter(x => !state.addedIngredients.has(x)).length;
              if (leftCount > 0) {
                updateMessage(`のこりの ざいりょうも いれよう（あと ${leftCount}こ）`);
              } else {
                updateMessage('ぜんぶ はいった！しっかり まぜよう');
                setTimeout(showKneadArea, 1000);
              }
              return true;
            }
            return false;
          }
        });
      });
    }

    function showKneadArea() {
      kneadAreaEl.style.display = 'flex';
      kneadAreaEl.style.opacity = '0';
      setTimeout(() => {
        kneadAreaEl.style.transition = 'opacity 0.5s ease';
        kneadAreaEl.style.opacity = '1';
      }, 50);
      if (kneadInitDone) return;
      kneadInitDone = true;
      let isKneading = false, lastX = 0, lastY = 0;

      kneadBowlEl.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        isKneading = true;
        lastX = e.clientX; lastY = e.clientY;
        kneadBowlEl.setPointerCapture(e.pointerId);
      });
      kneadBowlEl.addEventListener('pointermove', (e) => {
        if (!isKneading || state.kneadDone) return;
        e.preventDefault();
        const dist = Math.hypot(e.clientX - lastX, e.clientY - lastY);
        if (dist > 5) {
          state.kneadProgress += dist * 0.15;
          lastX = e.clientX; lastY = e.clientY;
          const s1 = 40 + Math.sin(state.kneadProgress * 0.1) * 15;
          const s2 = 60 + Math.cos(state.kneadProgress * 0.08) * 15;
          const s3 = 50 + Math.sin(state.kneadProgress * 0.12) * 10;
          meatDoughEl.style.borderRadius = `${s1}% ${100-s1}% ${s2}% ${100-s2}% / ${s3}% ${s3}% ${100-s3}% ${100-s3}%`;
          if (Math.floor(state.kneadProgress) % 30 === 0) {
            playTone(150 + Math.sin(state.kneadProgress) * 20, 'triangle', 0.1, 0.05);
          }
          if (state.kneadProgress < 100) {
            meatDoughEl.style.backgroundColor = `rgb(${239 - state.kneadProgress * 0.16}, ${154 + state.kneadProgress * 0.02}, ${154 - state.kneadProgress * 0.09})`;
          }
          if (state.kneadProgress >= 100) {
            state.kneadDone = true;
            meatDoughEl.style.backgroundColor = '#df9c91';
            meatDoughEl.style.borderColor = '#c08075';
            meatDoughEl.style.borderRadius = '50%';
            playSuccessSound();
            updateMessage('きれいに まざった！かたちを ととのえよう');
            setTimeout(showShapeArea, 1200);
          }
        }
      });
      const stopKneading = (e) => {
        if (!isKneading) return;
        isKneading = false;
        try { kneadBowlEl.releasePointerCapture(e.pointerId); } catch (_) {}
      };
      kneadBowlEl.addEventListener('pointerup', stopKneading);
      kneadBowlEl.addEventListener('pointercancel', stopKneading);
    }

    function showShapeArea() {
      kneadAreaEl.style.transition = 'opacity 0.5s ease';
      kneadAreaEl.style.opacity = '0';
      setTimeout(() => { kneadAreaEl.style.display = 'none'; }, 500);
      shapeAreaEl.style.display = 'flex';
      shapeAreaEl.style.opacity = '0';
      setTimeout(() => {
        shapeAreaEl.style.transition = 'opacity 0.5s ease';
        shapeAreaEl.style.opacity = '1';
      }, 100);
      if (shapeInitDone) return;
      shapeInitDone = true;
      rawPattyEl.addEventListener('click', () => {
        if (state.pattyShapeDone) return;
        state.pattyShapeCount++;
        playPatSound();
        rawPattyEl.style.transform = 'scale(1.08, 0.92)';
        setTimeout(() => { rawPattyEl.style.transform = ''; }, 100);
        if (state.pattyShapeCount === 1) {
          rawPattyEl.style.borderRadius = '55% 45% 45% 55% / 60% 60% 40% 40%';
          updateMessage('ぺちぺち！');
        } else if (state.pattyShapeCount === 3) {
          rawPattyEl.style.borderRadius = '50% 50% 50% 50% / 55% 55% 45% 45%';
          updateMessage('だんだん まるくなってきた！');
        } else if (state.pattyShapeCount >= state.pattyShapeLimit) {
          state.pattyShapeDone = true;
          rawPattyEl.style.borderRadius = '50% 50% 50% 50% / 60% 60% 40% 40%';
          rawPattyEl.style.backgroundColor = '#df9c91';
          rawPattyEl.style.borderColor = '#c08075';
          playSuccessSound();
          updateMessage('きれいな ハンバーグが できた！やく じゅんびを しよう');
          setTimeout(() => goToStep(2), 1800);
        }
      });
    }

    function initStep2() {
      if (step2InitDone) return;
      step2InitDone = true;
      initDraggable(pattyToCookEl, {
        onEnd: (el) => {
          if (isOverlapping(el, fryingPanEl) && !state.pattyPlacedOnPan) {
            state.pattyPlacedOnPan = true;
            playTone(261.63, 'sine', 0.2, 0.1);
            el.style.display = 'none';
            activePattyEl = document.createElement('div');
            activePattyEl.className = 'patty-on-pan';
            panInsideEl.appendChild(activePattyEl);
            startCooking();
            return true;
          }
          return false;
        }
      });
    }

    function startCooking() {
      stoveFireEl.style.opacity = '1';
      startSizzleSound();
      updateMessage('じっくり やこう。おいしそうな いろになるかな？');
      const steamInterval = setInterval(() => {
        if (!state.pattyPlacedOnPan || state.pattyPlacedOnPlate) {
          clearInterval(steamInterval);
          return;
        }
        createSteamBubble(panInsideEl);
      }, 400);

      state.pattyCookTimer = setInterval(() => {
        const side = state.pattyCookSide;
        state.pattyCookProgress[side] += 10;
        const prog = state.pattyCookProgress[side];
        if (side === 'front') {
          if (prog <= 100) {
            const r = 223 - (223 - 141) * (prog / 100);
            const g = 156 - (156 - 110) * (prog / 100);
            const b = 145 - (145 - 99) * (prog / 100);
            activePattyEl.style.backgroundColor = `rgb(${r}, ${g}, ${b})`;
            activePattyEl.style.borderColor = `rgb(${r-30}, ${g-30}, ${b-30})`;
          }
          if (prog >= 100) {
            clearInterval(state.pattyCookTimer);
            updateMessage('やけた！タップして ひっくりかえそう');
            activePattyEl.style.animation = 'flicker 1s infinite alternate';
            activePattyEl.addEventListener('click', flipPatty);
          }
        } else {
          if (prog <= 100) {
            const r = 141 - (141 - 93) * (prog / 100);
            const g = 110 - (110 - 64) * (prog / 100);
            const b = 99 - (99 - 55) * (prog / 100);
            activePattyEl.style.backgroundColor = `rgb(${r}, ${g}, ${b})`;
            activePattyEl.style.borderColor = `rgb(${r-30}, ${g-30}, ${b-30})`;
          }
          if (prog >= 100) {
            clearInterval(state.pattyCookTimer);
            state.pattyCookDone = true;
            stopSizzleSound();
            stoveFireEl.style.opacity = '0';
            updateMessage('りょうめん やけた！おさらに うつそう');
            activePattyEl.style.animation = '';
            makePattyDraggableToPlate();
          }
        }
      }, 500);
    }

    function flipPatty() {
      activePattyEl.removeEventListener('click', flipPatty);
      activePattyEl.style.animation = '';
      playTone(200, 'triangle', 0.3, 0.15);
      activePattyEl.classList.add('flip');
      setTimeout(() => {
        activePattyEl.classList.remove('flip');
        activePattyEl.style.backgroundColor = '#df9c91';
        activePattyEl.style.borderColor = '#c08075';
        state.pattyCookSide = 'back';
        startCooking();
      }, 500);
    }

    function makePattyDraggableToPlate() {
      initDraggable(activePattyEl, {
        onEnd: (el) => {
          if (isOverlapping(el, restingPlateEl)) {
            state.pattyPlacedOnPlate = true;
            playTone(392, 'sine', 0.25, 0.1);
            el.style.display = 'none';
            const cookedPatty = document.createElement('div');
            cookedPatty.className = 'patty-on-pan cooked';
            cookedPatty.style.cssText = 'position:absolute;cursor:default';
            restingPlateInsideEl.appendChild(cookedPatty);
            updateMessage('おさらに のせられた！もりつけを しよう');
            setTimeout(() => goToStep(3), 1800);
            return true;
          }
          return false;
        }
      });
    }

    function initStep3() {
      if (step3InitDone) return;
      step3InitDone = true;
      const rect = sauceCanvas.getBoundingClientRect();
      sauceCanvas.width = rect.width;
      sauceCanvas.height = rect.height;
      canvasCtx = sauceCanvas.getContext('2d');
      canvasCtx.lineCap = 'round';
      canvasCtx.lineJoin = 'round';
      canvasCtx.lineWidth = rect.width < 350 ? 10 : 14;

      toppings.forEach(top => {
        initDraggable(top, {
          onEnd: (el, x, y) => {
            if (isOverlapping(el, finalPlateEl)) {
              playTone(440, 'sine', 0.15, 0.1);
              const plateRect = finalPlateInsideEl.getBoundingClientRect();
              const placedTop = document.createElement('div');
              placedTop.className = 'placed-topping';
              placedTop.innerHTML = `<div class="${el.getAttribute('data-type')}-icon"></div>`;
              finalPlateInsideEl.appendChild(placedTop);
              const iconRect = placedTop.querySelector('div').getBoundingClientRect();
              placedTop.style.left = `${x - plateRect.left - iconRect.width / 2}px`;
              placedTop.style.top = `${y - plateRect.top - iconRect.height / 2}px`;
              initDraggable(placedTop, {
                onEnd: (pEl, px, py) => {
                  if (!isOverlapping(pEl, finalPlateEl)) {
                    pEl.remove();
                    state.placedToppingsCount--;
                    return true;
                  }
                  const pRect = finalPlateInsideEl.getBoundingClientRect();
                  pEl.style.transform = '';
                  const pElRect = pEl.getBoundingClientRect();
                  pEl.style.left = `${px - pRect.left - pElRect.width / 2}px`;
                  pEl.style.top = `${py - pRect.top - pElRect.height / 2}px`;
                  return true;
                }
              });
              state.placedToppingsCount++;
              updateMessage('すてきな もりつけ！ソースも かけてみよう');
              restartBtn.style.display = 'block';
              return false;
            }
            return false;
          }
        });
      });

      sauceBottles.forEach(bottle => {
        bottle.addEventListener('click', () => {
          sauceBottles.forEach(b => b.classList.remove('active'));
          bottle.classList.add('active');
          state.selectedSauce = bottle.getAttribute('data-sauce');
          playTone(350, 'sine', 0.1, 0.1);
        });
      });

      sauceCanvas.addEventListener('pointerdown', startSauceDraw);
      sauceCanvas.addEventListener('pointermove', drawSauce);
      sauceCanvas.addEventListener('pointerup', stopSauceDraw);
      sauceCanvas.addEventListener('pointerleave', stopSauceDraw);
    }

    function startSauceDraw(e) {
      e.preventDefault();
      isDrawingSauce = true;
      canvasCtx.beginPath();
      const rect = sauceCanvas.getBoundingClientRect();
      canvasCtx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
      canvasCtx.strokeStyle = state.selectedSauce === 'ketchup' ? '#d32f2f' : '#3e2723';
      playTone(180, 'sine', 0.2, 0.05);
      createSauceCursor(e.clientX, e.clientY);
    }

    function drawSauce(e) {
      if (!isDrawingSauce) return;
      const rect = sauceCanvas.getBoundingClientRect();
      canvasCtx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
      canvasCtx.stroke();
      if (Math.random() < 0.15) playTone(150 + Math.random() * 50, 'sine', 0.08, 0.03);
      updateSauceCursor(e.clientX, e.clientY);
    }

    function stopSauceDraw() {
      if (!isDrawingSauce) return;
      isDrawingSauce = false;
      canvasCtx.closePath();
      removeSauceCursor();
      updateMessage('おいしそうな ハンバーグが できたね！');
      restartBtn.style.display = 'block';
    }

    function createSauceCursor(x, y) {
      removeSauceCursor();
      const cursor = document.createElement('div');
      cursor.id = 'sauce-cursor-bottle';
      cursor.style.cssText = `position:fixed;width:35px;height:60px;border-radius:8px 8px 4px 4px;background-color:${state.selectedSauce === 'ketchup' ? '#e53935' : '#3e2723'};border:2px solid #fff;z-index:1000;pointer-events:none;transform-origin:bottom center;transform:translate(-50%,-100%) rotate(135deg)`;
      document.body.appendChild(cursor);
      updateSauceCursor(x, y);
    }

    function updateSauceCursor(x, y) {
      const cursor = document.getElementById('sauce-cursor-bottle');
      if (cursor) { cursor.style.left = `${x}px`; cursor.style.top = `${y}px`; }
    }

    function removeSauceCursor() {
      document.getElementById('sauce-cursor-bottle')?.remove();
    }

    function reset() {
      Object.assign(state, {
        onionCutCount: 0, onionCutDone: false,
        kneadProgress: 0, kneadDone: false,
        pattyShapeCount: 0, pattyShapeDone: false,
        pattyCookSide: 'front',
        pattyCookProgress: { front: 0, back: 0 },
        pattyCookDone: false, pattyPlacedOnPan: false, pattyPlacedOnPlate: false,
        selectedSauce: 'ketchup', placedToppingsCount: 0
      });
      state.addedIngredients = new Set();
      if (state.pattyCookTimer) clearInterval(state.pattyCookTimer);
      stopSizzleSound();

      onionEl.style.cssText = '';
      const onionBody = onionEl.querySelector('.onion-body');
      onionBody.style.cssText = '';
      onionEl.querySelectorAll('.onion-body').forEach((el, i) => { if (i > 0) el.remove(); });
      onionEl.querySelector('.onion-pieces').style.display = 'none';
      ingOnionEl.style.display = 'none';
      ingredients.forEach(ing => {
        ing.style.display = 'flex';
        ing.style.transform = '';
      });
      bowlInsideEl.innerHTML = '';
      kneadAreaEl.style.display = 'none';
      meatDoughEl.style.cssText = '';
      shapeAreaEl.style.display = 'none';
      rawPattyEl.style.cssText = '';
      pattyToCookEl.style.display = 'block';
      pattyToCookEl.style.transform = '';
      panInsideEl.innerHTML = '';
      stoveFireEl.style.opacity = '0';
      restingPlateInsideEl.innerHTML = '';
      finalPlateInsideEl.querySelectorAll('.placed-topping').forEach(t => t.remove());
      if (canvasCtx) canvasCtx.clearRect(0, 0, sauceCanvas.width, sauceCanvas.height);
    }

    return {
      onStep(stepNum) {
        if (stepNum === 1) { updateMessage('まずは たまねぎを トントン きろう'); initStep1(); }
        else if (stepNum === 2) { updateMessage('ハンバーグを フライパンにいれて やこう'); initStep2(); }
        else { updateMessage('おさらに やさいを もりつけて、ソースをかけよう！'); initStep3(); }
      },
      reset
    };
  })();

  // ==========================================
  // オムライス
  // ==========================================
  const OmuriceGame = (() => {
    const state = {
      chickenCutCount: 0, chickenCutLimit: 5, chickenCutDone: false,
      addedIngredients: new Set(),
      requiredIngredients: ['om-ing-rice', 'om-ing-chicken', 'om-ing-ketchup'],
      stirProgress: 0, stirDone: false,
      eggCracked: false, eggBeaten: false, beatProgress: 0,
      eggPoured: false, eggCookProgress: 0, eggCookTimer: null, eggCookDone: false,
      riceOnOmelette: false, wrapCount: 0, wrapLimit: 4, wrapDone: false,
      placedToppingsCount: 0
    };

    let omStep2InitDone = false;
    let omStep3InitDone = false;
    let omEggPourInitDone = false;
    let omChickenRiceDragInitDone = false;

    const chickenEl = document.getElementById('om-chicken');
    const ingChickenEl = document.getElementById('om-ing-chicken');
    const ricePanEl = document.getElementById('om-rice-pan');
    const ricePanInsideEl = document.getElementById('om-rice-pan-inside');
    const stirAreaEl = document.getElementById('om-stir-area');
    const stirPanEl = document.getElementById('om-stir-pan');
    const chickenRiceMixEl = document.getElementById('om-chicken-rice-mix');
    const eggBowlEl = document.getElementById('om-egg-bowl');
    const eggLiquidEl = document.getElementById('om-egg-liquid');
    const eggSourceEl = document.getElementById('om-egg-source');
    const eggPanEl = document.getElementById('om-egg-pan');
    const eggPanInsideEl = document.getElementById('om-egg-pan-inside');
    const omStoveFireEl = document.getElementById('om-stove-fire');
    const chickenRiceTrayEl = document.getElementById('om-chicken-rice-tray');
    const chickenRiceReadyEl = document.getElementById('om-chicken-rice-ready');
    const finalPlateEl = document.getElementById('om-final-plate');
    const finalPlateInsideEl = document.getElementById('om-final-plate-inside');
    const ketchupCanvas = document.getElementById('om-ketchup-canvas');
    const omIngredients = document.querySelectorAll('#omurice-game .om-shelf .draggable-ingredient');
    const omToppings = document.querySelectorAll('#omurice-game .draggable-topping');

    let activeOmeletteEl = null;
    let omCanvasCtx = null;
    let isDrawingKetchup = false;
    let omStirInitDone = false;

    function getOmAddedClass(id) {
      const map = { 'om-ing-rice': 'added-rice', 'om-ing-chicken': 'added-chicken', 'om-ing-ketchup': 'added-ketchup' };
      return map[id] || '';
    }

    let omStep1Initialized = false;

    function initStep1() {
      if (omStep1Initialized) return;
      omStep1Initialized = true;

      chickenEl.addEventListener('click', () => {
        if (state.chickenCutDone) return;
        state.chickenCutCount++;
        playChopSound();
        chickenEl.style.transform = 'scale(0.9) translateY(10px)';
        setTimeout(() => { chickenEl.style.transform = ''; }, 100);

        const chickenPieces = chickenEl.querySelector('.chicken-pieces');
        if (state.chickenCutCount === 2) {
          updateMessage('トントン！もっと きろう');
        } else if (state.chickenCutCount === 3) {
          chickenEl.querySelector('.chicken-body').style.display = 'none';
          chickenPieces.style.display = 'block';
          const w = chickenEl.clientWidth || 100;
          chickenPieces.innerHTML = '';
          for (let i = 0; i < 12; i++) {
            const p = document.createElement('div');
            p.className = 'chicken-piece';
            p.style.width = `${w * 0.1 + Math.random() * (w * 0.08)}px`;
            p.style.height = `${w * 0.08 + Math.random() * (w * 0.06)}px`;
            p.style.left = `${w * 0.1 + Math.random() * (w * 0.7)}px`;
            p.style.top = `${w * 0.1 + Math.random() * (w * 0.7)}px`;
            p.style.transform = `rotate(${Math.random() * 360}deg)`;
            chickenPieces.appendChild(p);
          }
          updateMessage('あとすこし！トントン！');
        } else if (state.chickenCutCount >= state.chickenCutLimit) {
          state.chickenCutDone = true;
          playSuccessSound();
          updateMessage('チキンが きれた！フライパンに いれよう');
          chickenEl.style.transition = 'all 0.5s ease';
          chickenEl.style.opacity = '0';
          chickenEl.style.transform = 'scale(0)';
          ingChickenEl.style.display = 'flex';
          ingChickenEl.style.opacity = '0';
          setTimeout(() => {
            ingChickenEl.style.transition = 'all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
            ingChickenEl.style.opacity = '1';
          }, 300);
        }
      });

      omIngredients.forEach(ing => {
        initDraggable(ing, {
          onEnd: (el) => {
            if (isOverlapping(el, ricePanEl)) {
              const id = el.id;
              state.addedIngredients.add(id);
              playTone(330, 'sine', 0.2, 0.15);
              const item = document.createElement('div');
              item.className = `added-ingredient ${getOmAddedClass(id)}`;
              item.style.left = `${15 + Math.random() * 30}%`;
              item.style.top = `${15 + Math.random() * 30}%`;
              ricePanInsideEl.appendChild(item);
              el.style.display = 'none';
              const left = state.requiredIngredients.filter(x => !state.addedIngredients.has(x)).length;
              if (left > 0) {
                updateMessage(`のこりの ざいりょうも いれよう（あと ${left}こ）`);
              } else {
                updateMessage('ぜんぶ はいった！くるくる まぜよう');
                setTimeout(showStirArea, 1000);
              }
              return true;
            }
            return false;
          }
        });
      });
    }

    function showStirArea() {
      stirAreaEl.style.display = 'flex';
      stirAreaEl.style.opacity = '0';
      setTimeout(() => {
        stirAreaEl.style.transition = 'opacity 0.5s ease';
        stirAreaEl.style.opacity = '1';
      }, 50);
      if (omStirInitDone) return;
      omStirInitDone = true;
      let isStirring = false, lastX = 0, lastY = 0;

      stirPanEl.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        isStirring = true;
        lastX = e.clientX; lastY = e.clientY;
        stirPanEl.setPointerCapture(e.pointerId);
      });
      stirPanEl.addEventListener('pointermove', (e) => {
        if (!isStirring || state.stirDone) return;
        e.preventDefault();
        const dist = Math.hypot(e.clientX - lastX, e.clientY - lastY);
        if (dist > 5) {
          state.stirProgress += dist * 0.15;
          lastX = e.clientX; lastY = e.clientY;
          const s1 = 40 + Math.sin(state.stirProgress * 0.1) * 15;
          const s2 = 60 + Math.cos(state.stirProgress * 0.08) * 15;
          chickenRiceMixEl.style.borderRadius = `${s1}% ${100-s1}% ${s2}% ${100-s2}%`;
          if (Math.floor(state.stirProgress) % 30 === 0) {
            playTone(150 + Math.sin(state.stirProgress) * 20, 'triangle', 0.1, 0.05);
          }
          const mix = Math.min(state.stirProgress / 100, 1);
          chickenRiceMixEl.style.background =
            `linear-gradient(135deg, #ff8a65 0%, #ff7043 ${30 + mix * 10}%, #fff8e1 ${50 + mix * 10}%, #ffcc80 100%)`;
          if (state.stirProgress >= 100) {
            state.stirDone = true;
            playSuccessSound();
            updateMessage('チキンライスが できた！たまごを つくろう');
            setTimeout(() => goToStep(2), 1800);
          }
        }
      });
      const stopStir = (e) => {
        if (!isStirring) return;
        isStirring = false;
        try { stirPanEl.releasePointerCapture(e.pointerId); } catch (_) {}
      };
      stirPanEl.addEventListener('pointerup', stopStir);
      stirPanEl.addEventListener('pointercancel', stopStir);
    }

    function playWrapSound() {
      playTone(280 + state.wrapCount * 30, 'sine', 0.12, 0.1);
    }

    function initChickenRiceDrag() {
      if (omChickenRiceDragInitDone) return;
      omChickenRiceDragInitDone = true;
      initDraggable(chickenRiceReadyEl, {
        onEnd: (el) => {
          if (!state.eggCookDone) {
            updateMessage('まず オムレツを やこう');
            return false;
          }
          if (state.riceOnOmelette) return false;
          if (isOverlapping(el, eggPanEl)) {
            state.riceOnOmelette = true;
            playTone(330, 'sine', 0.2, 0.15);
            el.style.display = 'none';
            chickenRiceTrayEl.classList.add('used');

            const riceOnOmelette = document.createElement('div');
            riceOnOmelette.className = 'rice-on-omelette';
            activeOmeletteEl.appendChild(riceOnOmelette);

            const omeletteFold = document.createElement('div');
            omeletteFold.className = 'omelette-fold';
            activeOmeletteEl.appendChild(omeletteFold);

            activeOmeletteEl.classList.add('has-rice');
            updateMessage('オムレツで ライスを マルマル おおおう');
            enableOmeletteWrap();
            return true;
          }
          return false;
        }
      });
    }

    function enableOmeletteWrap() {
      activeOmeletteEl.addEventListener('click', () => {
        if (!state.riceOnOmelette || state.wrapDone) return;
        state.wrapCount++;
        playWrapSound();
        activeOmeletteEl.classList.remove('wrap-1', 'wrap-2', 'wrap-3', 'wrapped');
        if (state.wrapCount === 1) {
          activeOmeletteEl.classList.add('wrap-1');
          updateMessage('左右から オムレツを とじていこう');
        } else if (state.wrapCount === 2) {
          activeOmeletteEl.classList.add('wrap-2');
          updateMessage('もうすこし！マルマル おおおう');
        } else if (state.wrapCount === 3) {
          activeOmeletteEl.classList.add('wrap-3');
          updateMessage('あと ひと押し！');
        } else if (state.wrapCount >= state.wrapLimit) {
          state.wrapDone = true;
          activeOmeletteEl.classList.add('wrapped');
          activeOmeletteEl.classList.remove('wrap-1', 'wrap-2', 'wrap-3');
          playSuccessSound();
          updateMessage('ふわふわ オムライスが できた！かざりを つけよう');
          setTimeout(() => goToStep(3), 1800);
        }
      });
    }

    function initStep2() {
      if (omStep2InitDone) return;
      omStep2InitDone = true;

      initDraggable(eggSourceEl, {
        onEnd: (el) => {
          if (state.eggCracked) return false;
          if (isOverlapping(el, eggBowlEl)) {
            state.eggCracked = true;
            playTone(200, 'triangle', 0.2, 0.15);
            eggLiquidEl.classList.add('visible');
            eggSourceEl.style.opacity = '0.3';
            updateMessage('くるくる まぜて たまごを とかそう');
            return true;
          }
          return false;
        }
      });

      let isBeating = false, lastX = 0, lastY = 0;
      eggBowlEl.addEventListener('pointerdown', (e) => {
        if (!state.eggCracked || state.eggBeaten) return;
        e.preventDefault();
        isBeating = true;
        lastX = e.clientX; lastY = e.clientY;
        eggBowlEl.setPointerCapture(e.pointerId);
      });
      eggBowlEl.addEventListener('pointermove', (e) => {
        if (!isBeating || state.eggBeaten) return;
        e.preventDefault();
        const dist = Math.hypot(e.clientX - lastX, e.clientY - lastY);
        if (dist > 5) {
          state.beatProgress += dist * 0.2;
          lastX = e.clientX; lastY = e.clientY;
          if (Math.floor(state.beatProgress) % 25 === 0) {
            playTone(160 + Math.sin(state.beatProgress) * 15, 'triangle', 0.08, 0.05);
          }
          if (state.beatProgress >= 80) {
            state.eggBeaten = true;
            eggLiquidEl.classList.add('beaten');
            playSuccessSound();
            updateMessage('たまごが とけた！フライパンに ながそう');
            initEggPour();
          }
        }
      });
      const stopBeat = (e) => {
        if (!isBeating) return;
        isBeating = false;
        try { eggBowlEl.releasePointerCapture(e.pointerId); } catch (_) {}
      };
      eggBowlEl.addEventListener('pointerup', stopBeat);
      eggBowlEl.addEventListener('pointercancel', stopBeat);
    }

    function initEggPour() {
      if (omEggPourInitDone) return;
      omEggPourInitDone = true;
      initDraggable(eggBowlEl, {
        onEnd: (el) => {
          if (isOverlapping(el, eggPanEl) && !state.eggPoured) {
            state.eggPoured = true;
            playTone(261.63, 'sine', 0.2, 0.1);
            el.style.display = 'none';
            activeOmeletteEl = document.createElement('div');
            activeOmeletteEl.className = 'omelette-on-pan';
            eggPanInsideEl.appendChild(activeOmeletteEl);
            startEggCooking();
            return true;
          }
          return false;
        }
      });
    }

    function startEggCooking() {
      omStoveFireEl.style.opacity = '1';
      startSizzleSound();
      updateMessage('じっくり やこう。ふわふわ オムレツに なるよ');
      const steamInterval = setInterval(() => {
        if (!state.eggPoured || state.wrapDone) {
          clearInterval(steamInterval);
          return;
        }
        createSteamBubble(eggPanInsideEl);
      }, 400);

      state.eggCookTimer = setInterval(() => {
        state.eggCookProgress += 10;
        const prog = state.eggCookProgress;
        if (prog <= 100) {
          const y1 = 255 - (255 - 241) * (prog / 100);
          const y2 = 213 - (213 - 192) * (prog / 100);
          activeOmeletteEl.style.background = `linear-gradient(180deg, rgb(255,${y1},${100 + prog * 0.2}) 0%, rgb(251,${y2},45) 100%)`;
        }
        if (prog >= 100) {
          clearInterval(state.eggCookTimer);
          state.eggCookDone = true;
          stopSizzleSound();
          omStoveFireEl.style.opacity = '0';
          activeOmeletteEl.classList.add('cooked');
          updateMessage('チキンライスを オムレツの うえに のせよう');
          initChickenRiceDrag();
        }
      }, 400);
    }

    function initStep3() {
      if (omStep3InitDone) return;
      omStep3InitDone = true;
      const rect = ketchupCanvas.getBoundingClientRect();
      ketchupCanvas.width = rect.width;
      ketchupCanvas.height = rect.height;
      omCanvasCtx = ketchupCanvas.getContext('2d');
      omCanvasCtx.lineCap = 'round';
      omCanvasCtx.lineJoin = 'round';
      omCanvasCtx.lineWidth = rect.width < 350 ? 8 : 12;

      omToppings.forEach(top => {
        if (top.getAttribute('data-type') === 'parsley') {
          let lastX = 0, lastY = 0, lastTime = 0, directionChanges = 0, lastDir = 0;
          const SHAKE_THRESHOLD = 5;
          const SHAKE_TIME_WINDOW = 800;

          top.addEventListener('pointermove', (e) => {
            if (!top.classList.contains('dragging')) return;
            const now = Date.now();
            const dx = e.clientX - lastX;
            const dy = e.clientY - lastY;
            const dist = Math.hypot(dx, dy);
            if (dist < 3) return;

            const dir = Math.atan2(dy, dx);
            if (lastDir !== 0 && Math.abs(dir - lastDir) > 1.2) {
              directionChanges++;
            }
            lastDir = dir;
            lastX = e.clientX;
            lastY = e.clientY;
            lastTime = now;

            if (directionChanges >= SHAKE_THRESHOLD) {
              emitParsleyFlakes(finalPlateInsideEl, 7);
              directionChanges = 0;
              playTone(520, 'sine', 0.08, 0.08);
            }
          });
        }

        initDraggable(top, {
          onEnd: (el, x, y) => {
            if (isOverlapping(el, finalPlateEl)) {
              playTone(440, 'sine', 0.15, 0.1);
              const plateRect = finalPlateInsideEl.getBoundingClientRect();
              const placedTop = document.createElement('div');
              placedTop.className = 'placed-topping';
              placedTop.innerHTML = `<div class="${el.getAttribute('data-type')}-icon"></div>`;
              finalPlateInsideEl.appendChild(placedTop);
              const iconRect = placedTop.querySelector('div').getBoundingClientRect();
              placedTop.style.left = `${x - plateRect.left - iconRect.width / 2}px`;
              placedTop.style.top = `${y - plateRect.top - iconRect.height / 2}px`;
              initDraggable(placedTop, {
                onEnd: (pEl, px, py) => {
                  if (!isOverlapping(pEl, finalPlateEl)) {
                    pEl.remove();
                    state.placedToppingsCount--;
                    return true;
                  }
                  const pRect = finalPlateInsideEl.getBoundingClientRect();
                  pEl.style.transform = '';
                  const pElRect = pEl.getBoundingClientRect();
                  pEl.style.left = `${px - pRect.left - pElRect.width / 2}px`;
                  pEl.style.top = `${py - pRect.top - pElRect.height / 2}px`;
                  return true;
                }
              });
              state.placedToppingsCount++;
              updateMessage('すてき！ケチャップも かけてみよう');
              restartBtn.style.display = 'block';
              return false;
            }
            return false;
          }
        });
      });

      function emitParsleyFlakes(container, count) {
        for (let i = 0; i < count; i++) {
          const flake = document.createElement('div');
          flake.className = 'parsley-flake';
          flake.style.left = `${20 + Math.random() * 60}%`;
          flake.style.top = `-10px`;
          flake.style.transform = `rotate(${Math.random() * 360}deg)`;
          container.appendChild(flake);
          const delay = Math.random() * 120;
          setTimeout(() => {
            flake.style.transition = `transform 600ms cubic-bezier(0.2,0.8,0.3,1), opacity 600ms ease`;
            flake.style.transform = `translateY(${180 + Math.random() * 60}px) rotate(${Math.random() * 180 - 90}deg)`;
            flake.style.opacity = '0';
          }, delay);
          setTimeout(() => flake.remove(), 900);
        }
      }

      ketchupCanvas.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        isDrawingKetchup = true;
        omCanvasCtx.beginPath();
        const rect = ketchupCanvas.getBoundingClientRect();
        omCanvasCtx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
        omCanvasCtx.strokeStyle = '#d32f2f';
        playTone(180, 'sine', 0.2, 0.05);
      });
      ketchupCanvas.addEventListener('pointermove', (e) => {
        if (!isDrawingKetchup) return;
        const rect = ketchupCanvas.getBoundingClientRect();
        omCanvasCtx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
        omCanvasCtx.stroke();
        if (Math.random() < 0.15) playTone(150 + Math.random() * 50, 'sine', 0.08, 0.03);
      });
      const stopKetchup = () => {
        if (!isDrawingKetchup) return;
        isDrawingKetchup = false;
        omCanvasCtx.closePath();
        updateMessage('おいしそうな オムライスが できたね！');
        restartBtn.style.display = 'block';
      };
      ketchupCanvas.addEventListener('pointerup', stopKetchup);
      ketchupCanvas.addEventListener('pointerleave', stopKetchup);
    }

    function reset() {
      Object.assign(state, {
        chickenCutCount: 0, chickenCutDone: false,
        stirProgress: 0, stirDone: false,
        eggCracked: false, eggBeaten: false, beatProgress: 0,
        eggPoured: false, eggCookProgress: 0, eggCookDone: false,
        riceOnOmelette: false, wrapCount: 0, wrapDone: false,
        placedToppingsCount: 0
      });
      state.addedIngredients = new Set();
      if (state.eggCookTimer) clearInterval(state.eggCookTimer);
      stopSizzleSound();

      chickenEl.style.cssText = '';
      chickenEl.querySelector('.chicken-body').style.display = 'block';
      chickenEl.querySelector('.chicken-pieces').style.display = 'none';
      ingChickenEl.style.display = 'none';
      omIngredients.forEach(ing => {
        ing.style.display = 'flex';
        ing.style.transform = '';
      });
      ricePanInsideEl.innerHTML = '';
      stirAreaEl.style.display = 'none';
      chickenRiceMixEl.style.cssText = '';
      chickenRiceTrayEl.classList.remove('used');
      chickenRiceReadyEl.style.display = 'block';
      chickenRiceReadyEl.style.transform = '';
      eggBowlEl.style.display = '';
      eggBowlEl.style.transform = '';
      eggLiquidEl.className = 'egg-liquid';
      eggSourceEl.style.opacity = '1';
      eggPanInsideEl.innerHTML = '';
      omStoveFireEl.style.opacity = '0';
      finalPlateInsideEl.querySelectorAll('.placed-topping').forEach(t => t.remove());
      if (omCanvasCtx) omCanvasCtx.clearRect(0, 0, ketchupCanvas.width, ketchupCanvas.height);
    }

    return {
      onStep(stepNum) {
        if (stepNum === 1) {
          updateMessage('チキンを トントン きって チキンライスを つくろう');
          initStep1();
        } else if (stepNum === 2) {
          updateMessage('たまごを ボウルに うって まぜよう');
          initStep2();
        } else {
          updateMessage('ケチャップで かわいく かざろう！');
          initStep3();
        }
      },
      reset
    };
  })();

  // ==========================================
  // ピザ
  // ==========================================
  const PizzaGame = (() => {
    const state = {
      addedIngredients: new Set(),
      requiredIngredients: ['pz-ing-flour', 'pz-ing-water', 'pz-ing-yeast'],
      kneadProgress: 0, kneadDone: false,
      stretchCount: 0, stretchLimit: 6, stretchDone: false,
      sauceAdded: false, cheeseAdded: false, prepDone: false,
      pizzaInOven: false, bakeProgress: 0, bakeTimer: null, bakeDone: false,
      placedToppingsCount: 0
    };

    let pzStep1InitDone = false;
    let pzStep2InitDone = false;
    let pzStep3InitDone = false;
    let pzKneadInitDone = false;
    let pzStretchInitDone = false;
    let pzTrayDragInitDone = false;

    const mixingBowlEl = document.getElementById('pz-mixing-bowl');
    const bowlInsideEl = document.getElementById('pz-bowl-inside');
    const kneadAreaEl = document.getElementById('pz-knead-area');
    const kneadBowlEl = document.getElementById('pz-knead-bowl');
    const doughEl = document.getElementById('pz-dough');
    const stretchAreaEl = document.getElementById('pz-stretch-area');
    const rawDoughEl = document.getElementById('pz-raw-dough');
    const bakingTrayEl = document.getElementById('pz-baking-tray');
    const doughBaseEl = document.getElementById('pz-dough-base');
    const bakingTrayStep3El = document.getElementById('pz-baking-tray-step3');
    const trayInsideStep3El = document.getElementById('pz-tray-inside-step3');
    const bakePrepEl = document.getElementById('pz-bake-prep');
    const finishAreaEl = document.getElementById('pz-finish-area');
    const ovenEl = document.getElementById('pz-oven');
    const ovenInsideEl = document.getElementById('pz-oven-inside');
    const ovenFireEl = document.getElementById('pz-oven-fire');
    const sauceEl = document.getElementById('pz-sauce');
    const cheeseEl = document.getElementById('pz-cheese');
    const finalPlateInsideEl = document.getElementById('pz-final-plate-inside');
    const pzIngredients = document.querySelectorAll('#pizza-game .pz-shelf .draggable-ingredient');
    const pzToppings = document.querySelectorAll('#pizza-game #pz-step-2 .draggable-topping');

    function getPzAddedClass(id) {
      const map = {
        'pz-ing-flour': 'added-flour',
        'pz-ing-water': 'added-water',
        'pz-ing-yeast': 'added-yeast'
      };
      return map[id] || '';
    }

    function initStep1() {
      if (pzStep1InitDone) return;
      pzStep1InitDone = true;

      pzIngredients.forEach(ing => {
        initDraggable(ing, {
          onEnd: (el) => {
            if (isOverlapping(el, mixingBowlEl)) {
              const id = el.id;
              state.addedIngredients.add(id);
              playTone(330, 'sine', 0.2, 0.15);
              const bowlItem = document.createElement('div');
              bowlItem.className = `added-ingredient ${getPzAddedClass(id)}`;
              bowlItem.style.left = `${15 + Math.random() * 30}%`;
              bowlItem.style.top = `${15 + Math.random() * 30}%`;
              bowlInsideEl.appendChild(bowlItem);
              el.style.display = 'none';
              const leftCount = state.requiredIngredients.filter(x => !state.addedIngredients.has(x)).length;
              if (leftCount > 0) {
                updateMessage(`のこりの ざいりょうも いれよう（あと ${leftCount}こ）`);
              } else {
                updateMessage('ぜんぶ はいった！しっかり こねよう');
                setTimeout(showKneadArea, 1000);
              }
              return true;
            }
            return false;
          }
        });
      });
    }

    function showKneadArea() {
      kneadAreaEl.style.display = 'flex';
      kneadAreaEl.style.opacity = '0';
      setTimeout(() => {
        kneadAreaEl.style.transition = 'opacity 0.5s ease';
        kneadAreaEl.style.opacity = '1';
      }, 50);
      if (pzKneadInitDone) return;
      pzKneadInitDone = true;
      let isKneading = false, lastX = 0, lastY = 0;

      kneadBowlEl.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        isKneading = true;
        lastX = e.clientX; lastY = e.clientY;
        kneadBowlEl.setPointerCapture(e.pointerId);
      });
      kneadBowlEl.addEventListener('pointermove', (e) => {
        if (!isKneading || state.kneadDone) return;
        e.preventDefault();
        const dist = Math.hypot(e.clientX - lastX, e.clientY - lastY);
        if (dist > 5) {
          state.kneadProgress += dist * 0.15;
          lastX = e.clientX; lastY = e.clientY;
          const s1 = 40 + Math.sin(state.kneadProgress * 0.1) * 15;
          const s2 = 60 + Math.cos(state.kneadProgress * 0.08) * 15;
          doughEl.style.borderRadius = `${s1}% ${100-s1}% ${s2}% ${100-s2}%`;
          if (Math.floor(state.kneadProgress) % 30 === 0) {
            playTone(150 + Math.sin(state.kneadProgress) * 20, 'triangle', 0.1, 0.05);
          }
          if (state.kneadProgress < 100) {
            doughEl.style.backgroundColor = `rgb(${245 - state.kneadProgress * 0.1}, ${222 - state.kneadProgress * 0.05}, ${179 + state.kneadProgress * 0.02})`;
          }
          if (state.kneadProgress >= 100) {
            state.kneadDone = true;
            doughEl.style.backgroundColor = '#f5deb3';
            doughEl.style.borderRadius = '50%';
            playSuccessSound();
            updateMessage('きれいに こねた！まるく のばそう');
            setTimeout(showStretchArea, 1200);
          }
        }
      });
      const stopKneading = (e) => {
        if (!isKneading) return;
        isKneading = false;
        try { kneadBowlEl.releasePointerCapture(e.pointerId); } catch (_) {}
      };
      kneadBowlEl.addEventListener('pointerup', stopKneading);
      kneadBowlEl.addEventListener('pointercancel', stopKneading);
    }

    function showStretchArea() {
      kneadAreaEl.style.transition = 'opacity 0.5s ease';
      kneadAreaEl.style.opacity = '0';
      setTimeout(() => { kneadAreaEl.style.display = 'none'; }, 500);
      stretchAreaEl.style.display = 'flex';
      stretchAreaEl.style.opacity = '0';
      setTimeout(() => {
        stretchAreaEl.style.transition = 'opacity 0.5s ease';
        stretchAreaEl.style.opacity = '1';
      }, 100);
      if (pzStretchInitDone) return;
      pzStretchInitDone = true;

      rawDoughEl.addEventListener('click', () => {
        if (state.stretchDone) return;
        state.stretchCount++;
        playPatSound();
        rawDoughEl.style.transform = 'scale(1.05, 0.95)';
        setTimeout(() => { rawDoughEl.style.transform = ''; }, 100);

        const size = 120 + state.stretchCount * 18;
        rawDoughEl.style.width = `${size}px`;
        rawDoughEl.style.height = `${size}px`;

        if (state.stretchCount === 1) {
          updateMessage('ペチペチ！まるく のばそう');
        } else if (state.stretchCount === 3) {
          updateMessage('だんだん おおきくなってきた！');
        } else if (state.stretchCount >= state.stretchLimit) {
          state.stretchDone = true;
          rawDoughEl.style.width = '220px';
          rawDoughEl.style.height = '220px';
          playSuccessSound();
          updateMessage('まるい ピザの きじが できた！のせものを のせよう');
          setTimeout(() => goToStep(2), 1800);
        }
      });
    }

    function checkPrepComplete() {
      if (!state.sauceAdded || !state.cheeseAdded || state.prepDone) return;
      state.prepDone = true;
      playSuccessSound();
      updateMessage('トッピングも のせたら「つぎへ」で オーブンへ！');
      nextBtn.style.display = 'block';
    }

    function placeToppingOnPizza(el, x, y) {
      playTone(440, 'sine', 0.15, 0.1);
      const doughRect = doughBaseEl.getBoundingClientRect();
      const placedTop = document.createElement('div');
      placedTop.className = 'placed-topping';
      placedTop.innerHTML = `<div class="${el.getAttribute('data-type')}-icon"></div>`;
      doughBaseEl.appendChild(placedTop);
      const iconRect = placedTop.querySelector('div').getBoundingClientRect();
      placedTop.style.left = `${x - doughRect.left - iconRect.width / 2}px`;
      placedTop.style.top = `${y - doughRect.top - iconRect.height / 2}px`;
      initDraggable(placedTop, {
        onEnd: (pEl, px, py) => {
          if (!isOverlapping(pEl, doughBaseEl)) {
            pEl.remove();
            state.placedToppingsCount--;
            return true;
          }
          const dRect = doughBaseEl.getBoundingClientRect();
          pEl.style.transform = '';
          const pElRect = pEl.getBoundingClientRect();
          pEl.style.left = `${px - dRect.left - pElRect.width / 2}px`;
          pEl.style.top = `${py - dRect.top - pElRect.height / 2}px`;
          return true;
        }
      });
      state.placedToppingsCount++;
      updateMessage('いいね！ソースと チーズも のせよう');
    }

    function initStep2() {
      if (pzStep2InitDone) return;
      pzStep2InitDone = true;

      initDraggable(sauceEl, {
        onEnd: (el) => {
          if (state.sauceAdded) return false;
          if (isOverlapping(el, bakingTrayEl)) {
            state.sauceAdded = true;
            playTone(330, 'sine', 0.2, 0.15);
            doughBaseEl.classList.add('has-sauce');
            el.style.display = 'none';
            updateMessage(state.cheeseAdded ? 'トッピングも のせてみよう' : 'チーズも のせよう');
            checkPrepComplete();
            return true;
          }
          return false;
        }
      });

      initDraggable(cheeseEl, {
        onEnd: (el) => {
          if (state.cheeseAdded) return false;
          if (isOverlapping(el, bakingTrayEl)) {
            state.cheeseAdded = true;
            playTone(392, 'sine', 0.2, 0.15);
            doughBaseEl.classList.add('has-cheese');
            el.style.display = 'none';
            updateMessage(state.sauceAdded ? 'トッピングも のせてみよう' : 'ソースも のせよう');
            checkPrepComplete();
            return true;
          }
          return false;
        }
      });

      pzToppings.forEach(top => {
        initDraggable(top, {
          onEnd: (el, x, y) => {
            if (isOverlapping(el, doughBaseEl)) {
              placeToppingOnPizza(el, x, y);
              return false;
            }
            return false;
          }
        });
      });
    }

    function prepareStep3Pizza() {
      trayInsideStep3El.innerHTML = '';
      const clone = doughBaseEl.cloneNode(true);
      clone.id = 'pz-dough-base-step3';
      clone.style.width = '200px';
      clone.style.height = '200px';
      trayInsideStep3El.appendChild(clone);
      bakingTrayStep3El.style.display = 'flex';
      bakingTrayStep3El.style.transform = '';
      bakePrepEl.style.display = 'grid';
      finishAreaEl.style.display = 'none';
    }

    function initTrayDrag() {
      if (pzTrayDragInitDone) return;
      pzTrayDragInitDone = true;
      initDraggable(bakingTrayStep3El, {
        onEnd: (el) => {
          if (state.pizzaInOven) return false;
          if (isOverlappingLoose(el, ovenEl, { topTolerance: 60 })) {
            state.pizzaInOven = true;
            playTone(261.63, 'sine', 0.2, 0.1);
            el.style.display = 'none';

            const sourceDough = trayInsideStep3El.querySelector('.pizza-dough-base');
            const pizzaInOven = document.createElement('div');
            pizzaInOven.className = 'pizza-in-oven';
            const innerDough = sourceDough.cloneNode(true);
            innerDough.id = 'pz-oven-dough';
            innerDough.style.width = '100%';
            innerDough.style.height = '100%';
            pizzaInOven.appendChild(innerDough);
            ovenInsideEl.appendChild(pizzaInOven);
            startBaking(innerDough);
            return true;
          }
          return false;
        }
      });
    }

    function showFinishedPizza(doughElInOven) {
      bakePrepEl.style.display = 'none';
      finishAreaEl.style.display = 'flex';
      finalPlateInsideEl.innerHTML = '';
      const bakedClone = doughElInOven.cloneNode(true);
      bakedClone.id = 'pz-pizza-finished';
      bakedClone.style.cssText = 'width:260px;height:260px;position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);';
      finalPlateInsideEl.appendChild(bakedClone);
      updateMessage('おいしそうな ピザが できたね！');
      restartBtn.style.display = 'block';
    }

    function startBaking(doughElInOven) {
      ovenFireEl.classList.add('active');
      startSizzleSound();
      updateMessage('じっくり やこう。チーズが とろけるよ');

      const steamInterval = setInterval(() => {
        if (!state.pizzaInOven || state.bakeDone) {
          clearInterval(steamInterval);
          return;
        }
        createSteamBubble(ovenInsideEl);
      }, 500);

      state.bakeTimer = setInterval(() => {
        state.bakeProgress += 10;
        const prog = state.bakeProgress;
        if (prog <= 100) {
          const warmth = prog / 100;
          doughElInOven.style.filter = `brightness(${1 + warmth * 0.15}) saturate(${1 + warmth * 0.3})`;
        }
        if (prog >= 100) {
          clearInterval(state.bakeTimer);
          state.bakeDone = true;
          stopSizzleSound();
          ovenFireEl.classList.remove('active');
          doughElInOven.classList.add('baked');
          doughElInOven.style.filter = '';
          playSuccessSound();
          showFinishedPizza(doughElInOven);
        }
      }, 500);
    }

    function initStep3() {
      if (!pzStep3InitDone) {
        pzStep3InitDone = true;
        initTrayDrag();
      }
      prepareStep3Pizza();
    }

    function reset() {
      Object.assign(state, {
        kneadProgress: 0, kneadDone: false,
        stretchCount: 0, stretchDone: false,
        sauceAdded: false, cheeseAdded: false, prepDone: false,
        pizzaInOven: false, bakeProgress: 0, bakeDone: false,
        placedToppingsCount: 0
      });
      state.addedIngredients = new Set();
      if (state.bakeTimer) clearInterval(state.bakeTimer);
      stopSizzleSound();

      pzIngredients.forEach(ing => {
        ing.style.display = 'flex';
        ing.style.transform = '';
      });
      bowlInsideEl.innerHTML = '';
      kneadAreaEl.style.display = 'none';
      kneadAreaEl.style.opacity = '';
      doughEl.style.cssText = '';
      stretchAreaEl.style.display = 'none';
      stretchAreaEl.style.opacity = '';
      rawDoughEl.style.cssText = '';

      sauceEl.style.display = 'flex';
      sauceEl.style.transform = '';
      cheeseEl.style.display = 'flex';
      cheeseEl.style.transform = '';
      doughBaseEl.className = 'pizza-dough-base';
      doughBaseEl.id = 'pz-dough-base';
      doughBaseEl.querySelectorAll('.placed-topping').forEach(t => t.remove());
      bakingTrayEl.style.display = 'flex';
      bakingTrayEl.style.transform = '';

      trayInsideStep3El.innerHTML = '';
      bakingTrayStep3El.style.display = 'flex';
      bakingTrayStep3El.style.transform = '';
      bakePrepEl.style.display = 'grid';
      finishAreaEl.style.display = 'none';
      ovenInsideEl.innerHTML = '';
      ovenFireEl.classList.remove('active');
      finalPlateInsideEl.innerHTML = '';
    }

    return {
      onStep(stepNum) {
        if (stepNum === 1) {
          updateMessage('こむぎこと みずと こうじを ボウルにいれよう');
          initStep1();
        } else if (stepNum === 2) {
          updateMessage('ソースと チーズと トッピングを のせよう');
          initStep2();
        } else {
          updateMessage('ピザを オーブンに いれて やこう');
          initStep3();
        }
      },
      reset
    };
  })();

  function createSteamBubble(container) {
    const bubble = document.createElement('div');
    bubble.className = 'steam-bubble';
    const size = 15 + Math.random() * 20;
    bubble.style.width = `${size}px`;
    bubble.style.height = `${size}px`;
    bubble.style.left = `${20 + Math.random() * 60}%`;
    bubble.style.top = `${20 + Math.random() * 60}%`;
    container.appendChild(bubble);
    setTimeout(() => bubble.remove(), 1500);
  }
});
