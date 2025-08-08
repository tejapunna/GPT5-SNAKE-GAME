// game.js - Responsive snake with touch controls and persistent scores

(function(){
  // Elements
  const canvas = document.getElementById('board');
  const ctx = canvas.getContext('2d');
  const scoreEl = document.getElementById('score');
  const nameSpan = document.getElementById('playerName');
  const changePlayerBtn = document.getElementById('changePlayer');
  const listEl = document.getElementById('topScores');
  const yourBestEl = document.getElementById('yourBest');
  const backendInfo = document.getElementById('backendInfo');

  const speedRange = document.getElementById('speedRange');
  const speedLabel = document.getElementById('speedLabel');
  const skinSelect = document.getElementById('skinSelect');

  const modal = document.getElementById('nameModal');
  const form = document.getElementById('nameForm');
  const input = document.getElementById('nameInput');

  const mobileControls = document.getElementById('mobileControls');
  const btnUp = document.getElementById('btnUp');
  const btnDown = document.getElementById('btnDown');
  const btnLeft = document.getElementById('btnLeft');
  const btnRight = document.getElementById('btnRight');
  const btnPause = document.getElementById('btnPause');

  // Logical grid
  const tile = 20;
  const tiles = 21; // 420/20

  // State
  let state = {
    snake: [{x:10, y:10}],
    dir: {x:1, y:0},
    nextDir: {x:1, y:0},
    food: {x: 15, y: 10},
    score: 0,
    speedMs: 120,
    running: true,
    gameOver: false,
    skin: 'classic',
  };

  // Helpers
  function randFood(){
    while(true){
      const x = Math.floor(Math.random()*tiles);
      const y = Math.floor(Math.random()*tiles);
      if(!state.snake.some(s=>s.x===x && s.y===y)) return {x,y};
    }
  }

  function resetGame(){
    state.snake = [{x:10, y:10}];
    state.dir = {x:1, y:0};
    state.nextDir = {x:1, y:0};
    state.food = randFood();
    state.score = 0;
    state.speedMs = parseInt(localStorage.getItem('snake_speed') || speedRange?.value || '120', 10);
    state.running = true;
    state.gameOver = false;
    scoreEl.textContent = '0';
  }

  function fitCanvas(){
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const size = Math.floor((rect.width && rect.height) ? Math.min(rect.width, rect.height) : (rect.width || 420));
    const px = Math.max(1, Math.round(size * dpr));
    canvas.width = px;
    canvas.height = px;
    canvas.style.width = size + 'px';
    canvas.style.height = size + 'px';
    ctx.setTransform(1,0,0,1,0,0);
    ctx.scale(dpr, dpr); // draw in CSS pixels
  }
  window.addEventListener('resize', fitCanvas);
  try { new ResizeObserver(fitCanvas).observe(canvas); } catch {}

  function draw(){
    const cssSize = canvas.clientWidth || 420;
    const scale = cssSize / tiles;

    // background
    ctx.fillStyle = '#000';
    ctx.fillRect(0,0,cssSize, cssSize);

    // food
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(state.food.x*scale, state.food.y*scale, scale, scale);

    // snake
    for(let i=0;i<state.snake.length;i++){
      const s = state.snake[i];
      if(state.skin === 'python'){
        const headColor = '#3776AB';
        const bodyA = '#FFD43B';
        const bodyB = '#FFC331';
        ctx.fillStyle = i===0 ? headColor : (i % 2 ? bodyA : bodyB);
        const x = s.x*scale, y = s.y*scale, sz = scale;
        ctx.fillRect(x, y, sz, sz);
        if(i===0){
          ctx.fillStyle = '#fff';
          ctx.fillRect(x + sz*0.25, y + sz*0.25, Math.max(2, sz*0.12), Math.max(2, sz*0.12));
          ctx.fillRect(x + sz*0.65, y + sz*0.25, Math.max(2, sz*0.12), Math.max(2, sz*0.12));
          ctx.fillStyle = '#000';
          ctx.fillRect(x + sz*0.29, y + sz*0.29, Math.max(1, sz*0.06), Math.max(1, sz*0.06));
          ctx.fillRect(x + sz*0.69, y + sz*0.29, Math.max(1, sz*0.06), Math.max(1, sz*0.06));
        }
      } else {
        ctx.fillStyle = i===0 ? '#22c55e' : '#16a34a';
        const x = s.x*scale, y = s.y*scale, sz = scale;
        ctx.fillRect(x, y, sz, sz);
      }
    }

    // overlays
    if(state.gameOver || !state.running){
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(0,0,cssSize, cssSize);
      ctx.fillStyle = '#e5e7eb';
      ctx.font = 'bold 22px system-ui';
      ctx.textAlign = 'center';
      const msg = state.gameOver ? 'Game Over - Press Enter to restart' : 'Paused - Press Space';
      ctx.fillText(msg, cssSize/2, cssSize/2);
    }
  }

  function tick(){
    if(!state.running || state.gameOver) return;

    // update direction
    const nd = state.nextDir;
    const hd = state.dir;
    if(!(nd.x === -hd.x && nd.y === -hd.y)) state.dir = nd;

    // new head
    const head = {x: state.snake[0].x + state.dir.x, y: state.snake[0].y + state.dir.y};
    head.x = (head.x + tiles) % tiles;
    head.y = (head.y + tiles) % tiles;

    // collision
    if(state.snake.some((s,idx)=> idx>0 && s.x===head.x && s.y===head.y)){
      state.gameOver = true;
      (async()=>{ await ScoresDB.saveScore(state.score); await refreshScores(); })();
      return;
    }

    // move
    state.snake.unshift(head);
    if(head.x === state.food.x && head.y === state.food.y){
      state.score += 10;
      scoreEl.textContent = String(state.score);
      state.food = randFood();
      if(state.speedMs > 50) state.speedMs -= 3;
    } else {
      state.snake.pop();
    }
  }

  let last = 0;
  function loop(ts){
    if(ts - last >= state.speedMs){
      tick();
      last = ts;
    }
    draw();
    requestAnimationFrame(loop);
  }

  function setDir(dx,dy){ state.nextDir = {x:dx, y:dy}; }

  // Keyboard
  window.addEventListener('keydown', (e)=>{
    const k = e.key.toLowerCase();
    if(k==='arrowup' || k==='w') setDir(0,-1);
    else if(k==='arrowdown' || k==='s') setDir(0,1);
    else if(k==='arrowleft' || k==='a') setDir(-1,0);
    else if(k==='arrowright' || k==='d') setDir(1,0);
    else if(k===' ') state.running = !state.running;
    else if(k==='enter' && state.gameOver){ resetGame(); }
  });

  // Modal helpers
  function showNameModal(){
    modal.classList.remove('hidden');
    input.value = ScoresDB.getPlayer() || '';
    setTimeout(()=> input.focus(), 50);
  }
  function hideNameModal(){ modal.classList.add('hidden'); }

  // Scores UI
  async function refreshScores(){
    const top = await ScoresDB.getTop(10);
    listEl.innerHTML = '';
    top.forEach((r,i)=>{
      const li = document.createElement('li');
      li.textContent = `${i+1}. ${r.name} — ${r.score}`;
      listEl.appendChild(li);
    });
    const name = ScoresDB.getPlayer();
    yourBestEl.textContent = name ? String(await ScoresDB.getBestForPlayer(name)) : '-';
  }

  // Boot
  async function boot(){
    await ScoresDB.init();

    const existing = ScoresDB.getPlayer();
    if(!existing) showNameModal(); else nameSpan.textContent = existing;
    backendInfo.textContent = `Leaderboard: ${ScoresDB.backend() === 'supabase' ? 'Global (Supabase)' : 'Local (this browser only)'}`;

    // settings
    const savedSpeed = parseInt(localStorage.getItem('snake_speed') || '120', 10);
    if(Number.isFinite(savedSpeed)){
      state.speedMs = savedSpeed;
      if(speedRange){ speedRange.value = String(savedSpeed); speedLabel.textContent = String(savedSpeed); }
    }
    const savedSkin = localStorage.getItem('snake_skin') || 'classic';
    state.skin = savedSkin; if(skinSelect) skinSelect.value = savedSkin;

    fitCanvas();
    await refreshScores();
    resetGame();
    requestAnimationFrame(loop);
  }

  // Form
  form.addEventListener('submit', (e)=>{
    e.preventDefault();
    const name = input.value.trim();
    if(name){
      ScoresDB.setPlayer(name);
      nameSpan.textContent = name;
      refreshScores();
      hideNameModal();
    }
  });
  changePlayerBtn.addEventListener('click', showNameModal);

  // Settings
  speedRange.addEventListener('input', ()=>{
    const v = parseInt(speedRange.value, 10);
    state.speedMs = v;
    speedLabel.textContent = String(v);
    localStorage.setItem('snake_speed', String(v));
  });
  skinSelect.addEventListener('change', ()=>{
    state.skin = skinSelect.value;
    localStorage.setItem('snake_skin', state.skin);
  });

  // Touch controls
  const isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
  if(isTouch && mobileControls){ mobileControls.classList.remove('hidden'); }
  function bindTap(el, fn){ if(!el) return; el.addEventListener('click', e=>{e.preventDefault(); fn();}); el.addEventListener('touchstart', e=>{e.preventDefault(); fn();}, {passive:false}); }
  bindTap(btnUp, ()=> setDir(0,-1));
  bindTap(btnDown, ()=> setDir(0,1));
  bindTap(btnLeft, ()=> setDir(-1,0));
  bindTap(btnRight, ()=> setDir(1,0));
  bindTap(btnPause, ()=> { state.running = !state.running; });

  // Start
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
