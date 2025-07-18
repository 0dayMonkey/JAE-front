// --- Initialisation et variables globales ---
const API_URL = 'https://miaou.vps.webdock.cloud/api';
const state = { token: null, currentView: 'logs', data: { logs: [], teams: [], stands: [] } };

// --- Fonctions Utilitaires (identiques à la version desktop) ---
const showMessage = (message, type = 'error') => {
    const container = document.getElementById('message-container');
    container.textContent = message;
    container.className = type;
    setTimeout(() => { container.className = 'hidden'; }, 4000);
};

const apiFetch = async (endpoint, options = {}) => {
    options.headers = { ...options.headers, 'Content-Type': 'application/json', 'Authorization': `Bearer ${state.token}` };
    const response = await fetch(`${API_URL}${endpoint}`, options);
    if (response.status === 401 || response.status === 403) {
        logout();
        throw new Error('Session expirée ou non autorisée.');
    }
    if (!response.ok) {
        const err = await response.json().catch(() => ({ message: 'Erreur serveur.' }));
        throw new Error(err.message);
    }
    return response.json();
};

// --- Logique de l'interface Mobile ---
const toggleNav = () => {
    document.getElementById('mobile-nav').classList.toggle('mobile-nav-visible');
};

const switchView = (viewName) => {
    state.currentView = viewName;
    document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
    document.getElementById(`view-${viewName}`).classList.remove('hidden');

    document.querySelectorAll('.nav-link').forEach(b => b.classList.remove('active'));
    document.querySelector(`.nav-link[data-view="${viewName}"]`).classList.add('active');
    
    document.querySelector('.header-title').textContent = document.querySelector(`.nav-link[data-view="${viewName}"]`).textContent;

    render();
    toggleNav();
};

const render = async () => {
    const view = document.getElementById(`view-${state.currentView}`);
    view.innerHTML = '<p>Chargement...</p>'; // Indicateur de chargement

    try {
        switch (state.currentView) {
            case 'logs':
                state.data.logs = await apiFetch('/admin/logs');
                renderLogs(state.data.logs);
                break;
            case 'teams':
                state.data.teams = await apiFetch('/scores');
                renderTeams(state.data.teams);
                break;
            case 'stands':
                state.data.stands = await apiFetch('/admin/stands');
                renderStands(state.data.stands);
                break;
        }
    } catch (error) {
        showMessage(error.message);
        view.innerHTML = `<p style="color:red;">${error.message}</p>`;
    }
};

const renderLogs = (logs) => {
    const container = document.getElementById('view-logs');
    if (logs.length === 0) {
        container.innerHTML = '<p>Aucun log de score pour le moment.</p>';
        return;
    }
    container.innerHTML = logs.map(log => `
        <div class="card log-card">
            <div class="points ${log.points >= 0 ? 'positive' : 'negative'}">${log.points}</div>
            <div class="details">
                <span class="info"><strong>Équipe :</strong> ${log.teamName || 'N/A'}</span>
                <span class="info"><strong>Stand :</strong> ${log.standName || 'N/A'}</span>
                <div class="timestamp">${new Date(log.timestamp).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</div>
            </div>
            <div class="actions">
                <button onclick="deleteLog('${log.logId}')">🗑️</button>
            </div>
        </div>
    `).join('');
};

const renderTeams = (teams) => {
    const container = document.getElementById('view-teams');
    container.innerHTML = teams.map(team => `
        <div class="card item-card">
            <div class="info">
                <div class="name">${team.name}</div>
                <div class="score">${team.score} points</div>
            </div>
            </div>
    `).join('');
};

const renderStands = (stands) => {
    const container = document.getElementById('view-stands');
    const standsToDisplay = stands.filter(stand => stand.name !== 'Admin');
     container.innerHTML = `<h2><button class="btn-add" onclick="openCreateStandModal()">+ Créer</button></h2>` +
     standsToDisplay.map(stand => `
        <div class="card item-card">
            <div class="info">
                <div class="name">${stand.name}</div>
                <div class="status ${stand.status}">${stand.status}</div>
            </div>
            <div class="actions-btn">
                <button class="kebab-btn" onclick="toggleKebab(event, '${stand.id}', '${stand.status}')">⋮</button>
            </div>
        </div>
    `).join('');
};

const toggleKebab = (event, standId, status) => {
    event.stopPropagation();
    closeAllKebabs();
    const parent = event.target.parentElement;
    const menu = document.createElement('div');
    menu.className = 'kebab-menu';
    const newStatus = status === 'ACTIF' ? 'INACTIF' : 'ACTIF';
    const actionText = status === 'ACTIF' ? 'Désactiver' : 'Activer';
    
    menu.innerHTML = `
        <button onclick="setStandStatus('${standId}', '${newStatus}')">${actionText}</button>
        <button onclick="openResetPinModal('${standId}')">Réinitialiser PIN</button>
    `;
    parent.appendChild(menu);
};

const closeAllKebabs = () => {
    document.querySelectorAll('.kebab-menu').forEach(menu => menu.remove());
};

const login = async (e) => {
    e.preventDefault();
    const password = document.getElementById('admin-password').value;
    try {
        const response = await fetch(`${API_URL}/auth/admin`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) });
        if (!response.ok) throw new Error('Mot de passe incorrect.');
        const { accessToken } = await response.json();
        state.token = accessToken;
        sessionStorage.setItem('jwt_admin_mobile', accessToken);
        document.getElementById('login-screen').classList.add('hidden');
        document.getElementById('dashboard-screen').classList.remove('hidden');
        render();
    } catch (error) { showMessage(error.message); }
};

const logout = () => {
    state.token = null;
    sessionStorage.removeItem('jwt_admin_mobile');
    document.getElementById('dashboard-screen').classList.add('hidden');
    document.getElementById('login-screen').classList.remove('hidden');
};


document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('admin-login-form').addEventListener('submit', login);
    document.getElementById('hamburger-btn').addEventListener('click', toggleNav);
    document.getElementById('logout-button-mobile').addEventListener('click', logout);
    
    document.querySelectorAll('.nav-link').forEach(button => {
        button.addEventListener('click', (e) => switchView(e.target.dataset.view));
    });

    document.body.addEventListener('click', closeAllKebabs);

    const existingToken = sessionStorage.getItem('jwt_admin_mobile');
    if (existingToken) {
        state.token = existingToken;
        document.getElementById('login-screen').classList.add('hidden');
        document.getElementById('dashboard-screen').classList.remove('hidden');
        render();
    }
});

window.deleteLog = async (logId) => { 
    showMessage(`Logique de suppression pour ${logId} à implémenter.`);
};
window.setStandStatus = async (standId, newStatus) => {
    showMessage(`Logique de changement de statut pour ${standId} à implémenter.`);
};