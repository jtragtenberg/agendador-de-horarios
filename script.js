// ==== CONFIGURAÇÃO ====
// Cole aqui a URL do seu Apps Script depois de implantar (veja apps-script/Code.gs).
const SCRIPT_URL = 'COLE_AQUI_A_URL_DO_SEU_APPS_SCRIPT';

// ==== CONSTANTES DA GRADE ====
const DIAS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
const HORA_INICIO = 9;
const HORA_FIM = 21; // exclusivo — último bloco é 20h-21h
const HORAS = [];
for (let h = HORA_INICIO; h < HORA_FIM; h++) HORAS.push(h);

function formatHora(h) {
  return `${h}:00`;
}

// ==== ESTADO ====
let selectedSlots = new Set(); // "dia-hora"
let allRows = []; // [{nome, dia, hora}]
const editorCells = {}; // "dia-hora" -> elemento
const grupoCells = {}; // "dia-hora" -> elemento

// ==== TABS ====
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});

function switchTab(tab) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.toggle('active', p.id === `tab-${tab}`));
}

// ==== CONSTRUÇÃO DA GRADE ====
function buildGrid(container, cellMap, interactive) {
  container.innerHTML = '';
  container.appendChild(el('div', 'grid-corner grid-header'));
  DIAS.forEach(dia => {
    const header = el('div', 'grid-header', dia);
    container.appendChild(header);
  });

  HORAS.forEach(hora => {
    const timeLabel = el('div', 'grid-time', formatHora(hora));
    container.appendChild(timeLabel);
    DIAS.forEach((dia, diaIdx) => {
      const cell = el('div', 'grid-cell');
      cell.dataset.dia = diaIdx;
      cell.dataset.hora = hora;
      container.appendChild(cell);
      cellMap[`${diaIdx}-${hora}`] = cell;
    });
  });
}

function el(tag, className, text) {
  const e = document.createElement(tag === 'div' ? 'div' : tag);
  if (className) e.className = className;
  if (text !== undefined) e.textContent = text;
  return e;
}

// ==== EDITOR: seleção por arraste ====
let isDragging = false;
let dragMode = true; // true = selecionando, false = removendo

function setupEditorDrag(container) {
  const start = (cellEl) => {
    if (!cellEl || !cellEl.classList.contains('grid-cell')) return;
    isDragging = true;
    const key = cellKey(cellEl);
    dragMode = !selectedSlots.has(key);
    applySelection(cellEl, dragMode);
  };

  container.addEventListener('mousedown', (ev) => {
    ev.preventDefault();
    start(ev.target.closest('.grid-cell'));
  });

  container.addEventListener('mouseover', (ev) => {
    if (!isDragging) return;
    const cellEl = ev.target.closest('.grid-cell');
    if (cellEl) applySelection(cellEl, dragMode);
  });

  document.addEventListener('mouseup', () => { isDragging = false; });

  // suporte a toque
  container.addEventListener('touchstart', (ev) => {
    const touch = ev.touches[0];
    const target = document.elementFromPoint(touch.clientX, touch.clientY);
    start(target && target.closest('.grid-cell'));
  }, { passive: true });

  container.addEventListener('touchmove', (ev) => {
    if (!isDragging) return;
    const touch = ev.touches[0];
    const target = document.elementFromPoint(touch.clientX, touch.clientY);
    const cellEl = target && target.closest('.grid-cell');
    if (cellEl) applySelection(cellEl, dragMode);
  }, { passive: true });

  document.addEventListener('touchend', () => { isDragging = false; });
}

function cellKey(cellEl) {
  return `${cellEl.dataset.dia}-${cellEl.dataset.hora}`;
}

function applySelection(cellEl, select) {
  const key = cellKey(cellEl);
  if (select) {
    selectedSlots.add(key);
    cellEl.classList.add('selected');
  } else {
    selectedSlots.delete(key);
    cellEl.classList.remove('selected');
  }
}

function clearEditorSelection() {
  selectedSlots.clear();
  Object.values(editorCells).forEach(c => c.classList.remove('selected'));
}

// ==== BACKEND ====
function isConfigured() {
  return SCRIPT_URL && !SCRIPT_URL.includes('COLE_AQUI');
}

async function loadData() {
  const status = document.getElementById('grupo-status');
  if (!isConfigured()) {
    status.textContent = 'Configure a URL do Apps Script em script.js (constante SCRIPT_URL) para conectar à planilha.';
    return;
  }
  status.textContent = 'Carregando respostas...';
  try {
    const res = await fetch(SCRIPT_URL, { method: 'GET' });
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    allRows = data.rows || [];
    renderGrupo();
    renderRespondentes();
    const totalPessoas = new Set(allRows.map(r => r.nome.toLowerCase())).size;
    status.textContent = totalPessoas
      ? `${totalPessoas} pessoa(s) já responderam.`
      : 'Ninguém respondeu ainda. Seja a primeira pessoa!';
  } catch (err) {
    status.textContent = 'Erro ao carregar dados da planilha: ' + err.message;
  }
}

async function saveData(nome, slots) {
  const status = document.getElementById('editor-status');
  if (!isConfigured()) {
    status.textContent = 'Configure a URL do Apps Script em script.js (constante SCRIPT_URL) antes de salvar.';
    return;
  }
  status.textContent = 'Salvando...';
  try {
    const body = new URLSearchParams({
      action: 'save',
      nome: nome,
      slots: JSON.stringify(slots)
    });
    const res = await fetch(SCRIPT_URL, { method: 'POST', body });
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    status.textContent = 'Disponibilidade salva com sucesso!';
    await loadData();
  } catch (err) {
    status.textContent = 'Erro ao salvar: ' + err.message;
  }
}

// ==== RENDER GRUPO (mapa de calor) ====
function renderGrupo() {
  const counts = {};
  const namesBySlot = {};
  allRows.forEach(r => {
    const key = `${r.dia}-${r.hora}`;
    counts[key] = (counts[key] || 0) + 1;
    if (!namesBySlot[key]) namesBySlot[key] = [];
    namesBySlot[key].push(r.nome);
  });

  const totalPessoas = new Set(allRows.map(r => r.nome.toLowerCase())).size || 1;

  Object.entries(grupoCells).forEach(([key, cellEl]) => {
    const count = counts[key] || 0;
    cellEl.style.background = colorForRatio(count / totalPessoas);
    cellEl.dataset.names = (namesBySlot[key] || []).join(', ');
    cellEl.dataset.count = count;
  });

  renderLegenda(totalPessoas);
}

function colorForRatio(ratio) {
  if (ratio <= 0) return 'var(--green-0)';
  if (ratio <= 0.2) return 'var(--green-1)';
  if (ratio <= 0.4) return 'var(--green-2)';
  if (ratio <= 0.6) return 'var(--green-3)';
  if (ratio <= 0.8) return 'var(--green-4)';
  return 'var(--green-5)';
}

function renderLegenda(totalPessoas) {
  const container = document.getElementById('grupo-legenda');
  container.innerHTML = '';
  const label = el('span', null, 'Menos disponível');
  container.appendChild(label);
  ['var(--green-0)', 'var(--green-1)', 'var(--green-2)', 'var(--green-3)', 'var(--green-4)', 'var(--green-5)'].forEach(c => {
    const sw = el('span', 'legend-swatch');
    sw.style.background = c;
    container.appendChild(sw);
  });
  container.appendChild(el('span', null, 'Mais disponível'));
}

function renderRespondentes() {
  const container = document.getElementById('lista-respondentes');
  container.innerHTML = '';
  const nomes = [...new Set(allRows.map(r => r.nome))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  if (!nomes.length) {
    container.appendChild(el('span', 'hint', 'Ainda ninguém respondeu.'));
    return;
  }
  nomes.forEach(nome => {
    const chip = el('button', 'chip', nome);
    chip.addEventListener('click', () => carregarParaEdicao(nome));
    container.appendChild(chip);
  });
}

function carregarParaEdicao(nome) {
  document.getElementById('input-nome').value = nome;
  clearEditorSelection();
  allRows.filter(r => r.nome === nome).forEach(r => {
    const key = `${r.dia}-${r.hora}`;
    const cellEl = editorCells[key];
    if (cellEl) applySelection(cellEl, true);
  });
  switchTab('editor');
}

// ==== TOOLTIP NO GRUPO ====
const tooltip = el('div', 'tooltip');
document.body.appendChild(tooltip);

function setupGrupoTooltip(container) {
  container.addEventListener('mouseover', (ev) => {
    const cellEl = ev.target.closest('.grid-cell');
    if (!cellEl) return;
    const count = cellEl.dataset.count || '0';
    const names = cellEl.dataset.names;
    tooltip.textContent = names ? `${count} disponível(is): ${names}` : 'Ninguém disponível';
    tooltip.style.display = 'block';
  });
  container.addEventListener('mousemove', (ev) => {
    tooltip.style.left = (ev.clientX + 14) + 'px';
    tooltip.style.top = (ev.clientY + 14) + 'px';
  });
  container.addEventListener('mouseout', (ev) => {
    if (!ev.target.closest('.grid-cell')) return;
    tooltip.style.display = 'none';
  });
}

// ==== INICIALIZAÇÃO ====
function init() {
  const editorContainer = document.getElementById('grid-editor');
  const grupoContainer = document.getElementById('grid-grupo');

  buildGrid(editorContainer, editorCells, true);
  buildGrid(grupoContainer, grupoCells, false);

  setupEditorDrag(editorContainer);
  setupGrupoTooltip(grupoContainer);

  document.getElementById('btn-atualizar').addEventListener('click', loadData);
  document.getElementById('btn-limpar').addEventListener('click', clearEditorSelection);

  document.getElementById('btn-salvar').addEventListener('click', () => {
    const nome = document.getElementById('input-nome').value.trim();
    const status = document.getElementById('editor-status');
    if (!nome) {
      status.textContent = 'Digite seu nome antes de salvar.';
      return;
    }
    saveData(nome, [...selectedSlots]);
  });

  loadData();
}

init();
