const WORKER_BASE = 'https://kairo-api2.eduardoavelinodasilva28.workers.dev';

let favorites = JSON.parse(localStorage.getItem('kairo_favs') || '[]');
let searchTimeout = null;
let popularesLoaded = false;
let genresPageLoaded = false;
let heroList = [];
let heroIndex = 0;
let heroTimer = null;
const animeCache = {};
let genrePool = [];

function isFav(id){ return favorites.some(f => f.mal_id === id); }

function toggleFav(anime){
  if(!anime) return;
  const idx = favorites.findIndex(f => f.mal_id === anime.mal_id);
  if(idx >= 0){ favorites.splice(idx,1); }
  else{
    favorites.push({
      mal_id: anime.mal_id,
      title: anime.title,
      image: anime.images?.jpg?.image_url,
      score: anime.score,
      episodes: anime.episodes,
      genre: anime.genres?.[0]?.name,
      type: anime.type
    });
  }
  localStorage.setItem('kairo_favs', JSON.stringify(favorites));
}

async function workerFetchList(path){
  try{
    const res = await fetch(WORKER_BASE + path);
    if(!res.ok) throw new Error('Erro no proxy: ' + res.status);
    const list = await res.json();
    if(!Array.isArray(list)) return [];
    list.forEach(a => animeCache[a.mal_id] = a);
    return list;
  }catch(e){ console.error(e); return []; }
}

async function workerFetchOne(id){
  try{
    const res = await fetch(WORKER_BASE + '/anime/' + id);
    if(!res.ok) throw new Error('Erro no proxy: ' + res.status);
    const anime = await res.json();
    animeCache[anime.mal_id] = anime;
    return anime;
  }catch(e){ console.error(e); return null; }
}

async function workerFetchTrailer(id){
  try{
    const res = await fetch(WORKER_BASE + '/trailer/' + id);
    if(!res.ok) throw new Error('Erro no proxy trailer');
    return await res.json();
  }catch(e){ return { youtube_id: null }; }
}

function getCurrentSeason(){
  const month = new Date().getMonth() + 1;
  let season;
  if(month <= 3) season = 'winter';
  else if(month <= 6) season = 'spring';
  else if(month <= 9) season = 'summer';
  else season = 'fall';
  return { year: new Date().getFullYear(), season };
}

function cardHTML(anime){
  const cover = anime.images?.jpg?.image_url || '';
  const score = anime.score ? anime.score.toFixed(1) : '—';
  const genre = anime.genres?.[0]?.name || anime.type || '';
  return `
    <div class="anime-card" onclick="openDetail(${anime.mal_id})">
      <div class="card-cover">
        <img src="${cover}" loading="lazy">
        <div class="card-score">★ ${score}</div>
      </div>
      <div class="card-title">${anime.title}</div>
      <div class="card-meta">${anime.episodes ? anime.episodes + ' eps' : '—'}${genre ? ' · ' + genre : ''}</div>
    </div>`;
}

async function ensureGenrePool(){
  if(genrePool.length) return genrePool;
  genrePool = await workerFetchList('/ranking?type=all&limit=100');
  return genrePool;
}

function filterByGenre(list, genreId){
  return list.filter(a => (a.genres || []).some(g => g.id === Number(genreId)));
}

function renderHero(){
  const el = document.getElementById('heroBanner');
  const anime = heroList[heroIndex];
  if(!anime){ el.innerHTML = '<div class="empty-msg">Nada encontrado</div>'; return; }
  const cover = anime.images?.jpg?.large_image_url || anime.images?.jpg?.image_url || '';
  const score = anime.score ? anime.score.toFixed(2) : '—';
  const genres = (anime.genres||[]).slice(0,2).map(g=>`<span class="hero-chip">${g.name}</span>`).join('');
  const favActive = isFav(anime.mal_id) ? 'active' : '';
  const dots = heroList.map((_,i)=>`<button class="hero-dot ${i===heroIndex?'active':''}" onclick="goToHero(${i})"></button>`).join('');
  el.innerHTML = `
    <div class="hero-bg"><img src="${cover}"></div>
    <div class="hero-content">
      <div class="hero-badge">EM DESTAQUE</div>
      <div class="hero-title">${anime.title}</div>
      <div class="hero-meta">
        <span class="hero-score">★ ${score}</span>
        ${genres}
      </div>
      <div class="hero-synopsis">${anime.synopsis || ''}</div>
      <div class="hero-actions">
        <button class="btn-watch" onclick="openDetail(${anime.mal_id})">▶ Assistir</button>
        <button class="btn-mylist ${favActive}" onclick="event.stopPropagation(); quickFav(${anime.mal_id}, this)">+ Minha Lista</button>
      </div>
      <div class="hero-nav">
        <button class="hero-arrow" onclick="heroPrev()">‹</button>
        <div class="hero-dots">${dots}</div>
        <button class="hero-arrow" onclick="heroNext()">›</button>
      </div>
    </div>`;
}

function goToHero(i){ heroIndex = i; renderHero(); restartHeroTimer(); }
function heroPrev(){ heroIndex = (heroIndex - 1 + heroList.length) % heroList.length; renderHero(); restartHeroTimer(); }
function heroNext(){ heroIndex = (heroIndex + 1) % heroList.length; renderHero(); restartHeroTimer(); }
function restartHeroTimer(){
  if(heroTimer) clearInterval(heroTimer);
  if(heroList.length <= 1) return;
  heroTimer = setInterval(()=>{ heroIndex = (heroIndex + 1) % heroList.length; renderHero(); }, 6000);
}

function quickFav(id, btnEl){
  const anime = animeCache[id];
  if(!anime) return;
  toggleFav(anime);
  btnEl.classList.toggle('active', isFav(id));
}

async function loadHome(){
  const ranking = await workerFetchList('/ranking?type=all&limit=8');
  heroList = ranking.slice(0,5);
  heroIndex = 0;
  renderHero();
  restartHeroTimer();

  const { year, season } = getCurrentSeason();
  const seasonList = await workerFetchList(`/season?year=${year}&season=${season}&limit=12`);
  document.getElementById('seasonCarousel').innerHTML = seasonList.map(cardHTML).join('') || '<div class="empty-msg">Nada encontrado</div>';

  const topList = await workerFetchList('/ranking?type=bypopularity&limit=12');
  document.getElementById('topCarousel').innerHTML = topList.map(cardHTML).join('') || '<div class="empty-msg">Nada encontrado</div>';

  const pool = await ensureGenrePool();
  const genreIds = [1,4,22,24];
  genreIds.forEach(id => {
    const filtered = filterByGenre(pool, id).slice(0,12);
    document.getElementById('genreCarousel-home-'+id).innerHTML = filtered.map(cardHTML).join('') || '<div class="empty-msg">Nada encontrado</div>';
  });
}

function setupChipScope(scope, onSelect){
  const container = document.querySelector(`.category-chips[data-scope="${scope}"]`);
  container.querySelectorAll('.chip').forEach(chip=>{
    chip.addEventListener('click', ()=>{
      container.querySelectorAll('.chip').forEach(c=>c.classList.remove('active'));
      chip.classList.add('active');
      onSelect(chip.dataset.genre);
    });
  });
}

setupChipScope('home', (genre)=>{
  if(!genre){
    document.getElementById('generalSections').classList.remove('hidden');
    document.querySelectorAll('#genreSectionsHome .genre-section').forEach(s=>s.classList.remove('hidden'));
  }else{
    document.getElementById('generalSections').classList.add('hidden');
    document.querySelectorAll('#genreSectionsHome .genre-section').forEach(s=>{
      s.classList.toggle('hidden', s.dataset.genre !== genre);
    });
  }
});

setupChipScope('genres', (genre)=>{
  if(!genre){
    document.getElementById('todosGenerosBlock').classList.remove('hidden');
    document.querySelectorAll('#genreSectionsPage .genre-section').forEach(s=>s.classList.remove('hidden'));
  }else{
    document.getElementById('todosGenerosBlock').classList.add('hidden');
    document.querySelectorAll('#genreSectionsPage .genre-section').forEach(s=>{
      s.classList.toggle('hidden', s.dataset.genre !== genre);
    });
  }
});

async function initGenresPage(){
  const pool = await ensureGenrePool();
  document.getElementById('todosGenerosGrid').innerHTML = pool.slice(0,8).map(cardHTML).join('') || '<div class="empty-msg">Nada encontrado</div>';
  const genreIds = [1,4,22,24];
  genreIds.forEach(id => {
    const filtered = filterByGenre(pool, id).slice(0,12);
    document.getElementById('genreCarousel-page-'+id).innerHTML = filtered.map(cardHTML).join('') || '<div class="empty-msg">Nada encontrado</div>';
  });
}

async function loadPopulares(){
  const grid = document.getElementById('popularesGrid');
  grid.innerHTML = '<div class="spinner"></div>';
  const results = await workerFetchList('/ranking?type=all&limit=24');
  grid.innerHTML = results.map(cardHTML).join('') || '<div class="empty-msg">Nada encontrado</div>';
}

async function runSearch(){
  const q = document.getElementById('searchInput').value.trim();
  if(!q){ showView('home'); return; }
  showView('search');
  const grid = document.getElementById('searchGrid');
  grid.innerHTML = '<div class="spinner"></div>';
  const results = await workerFetchList('/search?q=' + encodeURIComponent(q) + '&limit=24');
  grid.innerHTML = results.map(cardHTML).join('') || '<div class="empty-msg">Nenhum anime encontrado 😕</div>';
}
document.getElementById('searchInput').addEventListener('input', ()=>{
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(runSearch, 600);
});

async function openDetail(id){
  document.getElementById('modalOverlay').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  const content = document.getElementById('modalContent');
  content.innerHTML = '<div class="spinner"></div>';
  let anime = animeCache[id];
  if(!anime || !anime.synopsis){ anime = await workerFetchOne(id); }
  if(!anime){ content.innerHTML = '<div class="empty-msg">Erro ao carregar 😕</div>'; return; }
  renderDetail(anime);
  loadTrailerInto(id);
}

function renderDetail(anime){
  const content = document.getElementById('modalContent');
  const cover = anime.images?.jpg?.large_image_url || anime.images?.jpg?.image_url || '';
  const score = anime.score ? anime.score.toFixed(2) : '—';
  const genres = (anime.genres||[]).map(g=>`<span class="genre-pill">${g.name}</span>`).join('');
  const favActive = isFav(anime.mal_id) ? 'active' : '';
  const subtitle = anime.title_japanese || anime.title_english || '';

  content.innerHTML = `
    <img class="modal-cover" src="${cover}">
    <div class="modal-body">
      <div class="modal-title">${anime.title}</div>
      ${subtitle ? `<div class="modal-subtitle">${subtitle}</div>` : ''}
      <div class="modal-badges">
        <span class="modal-badge score">★ ${score}</span>
        <span class="modal-badge">${anime.episodes ? anime.episodes + ' episódios' : '—'}</span>
        <span class="modal-badge">${anime.status || '—'}</span>
        ${anime.year ? `<span class="modal-badge">${anime.year}</span>` : ''}
      </div>
      <div style="margin-bottom:14px;">${genres}</div>
      <div class="modal-synopsis">${anime.synopsis || 'Sem sinopse disponível.'}</div>
      <button class="modal-list-btn ${favActive}" onclick="toggleDetailFav(${anime.mal_id}, this)">+ ${favActive ? 'Na Lista' : 'Minha Lista'}</button>
      <div class="modal-divider"></div>
      <div class="modal-trailer-label">Trailer</div>
      <div id="trailerSlot-${anime.mal_id}"><div class="spinner"></div></div>
    </div>`;
}

async function loadTrailerInto(id){
  const { youtube_id } = await workerFetchTrailer(id);
  const slot = document.getElementById('trailerSlot-' + id);
  if(!slot) return;
  if(youtube_id){
    slot.outerHTML = `<div class="video-thumb" id="trailerSlot-${id}" onclick="playTrailer(${id},'${youtube_id}')">
      <img src="https://img.youtube.com/vi/${youtube_id}/hqdefault.jpg">
      <div class="play-btn">▶</div>
    </div>`;
  }else{
    slot.outerHTML = `<div id="trailerSlot-${id}" class="empty-msg" style="padding:10px 0;">Trailer não disponível para este título</div>`;
  }
}

function playTrailer(id, ytId){
  const el = document.getElementById('trailerSlot-' + id);
  if(el) el.outerHTML = `<div class="video-thumb played" id="trailerSlot-${id}"><iframe src="https://www.youtube.com/embed/${ytId}?autoplay=1" allow="autoplay; encrypted-media" allowfullscreen></iframe></div>`;
}

function toggleDetailFav(id, btnEl){
  const anime = animeCache[id];
  toggleFav(anime);
  const active = isFav(id);
  btnEl.classList.toggle('active', active);
  btnEl.innerHTML = `+ ${active ? 'Na Lista' : 'Minha Lista'}`;
}

function closeDetail(){
  document.getElementById('modalOverlay').classList.add('hidden');
  document.body.style.overflow = '';
}

function loadFavView(){
  const grid = document.getElementById('favGrid');
  if(!favorites.length){ grid.innerHTML = '<div class="empty-msg">Você ainda não adicionou nenhum anime ⭐</div>'; return; }
  grid.innerHTML = favorites.map(f => `
    <div class="anime-card" onclick="openDetail(${f.mal_id})">
      <div class="card-cover">
        <img src="${f.image||''}" loading="lazy">
        <div class="card-score">★ ${f.score ? f.score.toFixed(1) : '—'}</div>
      </div>
      <div class="card-title">${f.title}</div>
      <div class="card-meta">${f.episodes ? f.episodes + ' eps' : '—'}${f.genre ? ' · ' + f.genre : ''}</div>
    </div>`).join('');
}

function showView(view){
  const map = {home:'homeView',genres:'genresView',populares:'popularesView',fav:'favView',search:'searchView'};
  Object.keys(map).forEach(v=>{
    document.getElementById(map[v]).classList.toggle('hidden', v !== view);
  });
  document.querySelectorAll('.nav-row .nav-link').forEach(b=>b.classList.toggle('active', b.dataset.view === view));
  if(view === 'fav') loadFavView();
  if(view === 'populares' && !popularesLoaded){ popularesLoaded = true; loadPopulares(); }
  if(view === 'genres' && !genresPageLoaded){ genresPageLoaded = true; initGenresPage(); }
  window.scrollTo(0,0);
}
document.querySelectorAll('.nav-row .nav-link').forEach(btn=>{
  btn.addEventListener('click', ()=> showView(btn.dataset.view));
});

loadHome();
