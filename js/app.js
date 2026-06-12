// ============================================================
// SALÃO IDEAL - Aplicação Frontend
// ============================================================

// ============================================================
// CONFIGURAÇÃO - Altere aqui antes de publicar
// ============================================================
const CONFIG = {
  SALON_NAME:            'Salão Ideal',
  WEBAPP_URL:            'https://script.google.com/macros/s/AKfycbxNp6lxGLe0vV_XZGXiucp2n6_f0V33QQMDSvUkPqSTbs3ZWw12pswuLD5b0z4eGgMz/exec',
  GOOGLE_CLIENT_ID: '959475587376-rfkijkqb0n0c5oliothdh2t2148tjoii.apps.googleusercontent.com',
  AUTO_REFRESH_INTERVAL: 180000,  // 3 minutos
  CALENDAR_START_HOUR:   8,       // 08:00
  CALENDAR_END_HOUR:     22,      // 22:00
  HOUR_PX:               80,      // pixels por hora no calendário
};

// ============================================================
// ESTADO GLOBAL
// ============================================================
const STATE = {
  user:          null,
  idToken:       null,
  currentDate:   new Date(),
  currentView:   'calendar',
  calendarView:  'day',       // 'day' | 'month'
  agendamentos:  [],
  clientes:      [],
  servicos:      [],
  funcionarios:  [],
  refreshTimer:  null,
  popupEl:       null,
};

// ============================================================
// CACHE LOCAL — evita requisições repetidas ao Apps Script
// ============================================================
const Cache = {
  _s: {},

  get(key) {
    const e = this._s[key];
    return (e && Date.now() < e.exp) ? e.data : null;
  },

  set(key, data, ttlMs) {
    this._s[key] = { data, exp: Date.now() + ttlMs };
  },

  del(key) { delete this._s[key]; },

  delPrefix(prefix) {
    for (const k of Object.keys(this._s))
      if (k.startsWith(prefix)) delete this._s[k];
  },

  clear() { this._s = {}; },
};

// Paleta de cores para cada funcionário
const COLORS = [
  { bg: 'rgba(74, 144, 217, 0.88)',  border: '#4A90D9' },
  { bg: 'rgba(217, 106, 138, 0.88)', border: '#D96A8A' },
  { bg: 'rgba(107, 191, 142, 0.88)', border: '#6BBF8E' },
  { bg: 'rgba(155, 107, 217, 0.88)', border: '#9B6BD9' },
  { bg: 'rgba(232, 168, 56, 0.88)',  border: '#E8A838' },
  { bg: 'rgba(217, 106, 74, 0.88)',  border: '#D96A4A' },
  { bg: 'rgba(91, 191, 191, 0.88)',  border: '#5BBFBF' },
];

// ============================================================
// ÍCONES SVG
// ============================================================
function _svg(p, w) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${w}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="vertical-align:middle;flex-shrink:0">${p}</svg>`;
}
const Icons = {
  edit:    (w=14) => _svg(`<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>`, w),
  trash:   (w=14) => _svg(`<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>`, w),
  phone:   (w=14) => _svg(`<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.56 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>`, w),
  warning: (w=16) => _svg(`<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>`, w),
  info:    (w=16) => _svg(`<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>`, w),
  check:   (w=16) => _svg(`<polyline points="20 6 9 17 4 12"/>`, w),
  xmark:   (w=16) => _svg(`<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>`, w),
  clock:   (w=14) => _svg(`<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>`, w),
  dollar:  (w=14) => _svg(`<line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>`, w),
  message: (w=14) => _svg(`<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>`, w),
  tag:     (w=14) => _svg(`<path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/>`, w),
  user:    (w=14) => _svg(`<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>`, w),
  users:   (w=40) => _svg(`<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>`, w),
  grip:    (w=10) => _svg(`<circle cx="8" cy="5" r="1.5" fill="currentColor" stroke="none"/><circle cx="16" cy="5" r="1.5" fill="currentColor" stroke="none"/><circle cx="8" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="16" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="8" cy="19" r="1.5" fill="currentColor" stroke="none"/><circle cx="16" cy="19" r="1.5" fill="currentColor" stroke="none"/>`, w),
};

// ============================================================
// UTILITÁRIOS
// ============================================================
const Utils = {
  // Formata data como "Segunda-feira, 02 de Junho de 2026"
  formatDateLong(date) {
    return date.toLocaleDateString('pt-BR', {
      weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
    });
  },

  // Formata data como "YYYY-MM-DD" (para API e planilha)
  formatDateISO(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  },

  // Converte qualquer string de data para objeto Date (suporta YYYY-MM-DD e DD/MM/YYYY)
  parseDate(str) {
    if (!str) return null;
    if (/^\d{4}-\d{2}-\d{2}/.test(str))
      return new Date(str.slice(0, 10) + 'T12:00:00');
    if (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(str)) {
      const [d, m, y] = str.split('/');
      return new Date(`${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}T12:00:00`);
    }
    return null;
  },

  // YYYY-MM-DD a partir de qualquer formato
  toISO(str) {
    const d = Utils.parseDate(str);
    if (!d || isNaN(d)) return '';
    return d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
  },

  // Número inteiro YYYYMMDD para comparação sem timezone (ex: 20260321)
  dateToNum(str) {
    const d = Utils.parseDate(str);
    if (!d || isNaN(d)) return 0;
    return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
  },

  // Formata data como "DD/MM/YYYY" (para exibição) — aceita ambos os formatos
  formatDateBR(str) {
    const d = Utils.parseDate(str);
    if (!d || isNaN(d)) return str || '';
    return String(d.getDate()).padStart(2, '0') + '/' +
      String(d.getMonth() + 1).padStart(2, '0') + '/' +
      d.getFullYear();
  },

  // Iniciais de um nome (ex: "Ana Paula" → "AP")
  initials(name) {
    if (!name) return '?';
    return name.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
  },

  // Cor consistente por funcionárioID
  colorForId(id, index) {
    const i = index !== undefined ? index : Math.abs(this.hashCode(id)) % COLORS.length;
    return COLORS[i % COLORS.length];
  },

  hashCode(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) {
      h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
    }
    return h;
  },

  // Converte "HH:MM" para minutos desde meia-noite
  timeToMinutes(time) {
    if (!time) return 0;
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  },

  // Decodifica JWT do Google (client-side, somente payload)
  parseJwt(token) {
    try {
      const b64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      return JSON.parse(decodeURIComponent(
        atob(b64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')
      ));
    } catch { return null; }
  },

  // Limpa telefone para usar no wa.me (somente dígitos, DDI 55)
  cleanPhone(phone) {
    const digits = phone.replace(/\D/g, '');
    if (digits.startsWith('55')) return digits;
    return '55' + digits;
  },

  // Capitaliza primeira letra
  capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  },

  // Escapa HTML para prevenir XSS
  escHtml(str) {
    const d = document.createElement('div');
    d.textContent = String(str ?? '');
    return d.innerHTML;
  },
};

// ============================================================
// CAMADA DE API - Chama o Google Apps Script
// ============================================================
const API = {
  async call(params) {
    const url = new URL(CONFIG.WEBAPP_URL);
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null) url.searchParams.set(k, v);
    });

    const resp = await fetch(url.toString(), { method: 'GET' });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    return resp.json();
  },

  validateUser: (token) =>
    API.call({ action: 'validateUser', token }),

  // Agendamentos por dia único → cacheável; range (tabela) → cacheável; mês → direto
  async getAgendamentos(data, funcionarioId, role, startDate, endDate) {
    if (data && !startDate && !endDate) {
      const key = 'ag_day_' + data;
      const hit = Cache.get(key);
      if (hit) return hit;
      const result = await API.call({ action: 'getAgendamentos', data, funcionarioId, role });
      if (result.success) Cache.set(key, result, 10 * 60 * 1000);
      return result;
    }
    if (startDate && endDate) {
      const key = 'ag_range_' + startDate + '_' + endDate;
      const hit = Cache.get(key);
      if (hit) return hit;
      const result = await API.call({ action: 'getAgendamentos', funcionarioId, role, startDate, endDate });
      if (result.success) Cache.set(key, result, 10 * 60 * 1000);
      return result;
    }
    return API.call({ action: 'getAgendamentos', data, funcionarioId, role, startDate, endDate });
  },

  async createAgendamento(d) {
    const result = await API.call({ action: 'createAgendamento', ...d });
    if (result.success) Cache.delPrefix('ag_');
    return result;
  },

  async updateAgendamento(d) {
    const result = await API.call({ action: 'updateAgendamento', ...d });
    if (result.success) Cache.delPrefix('ag_');
    return result;
  },

  async deleteAgendamento(id) {
    const result = await API.call({ action: 'deleteAgendamento', id });
    if (result.success) Cache.delPrefix('ag_');
    return result;
  },

  async getClientes() {
    const hit = Cache.get('clientes');
    if (hit) return hit;
    const result = await API.call({ action: 'getClientes' });
    if (result.success) Cache.set('clientes', result, 10 * 60 * 1000);
    return result;
  },

  async createCliente(d) {
    const result = await API.call({ action: 'createCliente', ...d });
    if (result.success) Cache.del('clientes');
    return result;
  },

  async updateCliente(d) {
    const result = await API.call({ action: 'updateCliente', ...d });
    if (result.success) Cache.del('clientes');
    return result;
  },

  async deleteCliente(id) {
    const result = await API.call({ action: 'deleteCliente', id });
    if (result.success) Cache.del('clientes');
    return result;
  },

  async getServicos() {
    const hit = Cache.get('servicos');
    if (hit) return hit;
    const result = await API.call({ action: 'getServicos' });
    if (result.success) Cache.set('servicos', result, 10 * 60 * 1000);
    return result;
  },

  async createServico(d) {
    const result = await API.call({ action: 'createServico', ...d });
    if (result.success) Cache.del('servicos');
    return result;
  },

  async updateServico(d) {
    const result = await API.call({ action: 'updateServico', ...d });
    if (result.success) Cache.del('servicos');
    return result;
  },

  async deleteServico(id) {
    const result = await API.call({ action: 'deleteServico', id });
    if (result.success) Cache.del('servicos');
    return result;
  },

  async getFuncionarios() {
    const hit = Cache.get('funcionarios');
    if (hit) return hit;
    const result = await API.call({ action: 'getFuncionarios' });
    if (result.success) Cache.set('funcionarios', result, 10 * 60 * 1000);
    return result;
  },

  async createFuncionario(d) {
    const result = await API.call({ action: 'createFuncionario', ...d });
    if (result.success) Cache.del('funcionarios');
    return result;
  },

  async updateFuncionario(d) {
    const result = await API.call({ action: 'updateFuncionario', ...d });
    if (result.success) Cache.del('funcionarios');
    return result;
  },

  async deleteFuncionario(id) {
    const result = await API.call({ action: 'deleteFuncionario', id });
    if (result.success) Cache.del('funcionarios');
    return result;
  },
};

// ============================================================
// AUTENTICAÇÃO
// ============================================================
const Auth = {
  init() {
    // Espera o script do Google carregar
    if (typeof google === 'undefined') {
      setTimeout(() => Auth.init(), 300);
      return;
    }
    google.accounts.id.initialize({
      client_id: CONFIG.GOOGLE_CLIENT_ID,
      callback: Auth.handleCredential,
      auto_select: false,
    });
    google.accounts.id.renderButton(
      document.getElementById('google-signin-btn'),
      { theme: 'outline', size: 'large', text: 'signin_with', shape: 'rectangular', width: 280 }
    );
    UI.hideLoading();
    UI.showView('login');
  },

  async handleCredential(response) {
    UI.showLoading('Verificando acesso...');
    const token = response.credential;

    try {
      const result = await API.validateUser(token);
      if (!result.success) {
        UI.hideLoading();
        UI.showView('login');
        document.getElementById('auth-error').textContent = result.error || 'Acesso negado.';
        document.getElementById('auth-error').classList.remove('hidden');
        return;
      }

      STATE.user     = result.user;
      STATE.idToken  = token;
      document.getElementById('auth-error').classList.add('hidden');

      Auth.setupUserUI();
      App.loadInitialData(); // sem await — carrega clientes/serviços/funcionários em segundo plano
      App.prefetchWeek();    // sem await — pré-carrega 7 dias da agenda em segundo plano
      UI.hideLoading();
      UI.showApp();
      Router.navigate('calendar');
      Calendar.loadAndRender(); // carrega o calendário imediatamente, sem esperar o timer
      App.startAutoRefresh();
    } catch (err) {
      UI.hideLoading();
      UI.showView('login');
      const isNetwork = err.message.includes('fetch') || err.message.includes('Failed');
      document.getElementById('auth-error').textContent = isNetwork
        ? 'Erro de conexão. Verifique a URL do Apps Script.'
        : 'Erro interno: ' + err.message;
      document.getElementById('auth-error').classList.remove('hidden');
      console.error('Auth error:', err);
    }
  },

  setupUserUI() {
    const u = STATE.user;
    const avatarEl = document.getElementById('user-avatar');
    avatarEl.textContent = Utils.initials(u.Nome);
    avatarEl.style.background = COLORS[Math.abs(Utils.hashCode(u.FuncionarioID)) % COLORS.length].border;
    document.getElementById('user-name').textContent = u.Nome;
    document.getElementById('user-role').textContent = u.Role;

    // Mostrar itens admin
    if (u.Role === 'Admin') {
      document.querySelectorAll('.admin-only').forEach(el => el.classList.remove('hidden'));
    }
  },

  logout() {
    if (typeof google !== 'undefined') {
      google.accounts.id.disableAutoSelect();
    }
    STATE.user = null;
    STATE.idToken = null;
    clearInterval(STATE.refreshTimer);
    Cache.clear();
    UI.hideApp();
    UI.showView('login');
    document.getElementById('auth-error').classList.add('hidden');
  },
};

// ============================================================
// INTERFACE DE USUÁRIO
// ============================================================
const UI = {
  showLoading(msg) {
    const el = document.getElementById('app-loading');
    el.querySelector('p').textContent = msg || 'Carregando...';
    el.classList.remove('hidden');
    document.getElementById('view-login').classList.add('hidden');
    document.getElementById('app-container').classList.add('hidden');
  },

  hideLoading() {
    document.getElementById('app-loading').classList.add('hidden');
  },

  showView(view) {
    document.getElementById('view-login').classList.toggle('hidden', view !== 'login');
    document.getElementById('app-container').classList.toggle('hidden', view !== 'app');
  },

  showApp() {
    document.getElementById('view-login').classList.add('hidden');
    document.getElementById('app-container').classList.remove('hidden');
  },

  hideApp() {
    document.getElementById('app-container').classList.add('hidden');
    document.getElementById('view-login').classList.remove('hidden');
  },

  toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
  },

  // --- Modals ---
  openModal(id) {
    document.getElementById('modal-backdrop').classList.remove('hidden');
    document.getElementById(id).classList.remove('hidden');
  },

  closeModal() {
    document.getElementById('modal-backdrop').classList.add('hidden');
    document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
    UI.removePopup();
  },

  // --- Toasts ---
  toast(message, type = 'info', duration = 3500) {
    const icons = { success: Icons.check(), error: Icons.xmark(), warning: Icons.warning(), info: Icons.info() };
    const container = document.getElementById('toast-container');
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.innerHTML = `<span class="toast-icon">${icons[type] || 'ℹ️'}</span><span>${Utils.escHtml(message)}</span>`;
    container.appendChild(el);

    setTimeout(() => {
      el.classList.add('removing');
      setTimeout(() => el.remove(), 350);
    }, duration);
  },

  toastSuccess: (msg) => UI.toast(msg, 'success'),
  toastError:   (msg) => UI.toast(msg, 'error'),
  toastWarning: (msg) => UI.toast(msg, 'warning'),

  // --- Confirm ---
  confirm(message, onConfirm) {
    document.getElementById('confirm-message').textContent = message;
    UI.openModal('modal-confirm');
    const btn = document.getElementById('btn-confirm-delete');
    btn.onclick = () => { UI.closeModal(); onConfirm(); };
  },

  // --- Popup flutuante (detalhe do agendamento) ---
  showPopup(html, x, y) {
    UI.removePopup();
    const el = document.createElement('div');
    el.className = 'appt-popup';
    el.innerHTML = html;
    document.body.appendChild(el);
    STATE.popupEl = el;

    // Posiciona dinamicamente com base no tamanho real do popup
    const vw = window.innerWidth, vh = window.innerHeight;
    const w  = el.offsetWidth  || 290;
    const h  = el.offsetHeight || 200;
    let left = x + 10, top = y - 10;
    if (left + w + 4 > vw) left = x - w - 10;
    if (top  + h + 4 > vh) top  = y - h;
    el.style.left = Math.max(4, left) + 'px';
    el.style.top  = Math.max(4, top)  + 'px';
  },

  removePopup() {
    if (STATE.popupEl) { STATE.popupEl.remove(); STATE.popupEl = null; }
  },
};

// ============================================================
// ROTEADOR DE VIEWS
// ============================================================
const Router = {
  navigate(view) {
    STATE.currentView = view;

    // Mostrar/ocultar views
    document.querySelectorAll('.view-content').forEach(el => el.classList.add('hidden'));
    document.getElementById('view-' + view)?.classList.remove('hidden');

    // Mostrar/ocultar headers
    const isCalendar = view === 'calendar';
    document.getElementById('calendar-header').classList.toggle('hidden', !isCalendar);
    document.getElementById('default-header').classList.toggle('hidden', isCalendar);

    // Atualizar nav ativa
    document.querySelectorAll('.nav-item').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.view === view);
    });

    // Fechar sidebar mobile
    document.getElementById('sidebar').classList.remove('open');

    // Carregar dados da view
    const titles = {
      agendamentos: 'Agendamentos',
      clientes:     'Clientes',
      servicos:     'Serviços',
      funcionarios: 'Funcionários',
      'como-usar':  'Como usar?',
    };

    if (!isCalendar && titles[view]) {
      document.getElementById('page-title').textContent = titles[view];
      if (view !== 'como-usar') Router.loadView(view);
    }
  },

  async loadView(view) {
    switch(view) {
      case 'agendamentos': await Appointments.loadTable(); break;
      case 'clientes':     await Clientes.loadTable();     break;
      case 'servicos':     await Servicos.loadTable();     break;
      case 'funcionarios': await Funcionarios.loadTable(); break;
    }
  }
};

// ============================================================
// ORDEM DAS COLUNAS DA AGENDA (Admin)
// ============================================================
const ColumnOrder = {
  KEY: 'salao-ideal-column-order',

  load() {
    try {
      const raw = localStorage.getItem(this.KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  },

  save(ids) {
    localStorage.setItem(this.KEY, JSON.stringify(ids));
  },

  // Reordena funcs conforme a ordem salva; novas funcionárias ficam no final
  apply(funcs) {
    const order = this.load();
    if (!order || !order.length) return funcs;
    const map = {};
    funcs.forEach(f => { map[f.FuncionarioID] = f; });
    const sorted = [];
    order.forEach(id => { if (map[id]) sorted.push(map[id]); });
    funcs.forEach(f => { if (!sorted.includes(f)) sorted.push(f); });
    return sorted;
  },

  initDrag(staffColsEl) {
    let dragSrc = null;
    let ghost   = null;

    function removeGhost() {
      if (ghost) { ghost.remove(); ghost = null; }
    }

    function createGhost(col, x, y) {
      removeGhost();
      const header = col.querySelector('.cal-staff-header');
      const avatar = header?.querySelector('.avatar');
      const name   = header?.querySelector('.cal-staff-name');
      ghost = document.createElement('div');
      ghost.className = 'cal-drag-ghost';
      ghost.innerHTML =
        (avatar ? avatar.outerHTML : '') +
        `<span class="cal-staff-name" style="margin-top:3px">${name ? Utils.escHtml(name.textContent) : ''}</span>`;
      ghost.style.left = (x - 95) + 'px';
      ghost.style.top  = (y - 28) + 'px';
      document.body.appendChild(ghost);
    }

    staffColsEl.addEventListener('dragstart', (e) => {
      const col = e.target.closest('.cal-staff-col');
      if (!col) return;
      dragSrc = col;
      // Suprimir o ghost estático padrão do browser
      const blankImg = new Image();
      blankImg.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAUEBAAAACwAAAAAAQABAAACAkQBADs=';
      e.dataTransfer.setDragImage(blankImg, 0, 0);
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', col.dataset.funcId || '');
      setTimeout(() => col.classList.add('dragging'), 0);
      createGhost(col, e.clientX, e.clientY);
    });

    staffColsEl.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      if (ghost) {
        ghost.style.left = (e.clientX - 95) + 'px';
        ghost.style.top  = (e.clientY - 28) + 'px';
      }
      const col = e.target.closest('.cal-staff-col');
      if (!col || col === dragSrc) return;
      staffColsEl.querySelectorAll('.cal-staff-col.drag-over').forEach(c => c.classList.remove('drag-over'));
      col.classList.add('drag-over');
    });

    staffColsEl.addEventListener('dragleave', (e) => {
      const col = e.target.closest('.cal-staff-col');
      if (col && !col.contains(e.relatedTarget)) col.classList.remove('drag-over');
    });

    staffColsEl.addEventListener('drop', (e) => {
      e.preventDefault();
      const targetCol = e.target.closest('.cal-staff-col');
      if (!targetCol || targetCol === dragSrc || !dragSrc) return;
      targetCol.classList.remove('drag-over');

      const allCols = [...staffColsEl.querySelectorAll('.cal-staff-col')];
      const srcIdx  = allCols.indexOf(dragSrc);
      const tgtIdx  = allCols.indexOf(targetCol);
      if (srcIdx < tgtIdx) targetCol.after(dragSrc);
      else                  targetCol.before(dragSrc);

      const newOrder = [...staffColsEl.querySelectorAll('.cal-staff-col')].map(c => c.dataset.funcId);
      ColumnOrder.save(newOrder);
      UI.toastSuccess('Ordem das colunas salva!');
    });

    staffColsEl.addEventListener('dragend', () => {
      staffColsEl.querySelectorAll('.cal-staff-col').forEach(c => c.classList.remove('dragging', 'drag-over'));
      dragSrc = null;
      removeGhost();
    });
  },
};

// ============================================================
// CALENDÁRIO
// ============================================================
const Calendar = {
  render(agendamentos, allFuncionarios) {
    const container = document.getElementById('calendar-grid-outer');

    // Filtrar só funcionários que têm agendamentos OU mostrar todos
    const funcs = allFuncionarios && allFuncionarios.length > 0
      ? allFuncionarios
      : STATE.funcionarios;

    // Se for Funcionário, mostrar só coluna dele
    let funcsToShow = funcs;
    if (STATE.user.Role === 'Funcionario') {
      funcsToShow = funcs.filter(f => f.FuncionarioID === STATE.user.FuncionarioID);
      if (!funcsToShow.length) funcsToShow = [STATE.user];
    }

    if (!funcsToShow.length) {
      container.innerHTML = `
        <div class="cal-empty" style="padding:80px;text-align:center;width:100%">
          <div class="empty-icon">${Icons.users()}</div>
          <p>Nenhum funcionário cadastrado.<br>
             <small class="text-muted">Cadastre funcionários para exibir o calendário.</small></p>
        </div>`;
      return;
    }

    // Para Admin, aplicar a ordem salva das colunas
    if (STATE.user.Role !== 'Funcionario') {
      funcsToShow = ColumnOrder.apply(funcsToShow);
    }

    // Detectar conflitos
    const conflicts = Calendar.detectConflicts(agendamentos);
    const conflictBanner = document.getElementById('conflict-banner');
    if (conflicts.length > 0) {
      conflictBanner.classList.remove('hidden');
      document.getElementById('conflict-text').textContent =
        `${conflicts.length} conflito(s) de horário detectado(s). Verifique os blocos marcados com ⚠️`;
    } else {
      conflictBanner.classList.add('hidden');
    }

    const HOURS = CONFIG.CALENDAR_END_HOUR - CONFIG.CALENDAR_START_HOUR; // 14
    const PX    = CONFIG.HOUR_PX;

    // --- Coluna de horários ---
    let timeHtml = `<div class="cal-time-col">`;
    for (let h = CONFIG.CALENDAR_START_HOUR; h < CONFIG.CALENDAR_END_HOUR; h++) {
      timeHtml += `<div class="cal-time-label">${String(h).padStart(2,'0')}:00</div>`;
      timeHtml += `<div class="cal-time-label cal-time-label--half">${String(h).padStart(2,'0')}:30</div>`;
    }
    timeHtml += `<div class="cal-time-label">${String(CONFIG.CALENDAR_END_HOUR).padStart(2,'0')}:00</div>`;
    timeHtml += `</div>`;

    // --- Colunas de funcionários ---
    const isAdmin = STATE.user.Role !== 'Funcionario';
    let staffHtml = `<div class="cal-staff-cols">`;

    funcsToShow.forEach((func, idx) => {
      const color = COLORS[idx % COLORS.length];
      const initials = Utils.initials(func.Nome);
      const appts = agendamentos.filter(a => a.FuncionarioID === func.FuncionarioID);
      const headerAttrs = isAdmin ? ' draggable="true" title="Segure e arraste para reordenar"' : '';
      const dragHandle = isAdmin
        ? `<div class="cal-drag-handle">${Icons.grip()}</div>`
        : '';

      staffHtml += `
        <div class="cal-staff-col" data-func-id="${Utils.escHtml(func.FuncionarioID)}">
          <div class="cal-staff-header"${headerAttrs}>
            ${dragHandle}
            <div class="avatar" style="background:${color.border};width:30px;height:30px;font-size:11px">${Utils.escHtml(initials)}</div>
            <div class="cal-staff-name">${Utils.escHtml(func.Nome)}</div>
          </div>
          <div class="cal-timeline" style="height:${HOURS * PX}px">`;

      // Linhas de hora e meia-hora
      for (let h = 0; h < HOURS; h++) {
        staffHtml += `<div class="cal-hour-line" style="top:${h * PX}px"></div>`;
        staffHtml += `<div class="cal-half-line" style="top:${h * PX + PX/2}px"></div>`;
      }

      // Linha de agora
      const now = new Date();
      const todayISO = Utils.formatDateISO(STATE.currentDate);
      const todayRealISO = Utils.formatDateISO(now);
      if (todayISO === todayRealISO) {
        const nowMin = now.getHours() * 60 + now.getMinutes();
        const startMin = CONFIG.CALENDAR_START_HOUR * 60;
        if (nowMin >= startMin && nowMin <= CONFIG.CALENDAR_END_HOUR * 60) {
          const topNow = (nowMin - startMin) * (PX / 60);
          staffHtml += `<div class="cal-now-line" style="top:${topNow}px"></div>`;
        }
      }

      // Blocos de agendamento
      appts.forEach(a => {
        const startMin = Utils.timeToMinutes(a.Horario);
        const dur = parseInt(a.ServicoDuracao) || 60;
        const calStartMin = CONFIG.CALENDAR_START_HOUR * 60;
        const top    = (startMin - calStartMin) * (PX / 60);
        const height = Math.max(dur * (PX / 60), 22);

        const isConflict = conflicts.some(c =>
          c.FuncionarioID === a.FuncionarioID && c.Horario === a.Horario
        );

        const endMin = startMin + dur;
        const endH = Math.floor(endMin / 60);
        const endM = endMin % 60;
        const endTime = `${String(endH).padStart(2,'0')}:${String(endM).padStart(2,'0')}`;

        const statusMap = { Confirmado: 'status-confirmado', Pendente: 'status-pendente', Cancelado: 'status-cancelado' };
        const statusClass = statusMap[a.Status] || 'status-pendente';

        const dataJson = JSON.stringify(a).replace(/"/g, '&quot;');

        staffHtml += `
          <div class="cal-appt"
               style="top:${top}px;height:${height}px;background:${color.bg};border-left-color:${color.border};z-index:${startMin}"
               onclick="Calendar.showApptDetail(event, ${dataJson})"
               title="${Utils.escHtml(a.ClienteNome)} - ${Utils.escHtml(a.ServicoNome)}">
            ${isConflict ? `<span class="cal-appt-conflict">${Icons.warning(12)}</span>` : ''}
            <div class="cal-appt-time">
              <span class="cal-appt-status ${statusClass}"></span>
              ${Utils.escHtml(a.Horario)}–${Utils.escHtml(endTime)}
            </div>
            ${height > 36 ? `<div class="cal-appt-client">${Utils.escHtml(a.ClienteNome)}</div>` : ''}
            ${height > 52 ? `<div class="cal-appt-service">${Utils.escHtml(a.ServicoNome)}</div>` : ''}
          </div>`;
      });

      staffHtml += `</div></div>`;
    });

    staffHtml += `</div>`;

    container.innerHTML = timeHtml + staffHtml;

    // Ativar drag-and-drop de reordenação para Admin
    if (isAdmin) {
      const staffColsEl = container.querySelector('.cal-staff-cols');
      if (staffColsEl) ColumnOrder.initDrag(staffColsEl);
    }

    Calendar.setupOverlapFan(container);
  },

  setupOverlapFan(container) {
    let fanGroupCounter = 0;

    container.querySelectorAll('.cal-timeline').forEach(timeline => {
      const appts = Array.from(timeline.querySelectorAll('.cal-appt')).map(el => ({
        el,
        top:    parseFloat(el.style.top),
        bottom: parseFloat(el.style.top) + parseFloat(el.style.height),
      })).sort((a, b) => a.top - b.top);

      if (appts.length < 2) return;

      // Union-Find para agrupar agendamentos sobrepostos transitivamente
      const parent = appts.map((_, i) => i);
      const find = i => { while (parent[i] !== i) { parent[i] = parent[parent[i]]; i = parent[i]; } return i; };
      const union = (i, j) => { const pi = find(i), pj = find(j); if (pi !== pj) parent[pi] = pj; };

      for (let i = 0; i < appts.length; i++)
        for (let j = i + 1; j < appts.length; j++)
          if (appts[i].top < appts[j].bottom && appts[i].bottom > appts[j].top)
            union(i, j);

      // Montar grupos
      const groupMap = {};
      appts.forEach((appt, i) => {
        const root = find(i);
        if (!groupMap[root]) groupMap[root] = [];
        groupMap[root].push(appt);
      });

      Object.values(groupMap).forEach(group => {
        if (group.length < 2) return;
        group.sort((a, b) => a.top - b.top);
        const colId = timeline.closest('[data-func-id]')?.dataset.funcId || 'x';
        const groupId = `ol-${colId}-${fanGroupCounter++}`;
        group.forEach((item, idx) => {
          item.el.dataset.overlapGroup = groupId;
          item.el.dataset.overlapIdx  = String(idx);
        });
      });
    });

    // Hover: fan-out / fan-in — diagonal de 20°
    const STEP   = 28; // px de deslocamento total por camada
    const ANGLE  = 20 * Math.PI / 180;
    const STEP_X = Math.round(STEP * Math.cos(ANGLE)); // ~26px horizontal
    const STEP_Y = -Math.round(STEP * Math.sin(ANGLE)); // ~-10px vertical (sobe)
    const pending = {};

    container.querySelectorAll('.cal-appt[data-overlap-group]').forEach(appt => {
      appt.addEventListener('mouseenter', () => {
        const g = appt.dataset.overlapGroup;
        clearTimeout(pending[g]);
        const members = Array.from(container.querySelectorAll(`[data-overlap-group="${g}"]`))
          .sort((a, b) => parseInt(a.dataset.overlapIdx) - parseInt(b.dataset.overlapIdx));
        members.forEach((el, i) => { el.style.transform = `translate(${i * STEP_X}px, ${i * STEP_Y}px)`; });
      });

      appt.addEventListener('mouseleave', () => {
        const g = appt.dataset.overlapGroup;
        pending[g] = setTimeout(() => {
          const members = container.querySelectorAll(`[data-overlap-group="${g}"]`);
          if (!Array.from(members).some(el => el.matches(':hover')))
            members.forEach(el => { el.style.transform = ''; });
        }, 80);
      });
    });
  },

  detectConflicts(agendamentos) {
    const conflicts = [];
    const seen = {};
    agendamentos.forEach(a => {
      const key = `${a.FuncionarioID}_${a.Horario}`;
      if (seen[key]) {
        if (!conflicts.some(c => c.FuncionarioID === a.FuncionarioID && c.Horario === a.Horario)) {
          conflicts.push({ FuncionarioID: a.FuncionarioID, Horario: a.Horario });
        }
      }
      seen[key] = true;
    });
    return conflicts;
  },

  async showApptDetail(event, appt) {
    event.stopPropagation();
    const isAdmin = STATE.user.Role === 'Admin';

    if (!isAdmin) {
      // Funcionário: popup somente leitura
      const preco = parseFloat(appt.ServicoPreco || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
      const dur   = appt.ServicoDuracao || '?';
      const statusBadges = { Confirmado: 'badge-confirmado', Pendente: 'badge-pendente', Cancelado: 'badge-cancelado' };
      const html = `
        <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:10px">
          <h4 style="font-size:14px;font-weight:700;color:var(--text)">${Utils.escHtml(appt.ClienteNome)}</h4>
          <button onclick="UI.removePopup()" style="background:none;border:none;font-size:18px;color:var(--text-muted);cursor:pointer;line-height:1">×</button>
        </div>
        <div class="appt-popup-row">${Icons.tag()} ${Utils.escHtml(appt.ServicoNome)} (${dur} min)</div>
        <div class="appt-popup-row">${Icons.clock()} ${Utils.escHtml(appt.Horario)} · ${Utils.escHtml(appt.Data ? Utils.formatDateBR(appt.Data) : '')}</div>
        <div class="appt-popup-row">${Icons.dollar()} ${preco}</div>
        <div class="appt-popup-row"><span class="badge ${statusBadges[appt.Status] || 'badge-pendente'}">${Utils.escHtml(appt.Status)}</span></div>
        ${appt.Observacoes ? `<div class="appt-popup-row" style="font-style:italic">${Icons.message()} ${Utils.escHtml(appt.Observacoes)}</div>` : ''}
      `;
      UI.showPopup(html, event.clientX, event.clientY);
      return;
    }

    // Admin: popup de edição inline
    try { await App.ensureDataLoaded(); } catch(_) {}
    Calendar._editAppt = appt;

    const servicoOpts = STATE.servicos.map(s =>
      `<option value="${Utils.escHtml(s.ServicoID)}"${s.ServicoID === appt.ServicoID ? ' selected' : ''}>${Utils.escHtml(s.Nome)} (${s.Duracao_min} min)</option>`
    ).join('');

    const funcOpts = STATE.funcionarios.map(f =>
      `<option value="${Utils.escHtml(f.FuncionarioID)}"${f.FuncionarioID === appt.FuncionarioID ? ' selected' : ''}>${Utils.escHtml(f.Nome)}</option>`
    ).join('');

    const whatsBtn = appt.ClienteTelefone
      ? `<button onclick="WhatsApp.openForAppointment(Calendar._editAppt)" class="btn-whatsapp" style="font-size:11px;padding:5px 10px" title="WhatsApp">${Icons.phone(12)}</button>`
      : '';

    const html = `
      <div class="pef-header">
        <div class="pef-cliente">${Utils.escHtml(appt.ClienteNome)}</div>
        <button onclick="UI.removePopup()" class="pef-close">×</button>
      </div>
      <div class="pef-row">
        <div class="pef-field">
          <label class="pef-label">Data</label>
          <input type="date" id="ep-data" class="pef-input" value="${Utils.escHtml(appt.Data || '')}">
        </div>
        <div class="pef-field">
          <label class="pef-label">Horário</label>
          <input type="time" id="ep-horario" class="pef-input" value="${Utils.escHtml(appt.Horario || '')}">
        </div>
      </div>
      <div class="pef-field">
        <label class="pef-label">Serviço</label>
        <select id="ep-servico" class="pef-input">
          <option value="">Selecione...</option>
          ${servicoOpts}
        </select>
      </div>
      <div class="pef-field">
        <label class="pef-label">Funcionária</label>
        <select id="ep-funcionario" class="pef-input">
          <option value="">Selecione...</option>
          ${funcOpts}
        </select>
      </div>
      <div class="pef-field">
        <label class="pef-label">Status</label>
        <select id="ep-status" class="pef-input">
          <option value="Confirmado"${appt.Status === 'Confirmado' ? ' selected' : ''}>Confirmado</option>
          <option value="Pendente"${appt.Status === 'Pendente' ? ' selected' : ''}>Pendente</option>
          <option value="Cancelado"${appt.Status === 'Cancelado' ? ' selected' : ''}>Cancelado</option>
        </select>
      </div>
      <div class="pef-field">
        <label class="pef-label">Observações</label>
        <textarea id="ep-obs" class="pef-input pef-textarea">${Utils.escHtml(appt.Observacoes || '')}</textarea>
      </div>
      <div class="pef-footer">
        <button onclick="Appointments.saveFromPopup()" class="btn-primary" style="font-size:11px;padding:5px 12px;flex:1">Salvar</button>
        ${whatsBtn}
        <button onclick="Appointments.deleteFromPopup()" class="btn-danger" style="font-size:11px;padding:5px 10px" title="Excluir">${Icons.trash(12)}</button>
      </div>
    `;

    UI.showPopup(html, event.clientX, event.clientY);
  },

  updateDateTitle() {
    let title;
    if (STATE.calendarView === 'month') {
      title = STATE.currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    } else {
      title = Utils.formatDateLong(STATE.currentDate);
    }
    document.getElementById('calendar-date-title').textContent = Utils.capitalize(title);
  },

  setView(mode) {
    STATE.calendarView = mode;
    document.getElementById('btn-view-day').classList.toggle('active', mode === 'day');
    document.getElementById('btn-view-month').classList.toggle('active', mode === 'month');
    Calendar.updateDateTitle();
    if (mode === 'day') {
      Calendar.loadAndRender();
    } else {
      Calendar.loadAndRenderMonth();
    }
  },

  previousDay() {
    if (STATE.calendarView === 'month') {
      STATE.currentDate.setMonth(STATE.currentDate.getMonth() - 1);
    } else {
      STATE.currentDate.setDate(STATE.currentDate.getDate() - 1);
    }
    Calendar.updateDateTitle();
    STATE.calendarView === 'month' ? Calendar.loadAndRenderMonth() : Calendar.loadAndRender();
  },

  nextDay() {
    if (STATE.calendarView === 'month') {
      STATE.currentDate.setMonth(STATE.currentDate.getMonth() + 1);
    } else {
      STATE.currentDate.setDate(STATE.currentDate.getDate() + 1);
    }
    Calendar.updateDateTitle();
    STATE.calendarView === 'month' ? Calendar.loadAndRenderMonth() : Calendar.loadAndRender();
  },

  goToToday() {
    STATE.currentDate = new Date();
    Calendar.updateDateTitle();
    STATE.calendarView === 'month' ? Calendar.loadAndRenderMonth() : Calendar.loadAndRender();
  },

  goToDate(dateISO) {
    const [y, m, d] = dateISO.split('-').map(Number);
    STATE.currentDate = new Date(y, m - 1, d);
    Calendar.setView('day');
  },

  async loadAndRenderMonth() {
    try {
      const date  = STATE.currentDate;
      const year  = date.getFullYear();
      const month = date.getMonth();
      const mm    = String(month + 1).padStart(2, '0');
      const lastDay = new Date(year, month + 1, 0).getDate();
      const startDate = `${year}-${mm}-01`;
      const endDate   = `${year}-${mm}-${String(lastDay).padStart(2, '0')}`;

      const result = await API.getAgendamentos(
        null, STATE.user.FuncionarioID, STATE.user.Role, startDate, endDate
      );
      if (result.success) {
        STATE.agendamentos = result.data || [];
        if (result.funcionarios) STATE.funcionarios = result.funcionarios;
        Calendar.renderMonth(STATE.agendamentos);
      } else {
        UI.toastError('Erro ao carregar agenda: ' + result.error);
      }
    } catch(err) {
      UI.toastError('Erro de conexão ao carregar agenda mensal.');
    }
  },

  renderMonth(allAppts) {
    const date   = STATE.currentDate;
    const year   = date.getFullYear();
    const month  = date.getMonth();  // 0-indexed

    // Filtrar agendamentos do mês atual
    const monthAppts = allAppts.filter(a => {
      if (!a.Data || a.Data.includes('NaN')) return false;
      const parts = a.Data.split('-');
      return parseInt(parts[0]) === year && parseInt(parts[1]) === (month + 1);
    });

    // Mapa por data
    const dayMap = {};
    monthAppts.forEach(a => {
      if (!dayMap[a.Data]) dayMap[a.Data] = [];
      dayMap[a.Data].push(a);
    });

    const firstDay  = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    // Google: 0=Dom, converter para Seg=0
    let startDow = firstDay.getDay();
    startDow = startDow === 0 ? 6 : startDow - 1;

    const weekdays = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
    const todayISO = Utils.formatDateISO(new Date());

    // Mapa de cor por funcionário
    const funcColorMap = {};
    STATE.funcionarios.forEach((f, i) => {
      funcColorMap[f.FuncionarioID] = COLORS[i % COLORS.length].border;
    });

    let html = `
      <div class="cal-month-container">
        <div class="cal-month-weekdays">
          ${weekdays.map(w => `<div class="cal-month-wd">${w}</div>`).join('')}
        </div>
        <div class="cal-month-grid">`;

    // Células vazias antes do primeiro dia
    for (let i = 0; i < startDow; i++) {
      html += `<div class="cal-month-cell cal-month-empty"></div>`;
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const mm = String(month + 1).padStart(2, '0');
      const dd = String(day).padStart(2, '0');
      const dateISO = `${year}-${mm}-${dd}`;
      const appts   = dayMap[dateISO] || [];
      const isToday = dateISO === todayISO;
      const count   = appts.length;

      // Pontos coloridos por funcionário único
      const seenFuncs = [];
      appts.forEach(a => { if (!seenFuncs.includes(a.FuncionarioID)) seenFuncs.push(a.FuncionarioID); });
      const dots = seenFuncs.slice(0, 6).map(fid => {
        const color = funcColorMap[fid] || '#C47FA8';
        return `<span class="cal-month-dot" style="background:${color}"></span>`;
      }).join('');

      const numHtml = isToday
        ? `<span class="today-circle">${day}</span>`
        : `${day}`;

      html += `
        <div class="cal-month-cell ${isToday ? 'cal-month-today' : ''}"
             onclick="Calendar.goToDate('${dateISO}')"
             title="${count > 0 ? count + ' agendamento(s)' : 'Sem agendamentos'}">
          <div class="cal-month-day-num">${numHtml}</div>
          ${count > 0 ? `
            <div class="cal-month-dots">${dots}</div>
            <div class="cal-month-count">${count} agend.</div>` : ''}
        </div>`;
    }

    html += `</div></div>`;
    document.getElementById('calendar-grid-outer').innerHTML = html;
  },

  async loadAndRender(silent = false) {
    try {
      const dateISO = Utils.formatDateISO(STATE.currentDate);

      // Mostra loading só em navegação manual sem cache (não no auto-refresh)
      if (!silent && !Cache.get('ag_day_' + dateISO)) {
        document.getElementById('calendar-grid-outer').innerHTML =
          '<div class="cal-loading">Carregando, aguarde...</div>';
      }

      const result  = await API.getAgendamentos(
        dateISO,
        STATE.user.FuncionarioID,
        STATE.user.Role
      );

      if (result.success) {
        STATE.agendamentos = result.data || [];
        if (result.funcionarios) STATE.funcionarios = result.funcionarios;
        Calendar.render(STATE.agendamentos, STATE.funcionarios);
      } else {
        UI.toastError('Erro ao carregar agenda: ' + result.error);
      }
    } catch (err) {
      UI.toastError('Erro de conexão ao carregar agenda.');
      console.error(err);
    }
  },
};

// ============================================================
// CLIENTES
// ============================================================
const Clientes = {
  data: [],

  async loadTable(silent = false) {
    if (!silent) {
      document.getElementById('tbody-clientes').innerHTML =
        '<tr><td colspan="5" class="table-empty">Carregando...</td></tr>';
    }
    try {
      const res = await API.getClientes();
      if (res.success) {
        this.data = res.data || [];
        this.renderTable(this.data);
        STATE.clientes = this.data;
      } else {
        if (!silent) UI.toastError(res.error);
      }
    } catch(e) {
      if (!silent) UI.toastError('Erro ao carregar clientes.');
    }
  },

  renderTable(data) {
    const tbody = document.getElementById('tbody-clientes');
    if (!data.length) {
      tbody.innerHTML = '<tr><td colspan="5" class="table-empty">Nenhum cliente cadastrado.</td></tr>';
      return;
    }
    tbody.innerHTML = data.map(c => `
      <tr>
        <td><strong>${Utils.escHtml(c.Nome)}</strong></td>
        <td>${Utils.escHtml(c.Telefone)}</td>
        <td>${Utils.escHtml(c.Email)}</td>
        <td class="text-muted">${Utils.escHtml(c.Observacoes || '–')}</td>
        <td class="actions-cell">
          ${c.Telefone ? `<button class="btn-icon whatsapp" onclick="WhatsApp.openForClient(${JSON.stringify(c).replace(/"/g,'&quot;')})" title="WhatsApp">${Icons.phone()}</button>` : ''}
          <button class="btn-icon edit" onclick="Clientes.openEdit(${JSON.stringify(c).replace(/"/g,'&quot;')})" title="Editar">${Icons.edit()}</button>
          <button class="btn-icon delete" onclick="UI.confirm('Excluir cliente ${Utils.escHtml(c.Nome)}?', () => Clientes.deleteItem('${c.ClienteID}'))" title="Excluir">${Icons.trash()}</button>
        </td>
      </tr>`).join('');
  },

  filterTable(query) {
    const q = query.toLowerCase();
    const filtered = this.data.filter(c =>
      c.Nome?.toLowerCase().includes(q) ||
      c.Telefone?.toLowerCase().includes(q) ||
      c.Email?.toLowerCase().includes(q)
    );
    this.renderTable(filtered);
  },

  openCreate() {
    document.getElementById('modal-cliente-title').textContent = 'Novo Cliente';
    document.getElementById('cliente-id').value = '';
    document.getElementById('cliente-nome').value = '';
    document.getElementById('cliente-telefone').value = '';
    document.getElementById('cliente-email').value = '';
    document.getElementById('cliente-observacoes').value = '';
    UI.openModal('modal-cliente');
  },

  openEdit(c) {
    UI.removePopup();
    document.getElementById('modal-cliente-title').textContent = 'Editar Cliente';
    document.getElementById('cliente-id').value = c.ClienteID;
    document.getElementById('cliente-nome').value = c.Nome;
    document.getElementById('cliente-telefone').value = c.Telefone;
    document.getElementById('cliente-email').value = c.Email;
    document.getElementById('cliente-observacoes').value = c.Observacoes;
    UI.openModal('modal-cliente');
  },

  async save() {
    const id   = document.getElementById('cliente-id').value;
    const nome = document.getElementById('cliente-nome').value.trim();
    if (!nome) { UI.toastWarning('Informe o nome do cliente.'); return; }

    const data = {
      ClienteID:    id,
      Nome:         nome,
      Telefone:     document.getElementById('cliente-telefone').value,
      Email:        document.getElementById('cliente-email').value,
      Observacoes:  document.getElementById('cliente-observacoes').value,
    };

    UI.closeModal();

    let rollback = null;
    if (id) {
      const idx = this.data.findIndex(c => c.ClienteID === id);
      if (idx >= 0) {
        rollback = { type: 'update', idx, original: { ...this.data[idx] } };
        this.data[idx] = { ...this.data[idx], ...data };
      }
    } else {
      rollback = { type: 'create', tempId: '_opt_' + Date.now() };
      this.data.unshift({ ...data, ClienteID: rollback.tempId });
    }
    this.renderTable(this.data);
    UI.toastSuccess(id ? 'Cliente atualizado!' : 'Cliente cadastrado!');

    try {
      const res = id ? await API.updateCliente(data) : await API.createCliente(data);
      if (res.success) {
        await this.loadTable(true);
      } else {
        if (rollback.type === 'update') this.data[rollback.idx] = rollback.original;
        else this.data = this.data.filter(c => c.ClienteID !== rollback.tempId);
        this.renderTable(this.data);
        UI.toastError(res.error || 'Erro ao salvar.');
      }
    } catch(e) {
      if (rollback.type === 'update') this.data[rollback.idx] = rollback.original;
      else this.data = this.data.filter(c => c.ClienteID !== rollback.tempId);
      this.renderTable(this.data);
      UI.toastError('Erro de conexão.');
    }
  },

  async deleteItem(id) {
    const idx = this.data.findIndex(c => c.ClienteID === id);
    let rollback = null;
    if (idx >= 0) {
      rollback = { idx, item: { ...this.data[idx] } };
      this.data.splice(idx, 1);
      this.renderTable(this.data);
    }
    UI.toastSuccess('Cliente excluído.');

    try {
      const res = await API.deleteCliente(id);
      if (res.success) {
        await this.loadTable(true);
      } else {
        if (rollback) { this.data.splice(rollback.idx, 0, rollback.item); this.renderTable(this.data); }
        UI.toastError(res.error || 'Erro ao excluir.');
      }
    } catch(e) {
      if (rollback) { this.data.splice(rollback.idx, 0, rollback.item); this.renderTable(this.data); }
      UI.toastError('Erro de conexão.');
    }
  },
};

// ============================================================
// SERVIÇOS
// ============================================================
const Servicos = {
  data: [],

  async loadTable(silent = false) {
    if (!silent) {
      document.getElementById('tbody-servicos').innerHTML =
        '<tr><td colspan="4" class="table-empty">Carregando...</td></tr>';
    }
    try {
      const res = await API.getServicos();
      if (res.success) {
        this.data = res.data || [];
        this.renderTable(this.data);
        STATE.servicos = this.data;
      } else {
        if (!silent) UI.toastError(res.error);
      }
    } catch(e) {
      if (!silent) UI.toastError('Erro ao carregar serviços.');
    }
  },

  renderTable(data) {
    const tbody = document.getElementById('tbody-servicos');
    if (!data.length) {
      tbody.innerHTML = '<tr><td colspan="4" class="table-empty">Nenhum serviço cadastrado.</td></tr>';
      return;
    }
    tbody.innerHTML = data.map(s => {
      const preco = parseFloat(s.Preco || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
      return `
        <tr>
          <td><strong>${Utils.escHtml(s.Nome)}</strong></td>
          <td>${Utils.escHtml(s.Duracao_min)} min</td>
          <td class="price-tag">${preco}</td>
          <td class="actions-cell">
            <button class="btn-icon edit" onclick="Servicos.openEdit(${JSON.stringify(s).replace(/"/g,'&quot;')})" title="Editar">${Icons.edit()}</button>
            <button class="btn-icon delete" onclick="UI.confirm('Excluir serviço ${Utils.escHtml(s.Nome)}?', () => Servicos.deleteItem('${s.ServicoID}'))" title="Excluir">${Icons.trash()}</button>
          </td>
        </tr>`;
    }).join('');
  },

  filterTable(query) {
    const q = query.toLowerCase();
    this.renderTable(this.data.filter(s => s.Nome?.toLowerCase().includes(q)));
  },

  openCreate() {
    document.getElementById('modal-servico-title').textContent = 'Novo Serviço';
    document.getElementById('servico-id').value = '';
    document.getElementById('servico-nome').value = '';
    document.getElementById('servico-duracao').value = '';
    document.getElementById('servico-preco').value = '';
    UI.openModal('modal-servico');
  },

  openEdit(s) {
    document.getElementById('modal-servico-title').textContent = 'Editar Serviço';
    document.getElementById('servico-id').value = s.ServicoID;
    document.getElementById('servico-nome').value = s.Nome;
    document.getElementById('servico-duracao').value = s.Duracao_min;
    document.getElementById('servico-preco').value = s.Preco;
    UI.openModal('modal-servico');
  },

  async save() {
    const id    = document.getElementById('servico-id').value;
    const nome  = document.getElementById('servico-nome').value.trim();
    const dur   = document.getElementById('servico-duracao').value;
    const preco = document.getElementById('servico-preco').value;

    if (!nome || !dur || !preco) {
      UI.toastWarning('Preencha todos os campos obrigatórios.');
      return;
    }

    const data = { ServicoID: id, Nome: nome, Duracao_min: dur, Preco: preco };

    UI.closeModal();

    let rollback = null;
    if (id) {
      const idx = this.data.findIndex(s => s.ServicoID === id);
      if (idx >= 0) {
        rollback = { type: 'update', idx, original: { ...this.data[idx] } };
        this.data[idx] = { ...this.data[idx], ...data };
      }
    } else {
      rollback = { type: 'create', tempId: '_opt_' + Date.now() };
      this.data.unshift({ ...data, ServicoID: rollback.tempId });
    }
    this.renderTable(this.data);
    UI.toastSuccess(id ? 'Serviço atualizado!' : 'Serviço cadastrado!');

    try {
      const res = id ? await API.updateServico(data) : await API.createServico(data);
      if (res.success) {
        await this.loadTable(true);
      } else {
        if (rollback.type === 'update') this.data[rollback.idx] = rollback.original;
        else this.data = this.data.filter(s => s.ServicoID !== rollback.tempId);
        this.renderTable(this.data);
        UI.toastError(res.error || 'Erro ao salvar.');
      }
    } catch(e) {
      if (rollback.type === 'update') this.data[rollback.idx] = rollback.original;
      else this.data = this.data.filter(s => s.ServicoID !== rollback.tempId);
      this.renderTable(this.data);
      UI.toastError('Erro de conexão.');
    }
  },

  async deleteItem(id) {
    const idx = this.data.findIndex(s => s.ServicoID === id);
    let rollback = null;
    if (idx >= 0) {
      rollback = { idx, item: { ...this.data[idx] } };
      this.data.splice(idx, 1);
      this.renderTable(this.data);
    }
    UI.toastSuccess('Serviço excluído.');

    try {
      const res = await API.deleteServico(id);
      if (res.success) {
        await this.loadTable(true);
      } else {
        if (rollback) { this.data.splice(rollback.idx, 0, rollback.item); this.renderTable(this.data); }
        UI.toastError(res.error || 'Erro ao excluir.');
      }
    } catch(e) {
      if (rollback) { this.data.splice(rollback.idx, 0, rollback.item); this.renderTable(this.data); }
      UI.toastError('Erro de conexão.');
    }
  },
};

// ============================================================
// FUNCIONÁRIOS
// ============================================================
const Funcionarios = {
  data: [],

  async loadTable(silent = false) {
    if (!silent) {
      document.getElementById('tbody-funcionarios').innerHTML =
        '<tr><td colspan="5" class="table-empty">Carregando...</td></tr>';
    }
    try {
      const res = await API.getFuncionarios();
      if (res.success) {
        this.data = res.data || [];
        this.renderTable(this.data);
        STATE.funcionarios = this.data;
      } else {
        if (!silent) UI.toastError(res.error);
      }
    } catch(e) {
      if (!silent) UI.toastError('Erro ao carregar funcionários.');
    }
  },

  renderTable(data) {
    const tbody = document.getElementById('tbody-funcionarios');
    if (!data.length) {
      tbody.innerHTML = '<tr><td colspan="5" class="table-empty">Nenhum funcionário cadastrado.</td></tr>';
      return;
    }
    tbody.innerHTML = data.map((f, i) => {
      const roleClass = f.Role === 'Admin' ? 'badge-admin' : 'badge-funcionario';
      const color = COLORS[i % COLORS.length].border;
      return `
        <tr>
          <td>
            <div style="display:flex;align-items:center;gap:8px">
              <div class="avatar" style="background:${color};width:30px;height:30px;font-size:10px">${Utils.escHtml(Utils.initials(f.Nome))}</div>
              <strong>${Utils.escHtml(f.Nome)}</strong>
            </div>
          </td>
          <td>${Utils.escHtml(f.Telefone)}</td>
          <td>${Utils.escHtml(f.Email)}</td>
          <td><span class="badge ${roleClass}">${Utils.escHtml(f.Role)}</span></td>
          <td class="actions-cell">
            <button class="btn-icon edit" onclick="Funcionarios.openEdit(${JSON.stringify(f).replace(/"/g,'&quot;')})" title="Editar">${Icons.edit()}</button>
            <button class="btn-icon delete" onclick="UI.confirm('Excluir funcionário ${Utils.escHtml(f.Nome)}?', () => Funcionarios.deleteItem('${f.FuncionarioID}'))" title="Excluir">${Icons.trash()}</button>
          </td>
        </tr>`;
    }).join('');
  },

  filterTable(query) {
    const q = query.toLowerCase();
    this.renderTable(this.data.filter(f =>
      f.Nome?.toLowerCase().includes(q) || f.Email?.toLowerCase().includes(q)
    ));
  },

  openCreate() {
    document.getElementById('modal-funcionario-title').textContent = 'Novo Funcionário';
    document.getElementById('funcionario-id').value = '';
    document.getElementById('funcionario-nome').value = '';
    document.getElementById('funcionario-telefone').value = '';
    document.getElementById('funcionario-email').value = '';
    document.getElementById('funcionario-role').value = 'Funcionario';
    UI.openModal('modal-funcionario');
  },

  openEdit(f) {
    document.getElementById('modal-funcionario-title').textContent = 'Editar Funcionário';
    document.getElementById('funcionario-id').value = f.FuncionarioID;
    document.getElementById('funcionario-nome').value = f.Nome;
    document.getElementById('funcionario-telefone').value = f.Telefone;
    document.getElementById('funcionario-email').value = f.Email;
    document.getElementById('funcionario-role').value = f.Role;
    UI.openModal('modal-funcionario');
  },

  async save() {
    const id    = document.getElementById('funcionario-id').value;
    const nome  = document.getElementById('funcionario-nome').value.trim();
    const email = document.getElementById('funcionario-email').value.trim();

    if (!nome || !email) {
      UI.toastWarning('Nome e email são obrigatórios.');
      return;
    }

    const data = {
      FuncionarioID: id,
      Nome:          nome,
      Telefone:      document.getElementById('funcionario-telefone').value,
      Email:         email,
      Role:          document.getElementById('funcionario-role').value,
    };

    UI.closeModal();

    let rollback = null;
    if (id) {
      const idx = this.data.findIndex(f => f.FuncionarioID === id);
      if (idx >= 0) {
        rollback = { type: 'update', idx, original: { ...this.data[idx] } };
        this.data[idx] = { ...this.data[idx], ...data };
      }
    } else {
      rollback = { type: 'create', tempId: '_opt_' + Date.now() };
      this.data.unshift({ ...data, FuncionarioID: rollback.tempId });
    }
    this.renderTable(this.data);
    UI.toastSuccess(id ? 'Funcionário atualizado!' : 'Funcionário cadastrado!');

    try {
      const res = id ? await API.updateFuncionario(data) : await API.createFuncionario(data);
      if (res.success) {
        await this.loadTable(true);
      } else {
        if (rollback.type === 'update') this.data[rollback.idx] = rollback.original;
        else this.data = this.data.filter(f => f.FuncionarioID !== rollback.tempId);
        this.renderTable(this.data);
        UI.toastError(res.error || 'Erro ao salvar.');
      }
    } catch(e) {
      if (rollback.type === 'update') this.data[rollback.idx] = rollback.original;
      else this.data = this.data.filter(f => f.FuncionarioID !== rollback.tempId);
      this.renderTable(this.data);
      UI.toastError('Erro de conexão.');
    }
  },

  async deleteItem(id) {
    const idx = this.data.findIndex(f => f.FuncionarioID === id);
    let rollback = null;
    if (idx >= 0) {
      rollback = { idx, item: { ...this.data[idx] } };
      this.data.splice(idx, 1);
      this.renderTable(this.data);
    }
    UI.toastSuccess('Funcionário excluído.');

    try {
      const res = await API.deleteFuncionario(id);
      if (res.success) {
        await this.loadTable(true);
      } else {
        if (rollback) { this.data.splice(rollback.idx, 0, rollback.item); this.renderTable(this.data); }
        UI.toastError(res.error || 'Erro ao excluir.');
      }
    } catch(e) {
      if (rollback) { this.data.splice(rollback.idx, 0, rollback.item); this.renderTable(this.data); }
      UI.toastError('Erro de conexão.');
    }
  },
};

// ============================================================
// AGENDAMENTOS
// ============================================================
const Appointments = {
  data:         [],
  filteredData: [],
  currentPage:  1,
  pageSize:     20,
  sort: { column: 'Data', direction: 'asc' },

  async loadTable(silent = false) {
    const today    = new Date();
    const todayISO = Utils.formatDateISO(today);
    const end      = new Date(today); end.setDate(today.getDate() + 6);
    const endISO   = Utils.formatDateISO(end);

    if (!silent) {
      document.getElementById('tbody-agendamentos').innerHTML =
        '<tr><td colspan="7" class="table-empty">Carregando...</td></tr>';
      const filterInfo = document.getElementById('agendamentos-filter-info');
      if (filterInfo) filterInfo.textContent = 'Próximos 7 dias';
    }

    try {
      const res = await API.getAgendamentos(
        null, STATE.user.FuncionarioID, STATE.user.Role, todayISO, endISO
      );
      if (res.success) {
        this.data = res.data || [];
        if (res.funcionarios) STATE.funcionarios = res.funcionarios;
        const q = document.getElementById('search-agendamentos')?.value || '';
        this.applyFilterAndSort(q);
      } else {
        if (!silent) UI.toastError(res.error);
      }
    } catch(e) {
      if (!silent) UI.toastError('Erro ao carregar agendamentos.');
    }
  },

  _buildOptimisticItem(payload) {
    const cl = STATE.clientes.find(c => c.ClienteID === payload.ClienteID) || {};
    const sv = STATE.servicos.find(s => s.ServicoID === payload.ServicoID) || {};
    const fn = STATE.funcionarios.find(f => f.FuncionarioID === payload.FuncionarioID) || {};
    return {
      AgendamentoID:   payload.AgendamentoID || '_opt_' + Date.now(),
      Data:            payload.Data,
      Horario:         payload.Horario,
      ClienteID:       payload.ClienteID,
      ClienteNome:     cl.Nome || '',
      ClienteTelefone: cl.Telefone || '',
      ServicoID:       payload.ServicoID,
      ServicoNome:     sv.Nome || '',
      FuncionarioID:   payload.FuncionarioID,
      FuncionarioNome: fn.Nome || '',
      Status:          payload.Status || 'Confirmado',
      Observacoes:     payload.Observacoes || '',
    };
  },

  sortBy(column) {
    if (this.sort.column === column) {
      this.sort.direction = this.sort.direction === 'asc' ? 'desc' : 'asc';
    } else {
      this.sort.column = column;
      this.sort.direction = 'asc';
    }
    const q = document.getElementById('search-agendamentos')?.value || '';
    this.applyFilterAndSort(q);
  },

  applyFilterAndSort(query) {
    // 1. Filtro de texto sobre todos os dados
    const q = (query || '').toLowerCase().trim();
    if (q) {
      this.filteredData = this.data.filter(a => {
        const br = Utils.formatDateBR(a.Data);
        return [a.ClienteNome, a.ServicoNome, a.FuncionarioNome,
                a.Data, br, a.Horario, a.Status]
          .some(v => v && String(v).toLowerCase().includes(q));
      });
    } else {
      this.filteredData = [...this.data];
    }

    // 2. Ordenação
    const { column, direction } = this.sort;
    this.filteredData.sort((a, b) => {
      let va = '', vb = '';
      switch (column) {
        case 'Data':
          va = Utils.toISO(a.Data) + (a.Horario || '');
          vb = Utils.toISO(b.Data) + (b.Horario || '');
          break;
        case 'Horario':     va = a.Horario || '';                        vb = b.Horario || '';                        break;
        case 'Cliente':     va = (a.ClienteNome     || '').toLowerCase(); vb = (b.ClienteNome     || '').toLowerCase(); break;
        case 'Servico':     va = (a.ServicoNome     || '').toLowerCase(); vb = (b.ServicoNome     || '').toLowerCase(); break;
        case 'Funcionario': va = (a.FuncionarioNome || '').toLowerCase(); vb = (b.FuncionarioNome || '').toLowerCase(); break;
        case 'Status':      va = (a.Status          || '').toLowerCase(); vb = (b.Status          || '').toLowerCase(); break;
      }
      const cmp = va < vb ? -1 : va > vb ? 1 : 0;
      return direction === 'asc' ? cmp : -cmp;
    });

    // 3. Volta para página 1 sempre que filtro/ordenação muda
    this.currentPage = 1;
    this.renderCurrentPage();
  },

  filterTable(query) {
    this.applyFilterAndSort(query);
  },

  goToPage(page) {
    const totalPages = Math.ceil(this.filteredData.length / this.pageSize);
    if (page < 1 || page > totalPages) return;
    this.currentPage = page;
    this.renderCurrentPage();
  },

  renderCurrentPage() {
    const start    = (this.currentPage - 1) * this.pageSize;
    const pageData = this.filteredData.slice(start, start + this.pageSize);
    this.renderTable(pageData);
    this.renderPagination();
    this.updateSortHeaders();
  },

  renderPagination() {
    const container = document.getElementById('agendamentos-pagination');
    if (!container) return;

    const total      = this.filteredData.length;
    const totalPages = Math.ceil(total / this.pageSize);

    if (total === 0 || totalPages <= 1) { container.innerHTML = ''; return; }

    const start = (this.currentPage - 1) * this.pageSize + 1;
    const end   = Math.min(this.currentPage * this.pageSize, total);

    let pagesHtml = '';
    let lastPrinted = 0;
    for (let i = 1; i <= totalPages; i++) {
      const near = Math.abs(i - this.currentPage) <= 1;
      const edge = i === 1 || i === totalPages;
      if (near || edge) {
        if (lastPrinted && i - lastPrinted > 1) {
          pagesHtml += `<span class="pg-ellipsis">…</span>`;
        }
        const active = i === this.currentPage;
        pagesHtml += `<button onclick="Appointments.goToPage(${i})" class="pg-btn${active ? ' pg-active' : ''}">${i}</button>`;
        lastPrinted = i;
      }
    }

    container.innerHTML = `
      <span class="pg-info">${start}–${end} de ${total} agendamentos</span>
      <div class="pg-controls">
        <button onclick="Appointments.goToPage(${this.currentPage - 1})"
          class="pg-btn pg-nav"${this.currentPage === 1 ? ' disabled' : ''}>‹</button>
        ${pagesHtml}
        <button onclick="Appointments.goToPage(${this.currentPage + 1})"
          class="pg-btn pg-nav"${this.currentPage === totalPages ? ' disabled' : ''}>›</button>
      </div>`;
  },

  updateSortHeaders() {
    document.querySelectorAll('#table-agendamentos .sortable').forEach(th => {
      const col  = th.dataset.col;
      const icon = th.querySelector('.sort-icon');
      if (!icon) return;
      const isActive = col === this.sort.column;
      th.classList.toggle('sort-active', isActive);
      icon.textContent = isActive
        ? (this.sort.direction === 'asc' ? ' ▲' : ' ▼')
        : ' ⇅';
    });
  },

  renderTable(data) {
    const tbody = document.getElementById('tbody-agendamentos');
    if (!data.length) {
      tbody.innerHTML = '<tr><td colspan="7" class="table-empty">Nenhum agendamento encontrado.</td></tr>';
      return;
    }

    const statusBadges = { Confirmado: 'badge-confirmado', Pendente: 'badge-pendente', Cancelado: 'badge-cancelado' };

    tbody.innerHTML = data.map(a => `
      <tr>
        <td>${Utils.escHtml(Utils.formatDateBR(a.Data))}</td>
        <td><strong>${Utils.escHtml(a.Horario)}</strong></td>
        <td>${Utils.escHtml(a.ClienteNome)}</td>
        <td>${Utils.escHtml(a.ServicoNome)}</td>
        <td>${Utils.escHtml(a.FuncionarioNome)}</td>
        <td><span class="badge ${statusBadges[a.Status] || 'badge-pendente'}">${Utils.escHtml(a.Status)}</span></td>
        <td class="actions-cell">
          ${a.ClienteTelefone ? `<button class="btn-icon whatsapp" onclick="WhatsApp.openForAppointment(${JSON.stringify(a).replace(/"/g,'&quot;')})" title="WhatsApp">${Icons.phone()}</button>` : ''}
          <button class="btn-icon edit" onclick="Appointments.openEdit(${JSON.stringify(a).replace(/"/g,'&quot;')})" title="Editar">${Icons.edit()}</button>
          <button class="btn-icon delete" onclick="UI.confirm('Excluir agendamento de ${Utils.escHtml(a.ClienteNome)}?', () => Appointments.deleteItem('${a.AgendamentoID}'))" title="Excluir">${Icons.trash()}</button>
        </td>
      </tr>`).join('');
  },

  populateSelects() {
    // Serviços
    const selServico = document.getElementById('agendamento-servico');
    selServico.innerHTML = '<option value="">Selecione o serviço...</option>' +
      STATE.servicos.map(s => `<option value="${s.ServicoID}">${Utils.escHtml(s.Nome)} (${s.Duracao_min} min)</option>`).join('');

    // Funcionários
    const selFunc = document.getElementById('agendamento-funcionario');
    selFunc.innerHTML = '<option value="">Selecione o funcionário...</option>' +
      STATE.funcionarios.map(f => `<option value="${f.FuncionarioID}">${Utils.escHtml(f.Nome)}</option>`).join('');
  },

  searchCliente(query) {
    const dropdown = document.getElementById('agendamento-cliente-dropdown');
    const hidden   = document.getElementById('agendamento-cliente');
    const input    = document.getElementById('agendamento-cliente-search');

    // Se já tem um cliente selecionado e o texto bate com ele, não reabrir
    if (hidden.value && input.dataset.selectedNome === query) {
      dropdown.classList.add('hidden');
      return;
    }

    // Limpar seleção ao digitar algo diferente
    if (hidden.value && input.dataset.selectedNome !== query) {
      hidden.value = '';
      input.classList.remove('has-value');
      document.getElementById('agendamento-cliente-clear').classList.add('hidden');
      delete input.dataset.selectedNome;
    }

    const q = query.trim().toLowerCase();
    const matches = STATE.clientes.filter(c =>
      c.Nome.toLowerCase().includes(q) ||
      (c.Telefone || '').toLowerCase().includes(q)
    );

    if (!q && !matches.length) {
      dropdown.classList.add('hidden');
      return;
    }

    const highlight = (text, q) => {
      if (!q) return Utils.escHtml(text);
      const idx = text.toLowerCase().indexOf(q);
      if (idx < 0) return Utils.escHtml(text);
      return Utils.escHtml(text.slice(0, idx))
        + '<mark>' + Utils.escHtml(text.slice(idx, idx + q.length)) + '</mark>'
        + Utils.escHtml(text.slice(idx + q.length));
    };

    if (matches.length === 0) {
      dropdown.innerHTML = `<div class="cliente-search-empty">Nenhum cliente encontrado</div>`;
    } else {
      dropdown.innerHTML = matches.slice(0, 12).map(c => `
        <div class="cliente-search-item" tabindex="0"
          onmousedown="event.preventDefault(); Appointments.selectCliente('${c.ClienteID}', ${JSON.stringify(c.Nome).replace(/"/g,'&quot;')})"
          onkeydown="if(event.key==='Enter'||event.key===' ') Appointments.selectCliente('${c.ClienteID}', ${JSON.stringify(c.Nome).replace(/"/g,'&quot;')})">
          <span class="cliente-search-item-nome">${highlight(c.Nome, q)}</span>
          ${c.Telefone ? `<span class="cliente-search-item-tel">${Utils.escHtml(c.Telefone)}</span>` : ''}
        </div>`).join('');
    }

    dropdown.classList.remove('hidden');
  },

  selectCliente(id, nome) {
    const hidden  = document.getElementById('agendamento-cliente');
    const input   = document.getElementById('agendamento-cliente-search');
    const clear   = document.getElementById('agendamento-cliente-clear');
    const dropdown = document.getElementById('agendamento-cliente-dropdown');

    hidden.value = id;
    input.value  = nome;
    input.dataset.selectedNome = nome;
    input.classList.add('has-value');
    clear.classList.remove('hidden');
    dropdown.classList.add('hidden');
  },

  clearCliente() {
    const hidden  = document.getElementById('agendamento-cliente');
    const input   = document.getElementById('agendamento-cliente-search');
    const clear   = document.getElementById('agendamento-cliente-clear');
    const dropdown = document.getElementById('agendamento-cliente-dropdown');

    hidden.value = '';
    input.value  = '';
    input.classList.remove('has-value');
    clear.classList.add('hidden');
    dropdown.classList.add('hidden');
    delete input.dataset.selectedNome;
    input.focus();
  },

  async openCreate(data = {}) {
    await App.ensureDataLoaded();
    this.populateSelects();

    document.getElementById('modal-agendamento-title').textContent = 'Novo Agendamento';
    document.getElementById('agendamento-id').value = '';
    document.getElementById('agendamento-data').value = data.data || Utils.formatDateISO(STATE.currentDate);
    document.getElementById('agendamento-horario').value = data.horario || '';
    document.getElementById('agendamento-servico').value = '';
    document.getElementById('agendamento-funcionario').value = '';
    document.getElementById('agendamento-status').value = 'Confirmado';
    document.getElementById('agendamento-observacoes').value = '';
    this.clearCliente();
    UI.openModal('modal-agendamento');
  },

  async openEdit(a) {
    UI.removePopup();
    await App.ensureDataLoaded();
    this.populateSelects();

    document.getElementById('modal-agendamento-title').textContent = 'Editar Agendamento';
    document.getElementById('agendamento-id').value = a.AgendamentoID;
    document.getElementById('agendamento-data').value = a.Data;
    document.getElementById('agendamento-horario').value = a.Horario;
    this.selectCliente(a.ClienteID, a.ClienteNome || '');
    document.getElementById('agendamento-servico').value = a.ServicoID;
    document.getElementById('agendamento-funcionario').value = a.FuncionarioID;
    document.getElementById('agendamento-status').value = a.Status;
    document.getElementById('agendamento-observacoes').value = a.Observacoes;
    UI.openModal('modal-agendamento');
  },

  async saveFromPopup() {
    const appt = Calendar._editAppt;
    if (!appt) return;

    const data    = document.getElementById('ep-data')?.value;
    const horario = document.getElementById('ep-horario')?.value;
    const servico = document.getElementById('ep-servico')?.value;
    const func    = document.getElementById('ep-funcionario')?.value;
    const status  = document.getElementById('ep-status')?.value;
    const obs     = document.getElementById('ep-obs')?.value || '';

    if (!data || !horario || !servico || !func) {
      UI.toastWarning('Preencha todos os campos obrigatórios.');
      return;
    }

    const payload = {
      AgendamentoID: appt.AgendamentoID,
      Data:          data,
      Horario:       horario,
      ClienteID:     appt.ClienteID,
      ServicoID:     servico,
      FuncionarioID: func,
      Status:        status,
      Observacoes:   obs,
    };

    const idx = STATE.agendamentos.findIndex(a => a.AgendamentoID === appt.AgendamentoID);
    const original = idx >= 0 ? { ...STATE.agendamentos[idx] } : null;
    if (idx >= 0) {
      STATE.agendamentos[idx] = this._buildOptimisticItem(payload);
      Calendar.render(STATE.agendamentos, STATE.funcionarios);
    }
    UI.removePopup();
    UI.toastSuccess('Agendamento atualizado!');

    try {
      const res = await API.updateAgendamento(payload);
      if (res.success) {
        await Calendar.loadAndRender(true);
      } else {
        if (idx >= 0 && original) { STATE.agendamentos[idx] = original; Calendar.render(STATE.agendamentos, STATE.funcionarios); }
        UI.toastError(res.error || 'Erro ao salvar.');
      }
    } catch(e) {
      if (idx >= 0 && original) { STATE.agendamentos[idx] = original; Calendar.render(STATE.agendamentos, STATE.funcionarios); }
      UI.toastError('Erro de conexão.');
    }
  },

  deleteFromPopup() {
    const appt = Calendar._editAppt;
    if (!appt) return;
    UI.confirm(`Excluir agendamento de ${appt.ClienteNome}?`, async () => {
      const idx = STATE.agendamentos.findIndex(a => a.AgendamentoID === appt.AgendamentoID);
      const original = idx >= 0 ? { ...STATE.agendamentos[idx] } : null;
      if (idx >= 0) {
        STATE.agendamentos.splice(idx, 1);
        Calendar.render(STATE.agendamentos, STATE.funcionarios);
      }
      UI.removePopup();
      UI.toastSuccess('Agendamento excluído.');

      try {
        const res = await API.deleteAgendamento(appt.AgendamentoID);
        if (res.success) {
          await Calendar.loadAndRender(true);
        } else {
          if (idx >= 0 && original) { STATE.agendamentos.splice(idx, 0, original); Calendar.render(STATE.agendamentos, STATE.funcionarios); }
          UI.toastError(res.error || 'Erro ao excluir.');
        }
      } catch(e) {
        if (idx >= 0 && original) { STATE.agendamentos.splice(idx, 0, original); Calendar.render(STATE.agendamentos, STATE.funcionarios); }
        UI.toastError('Erro de conexão.');
      }
    });
  },

  async save() {
    const id      = document.getElementById('agendamento-id').value;
    const data    = document.getElementById('agendamento-data').value;
    const horario = document.getElementById('agendamento-horario').value;
    const cliente = document.getElementById('agendamento-cliente').value;
    const servico = document.getElementById('agendamento-servico').value;
    const func    = document.getElementById('agendamento-funcionario').value;

    if (!data || !horario || !cliente || !servico || !func) {
      UI.toastWarning('Preencha todos os campos obrigatórios.');
      return;
    }

    const payload = {
      AgendamentoID: id,
      Data:          data,
      Horario:       horario,
      ClienteID:     cliente,
      ServicoID:     servico,
      FuncionarioID: func,
      Status:        document.getElementById('agendamento-status').value,
      Observacoes:   document.getElementById('agendamento-observacoes').value,
    };

    UI.closeModal();

    const isTable    = STATE.currentView === 'agendamentos';
    const isCalendar = STATE.currentView === 'calendar';
    const optimistic = this._buildOptimisticItem(payload);
    let rollback = null;

    if (isTable) {
      if (id) {
        const idx = this.data.findIndex(a => a.AgendamentoID === id);
        if (idx >= 0) {
          rollback = { view: 'table', type: 'update', idx, original: { ...this.data[idx] } };
          this.data[idx] = optimistic;
        }
      } else {
        rollback = { view: 'table', type: 'create', tempId: optimistic.AgendamentoID };
        this.data.unshift(optimistic);
      }
      const q = document.getElementById('search-agendamentos')?.value || '';
      this.applyFilterAndSort(q);
    } else if (isCalendar && payload.Data === Utils.formatDateISO(STATE.currentDate)) {
      if (id) {
        const idx = STATE.agendamentos.findIndex(a => a.AgendamentoID === id);
        if (idx >= 0) {
          rollback = { view: 'calendar', type: 'update', idx, original: { ...STATE.agendamentos[idx] } };
          STATE.agendamentos[idx] = optimistic;
        }
      } else {
        rollback = { view: 'calendar', type: 'create', tempId: optimistic.AgendamentoID };
        STATE.agendamentos.push(optimistic);
      }
      Calendar.render(STATE.agendamentos, STATE.funcionarios);
    }

    UI.toastSuccess(id ? 'Agendamento atualizado!' : 'Agendamento criado!');

    const _rollbackCalendarOrTable = () => {
      if (!rollback) return;
      if (rollback.view === 'table') {
        if (rollback.type === 'update') this.data[rollback.idx] = rollback.original;
        else this.data = this.data.filter(a => a.AgendamentoID !== rollback.tempId);
        const q = document.getElementById('search-agendamentos')?.value || '';
        this.applyFilterAndSort(q);
      } else {
        if (rollback.type === 'update') STATE.agendamentos[rollback.idx] = rollback.original;
        else STATE.agendamentos = STATE.agendamentos.filter(a => a.AgendamentoID !== rollback.tempId);
        Calendar.render(STATE.agendamentos, STATE.funcionarios);
      }
    };

    try {
      const res = id ? await API.updateAgendamento(payload) : await API.createAgendamento(payload);
      if (res.success) {
        if (isTable) await this.loadTable(true);
        else await Calendar.loadAndRender(true);
      } else {
        _rollbackCalendarOrTable();
        UI.toastError(res.error || 'Erro ao salvar.');
      }
    } catch(e) {
      _rollbackCalendarOrTable();
      UI.toastError('Erro de conexão.');
    }
  },

  async deleteItem(id) {
    const isTable    = STATE.currentView === 'agendamentos';
    const isCalendar = STATE.currentView === 'calendar';
    let rollback = null;

    if (isTable) {
      const idx = this.data.findIndex(a => a.AgendamentoID === id);
      if (idx >= 0) {
        rollback = { view: 'table', idx, item: { ...this.data[idx] } };
        this.data.splice(idx, 1);
        const q = document.getElementById('search-agendamentos')?.value || '';
        this.applyFilterAndSort(q);
      }
    } else if (isCalendar) {
      const idx = STATE.agendamentos.findIndex(a => a.AgendamentoID === id);
      if (idx >= 0) {
        rollback = { view: 'calendar', idx, item: { ...STATE.agendamentos[idx] } };
        STATE.agendamentos.splice(idx, 1);
        Calendar.render(STATE.agendamentos, STATE.funcionarios);
      }
    }
    UI.toastSuccess('Agendamento excluído.');

    const _rollback = () => {
      if (!rollback) return;
      if (rollback.view === 'table') {
        this.data.splice(rollback.idx, 0, rollback.item);
        const q = document.getElementById('search-agendamentos')?.value || '';
        this.applyFilterAndSort(q);
      } else {
        STATE.agendamentos.splice(rollback.idx, 0, rollback.item);
        Calendar.render(STATE.agendamentos, STATE.funcionarios);
      }
    };

    try {
      const res = await API.deleteAgendamento(id);
      if (res.success) {
        if (isTable) await this.loadTable(true);
        else await Calendar.loadAndRender(true);
      } else {
        _rollback();
        UI.toastError(res.error || 'Erro ao excluir.');
      }
    } catch(e) {
      _rollback();
      UI.toastError('Erro de conexão.');
    }
  },
};

// ============================================================
// WHATSAPP
// ============================================================
const WhatsApp = {
  currentData: null,

  templates: {
    confirmacao: (d) =>
      `Olá ${d.ClienteNome}, passando para confirmar seu horário no ${CONFIG.SALON_NAME} em ${Utils.formatDateBR(d.Data)} às ${d.Horario}. Aguardamos você!`,
    lembrete: (d) =>
      `Olá ${d.ClienteNome}, estamos lembrando do seu atendimento amanhã às ${d.Horario} no ${CONFIG.SALON_NAME}. Qualquer dúvida, entre em contato!`,
    cancelamento: (d) =>
      `Olá ${d.ClienteNome}, precisamos remarcar seu horário. Entre em contato conosco para agendar um novo horário. Desculpe o transtorno!`,
  },

  openForAppointment(appt) {
    UI.removePopup();
    this.currentData = {
      ClienteNome:   appt.ClienteNome,
      ClienteFone:   appt.ClienteTelefone,
      Data:          appt.Data,
      Horario:       appt.Horario,
    };
    this._openModal();
  },

  openForClient(cliente) {
    this.currentData = {
      ClienteNome:  cliente.Nome,
      ClienteFone:  cliente.Telefone,
      Data:         Utils.formatDateISO(new Date()),
      Horario:      '',
    };
    this._openModal();
  },

  _openModal() {
    if (!this.currentData?.ClienteFone) {
      UI.toastWarning('Este cliente não possui telefone cadastrado.');
      return;
    }
    document.getElementById('whatsapp-client-name').innerHTML =
      Icons.user(16) + ' ' + Utils.escHtml(this.currentData.ClienteNome);
    document.getElementById('whatsapp-type').value = 'confirmacao';
    this.updatePreview();
    UI.openModal('modal-whatsapp');
  },

  updatePreview() {
    if (!this.currentData) return;
    const type = document.getElementById('whatsapp-type').value;
    const msg  = this.templates[type]?.(this.currentData) || '';
    document.getElementById('whatsapp-message').value = msg;
  },

  send() {
    const phone = Utils.cleanPhone(this.currentData.ClienteFone);
    const msg   = document.getElementById('whatsapp-message').value;
    const url   = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
    UI.closeModal();
  },
};

// ============================================================
// CONTROLADOR PRINCIPAL
// ============================================================
const App = {
  async loadInitialData() {
    try {
      const [c, s, f] = await Promise.all([
        API.getClientes(),
        API.getServicos(),
        API.getFuncionarios(),
      ]);
      if (c.success) STATE.clientes    = c.data || [];
      if (s.success) STATE.servicos    = s.data || [];
      if (f.success) STATE.funcionarios = f.data || [];
    } catch(e) {
      console.warn('Erro ao carregar dados iniciais:', e);
    }
  },

  // Pré-carrega agendamentos dos próximos 7 dias para navegação instantânea
  async prefetchWeek() {
    if (!STATE.user) return;
    const today = new Date();
    const fetches = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const iso = Utils.formatDateISO(d);
      if (!Cache.get('ag_day_' + iso)) {
        fetches.push(
          API.getAgendamentos(iso, STATE.user.FuncionarioID, STATE.user.Role)
            .then(r => { if (r.success && r.funcionarios) STATE.funcionarios = r.funcionarios; })
            .catch(() => {})
        );
      }
    }
    await Promise.all(fetches);
  },

  // Garante que os dados estejam carregados antes de abrir modais
  async ensureDataLoaded() {
    if (!STATE.clientes.length || !STATE.servicos.length || !STATE.funcionarios.length) {
      await App.loadInitialData();
    }
  },

  async refreshAll() {
    const btn = document.getElementById('btn-refresh');
    btn.classList.add('spinning');
    try {
      Cache.clear(); // força dados frescos no refresh manual
      await App.loadInitialData();
      if (STATE.currentView === 'calendar') {
        if (STATE.calendarView === 'month') {
          await Calendar.loadAndRenderMonth();
        } else {
          await Calendar.loadAndRender();
        }
      } else {
        await Router.loadView(STATE.currentView);
      }
    } finally {
      btn.classList.remove('spinning');
    }
  },

  startAutoRefresh() {
    clearInterval(STATE.refreshTimer);
    STATE.refreshTimer = setInterval(async () => {
      if (STATE.currentView === 'calendar' && STATE.user) {
        // Invalida só o dia atual para buscar dados frescos, sem mostrar loading
        Cache.del('ag_day_' + Utils.formatDateISO(STATE.currentDate));
        if (STATE.calendarView === 'month') {
          await Calendar.loadAndRenderMonth();
        } else {
          await Calendar.loadAndRender(true); // silent: não exibe indicador de loading
        }
      }
    }, CONFIG.AUTO_REFRESH_INTERVAL);
  },

  init() {
    // Aplicar nome do salão
    document.title = CONFIG.SALON_NAME;
    document.getElementById('login-salon-name').textContent  = CONFIG.SALON_NAME;
    document.getElementById('sidebar-salon-name').textContent = CONFIG.SALON_NAME;

    // Fechar popup ao clicar fora
    document.addEventListener('click', (e) => {
      if (STATE.popupEl && !STATE.popupEl.contains(e.target)) {
        UI.removePopup();
      }
      // Fechar dropdown de busca de cliente ao clicar fora
      const wrapper = document.querySelector('.cliente-search-wrapper');
      const dropdown = document.getElementById('agendamento-cliente-dropdown');
      if (dropdown && wrapper && !wrapper.contains(e.target)) {
        dropdown.classList.add('hidden');
      }
    });

    // Inicializar calendário (data de hoje)
    Calendar.updateDateTitle();

    // Iniciar autenticação
    Auth.init();
  },
};

// ============================================================
// BOOTSTRAP
// ============================================================
document.addEventListener('DOMContentLoaded', () => App.init());
