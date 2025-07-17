const API_URL = 'http://your-backend-vps-ip:3000/api'; // Mettez l'IP de votre VPS ici

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('admin-login-form');
    const dashboard = document.getElementById('admin-dashboard');
    const logTableBody = document.getElementById('log-table-body');
    const messageDiv = document.getElementById('message');
    const logoutButton = document.getElementById('logout-button');

    // --- LOGIQUE DE CONNEXION ---
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const password = document.getElementById('admin-password').value;

        try {
            const response = await fetch(`${API_URL}/auth/admin`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password })
            });

            if (!response.ok) throw new Error('Mot de passe incorrect.');

            const { accessToken } = await response.json();
            sessionStorage.setItem('jwt_admin', accessToken); // Stocker le token
            
            showDashboard();
        } catch (error) {
            showMessage(error.message, 'error');
        }
    });

    // --- LOGIQUE DU DASHBOARD ---
    const fetchLogs = async () => {
        const token = sessionStorage.getItem('jwt_admin');
        if (!token) {
            showLogin();
            return;
        }

        try {
            const response = await fetch(`${API_URL}/admin/logs`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.status === 401 || response.status === 403) {
                 // Si le token est invalide ou expiré
                sessionStorage.removeItem('jwt_admin');
                showLogin();
                throw new Error('Session expirée, veuillez vous reconnecter.');
            }
            if (!response.ok) throw new Error('Erreur réseau.');

            const logs = await response.json();
            
            logTableBody.innerHTML = ''; // Vider le tableau
            if (logs.length === 0) {
                logTableBody.innerHTML = '<tr><td colspan="4">Aucun score enregistré pour le moment.</td></tr>';
            } else {
                logs.forEach(log => {
                    const row = document.createElement('tr');
                    const formattedDate = new Date(log.timestamp).toLocaleString('fr-FR');
                    row.innerHTML = `
                        <td>${formattedDate}</td>
                        <td class="team-${log.teamName}">${log.teamName}</td>
                        <td>${log.standName}</td>
                        <td>${log.points}</td>
                    `;
                    logTableBody.appendChild(row);
                });
            }
        } catch (error) {
            showMessage(error.message, 'error');
        }
    };
    
    // --- GESTION DE L'AFFICHAGE ET DE LA SESSION ---
    function showDashboard() {
        loginForm.classList.add('hidden');
        dashboard.classList.remove('hidden');
        showMessage('');
        fetchLogs(); // Charger les données dès que le dashboard est affiché
    }

    function showLogin() {
        dashboard.classList.add('hidden');
        loginForm.classList.remove('hidden');
        loginForm.reset();
    }
    
    logoutButton.addEventListener('click', () => {
        sessionStorage.removeItem('jwt_admin');
        showLogin();
        showMessage('Vous avez été déconnecté.', 'success');
    });

    function showMessage(msg, type = '') {
        messageDiv.textContent = msg;
        messageDiv.className = type;
    }
    
    // Au chargement de la page, vérifier si l'utilisateur est déjà connecté
    if (sessionStorage.getItem('jwt_admin')) {
        showDashboard();
    }
});