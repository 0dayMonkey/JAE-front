const API_URL = 'https://miaou.vps.webdock.cloud/api';

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const scoreSection = document.getElementById('score-section');
    const scoreForm = document.getElementById('score-form');
    const messageDiv = document.getElementById('message');
    const standNameSelect = document.getElementById('stand-name');
    const teamSelect = document.getElementById('team-select');
    const welcomeStand = document.getElementById('welcome-stand');

    const initData = async () => {
        try {
            const response = await fetch(`${API_URL}/init-data`);
            if (!response.ok) {
                throw new Error('Could not fetch initial data.');
            }
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

            if (!response.ok) {
                throw new Error(await response.text());
            }
            
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

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.message);
            }

            const result = await response.json();
            showMessage(result.message, 'success');
            scoreForm.reset();
        } catch (error) {
            showMessage(`Erreur : ${error.message}`, 'error');
        }
    });

    function showMessage(msg, type = '') {
        messageDiv.textContent = msg;
        messageDiv.className = type;
    }
});