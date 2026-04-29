'use strict';

const SKINS = [
  { id:'classic', name:'Classique', price:0,   c4:['#ff2d55','#0a84ff','#30d158','#ffd60a'], c9:['#ff2d55','#0a84ff','#30d158','#ffd60a','#ff6b35','#bf5af2','#5ac8fa','#ff9f0a','#32d74b'] },
  { id:'neon',    name:'Néon',      price:80,  c4:['#ff0080','#00ffcc','#ffee00','#8000ff'], c9:['#ff0080','#00ffcc','#ffee00','#8000ff','#ff4400','#00ff44','#0044ff','#ff8800','#cc00ff'] },
  { id:'pastel',  name:'Pastel',    price:60,  c4:['#ffb3c6','#a8d8ea','#b5ead7','#ffdac1'], c9:['#ffb3c6','#a8d8ea','#b5ead7','#ffdac1','#e2b4f0','#c7f2a4','#fef9c3','#c9d6ff','#ffd6e7'] },
  { id:'ocean',   name:'Océan',     price:100, c4:['#03045e','#0077b6','#00b4d8','#90e0ef'], c9:['#03045e','#023e8a','#0077b6','#0096c7','#00b4d8','#48cae4','#90e0ef','#ade8f4','#caf0f8'] },
  { id:'fire',    name:'Feu',       price:120, c4:['#6a040f','#d00000','#e85d04','#f48c06'], c9:['#6a040f','#9d0208','#d00000','#dc2f02','#e85d04','#f48c06','#faa307','#ffba08','#370617'] },
  { id:'mono',    name:'Mono',      price:150, c4:['#212121','#424242','#757575','#bdbdbd'], c9:['#121212','#1e1e1e','#212121','#303030','#424242','#616161','#757575','#9e9e9e','#bdbdbd'] },
];

const ADS = [
  { brand:'MemoPro+',  tagline:'Entraîne ton cerveau chaque jour' },
  { brand:'CoinBoost', tagline:'Double tes gains pendant 1h' },
  { brand:'BrainFit',  tagline:'Le jeu de mémoire ultime' },
  { brand:'PixelMind', tagline:'Des puzzles pour les experts' },
  { brand:'ZenFocus',  tagline:'Concentration maximale garantie' },
];

let state = {
  coins:0, best:0, games:0, streak:0,
  owned:new Set(['classic']), equipped:'classic', deathCount:0,
};

let saveTimer=null;
function save(){
  clearTimeout(saveTimer);
  saveTimer=setTimeout(async()=>{
    if(!Auth.user) return;
    await Auth.saveProfile({
      coins:state.coins, best_score:state.best, games:state.games,
      streak:state.streak, death_count:state.deathCount,
      owned_skins:[...state.owned], equipped:state.equipped,
    });
  },800);
}

let audioCtx;
function getAudio(){ if(!audioCtx) try{audioCtx=new(window.AudioContext||window.webkitAudioContext)();}catch(e){} return audioCtx; }
function beep(freq,dur=180,type='sine',vol=0.2){
  const ctx=getAudio(); if(!ctx) return;
  const o=ctx.createOscillator(),g=ctx.createGain();
  o.connect(g); g.connect(ctx.destination);
  o.frequency.value=freq; o.type=type;
  g.gain.setValueAtTime(vol,ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+dur/1000);
  o.start(); o.stop(ctx.currentTime+dur/1000);
}
function errorSound(){
  const ctx=getAudio(); if(!ctx) return;
  const o=ctx.createOscillator(),g=ctx.createGain();
  o.connect(g); g.connect(ctx.destination);
  o.frequency.value=100; o.type='sawtooth';
  g.gain.setValueAtTime(0.2,ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.5);
  o.start(); o.stop(ctx.currentTime+0.5);
}
function successJingle(){ [523,659,784].forEach((f,i)=>setTimeout(()=>beep(f,120),i*80)); }

let gSeq=[],gStep=0,gLevel=0,gScore=0,gMode='4x',gPlaying=false,gWaiting=false,gPrevScreen='home';

function show(id){
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  const el=document.getElementById(id);
  if(el){ el.classList.add('active'); }
}
function getSkin(){ return SKINS.find(s=>s.id===state.equipped); }
function skinColors(){ return gMode==='9x'?getSkin().c9:getSkin().c4; }
function applyColors(){ const cols=skinColors(); document.querySelectorAll('.tile').forEach((t,i)=>t.style.background=cols[i]||'#222'); }

function buildBoard(){
  const board=document.getElementById('board');
  const cols=gMode==='4x'?2:3;
  const vw=Math.min(window.innerWidth,420);
  const size=gMode==='4x'?Math.floor((vw-60)/2):Math.floor((vw-70)/3);
  board.innerHTML='';
  board.style.gridTemplateColumns=`repeat(${cols},${size}px)`;
  board.style.gap='10px';
  skinColors().forEach((col,i)=>{
    const btn=document.createElement('button');
    btn.className='tile'; btn.id='tile-'+i;
    btn.style.cssText=`width:${size}px;height:${size}px;background:${col};border-radius:${gMode==='9x'?'10px':'14px'}`;
    btn.disabled=true;
    btn.addEventListener('click',()=>handleTile(i));
    board.appendChild(btn);
  });
}

function flashTile(i,cb){
  const freqs=gMode==='4x'?[261,329,392,523]:[220,261,311,370,440,523,622,740,880];
  beep(freqs[i]||440);
  const t=document.getElementById('tile-'+i); if(!t) return cb&&cb();
  t.classList.add('lit');
  setTimeout(()=>{ t.classList.remove('lit'); cb&&cb(); },280);
}

function renderDots(){
  const el=document.getElementById('seq-dots'); el.innerHTML='';
  for(let i=0;i<gSeq.length;i++){
    const d=document.createElement('div');
    d.className='sdot'+(i<gStep?' done':i===gStep?' current':'');
    el.appendChild(d);
  }
}

function setStatus(s){ document.getElementById('g-status').textContent=s; }
function updGameHud(){
  document.getElementById('g-level').textContent='Niveau '+gLevel;
  document.getElementById('g-score').textContent=gScore;
  document.getElementById('g-best-inline').textContent=state.best||'—';
  document.getElementById('g-coins').textContent=state.coins;
  document.getElementById('g-progress').style.width=Math.min(100,(gLevel/30)*100)+'%';
}
function updHomeHud(){
  try{const p=Auth&&Auth.profile;const nameEl=document.getElementById('home-username-display');if(nameEl&&p)nameEl.textContent=p.username;}catch(e){}
  document.getElementById('hm-coins').textContent=state.coins;
  document.getElementById('hm-best').textContent=state.best||'—';
  document.getElementById('hm-games').textContent=state.games;
  document.getElementById('hm-streak').textContent=state.streak;
}
function setTilesEnabled(v){ document.querySelectorAll('.tile').forEach(t=>t.disabled=!v); }

function playSeq(i=0){
  if(i>=gSeq.length){ setTimeout(()=>{ gWaiting=true; setTilesEnabled(true); setStatus('à toi !'); renderDots(); },400); return; }
  const delay=i===0?300:(gLevel>10?120:150);
  setTimeout(()=>flashTile(gSeq[i],()=>playSeq(i+1)),delay);
}

function nextRound(){
  gWaiting=false; gStep=0; gLevel++;
  gSeq.push(Math.floor(Math.random()*(gMode==='4x'?4:9)));
  updGameHud(); renderDots(); setStatus('mémorise…');
  setTimeout(()=>playSeq(),700);
}

function handleTile(i){
  if(!gPlaying||!gWaiting) return;
  const ctx=getAudio(); if(ctx&&ctx.state==='suspended') ctx.resume();
  flashTile(i); gStep++; renderDots();
  if(i!==gSeq[gStep-1]){
    errorSound(); gWaiting=false; setTilesEnabled(false);
    const t=document.getElementById('tile-'+i);
    if(t){ t.classList.add('wrong'); setTimeout(()=>t.classList.remove('wrong'),300); }
    setTimeout(()=>triggerGameOver(),600); return;
  }
  state.coins+=Math.ceil(gLevel*1.5); gScore+=10+gLevel; updGameHud();
  if(gStep===gSeq.length){
    gWaiting=false; setTilesEnabled(false);
    successJingle(); setStatus('parfait !');
    setTimeout(nextRound,900);
  }
}

function triggerGameOver(){
  gPlaying=false; state.deathCount++; state.games++;
  const coinBonus=Math.floor(gScore/8); state.coins+=coinBonus;
  let newRecord=false;
  if(gLevel>state.best){ state.best=gLevel; newRecord=true; state.streak++; } else { state.streak=0; }
  save();
  document.getElementById('go-level').textContent=gLevel;
  document.getElementById('go-record-msg').textContent=newRecord?'★ Nouveau record !':'record : niveau '+state.best;
  document.getElementById('go-coins-earned').textContent='+'+coinBonus+' ◈ gagnés';
  if(state.deathCount%2===0){ showAd(); } else { show('gameover'); }
}

let adTimer;
function showAd(){
  const ad=ADS[Math.floor(Math.random()*ADS.length)];
  document.getElementById('ad-brand').textContent=ad.brand;
  document.getElementById('ad-tagline').textContent=ad.tagline;
  const fill=document.getElementById('ad-fill'),timerEl=document.getElementById('ad-timer'),skipBtn=document.getElementById('skip-btn');
  skipBtn.disabled=true; fill.style.transition='none'; fill.style.width='100%';
  show('ad'); let t=5; timerEl.textContent=t;
  setTimeout(()=>{ fill.style.transition='width 5s linear'; fill.style.width='0%'; },50);
  adTimer=setInterval(()=>{
    t--; timerEl.textContent=t>0?t:'✓';
    if(t<=0){ clearInterval(adTimer); skipBtn.disabled=false; state.coins+=30; save(); }
  },1000);
}

function renderShop(){
  const grid=document.getElementById('shop-grid'); grid.innerHTML='';
  SKINS.forEach(skin=>{
    const owned=state.owned.has(skin.id),equipped=state.equipped===skin.id;
    const div=document.createElement('div');
    div.className='shop-item'+(equipped?' equipped':owned?' owned':'');
    const prev=document.createElement('div'); prev.className='shop-preview sp-4';
    skin.c4.forEach(c=>{ const pip=document.createElement('div'); pip.style.cssText='border-radius:3px;flex:1;min-height:20px;background:'+c; prev.appendChild(pip); });
    const name=document.createElement('div'); name.className='shop-name'; name.textContent=skin.name;
    const badge=document.createElement('div'); badge.className='shop-badge'+(equipped?' equipped':owned?' owned':'');
    badge.textContent=equipped?'Équipé':owned?'Possédé':'◈ '+skin.price;
    div.appendChild(prev); div.appendChild(name); div.appendChild(badge);
    if(!owned){ div.onclick=()=>{
      if(state.coins<skin.price){ badge.textContent='Pas assez !'; setTimeout(()=>badge.textContent='◈ '+skin.price,1200); return; }
      state.coins-=skin.price; state.owned.add(skin.id); state.equipped=skin.id;
      save(); document.getElementById('sh-coins').textContent=state.coins; applyColors(); renderShop();
    }; } else if(!equipped){ div.onclick=()=>{ state.equipped=skin.id; save(); applyColors(); renderShop(); }; }
    grid.appendChild(div);
  });
}

function renderModePreview(){
  const sk=getSkin();
  document.querySelectorAll('.mp-4 div').forEach((el,i)=>el.style.background=sk.c4[i]||'#222');
  document.querySelectorAll('.mp-9 div').forEach((el,i)=>el.style.background=sk.c9[i]||'#222');
}

async function renderLeaderboard(){
  document.getElementById('lb-loading').style.display='block';
  document.getElementById('lb-list').innerHTML='';
  const lb=await Auth.fetchLeaderboard();
  document.getElementById('lb-loading').style.display='none';
  document.getElementById('lb-my-best').textContent=state.best||'—';
  const list=document.getElementById('lb-list');
  if(!lb.length){ list.innerHTML='<div style="padding:2rem;text-align:center;color:#555;font-family:Space Mono,monospace;font-size:12px">Aucun score encore.</div>'; return; }
  lb.forEach(entry=>{
    const isYou=Auth.profile&&entry.username===Auth.profile.username;
    const row=document.createElement('div');
    row.className='lb-row'+(isYou?' lb-you':'');
    const r=entry.rank;
    row.innerHTML=`<div class="lb-rank ${r<=3?'top':''}">${r===1?'🥇':r===2?'🥈':r===3?'🥉':r}</div><div class="lb-name">${entry.username}${isYou?' (toi)':''}</div><div class="lb-score">Niv. ${entry.best_score}</div>`;
    list.appendChild(row);
  });
}

const App = {
  showHome(){ updHomeHud(); renderModePreview(); show('home'); },
  startGame(mode){ gMode=mode; gSeq=[]; gStep=0; gLevel=0; gScore=0; gPlaying=true; gWaiting=false; buildBoard(); updGameHud(); show('game'); nextRound(); },
  quitGame(){ gPlaying=false; this.showHome(); },
  retry(){ this.startGame(gMode); },
  showShop(){ gPrevScreen=document.querySelector('.screen.active')?.id||'home'; document.getElementById('sh-coins').textContent=state.coins; renderShop(); show('shop'); },
  closeShop(){ show(['game','gameover'].includes(gPrevScreen)?gPrevScreen:'home'); if(gPrevScreen==='game') gPlaying=true; },
  skipAd(){ clearInterval(adTimer); show('gameover'); },
  showLeaderboard(){ show('leaderboard'); renderLeaderboard(); },
  showProfile(){
    const p=Auth.profile;
    if(p){
      document.getElementById('prof-avatar').textContent=(p.username||'?')[0].toUpperCase();
      document.getElementById('prof-username').textContent=p.username;
      document.getElementById('prof-email').textContent=Auth.user?.email||'';
      document.getElementById('prof-best').textContent=state.best||'—';
      document.getElementById('prof-games').textContent=state.games;
      document.getElementById('prof-coins').textContent=state.coins;
    }
    show('profile');
  },
  buyCoins(amount,price){ document.getElementById('modal-sub').textContent=`◈ ${amount} coins — ${price}€`; document.getElementById('stripe-modal').style.display='flex'; window._pendingCoins=amount; },
  closeModal(){ document.getElementById('stripe-modal').style.display='none'; window._pendingCoins=null; },
};

window.App=App; window.state=state; window.show=show; window.save=save; window.applyColors=applyColors;
