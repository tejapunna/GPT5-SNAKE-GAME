// game.js - Minimal, responsive snake game with score saving

(function(){
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

  const tile = 20; // grid size
  const tiles = canvas.width / tile; // assume square

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
    state.speedMs = 120;
    state.running = true;
    state.gameOver = false;
    scoreEl.textContent = '0';
  }

  function draw(){
    ctx.fillStyle = '#000';
    ctx.fillRect(0,0,canvas.width, canvas.height);

    // draw food
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(state.food.x*tile, state.food.y*tile, tile, tile);

    // draw snake
    for(let i=0;i<state.snake.length;i++){
      const s = state.snake[i];
      if(state.skin === 'python'){
        // Python logo inspired colors
        const headColor = '#3776AB';
        const bodyA = '#FFD43B';
        const bodyB = '#FFC331';
        ctx.fillStyle = i===0 ? headColor : (i % 2 ? bodyA : bodyB);
        ctx.fillRect(s.x*tile, s.y*tile, tile, tile);
        // simple eyes on head
        if(i===0){
          ctx.fillStyle = '#fff';
          const cx = s.x*tile, cy = s.y*tile;
          ctx.fillRect(cx + 5, cy + 5, 3, 3);
          ctx.fillRect(cx + tile - 8, cy + 5, 3, 3);
          ctx.fillStyle = '#000';
          ctx.fillRect(cx + 6, cy + 6, 1, 1);
          ctx.fillRect(cx + tile - 7, cy + 6, 1, 1);
        }
      } else {
        // Classic green
        ctx.fillStyle = i===0 ? '#22c55e' : '#16a34a';
        ctx.fillRect(s.x*tile, s.y*tile, tile, tile);
      }
    }

    if(state.gameOver){
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(0,0,canvas.width, canvas.height);
      ctx.fillStyle = '#e5e7eb';
      ctx.font = 'bold 28px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('Game Over - Press Enter to restart', canvas.width/2, canvas.height/2);
    } else if(!state.running){
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(0,0,canvas.width, canvas.height);
      ctx.fillStyle = '#e5e7eb';
      ctx.font = 'bold 28px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('Paused - Press Space', canvas.width/2, canvas.height/2);
    }
  }

  function tick(){
    if(!state.running || state.gameOver) return;

    // apply nextDir if not reversing
    const nd = state.nextDir;
    const hd = state.dir;
    if(!(nd.x === -hd.x && nd.y === -hd.y)) state.dir = nd;

    const head = {x: state.snake[0].x + state.dir.x, y: state.snake[0].y + state.dir.y};

    // wrap around
    head.x = (head.x + tiles) % tiles;
    head.y = (head.y + tiles) % tiles;

    // self collision
    if(state.snake.some((s,idx)=> idx>0 && s.x===head.x && s.y===head.y)){
      state.gameOver = true;
      (async()=>{ await ScoresDB.saveScore(state.score); await refreshScores(); })();
      return;
    }

    state.snake.unshift(head);

    // food
    if(head.x === state.food.x && head.y === state.food.y){
      state.score += 10;
      scoreEl.textContent = String(state.score);
      state.food = randFood();
  if(state.speedMs > 50) state.speedMs -= 3; // allow faster than before
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

  function setDir(dx,dy){
    state.nextDir = {x:dx, y:dy};
  }

  window.addEventListener('keydown', (e)=>{
    const k = e.key.toLowerCase();
    if(k==='arrowup' || k==='w') setDir(0,-1);
    else if(k==='arrowdown' || k==='s') setDir(0,1);
    else if(k==='arrowleft' || k==='a') setDir(-1,0);
    else if(k==='arrowright' || k==='d') setDir(1,0);
    else if(k===' ') state.running = !state.running;
    else if(k==='enter' && state.gameOver){ resetGame(); }
  });

  function showNameModal(){
    modal.classList.remove('hidden');
    input.value = ScoresDB.getPlayer() || '';
    setTimeout(()=> input.focus(), 50);
  }

  function hideNameModal(){
    modal.classList.add('hidden');
  }

  async function refreshScores(){
    const top = await ScoresDB.getTop(10);
    listEl.innerHTML = '';
    top.forEach((r,i)=>{
      const li = document.createElement('li');
      li.textContent = `${i+1}. ${r.name} — ${r.score}`;
      listEl.appendChild(li);
    });
    const name = ScoresDB.getPlayer();
    if(name){
      yourBestEl.textContent = String(await ScoresDB.getBestForPlayer(name));
    } else {
      yourBestEl.textContent = '-';
    }
  }

  async function boot(){
    await ScoresDB.init();

    const existing = ScoresDB.getPlayer();
    if(!existing){
      showNameModal();
    } else {
      nameSpan.textContent = existing;
    }
    backendInfo.textContent = `Leaderboard: ${ScoresDB.backend() === 'supabase' ? 'Global (Supabase)' : 'Local (this browser only)'}`;

    // Load saved settings
    const savedSpeed = parseInt(localStorage.getItem('snake_speed') || '120', 10);
    if(Number.isFinite(savedSpeed)){
      state.speedMs = savedSpeed;
      speedRange.value = String(savedSpeed);
      speedLabel.textContent = String(savedSpeed);
    }
    const savedSkin = localStorage.getItem('snake_skin') || 'classic';
    state.skin = savedSkin;
    skinSelect.value = savedSkin;

    await refreshScores();
    resetGame();
    requestAnimationFrame(loop);
  }

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

  changePlayerBtn.addEventListener('click', ()=>{
    showNameModal();
  });

  // Speed and skin controls
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

  // kick things off after DOM is ready but sql.js is deferred; db.js loads before this file
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
