const API_URL = 'http://your-backend-vps-ip:3000/api';

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const scoreSection = document.getElementById('score-section');
    const scoreForm = document.getElementById('score-form');
    const messageDiv = document.getElementById('message');
    const standNameSelect = document.getElementById('stand-name');
    const teamSelect = document.getElementById('team-select');
    const welcomeStand = document.getElementById('welcome-stand');

    // Charger les équipes et les stands pour les menus déroulants
    const initData = async () => {
        try {
            const response = await fetch(`${API_URL}/init-data`);
            const data = await response.json();
            
            data.stands.forEach(stand => {
                const option = new Option(stand.name, stand.name);
                standNameSelect.add(option);
            });

            data.teams.forEach(team => {
                const option = new Option(team.name, team.id);
                teamSelect.add(option);
            });
        } catch (error) {
            showMessage('Erreur de chargement des données initiales.', 'error');
        }
    };
    initData();


    // Gestion de la connexion
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const standName = standNameSelect.value;
        const pin = document.getElementById('pin').value;

        try {
            const response = await fetch(`${API_URL}/auth/stand`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ standName, pin })
            });

            if (!response.ok) throw new Error(await response.text());
            
            const { accessToken } = await response.json();
            sessionStorage.setItem('jwt', accessToken);
            
            loginForm.classList.add('hidden');
            scoreSection.classList.remove('hidden');
            welcomeStand.textContent = `Bienvenue au stand ${standName}`;
            showMessage('');
        } catch (error) {
            showMessage(`Erreur de connexion : ${error.message}`, 'error');
        }
    });

    // Gestion de l'ajout de score
    scoreForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const teamId = teamSelect.value;
        const points = parseInt(document.getElementById('points').value, 10);
        const token = sessionStorage.getItem('jwt');

        if (!token) {
            showMessage('Vous n\'êtes pas connecté.', 'error');
            return;
        }

        try {
            const response = await fetch(`${API_URL}/scores`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ teamId, points })
            });

            if (!response.ok) throw new Error(await response.json().then(e => e.message));

            const result = await response.json();
            showMessage(result.message, 'success');
            scoreForm.reset(); // Vider le formulaire
        } catch (error) {
            showMessage(`Erreur : ${error.message}`, 'error');
        }
    });

    function showMessage(msg, type = '') {
        messageDiv.textContent = msg;
        messageDiv.className = type; // 'success' ou 'error'
    }
});