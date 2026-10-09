const DATA = {
  hollywood:{label:"Hollywood", sub:"Taylor Swift & Lady Gaga — original demo tracks", tracks:[
    {t:"Blank Space",a:"Taylor Swift",d:231},{t:"Anti-Hero",a:"Taylor Swift",d:200},
    {t:"Love Story",a:"Taylor Swift",d:235},{t:"Poker Face",a:"Lady Gaga",d:237},
    {t:"Shallow",a:"Lady Gaga",d:216}]},
  bollywood:{label:"Bollywood", sub:"Arijit Singh & Sonu Nigam — original demo tracks", tracks:[
    {t:"Tum Hi Ho",a:"Arijit Singh",d:262},{t:"Channa Mereya",a:"Arijit Singh",d:290},
    {t:"Kesariya",a:"Arijit Singh",d:268},{t:"Kal Ho Naa Ho",a:"Sonu Nigam",d:296},
    {t:"Suraj Hua Maddham",a:"Sonu Nigam",d:310}]},
  pakistani:{label:"Pakistani Artists", sub:"Samar Jafari & Atif Aslam — original demo tracks", tracks:[
    {t:"Tera Hone Laga Hoon",a:"Atif Aslam",d:330},{t:"Jeena Jeena",a:"Atif Aslam",d:230},
    {t:"Pehli Nazar Mein",a:"Atif Aslam",d:296},{t:"Yaadein",a:"Samar Jafari",d:210},
    {t:"Dil Ki Baat",a:"Samar Jafari",d:225}]},
  indianpop:{label:"Indian Pop", sub:"Karan Aujla, Shubh & Cheema Y — original demo tracks", tracks:[
    {t:"Softly",a:"Karan Aujla",d:172},{t:"On Top",a:"Karan Aujla",d:165},
    {t:"Cheque",a:"Shubh",d:158},{t:"No Love",a:"Shubh",d:170},
    {t:"Bachke Bachke",a:"Cheema Y",d:180}]},
  kpop:{label:"K-Pop", sub:"TXT, BTS & BLACKPINK — original demo tracks", tracks:[
    {t:"Dynamite",a:"BTS",d:199},{t:"Spring Day",a:"BTS",d:274},
    {t:"Kill This Love",a:"BLACKPINK",d:187},{t:"How You Like That",a:"BLACKPINK",d:182},
    {t:"Blue Hour",a:"TXT",d:210}]},
};
let idCounter=0;
Object.entries(DATA).forEach(([cat,c])=>c.tracks.forEach(tr=>{tr.id=cat+"-"+(idCounter++); tr.cat=cat;}));
const ALL_TRACKS = Object.values(DATA).flatMap(c=>c.tracks);
const byId = id => ALL_TRACKS.find(t=>t.id===id);

function loadJSON(k,fallback){try{const v=localStorage.getItem(k); return v?JSON.parse(v):fallback;}catch(e){return fallback;}}
function saveJSON(k,v){try{localStorage.setItem(k,JSON.stringify(v));}catch(e){}}
let library = new Set(loadJSON('mx_library',[]));
let counts = loadJSON('mx_counts',{});
function persistLibrary(){saveJSON('mx_library',[...library]);}
function persistCounts(){saveJSON('mx_counts',counts);}

function hashStr(s){let h=0; for(let i=0;i<s.length;i++){h=(h*31+s.charCodeAt(i))|0;} return Math.abs(h);}
function artStyle(track){
  const h=hashStr(track.t+track.a);
  const hue=h%360;
  return `background:linear-gradient(135deg,hsl(${hue},60%,45%),hsl(${(hue+50)%360},55%,30%))`;
}
function initials(name){return name.split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase();}

let audioCtx=null, noteTimer=null, masterGain=null;
function ensureCtx(){ if(!audioCtx){ audioCtx=new (window.AudioContext||window.webkitAudioContext)(); masterGain=audioCtx.createGain(); masterGain.gain.value=state.volume*0.9; masterGain.connect(audioCtx.destination);} }
function playNote(freq, dur, wave){
  const o=audioCtx.createOscillator(); const g=audioCtx.createGain();
  o.type=wave; o.frequency.value=freq;
  g.gain.setValueAtTime(0.0001,audioCtx.currentTime);
  g.gain.linearRampToValueAtTime(0.18,audioCtx.currentTime+0.02);
  g.gain.exponentialRampToValueAtTime(0.0001,audioCtx.currentTime+dur);
  o.connect(g); g.connect(masterGain);
  o.start(); o.stop(audioCtx.currentTime+dur);
}
const SCALE=[261.63,293.66,329.63,392.00,440.00,523.25,587.33,659.25];
function startMelody(track){
  stopMelody();
  const seed=hashStr(track.t+track.a);
  const wave = seed%2===0 ? 'triangle':'sine';
  let step=seed%SCALE.length;
  noteTimer=setInterval(()=>{
    if(!state.playing) return;
    const idx=(step + (seed>>3))%SCALE.length;
    playNote(SCALE[idx], 0.38, wave);
    step=(step+1+(seed%3))%SCALE.length;
  },420);
}
function stopMelody(){ if(noteTimer){clearInterval(noteTimer); noteTimer=null;} }

const state = {current:null, playing:false, time:0, ticker:null, volume:0.7};

function fmt(s){ s=Math.floor(s); return Math.floor(s/60)+":"+String(s%60).padStart(2,'0'); }

function renderPlayerBar(){
  const pArt=document.getElementById('pArt'), pTitle=document.getElementById('pTitle'),
        pArtist=document.getElementById('pArtist'), pHeart=document.getElementById('pHeart');
  if(!state.current){
    pTitle.textContent="Nothing playing"; pArtist.textContent="Pick a track";
    pArt.removeAttribute('style'); pArt.textContent="—"; pHeart.classList.remove('active');
    document.getElementById('durTime').textContent="0:00";
    return;
  }
  const tr=state.current;
  pTitle.textContent=tr.t; pArtist.textContent=tr.a;
  pArt.setAttribute('style', artStyle(tr));
  pArt.textContent=initials(tr.a);
  pHeart.classList.toggle('active', library.has(tr.id));
  document.getElementById('durTime').textContent=fmt(tr.d);
}

function updateSeek(){
  const tr=state.current; if(!tr) return;
  document.getElementById('curTime').textContent=fmt(state.time);
  document.getElementById('seekFill').style.width=(state.time/tr.d*100)+"%";
}

function play(track){
  ensureCtx(); if(audioCtx.state==='suspended') audioCtx.resume();
  state.current=track; state.playing=true; state.time=0;
  counts[track.id]=(counts[track.id]||0)+1; persistCounts();
  document.getElementById('playIcon').innerHTML='<path d="M6 5h4v14H6zm8 0h4v14h-4z"/>';
  renderPlayerBar(); updateSeek(); startMelody(track);
  clearInterval(state.ticker);
  state.ticker=setInterval(()=>{
    if(!state.playing) return;
    state.time+=0.25;
    if(state.time>=track.d){ next(); return; }
    updateSeek();
  },250);
  renderGrid();
}
function pause(){
  state.playing=false;
  document.getElementById('playIcon').innerHTML='<path d="M8 5v14l11-7z"/>';
}
function resume(){
  if(!state.current) return;
  ensureCtx(); if(audioCtx.state==='suspended') audioCtx.resume();
  state.playing=true;
  document.getElementById('playIcon').innerHTML='<path d="M6 5h4v14H6zm8 0h4v14h-4z"/>';
}
function togglePlay(){
  if(!state.current){ if(ALL_TRACKS.length) play(ALL_TRACKS[0]); return; }
  state.playing ? pause() : resume();
}
function trackList(){ return state.current ? (DATA[state.current.cat]?.tracks || ALL_TRACKS) : ALL_TRACKS; }
function next(){
  const list=trackList(); if(!state.current){ play(list[0]); return; }
  const i=list.findIndex(t=>t.id===state.current.id);
  play(list[(i+1)%list.length]);
}
function prev(){
  const list=trackList(); if(!state.current){ play(list[0]); return; }
  const i=list.findIndex(t=>t.id===state.current.id);
  play(list[(i-1+list.length)%list.length]);
}
function toggleLibrary(id){
  library.has(id) ? library.delete(id) : library.add(id);
  persistLibrary(); renderPlayerBar();
  if(currentCat==='library') renderGrid();
}

let currentCat='home';
function cardHTML(tr){
  const isPlaying = state.current && state.current.id===tr.id && state.playing;
  return `<div class="card${isPlaying?' playing':''}" data-id="${tr.id}">
    <div class="art" style="${artStyle(tr)}">${initials(tr.a)}
      <div class="playbtn">
        <svg viewBox="0 0 24 24">${isPlaying?'<path d="M6 5h4v14H6zm8 0h4v14h-4z"/>':'<path d="M8 5v14l11-7z"/>'}</svg>
      </div>
    </div>
    <div class="track-title">${tr.t}</div>
    <div class="track-artist">${tr.a} · ${fmt(tr.d)}</div>
  </div>`;
}
function goTo(cat){
  document.querySelectorAll('.navitem').forEach(i=>i.classList.toggle('active', i.dataset.cat===cat));
  currentCat=cat; renderGrid();
}
function bindCards(grid){
  grid.querySelectorAll('.card').forEach(card=>{
    const id=card.dataset.id;
    card.addEventListener('click',()=>{
      const tr=byId(id);
      if(state.current && state.current.id===id){ togglePlay(); renderGrid(); }
      else { play(tr); }
    });
  });
}
function renderHome(grid){
  const featured=Object.values(DATA).flatMap(c=>c.tracks.slice(0,2));
  const top=ALL_TRACKS.filter(t=>counts[t.id]>0).sort((a,b)=>(counts[b.id]||0)-(counts[a.id]||0)).slice(0,5);
  const tiles=Object.entries(DATA).map(([k,c])=>`<div class="tile" data-go="${k}">${c.label}<small>${c.tracks.length} tracks</small></div>`).join('')
    +`<div class="tile" data-go="library">My Library<small>${library.size} saved</small></div>`;
  grid.innerHTML=`
    <div class="hero">
      <h2>Welcome to music<span>Xplore</span></h2>
      <p>Explore Hollywood, Bollywood, Pakistani, Indian pop and K-pop — all in one place.</p>
      <button class="hero-btn" id="shuffleBtn">Shuffle play</button>
    </div>
    <div class="sec-title">Browse categories</div>
    <div class="tiles">${tiles}</div>
    <div class="sec-title">Featured for you</div>
    <div class="row">${featured.map(cardHTML).join('')}</div>
    ${top.length?`<div class="sec-title">Your most listened</div><div class="row">${top.map(cardHTML).join('')}</div>`:''}`;
  grid.querySelectorAll('[data-go]').forEach(t=>t.addEventListener('click',()=>goTo(t.dataset.go)));
  document.getElementById('shuffleBtn').addEventListener('click',()=>play(ALL_TRACKS[Math.floor(Math.random()*ALL_TRACKS.length)]));
  bindCards(grid);
}
function gridOf(tracks){ return `<div class="grid">${tracks.map(cardHTML).join('')}</div>`; }
function emptyMsg(m){ return `<div class="empty">${m}</div>`; }
function topPlayed(){ return ALL_TRACKS.filter(t=>counts[t.id]>0).sort((a,b)=>(counts[b.id]||0)-(counts[a.id]||0)); }

function renderGrid(){
  const view=document.getElementById('view');
  const title=document.getElementById('pageTitle'), sub=document.getElementById('pageSub');
  let html='';
  if(searchQuery){
    const q=searchQuery.toLowerCase();
    const res=ALL_TRACKS.filter(t=>(t.t+' '+t.a).toLowerCase().includes(q));
    title.textContent="Search"; sub.textContent='Results for "'+searchQuery+'"';
    html=res.length?gridOf(res):emptyMsg('No songs or artists found.');
  } else if(currentCat==='home'){
    title.textContent="Home"; sub.textContent="Welcome to musicXplore";
    const trending=Object.values(DATA).map(c=>c.tracks[0]);
    const tiles=Object.entries(DATA).map(([k,c])=>{
      const hue=hashStr(c.label)%360;
      return `<div class="tile" data-go="${k}" style="background:linear-gradient(135deg,hsl(${hue},50%,26%),hsl(${(hue+40)%360},45%,14%))">${c.label}<span>${c.tracks.length} tracks</span></div>`;
    }).join('');
    const top=topPlayed().slice(0,5);
    html=`<section class="hero"><h2>Explore every sound.</h2>
      <p>Hollywood hits, Bollywood romance, Pakistani classics, Punjabi pop and K-Pop — all in one place.</p>
      <button class="hero-btn" id="heroPlay">&#9654; Start listening</button></section>
      <h3 class="sec">Browse categories</h3><div class="tiles">${tiles}</div>
      <div class="block"><h3 class="sec">Trending now</h3>${gridOf(trending)}</div>`
      + (top.length?`<div class="block"><h3 class="sec">Your most listened</h3>${gridOf(top)}</div>`:'');
  } else if(currentCat==='library'){
    title.textContent="My Library"; sub.textContent="Tracks you've saved";
    const t=ALL_TRACKS.filter(t=>library.has(t.id));
    html=t.length?gridOf(t):emptyMsg('No saved tracks yet — play a track, then tap the heart in the player bar.');
  } else if(currentCat==='mostplayed'){
    title.textContent="Most Listened"; sub.textContent="Your top plays on musicXplore";
    const t=topPlayed();
    html=t.length?gridOf(t):emptyMsg('Nothing played yet — start listening.');
  } else {
    const c=DATA[currentCat]; title.textContent=c.label; sub.textContent=c.sub; html=gridOf(c.tracks);
  }
  view.innerHTML=html;
  view.querySelectorAll('.card').forEach(card=>{
    const id=card.dataset.id;
    card.addEventListener('click',()=>{
      const tr=byId(id);
      if(state.current && state.current.id===id){ togglePlay(); renderGrid(); }
      else { play(tr); }
    });
  });
  const hp=document.getElementById('heroPlay');
  if(hp) hp.addEventListener('click',()=>play(Object.values(DATA)[0].tracks[0]));
}

function goTo(cat){
  currentCat=cat; searchQuery='';
  document.getElementById('searchInput').value='';
  document.querySelectorAll('.navitem').forEach(i=>i.classList.toggle('active', i.dataset.cat===cat));
  renderGrid();
  document.querySelector('.content').scrollTop=0;
}
document.addEventListener('click',e=>{
  const el=e.target.closest('[data-go]'); if(el) goTo(el.dataset.go);
});
document.querySelectorAll('.navitem').forEach(item=>{
  item.addEventListener('click',()=>goTo(item.dataset.cat));
});
document.getElementById('searchInput').addEventListener('input',e=>{
  searchQuery=e.target.value.trim(); renderGrid();
});

document.getElementById('playBtn').addEventListener('click',()=>{togglePlay(); renderGrid();});
document.getElementById('nextBtn').addEventListener('click',()=>{next();});
document.getElementById('prevBtn').addEventListener('click',()=>{prev();});
document.getElementById('pHeart').addEventListener('click',()=>{ if(state.current) toggleLibrary(state.current.id); });
document.getElementById('seekBar').addEventListener('click',(e)=>{
  if(!state.current) return;
  const rect=e.currentTarget.getBoundingClientRect();
  const pct=(e.clientX-rect.left)/rect.width;
  state.time=pct*state.current.d; updateSeek();
});
const volFill=document.getElementById('volFill');
volFill.style.width=(state.volume*100)+"%";
document.getElementById('volBar').addEventListener('click',(e)=>{
  const rect=e.currentTarget.getBoundingClientRect();
  const pct=Math.max(0,Math.min(1,(e.clientX-rect.left)/rect.width));
  state.volume=pct; volFill.style.width=(pct*100)+"%";
  if(masterGain) masterGain.gain.value=pct*0.9;
});

renderGrid();
renderPlayerBar();