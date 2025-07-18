const API_URL = 'https://miaou.vps.webdock.cloud/api';

const state = {
    token: null,
    currentView: 'logs',
    logs: [],
    teams: [],
    stands: []
};

const showMessage = (message, type = 'error') => {
    const container = document.getElementById('message-container');
    if (!container) return;
    container.textContent = message;
    container.className = type;
    container.classList.remove('hidden');
    setTimeout(() => container.classList.add('hidden'), 4000);
};

const apiFetch = async (endpoint, options = {}) => {
    options.headers = {
        ...options.headers,
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${state.token}`
    };
    // Le endpoint ne commencera plus par /api
    const response = await fetch(`${API_URL}${endpoint}`, options);
    if (response.status === 401 || response.status === 403) {
        logout();
        throw new Error('Session expirée.');
    }
    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || 'Erreur API.');
    }
    // Gérer les réponses qui n'ont pas de corps JSON
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.indexOf("application/json") !== -1) {
        return response.json();
    } else {
        return response.text();
    }
};

const render = () => {
    document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
    document.getElementById(`view-${state.currentView}`).classList.remove('hidden');
    document.querySelectorAll('.sidebar nav button').forEach(b => b.classList.remove('active'));
    document.querySelector(`.sidebar nav button[data-view="${state.currentView}"]`).classList.add('active');

    switch (state.currentView) {
        case 'logs': renderLogs(); break;
        case 'teams': renderTeams(); break;
        case 'stands': renderStands(); break;
    }
};

const renderLogs = async () => {
    try {
        // CORRECTION : Appel sans /api
        state.logs = await apiFetch('/admin/logs');
        const view = document.getElementById('view-logs');
        let html = `<h2>Historique des Scores</h2><div class="table-container"><table><thead><tr><th>Timestamp</th><th>Équipe</th><th>Stand</th><th>Points</th><th>Actions</th></tr></thead><tbody>`;
        if (state.logs.length > 0) {
            state.logs.forEach(log => {
                html += `
                    <tr>
                        <td>${new Date(log.timestamp).toLocaleString('fr-FR')}</td>
                        <td>${log.teamName || 'N/A'}</td>
                        <td>${log.standName || 'N/A'}</td>
                        <td>${log.points}</td>
                        <td>
                            <button class="action-btn" onclick="openEditLogModal('${log.logId}', ${log.points})">✏️</button>
                            <button class="action-btn" onclick="deleteLog('${log.logId}')">🗑️</button>
                        </td>
                    </tr>
                `;
            });
        } else {
            html += `<tr><td colspan="5">Aucun log à afficher pour le moment.</td></tr>`;
        }
        html += `</tbody></table></div>`;
        view.innerHTML = html;
    } catch (error) { showMessage(error.message); }
};

const renderTeams = async () => {
    document.getElementById('view-teams').innerHTML = `<h2>Gestion des Équipes (prochainement)</h2>`;
};

const renderStands = async () => {
    document.getElementById('view-stands').innerHTML = `<h2>Gestion des Stands (prochainement)</h2>`;
};

function openEditLogModal(logId, currentPoints) {
    document.getElementById('modal-title').innerText = 'Modifier le Score';
    const body = document.getElementById('modal-body');
    body.innerHTML = `
        <p>Entrez la nouvelle valeur des points pour ce log.</p>
        <input type="number" id="edit-points-input" value="${currentPoints}" class="modal-input">
    `;
    const actions = document.getElementById('modal-actions');
    actions.innerHTML = `
        <button type="button" class="btn-secondary" onclick="closeModal()">Annuler</button>
        <button type="button" class="btn-primary" onclick="submitEditLog('${logId}')">Valider</button>
    `;
    document.getElementById('modal-container').classList.remove('hidden');
}

function closeModal() {
    document.getElementById('modal-container').classList.add('hidden');
}

async function submitEditLog(logId) {
    const newPointsInput = document.getElementById('edit-points-input');
    const newPoints = newPointsInput.value;
    try {
        // CORRECTION : Appel sans /api
        await apiFetch(`/scores/${logId}`, {
            method: 'PUT',
            body: JSON.stringify({ points: parseInt(newPoints, 10) })
        });
        showMessage('Score mis à jour !', 'success');
        closeModal();
        renderLogs();
    } catch (error) {
        showMessage(error.message);
    }
}

async function deleteLog(logId) {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce score ? Cette action recalculera le total de l\'équipe.')) {
        try {
            // CORRECTION : Appel sans /api
            await apiFetch(`/scores/${logId}`, { method: 'DELETE' });
            showMessage('Score supprimé !', 'success');
            renderLogs();
        } catch (error) {
            showMessage(error.message);
        }
    }
}

const login = async (e) => {
    e.preventDefault();
    const password = document.getElementById('admin-password').value;
    try {
        // CORRECTION : Appel sans /api
        const response = await fetch(`${API_URL}/auth/admin`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password })
        });
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

    if (sessionStorage.getItem('jwt_admin')) {
        state.token = sessionStorage.getItem('jwt_admin');
        document.getElementById('login-screen').classList.add('hidden');
        document.getElementById('dashboard-screen').classList.remove('hidden');
        render();
    }
});

window.openEditLogModal = openEditLogModal;
window.closeModal = closeModal;
window.submitEditLog = submitEditLog;
window.deleteLog = deleteLog;