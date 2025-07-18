const API_URL = 'https://miaou.vps.webdock.cloud/api';

const state = {
    token: null,
    currentView: 'logs',
    logs: [],
    teams: [],
    stands: []
};

// --- Fonctions Utilitaires ---

const showMessage = (message, type = 'error') => {
    const container = document.getElementById('message-container');
    if (!container) return;
    container.textContent = message;
    container.className = '';
    container.classList.add(type);
    container.classList.remove('hidden');
    setTimeout(() => {
        container.classList.add('hidden');
    }, 4000);
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
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.indexOf("application/json") !== -1) {
        return response.json();
    }
    return response.text();
};

const showConfirmationModal = (message) => {
    return new Promise((resolve) => {
        const confirmContainer = document.getElementById('confirm-container');
        document.getElementById('confirm-text').innerText = message;
        confirmContainer.classList.remove('hidden');
        const btnOk = document.getElementById('confirm-ok');
        const btnCancel = document.getElementById('confirm-cancel');
        const cleanup = () => {
            confirmContainer.classList.add('hidden');
            btnOk.replaceWith(btnOk.cloneNode(true));
            btnCancel.replaceWith(btnCancel.cloneNode(true));
        };
        btnOk.addEventListener('click', () => { cleanup(); resolve(true); }, { once: true });
        btnCancel.addEventListener('click', () => { cleanup(); resolve(false); }, { once: true });
    });
};

function closeModal() {
    document.getElementById('modal-container').classList.add('hidden');
}

// --- Fonctions de Rendu des Vues ---

const render = () => {
    document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
    document.getElementById(`view-${state.currentView}`).classList.remove('hidden');
    document.querySelectorAll('.sidebar nav button').forEach(b => b.classList.remove('active'));
    document.querySelector(`.sidebar nav button[data-view="${state.currentView}"]`).classList.add('active');
    switch (state.currentView) {
        case 'logs':
            renderLogs();
            break;
        case 'teams':
            renderTeams();
            break;
        case 'stands':
            renderStands();
            break;
    }
};

const renderLogs = async () => {
    try {
        state.logs = await apiFetch('/admin/logs');
        const view = document.getElementById('view-logs');
        let html = `<h2>Historique des Scores</h2><div class="table-container"><table><thead><tr><th>Timestamp</th><th>Équipe</th><th>Stand</th><th>Points</th><th>Actions</th></tr></thead><tbody>`;
        if (state.logs.length > 0) {
            state.logs.forEach(log => {
                html += `<tr><td>${new Date(log.timestamp).toLocaleString('fr-FR')}</td><td>${log.teamName || 'N/A'}</td><td>${log.standName || 'N/A'}</td><td>${log.points}</td><td><button class="action-btn" onclick="openEditLogModal('${log.logId}', ${log.points})">✏️</button><button class="action-btn" onclick="deleteLog('${log.logId}')">🗑️</button></td></tr>`;
            });
        } else {
            html += `<tr><td colspan="5" style="text-align:center;">Aucun log à afficher.</td></tr>`;
        }
        html += `</tbody></table></div>`;
        view.innerHTML = html;
    } catch (error) {
        showMessage(error.message);
    }
};

const renderTeams = async () => {
    try {
        state.teams = await apiFetch('/scores');
        const view = document.getElementById('view-teams');
        let html = `<h2>Gestion des Équipes</h2><div class="table-container"><table><thead><tr><th>Équipe</th><th>Score Total</th><th>Actions</th></tr></thead><tbody>`;
        state.teams.forEach(team => {
            html += `<tr><td>${team.name}</td><td>${team.score}</td><td><button class="action-btn" onclick="openManageTeamModal('${team.id}', '${team.name}', ${team.score})">⚙️ Gérer</button></td></tr>`;
        });
        html += `</tbody></table></div>`;
        view.innerHTML = html;
    } catch (error) {
        showMessage(error.message);
    }
};

const renderStands = async () => {
    try {
        state.stands = await apiFetch('/admin/stands');
        const view = document.getElementById('view-stands');
        let html = `<h2>Gestion des Stands <button class="btn btn-primary" onclick="openCreateStandModal()">+ Créer un Stand</button></h2><div class="table-container"><table><thead><tr><th>Nom du Stand</th><th>Statut</th><th>Actions</th></tr></thead><tbody>`;
        state.stands.forEach(stand => {
            html += `<tr><td>${stand.name}</td><td>${stand.isActive ? '✅ Actif' : '❌ Inactif'}</td><td><button class="action-btn" onclick="toggleStand('${stand.id}', ${!stand.isActive})">${stand.isActive ? 'Désactiver' : 'Activer'}</button><button class="action-btn" onclick="openResetPinModal('${stand.id}', '${stand.name}')">🔑 Réinitialiser PIN</button></td></tr>`;
        });
        html += `</tbody></table></div>`;
        view.innerHTML = html;
    } catch (error) {
        showMessage(error.message);
    }
};


// --- Fonctions de Gestion (Modals & Actions) ---

function openEditLogModal(logId, currentPoints) {
    document.getElementById('modal-title').innerText = 'Modifier le Score d\'un Log';
    document.getElementById('modal-body').innerHTML = `<p>Nouvelle valeur des points :</p><input type="number" id="edit-points-input" value="${currentPoints}" class="modal-input">`;
    document.getElementById('modal-actions').innerHTML = `<button class="btn btn-secondary" onclick="closeModal()">Annuler</button><button class="btn btn-primary" onclick="submitEditLog('${logId}')">Valider</button>`;
    document.getElementById('modal-container').classList.remove('hidden');
}

async function submitEditLog(logId) {
    const newPoints = document.getElementById('edit-points-input').value;
    try {
        await apiFetch(`/scores/${logId}`, { method: 'PUT', body: JSON.stringify({ points: parseInt(newPoints, 10) }) });
        showMessage('Score mis à jour !', 'success');
        closeModal();
        renderLogs();
    } catch (error) {
        showMessage(error.message);
    }
}

async function deleteLog(logId) {
    const confirmed = await showConfirmationModal('Êtes-vous sûr de vouloir supprimer ce score ?');
    if (confirmed) {
        try {
            await apiFetch(`/scores/${logId}`, { method: 'DELETE' });
            showMessage('Score supprimé !', 'success');
            renderLogs();
        } catch (error) {
            showMessage(error.message);
        }
    }
}

function openCreateStandModal() {
    document.getElementById('modal-title').innerText = 'Créer un nouveau Stand';
    document.getElementById('modal-body').innerHTML = `<p>Nom du Stand:</p><input type="text" id="new-stand-name" class="modal-input"><p>PIN (6 chiffres):</p><input type="text" id="new-stand-pin" class="modal-input" maxlength="6">`;
    document.getElementById('modal-actions').innerHTML = `<button class="btn btn-secondary" onclick="closeModal()">Annuler</button><button class="btn btn-primary" onclick="submitCreateStand()">Créer</button>`;
    document.getElementById('modal-container').classList.remove('hidden');
}

async function submitCreateStand() {
    const name = document.getElementById('new-stand-name').value;
    const pin = document.getElementById('new-stand-pin').value;
    try {
        await apiFetch('/admin/stands', { method: 'POST', body: JSON.stringify({ name, pin }) });
        showMessage('Stand créé !', 'success');
        closeModal();
        renderStands();
    } catch (error) {
        showMessage(error.message);
    }
}

async function toggleStand(standId, isActive) {
    const action = isActive ? 'activer' : 'désactiver';
    const confirmed = await showConfirmationModal(`Êtes-vous sûr de vouloir ${action} ce stand ?`);
    if (confirmed) {
        try {
            await apiFetch(`/admin/stands/${standId}/toggle`, { method: 'PUT', body: JSON.stringify({ isActive }) });
            showMessage('Statut mis à jour !', 'success');
            renderStands();
        } catch (error) {
            showMessage(error.message);
        }
    }
}

function openResetPinModal(standId, standName) {
    document.getElementById('modal-title').innerText = `Réinitialiser PIN pour ${standName}`;
    document.getElementById('modal-body').innerHTML = `<p>Nouveau PIN (6 chiffres):</p><input type="text" id="reset-pin-input" class="modal-input" maxlength="6">`;
    document.getElementById('modal-actions').innerHTML = `<button class="btn btn-secondary" onclick="closeModal()">Annuler</button><button class="btn btn-primary" onclick="submitResetPin('${standId}')">Réinitialiser</button>`;
    document.getElementById('modal-container').classList.remove('hidden');
}

async function submitResetPin(standId) {
    const pin = document.getElementById('reset-pin-input').value;
    try {
        await apiFetch(`/admin/stands/${standId}/pin`, { method: 'PUT', body: JSON.stringify({ pin }) });
        showMessage('PIN mis à jour !', 'success');
        closeModal();
    } catch (error) {
        showMessage(error.message);
    }
}

function openManageTeamModal(teamId, teamName, currentScore) {
    document.getElementById('modal-title').innerText = `Gérer l'équipe : ${teamName}`;
    const body = document.getElementById('modal-body');
    body.innerHTML = `<div class="team-management-modal"><div class="form-group"><p>Définir un nouveau score total</p><small>Remplace le score actuel (${currentScore}) par cette valeur.</small><input type="number" id="set-score-input" class="modal-input" placeholder="Ex: 500"></div><div class="form-group"><p>Ajuster le score</p><small>Ajoute ou retire des points. Crée un log "Admin".</small><div class="score-adjuster"><button id="adjust-minus" class="btn">-</button><span id="adjust-score-display" class="score-display" style="background-color:var(--team-color-${teamName})">0</span><button id="adjust-plus" class="btn">+</button></div></div></div>`;
    document.getElementById('modal-actions').innerHTML = `<button class="btn btn-secondary" onclick="closeModal()">Annuler</button><button class="btn btn-primary" onclick="submitManageTeam('${teamId}')">Valider</button>`;
    document.getElementById('modal-container').classList.remove('hidden');

    const display = document.getElementById('adjust-score-display');
    let adjustValue = 0;
    document.getElementById('adjust-plus').addEventListener('click', () => {
        adjustValue++;
        display.textContent = adjustValue;
    });
    document.getElementById('adjust-minus').addEventListener('click', () => {
        adjustValue--;
        display.textContent = adjustValue;
    });
}

async function submitManageTeam(teamId) {
    const scoreToSet = document.getElementById('set-score-input').value;
    const scoreToAdjust = document.getElementById('adjust-score-display').textContent;
    try {
        if (scoreToSet !== '') {
            await apiFetch(`/admin/teams/${teamId}/set`, { method: 'PUT', body: JSON.stringify({ score: parseInt(scoreToSet, 10) }) });
            showMessage('Score total défini !', 'success');
        } else if (parseInt(scoreToAdjust, 10) !== 0) {
            await apiFetch(`/admin/teams/${teamId}/adjust`, { method: 'POST', body: JSON.stringify({ points: parseInt(scoreToAdjust, 10) }) });
            showMessage('Score ajusté !', 'success');
        } else {
            return;
        }
        closeModal();
        renderTeams();
        if (state.currentView === 'logs') {
            renderLogs();
        }
    } catch (error) {
        showMessage(error.message);
    }
}

// --- Authentification & Initialisation ---

const login = async (e) => {
    e.preventDefault();
    const password = document.getElementById('admin-password').value;
    try {
        const response = await fetch(`${API_URL}/auth/admin`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) });
        if (!response.ok) throw new Error('Mot de passe incorrect.');
        const { accessToken } = await response.json();
        state.token = accessToken;
        sessionStorage.setItem('jwt_admin', accessToken);
        document.getElementById('login-screen').classList.add('hidden');
        document.getElementById('dashboard-screen').classList.remove('hidden');
        render();
    } catch (error) {
        showMessage(error.message);
    }
};

const logout = () => {
    state.token = null;
    sessionStorage.removeItem('jwt_admin');
    document.getElementById('dashboard-screen').classList.add('hidden');
    document.getElementById('login-screen').classList.remove('hidden');
};

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('admin-login-form').addEventListener('submit', login);
    document.getElementById('logout-button').addEventListener('click', logout);

    document.querySelectorAll('.sidebar nav button').forEach(button => {
        button.addEventListener('click', (e) => {
            state.currentView = e.target.dataset.view;
            render();
        });
    });

    const existingToken = sessionStorage.getItem('jwt_admin');
    if (existingToken) {
        state.token = existingToken;
        document.getElementById('login-screen').classList.add('hidden');
        document.getElementById('dashboard-screen').classList.remove('hidden');
        render();
    }
});

// Exposer les fonctions de modal à la portée globale pour les onclick
window.openEditLogModal = openEditLogModal;
window.submitEditLog = submitEditLog;
window.deleteLog = deleteLog;
window.openCreateStandModal = openCreateStandModal;
window.submitCreateStand = submitCreateStand;
window.toggleStand = toggleStand;
window.openResetPinModal = openResetPinModal;
window.submitResetPin = submitResetPin;
window.openManageTeamModal = openManageTeamModal;
window.submitManageTeam = submitManageTeam;
window.closeModal = closeModal;