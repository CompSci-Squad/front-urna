/* ============================================================
   Urna Digital — lógica
   Fluxo: Prefeito  →  Presidente  →  FIM (comprovante)
   ============================================================ */

// ---------- Default silhouette (used when no photo on file) ----------
const SILHOUETTE_SVG = `
  <svg viewBox="0 0 64 64" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
    <rect width="64" height="64" fill="#E7E7E5"/>
    <circle cx="32" cy="25" r="11" fill="#A3A3A0"/>
    <path d="M10 60 C 10 44, 22 38, 32 38 C 42 38, 54 44, 54 60 Z" fill="#A3A3A0"/>
  </svg>
`;

// ============================================================
// RACES — cada cargo em sequência, com sua própria lista de candidatos.
// Para adicionar um novo cargo (ex.: Vereador, Governador), basta
// inserir um objeto neste array, na ordem em que deve ser votado.
// ============================================================
const RACES = [
  {
    id: "prefeito",
    label: "PREFEITO",
    candidates: [
      { num: "13123", name: "Ana Beatriz Moraes",     party: "PT",    photo: null },
      { num: "15048", name: "Roberto Pereira Lima",   party: "MDB",   photo: null },
      { num: "22517", name: "Carla Souza Andrade",    party: "PL",    photo: null },
      { num: "25333", name: "Eduardo Tavares",        party: "DEM",   photo: null },
      { num: "30190", name: "Mariana Castro Ribeiro", party: "NOVO",  photo: null },
      { num: "40222", name: "José Carlos Mendonça",   party: "PSB",   photo: null },
      { num: "45088", name: "Patrícia Ferraz",        party: "PSDB",  photo: null },
      { num: "50456", name: "Lucas Antônio Gomes",    party: "PSOL",  photo: null },
      { num: "65789", name: "Fernanda Oliveira",      party: "PCdoB", photo: null },
      { num: "77001", name: "Diego Nascimento",       party: "SD",    photo: null },
    ],
    votes: { "13123": 312, "15048": 218, "22517": 186, "25333": 88, "30190": 64,
             "40222": 51,  "45088": 42,  "50456": 36,  "65789": 28, "77001": 18,
             BRANCO: 38, NULO: 25 },
  },
  {
    id: "presidente",
    label: "PRESIDENTE",
    candidates: [
      { num: "12410", name: "Helena Vasconcelos",       party: "PDT",       photo: null },
      { num: "14302", name: "Marcos Antônio Silva",     party: "PRTB",      photo: null },
      { num: "17655", name: "Paula Resende Almeida",    party: "PL",        photo: null },
      { num: "20114", name: "Ricardo Moreira Brito",    party: "PSC",       photo: null },
      { num: "23789", name: "Júlia Cordeiro Sampaio",   party: "CIDADANIA", photo: null },
      { num: "33028", name: "Antônio Bastos Neto",      party: "PMN",       photo: null },
      { num: "44567", name: "Camila Rocha Albuquerque", party: "UNIÃO",     photo: null },
      { num: "55903", name: "Henrique Paixão",          party: "PP",        photo: null },
      { num: "70241", name: "Beatriz Monteiro Dias",    party: "AVANTE",    photo: null },
      { num: "90876", name: "Otávio Lemos Cardoso",     party: "PROS",      photo: null },
    ],
    votes: { "12410": 412, "14302": 198, "17655": 256, "20114": 102, "23789": 73,
             "33028": 44,  "44567": 188, "55903": 61,  "70241": 31,  "90876": 22,
             BRANCO: 51, NULO: 33 },
  },
];

// Estado da sessão de votação
let currentRaceIdx = 0;
const ballot = [];          // [{race, vote: candidate|special}]
let pendingVote = null;     // candidato no modal aguardando confirmação

const currentRace = () => RACES[currentRaceIdx];

// ---------- Avatar ----------
function avatarFor(cand) {
  if (cand && cand.photo) {
    return `<img src="${cand.photo}" alt="Foto de ${cand.name}" loading="lazy" />`;
  }
  return SILHOUETTE_SVG;
}

// ============================================================
// VIEW SWITCHING
// ============================================================
const tabs = document.querySelectorAll('.tab');
const views = {
  vote:    document.getElementById('view-vote'),
  results: document.getElementById('view-results'),
  admin:   document.getElementById('view-admin'),
  fim:     document.getElementById('view-fim'),
};
function showView(name) {
  Object.entries(views).forEach(([k, el]) => el.classList.toggle('hidden', k !== name));
  tabs.forEach(t => t.classList.toggle('active', t.dataset.view === name));
}
tabs.forEach(t => t.addEventListener('click', () => showView(t.dataset.view)));

// ============================================================
// STEP INDICATOR + RACE TITLE
// ============================================================
const stepEl = document.getElementById('race-step');
const raceNameEl = document.getElementById('race-name');

function renderRaceHeader() {
  raceNameEl.textContent = currentRace().label;
  stepEl.innerHTML = RACES.map((r, i) => {
    const state = i < currentRaceIdx ? 'done' : i === currentRaceIdx ? 'now' : 'next';
    const dot = state === 'done' ? '✓' : (i + 1);
    const color = state === 'now'  ? 'var(--lime-600)'
                : state === 'done' ? 'var(--fg-default)'
                : 'var(--fg-subtle)';
    const bg = state === 'now'  ? 'var(--lime-100)'
              : state === 'done' ? 'var(--neutral-100)'
              : 'transparent';
    const border = state === 'next' ? '1px dashed var(--border-default)' : '1px solid transparent';
    return `<span style="display:inline-flex;align-items:center;gap:6px;padding:4px 10px;border-radius:999px;background:${bg};border:${border};color:${color};">
      <span style="width:18px;height:18px;border-radius:999px;display:grid;place-items:center;background:${state==='now'?'var(--lime-500)':state==='done'?'var(--neutral-300)':'transparent'};color:${state==='now'?'var(--neutral-950)':'inherit'};border:${state==='next'?'1px solid var(--border-default)':'0'};font-size:10px;">${dot}</span>
      ${r.label}
    </span>`;
  }).join('<span style="color:var(--fg-subtle);align-self:center;">›</span>');
}

// ============================================================
// CANDIDATE LIST
// ============================================================
const list = document.getElementById('candidate-list');
const search = document.getElementById('search');

function renderCandidates(filter = "") {
  const f = filter.replace(/\D/g, '');
  const cands = currentRace().candidates;
  const matches = f ? cands.filter(c => c.num.startsWith(f)) : cands;

  list.innerHTML = '';
  if (matches.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <div style="font-family:var(--font-display);font-size:22px;font-weight:600;color:var(--fg-default);margin-bottom:4px;">Nenhum candidato encontrado</div>
        <div>Verifique o número digitado ou vote em <b>BRANCO</b> / <b>NULO</b>.</div>
      </div>`;
    return;
  }

  matches.forEach(c => {
    const el = document.createElement('button');
    el.className = 'candidate';
    el.setAttribute('role', 'listitem');
    el.setAttribute('aria-label', `Candidato ${c.num} - ${c.name}, partido ${c.party}`);
    el.innerHTML = `
      <div class="cand-photo">${avatarFor(c)}</div>
      <div class="cand-body">
        <div class="cand-name">${c.name}</div>
        <div class="cand-meta">
          <span class="party">${c.party}</span>
          <span style="color:var(--border-strong)">·</span>
          <span class="role">${currentRace().label}</span>
        </div>
      </div>
      <div class="cand-number">${c.num}</div>
    `;
    el.addEventListener('click', () => openModal(c));
    list.appendChild(el);
  });
}

search.addEventListener('input', e => {
  const v = e.target.value.replace(/\D/g, '');
  e.target.value = v;
  renderCandidates(v);
});
search.addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    const f = search.value.trim();
    const cand = currentRace().candidates.find(c => c.num === f);
    if (cand) openModal(cand);
  }
});

// Lupa clicável — mesma lógica do Enter
document.getElementById('search-btn').addEventListener('click', () => {
  const f = search.value.trim();
  const cand = currentRace().candidates.find(c => c.num === f);
  if (cand) {
    openModal(cand);
  } else {
    search.focus();
  }
});

// ============================================================
// MODAL
// ============================================================
const modal = document.getElementById('modal');
const mPhoto = document.getElementById('m-photo');
const mName = document.getElementById('modal-name');
const mNumber = document.getElementById('m-number');
const mParty = document.getElementById('m-party');
const mRole = document.getElementById('m-role');
const btnConfirm = document.getElementById('m-confirm');
const btnCancel = document.getElementById('m-cancel');

function openModal(cand) {
  pendingVote = cand;
  mPhoto.innerHTML = avatarFor(cand);
  mName.textContent = cand.name;
  mNumber.textContent = cand.num;
  mParty.textContent = cand.party;
  mRole.textContent = currentRace().label;
  modal.classList.remove('hidden');
}
function closeModal() { modal.classList.add('hidden'); }

function openSpecialModal(kind) {
  const data = kind === 'BRANCO'
    ? { num: '—', name: 'Voto em Branco', party: '—', color: '#78787A', special: 'BRANCO' }
    : { num: '—', name: 'Voto Nulo',      party: '—', color: '#DC2626', special: 'NULO' };
  pendingVote = data;
  mPhoto.innerHTML = `<div style="width:100%;height:100%;display:grid;place-items:center;background:${data.color}1A;color:${data.color};font-family:var(--font-display);font-weight:700;font-size:42px;">${kind === 'BRANCO' ? '∅' : '✕'}</div>`;
  mName.textContent = data.name;
  mNumber.textContent = data.num;
  mParty.textContent = data.party;
  mRole.textContent = currentRace().label;
  modal.classList.remove('hidden');
}

document.getElementById('btn-blank').addEventListener('click', () => openSpecialModal('BRANCO'));
document.getElementById('btn-null').addEventListener('click',  () => openSpecialModal('NULO'));

btnCancel.addEventListener('click',  () => { closeModal(); showVerdict(false); });
btnConfirm.addEventListener('click', () => { closeModal(); showVerdict(true);  });

modal.addEventListener('click', e => {
  if (e.target === modal) { closeModal(); showVerdict(false); }
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
    closeModal(); showVerdict(false);
  }
});

// ============================================================
// VERDICT (CONFIRMADO / CANCELADO)
// ============================================================
const verdict = document.getElementById('verdict');
const vCard = document.getElementById('verdict-card');
const vTitle = document.getElementById('verdict-title');
const vSub = document.getElementById('verdict-sub');
const vIcon = document.getElementById('verdict-icon');

const ICON_CHECK = `<svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
const ICON_X     = `<svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;

function showVerdict(confirmed) {
  if (confirmed) {
    vCard.className = 'verdict-card ok';
    vTitle.textContent = 'CONFIRMADO';
    vSub.textContent = `Voto para ${currentRace().label} registrado.`;
    vIcon.innerHTML = ICON_CHECK;
    playBeep();
  } else {
    vCard.className = 'verdict-card bad';
    vTitle.textContent = 'CANCELADO';
    vSub.textContent = 'Operação cancelada. Você pode votar novamente.';
    vIcon.innerHTML = ICON_X;
  }
  verdict.classList.remove('hidden');

  setTimeout(() => {
    verdict.classList.add('hidden');
    if (confirmed) {
      // grava o voto e avança para a próxima eleição (ou finaliza)
      ballot.push({ race: currentRace(), vote: pendingVote });
      pendingVote = null;

      if (currentRaceIdx < RACES.length - 1) {
        currentRaceIdx += 1;
        search.value = '';
        renderRaceHeader();
        renderCandidates();
        search.focus();
      } else {
        finalizeBallot();
      }
    } else {
      search.value = '';
      renderCandidates();
      search.focus();
    }
  }, 1600);
}

// ============================================================
// SOM
// ============================================================
let audioCtx = null;
function playBeep() {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const ctx = audioCtx;
    const playTone = (freq, start, dur) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = freq;
      o.type = 'sine';
      g.gain.setValueAtTime(0, ctx.currentTime + start);
      g.gain.linearRampToValueAtTime(0.18, ctx.currentTime + start + 0.01);
      g.gain.linearRampToValueAtTime(0, ctx.currentTime + start + dur);
      o.connect(g).connect(ctx.destination);
      o.start(ctx.currentTime + start);
      o.stop(ctx.currentTime + start + dur + 0.02);
    };
    playTone(1100, 0,    0.12);
    playTone(1500, 0.14, 0.18);
  } catch (e) { /* */ }
}

// ============================================================
// FIM — comprovante final (com TODOS os votos)
// ============================================================
function describeVote(entry) {
  const v = entry.vote;
  if (v.special === 'BRANCO') return 'BRANCO';
  if (v.special === 'NULO')   return 'NULO';
  return `${v.num} — ${v.name} (${v.party})`;
}

function finalizeBallot() {
  // Constrói as linhas do comprovante para cada cargo votado
  const rows = ballot.map(entry => `
    <div class="row"><span>${entry.race.label}</span><b>${describeVote(entry)}</b></div>
  `).join('');
  document.getElementById('r-votes').innerHTML = rows;
  document.getElementById('r-time').textContent = new Date().toLocaleTimeString('pt-BR');
  document.getElementById('r-id').textContent   = '0x' + Math.random().toString(16).slice(2, 10).toUpperCase();
  document.getElementById('r-voter').textContent = document.getElementById('voter-num').textContent;
  showView('fim');
}

document.getElementById('btn-restart').addEventListener('click', () => {
  // Reset completo da sessão
  currentRaceIdx = 0;
  ballot.length = 0;
  pendingVote = null;
  search.value = '';
  renderRaceHeader();
  renderCandidates();
  // Próximo eleitor
  const cur = document.getElementById('voter-num');
  const n = parseInt(cur.textContent.replace(/\D/g, ''), 10) + 1;
  cur.textContent = n.toString().padStart(6, '0').replace(/(\d{3})(\d{3})/, '$1.$2');
  showView('vote');
  search.focus();
});

document.getElementById('btn-print').addEventListener('click', () => window.print());

// ============================================================
// CLOCK
// ============================================================
function tickClock() {
  document.getElementById('clock').textContent = new Date().toLocaleTimeString('pt-BR');
}
tickClock();
setInterval(tickClock, 1000);

// ============================================================
// APURAÇÃO — agora com seletor de cargo
// ============================================================
let resultsRaceIdx = 0;

function renderResults() {
  const race = RACES[resultsRaceIdx];
  const VOTES = race.votes;
  const CANDS = race.candidates;

  // Seletor de cargo no topo da apuração
  const head = document.querySelector('#view-results .page-head > div');
  const existing = head.querySelector('.race-switch');
  if (!existing) {
    const switchEl = document.createElement('div');
    switchEl.className = 'race-switch tabs';
    switchEl.style.marginTop = '12px';
    switchEl.style.width = 'fit-content';
    switchEl.innerHTML = RACES.map((r, i) => `
      <button class="tab ${i === resultsRaceIdx ? 'active' : ''}" data-race="${i}">${r.label}</button>
    `).join('');
    head.appendChild(switchEl);
    switchEl.addEventListener('click', e => {
      const btn = e.target.closest('button[data-race]');
      if (!btn) return;
      resultsRaceIdx = +btn.dataset.race;
      switchEl.querySelectorAll('button').forEach(b =>
        b.classList.toggle('active', +b.dataset.race === resultsRaceIdx));
      renderResults();
    });
  }

  const total = Object.values(VOTES).reduce((a, b) => a + b, 0);
  const valid = total - VOTES.BRANCO - VOTES.NULO;

  document.getElementById('kpi-grid').innerHTML = `
    <div class="kpi"><div class="label">Cargo</div><div class="value lime" style="font-size:22px;">${race.label}</div></div>
    <div class="kpi"><div class="label">Total de votos</div><div class="value">${total.toLocaleString('pt-BR')}</div></div>
    <div class="kpi"><div class="label">Votos válidos</div><div class="value lime">${valid.toLocaleString('pt-BR')}</div></div>
    <div class="kpi"><div class="label">Brancos</div><div class="value">${VOTES.BRANCO}</div></div>
    <div class="kpi"><div class="label">Nulos</div><div class="value">${VOTES.NULO}</div></div>
  `;

  const rows = CANDS
    .map(c => ({ ...c, votes: VOTES[c.num] || 0 }))
    .sort((a, b) => b.votes - a.votes);
  const max = Math.max(...rows.map(r => r.votes));

  const bar = document.getElementById('bar-chart');
  bar.innerHTML = rows.map((r, i) => `
    <div class="bar-row">
      <div class="bar-num">${r.num}</div>
      <div class="bar-track">
        <div class="bar-name">
          <span>${r.name} <span style="color:var(--fg-muted);font-weight:500;font-family:var(--font-mono);">· ${r.party}</span></span>
          <span class="pct">${((r.votes / total) * 100).toFixed(1)}%</span>
        </div>
        <div class="bar-bg">
          <div class="bar-fill" style="width:${(r.votes / max) * 100}%; background:${i === 0 ? 'var(--lime-500)' : (i < 3 ? 'var(--neutral-600)' : 'var(--neutral-400)')};"></div>
        </div>
      </div>
      <div class="bar-votes">${r.votes.toLocaleString('pt-BR')}</div>
    </div>
  `).join('') + `
    <div class="bar-row">
      <div class="bar-num" style="color:var(--fg-muted);">—</div>
      <div class="bar-track">
        <div class="bar-name"><span style="color:var(--fg-muted);">Brancos</span><span class="pct">${((VOTES.BRANCO/total)*100).toFixed(1)}%</span></div>
        <div class="bar-bg"><div class="bar-fill" style="width:${(VOTES.BRANCO/max)*100}%;background:var(--neutral-300);"></div></div>
      </div>
      <div class="bar-votes">${VOTES.BRANCO}</div>
    </div>
    <div class="bar-row">
      <div class="bar-num" style="color:var(--fg-muted);">—</div>
      <div class="bar-track">
        <div class="bar-name"><span style="color:var(--fg-muted);">Nulos</span><span class="pct">${((VOTES.NULO/total)*100).toFixed(1)}%</span></div>
        <div class="bar-bg"><div class="bar-fill" style="width:${(VOTES.NULO/max)*100}%;background:var(--red-400);"></div></div>
      </div>
      <div class="bar-votes">${VOTES.NULO}</div>
    </div>
  `;

  // Donut
  const donut = document.getElementById('donut');
  const top3 = rows.slice(0, 3);
  const outros = rows.slice(3).reduce((s, r) => s + r.votes, 0);
  const segments = [
    ...top3.map((r, i) => ({ name: r.name.split(' ').slice(0, 2).join(' '), party: r.party, value: r.votes, color: ['#84CC16', '#525356', '#A3A3A0'][i] })),
    { name: 'Outros candidatos', party: '', value: outros,       color: '#D4D4D2' },
    { name: 'Brancos',           party: '', value: VOTES.BRANCO, color: '#E7E7E5' },
    { name: 'Nulos',             party: '', value: VOTES.NULO,   color: '#EF4444' },
  ];

  const cx = 100, cy = 100, r = 78, rin = 50;
  let acc = 0;
  const paths = segments.map(seg => {
    const start = (acc / total) * 2 * Math.PI - Math.PI / 2;
    acc += seg.value;
    const end = (acc / total) * 2 * Math.PI - Math.PI / 2;
    const large = (end - start) > Math.PI ? 1 : 0;
    const x1 = cx + r * Math.cos(start), y1 = cy + r * Math.sin(start);
    const x2 = cx + r * Math.cos(end),   y2 = cy + r * Math.sin(end);
    const x3 = cx + rin * Math.cos(end), y3 = cy + rin * Math.sin(end);
    const x4 = cx + rin * Math.cos(start), y4 = cy + rin * Math.sin(start);
    return `<path d="M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} L ${x3} ${y3} A ${rin} ${rin} 0 ${large} 0 ${x4} ${y4} Z" fill="${seg.color}" />`;
  }).join('');
  donut.innerHTML = paths + `
    <text x="100" y="96" text-anchor="middle" font-family="Inter Tight" font-weight="700" font-size="26" fill="#18191C">${total.toLocaleString('pt-BR')}</text>
    <text x="100" y="115" text-anchor="middle" font-family="Inter" font-size="11" fill="#78787A" letter-spacing="0.08em">VOTOS</text>
  `;

  document.getElementById('donut-legend').innerHTML = segments.map(seg => `
    <div class="legend-item">
      <span class="legend-dot" style="background:${seg.color};"></span>
      <span>${seg.name}${seg.party ? ` <span style="color:var(--fg-muted);font-family:var(--font-mono);font-size:11px;">· ${seg.party}</span>` : ''}</span>
      <span class="pct">${((seg.value / total) * 100).toFixed(1)}%</span>
    </div>
  `).join('');
}

// ============================================================
// ADMIN — todos os candidatos de todos os cargos + CRUD
// ============================================================
function renderAdmin() {
  const tb = document.getElementById('admin-tbody');
  const all = RACES.flatMap((r, ri) => r.candidates.map((c, ci) => ({ ...c, role: r.label, _race: ri, _idx: ci })));
  tb.innerHTML = all.map(c => `
    <tr>
      <td class="mono">${c.num}</td>
      <td><b>${c.name}</b></td>
      <td>${c.party}</td>
      <td>${c.role}</td>
      <td><span class="status-dot status-ok"></span>Ativo</td>
      <td style="text-align:right;">
        <button class="icon-btn" data-act="edit" data-race="${c._race}" data-idx="${c._idx}" title="Editar">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
        <button class="icon-btn danger" data-act="delete" data-race="${c._race}" data-idx="${c._idx}" title="Remover">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
        </button>
      </td>
    </tr>
  `).join('');

  document.getElementById('admin-cand-count').textContent = all.length;
}

// Delegate edit/delete clicks
document.getElementById('admin-tbody').addEventListener('click', e => {
  const btn = e.target.closest('button[data-act]');
  if (!btn) return;
  const ri = +btn.dataset.race, ci = +btn.dataset.idx;
  if (btn.dataset.act === 'edit') {
    openCandForm(ri, ci);
  } else if (btn.dataset.act === 'delete') {
    const c = RACES[ri].candidates[ci];
    if (confirm(`Remover o candidato "${c.name}" (${c.num} — ${c.party})?`)) {
      RACES[ri].candidates.splice(ci, 1);
      renderAdmin();
      renderCandidates();
      renderResults();
    }
  }
});

// ----- New / Edit form -----
const cfModal   = document.getElementById('cand-form-modal');
const cfForm    = document.getElementById('cand-form');
const cfTitle   = document.getElementById('cf-title');
const cfEyebrow = document.getElementById('cf-eyebrow');
const cfNum     = document.getElementById('cf-num');
const cfName    = document.getElementById('cf-name');
const cfParty   = document.getElementById('cf-party');
const cfRace    = document.getElementById('cf-race');
const cfPhoto   = document.getElementById('cf-photo');
const cfError   = document.getElementById('cf-error');
const cfEditKey = document.getElementById('cf-edit-key');

function openCandForm(ri = null, ci = null) {
  cfError.style.display = 'none';
  cfForm.reset();
  if (ri != null && ci != null) {
    const c = RACES[ri].candidates[ci];
    cfTitle.textContent = `Editar candidato — ${c.name}`;
    cfEyebrow.textContent = 'Edição de candidato';
    cfNum.value = c.num;
    cfName.value = c.name;
    cfParty.value = c.party;
    cfPhoto.value = c.photo || '';
    cfRace.value = RACES[ri].id;
    cfEditKey.value = `${ri}:${ci}`;
  } else {
    cfTitle.textContent = 'Novo candidato';
    cfEyebrow.textContent = 'Cadastro de candidato';
    cfEditKey.value = '';
  }
  cfModal.classList.remove('hidden');
  setTimeout(() => cfNum.focus(), 50);
}
function closeCandForm() { cfModal.classList.add('hidden'); }

document.getElementById('btn-add-cand').addEventListener('click', () => openCandForm());
document.getElementById('cf-cancel').addEventListener('click', closeCandForm);
cfModal.addEventListener('click', e => { if (e.target === cfModal) closeCandForm(); });

cfNum.addEventListener('input', e => { e.target.value = e.target.value.replace(/\D/g, ''); });
cfParty.addEventListener('input', e => { e.target.value = e.target.value.toUpperCase(); });

cfForm.addEventListener('submit', e => {
  e.preventDefault();
  const num   = cfNum.value.trim();
  const name  = cfName.value.trim();
  const party = cfParty.value.trim();
  const raceId = cfRace.value;
  const photo = cfPhoto.value.trim() || null;

  if (!num || !name || !party) {
    cfError.textContent = 'Preencha número, nome e partido.';
    cfError.style.display = 'block';
    return;
  }

  const targetRaceIdx = RACES.findIndex(r => r.id === raceId);
  if (targetRaceIdx < 0) return;

  const editKey = cfEditKey.value;
  if (editKey) {
    const [ri, ci] = editKey.split(':').map(Number);
    // If race changed, move it
    const old = RACES[ri].candidates[ci];
    const updated = { ...old, num, name, party, photo };
    if (ri !== targetRaceIdx) {
      RACES[ri].candidates.splice(ci, 1);
      RACES[targetRaceIdx].candidates.push(updated);
    } else {
      RACES[ri].candidates[ci] = updated;
    }
  } else {
    // Avoid duplicate number on same race
    if (RACES[targetRaceIdx].candidates.some(c => c.num === num)) {
      cfError.textContent = `Já existe um candidato com o número ${num} para ${RACES[targetRaceIdx].label}.`;
      cfError.style.display = 'block';
      return;
    }
    RACES[targetRaceIdx].candidates.push({ num, name, party, photo });
  }

  closeCandForm();
  renderAdmin();
  renderCandidates();
  renderResults();
});

// ============================================================
// LOGIN + ROLES
// ============================================================
const VOTER_CPF = '000.000.000-00';
const ADMIN_CPF = '111.111.111-11';
const VALID_PASS = '1234';

// Backwards-compat (used elsewhere if referenced).
const VALID_CPF  = VOTER_CPF;

let currentUser = null;  // { role: 'voter' | 'admin', cpf: '...' }

const loginView  = document.getElementById('view-login');
const appShell   = document.getElementById('app-shell');
const loginForm  = document.getElementById('login-form');
const cpfInput   = document.getElementById('login-cpf');
const passInput  = document.getElementById('login-pass');
const loginError = document.getElementById('login-error');

// Máscara simples de CPF: 000.000.000-00
cpfInput.addEventListener('input', e => {
  let v = e.target.value.replace(/\D/g, '').slice(0, 11);
  if (v.length > 9)  v = v.replace(/(\d{3})(\d{3})(\d{3})(\d{0,2})/, '$1.$2.$3-$4');
  else if (v.length > 6) v = v.replace(/(\d{3})(\d{3})(\d{0,3})/, '$1.$2.$3');
  else if (v.length > 3) v = v.replace(/(\d{3})(\d{0,3})/, '$1.$2');
  e.target.value = v;
  loginError.style.display = 'none';
});
passInput.addEventListener('input', () => { loginError.style.display = 'none'; });

loginForm.addEventListener('submit', e => {
  e.preventDefault();
  const cpf = cpfInput.value;
  const pass = passInput.value;

  let role = null;
  if (cpf === VOTER_CPF && pass === VALID_PASS) role = 'voter';
  else if (cpf === ADMIN_CPF && pass === VALID_PASS) role = 'admin';

  if (!role) {
    loginError.style.display = 'block';
    passInput.value = '';
    passInput.focus();
    return;
  }

  currentUser = { role, cpf };
  document.body.dataset.role = role;
  applyRoleUI(role);

  loginView.style.display = 'none';
  appShell.style.display = 'block';
});

// Show/hide chrome based on role and pick a sensible default view
function applyRoleUI(role) {
  const pill = document.getElementById('role-pill');
  if (role === 'admin') {
    pill.innerHTML = '<span class="role-badge admin">★ Administrador</span>';
    document.getElementById('voter-meta').style.display = 'none';
    showView('admin');
  } else {
    pill.innerHTML = '<span class="role-badge voter"><span class="status-dot status-ok" style="margin:0;"></span>Eleitor</span>';
    document.getElementById('voter-meta').style.display = '';
    showView('vote');
    setTimeout(() => search && search.focus(), 50);
  }
}

// Logout
document.getElementById('btn-logout').addEventListener('click', () => {
  currentUser = null;
  delete document.body.dataset.role;
  // Reset voting session
  currentRaceIdx = 0;
  ballot.length = 0;
  pendingVote = null;
  if (search) search.value = '';
  renderRaceHeader();
  renderCandidates();
  // Hide app shell, show login
  appShell.style.display = 'none';
  loginView.style.display = '';
  cpfInput.value = '';
  passInput.value = '';
  loginError.style.display = 'none';
  cpfInput.focus();
});

cpfInput.focus();

// ============================================================
// BOOT
// ============================================================
renderRaceHeader();
renderCandidates();
renderResults();
renderAdmin();
