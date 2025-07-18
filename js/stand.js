const API_URL = 'https://miaou.vps.webdock.cloud/api';

document.addEventListener('DOMContentLoaded', () => {
    const standSelectionSection = document.getElementById('stand-selection-section');
    const standButtonsContainer = document.getElementById('stand-buttons-container');
    const scoreSection = document.getElementById('score-section');
    const messageContainer = document.getElementById('message-container');
    const pinModal = document.getElementById('pin-modal');
    const pinForm = document.getElementById('pin-form');
    const pinInput = document.getElementById('pin-input');
    const cancelPinButton = document.getElementById('cancel-pin');
    const pinModalTitle = document.getElementById('pin-modal-title');
    const logoutButton = document.getElementById('logout-button');
    const teamsDisplayContainer = document.getElementById('teams-display-container');
    const welcomeStand = document.getElementById('welcome-stand');
    const teamSelectionSquares = document.getElementById('team-selection-squares');
    const btnMinus = document.getElementById('btn-minus');
    const btnPlus = document.getElementById('btn-plus');
    const pointsDisplay = document.getElementById('points-display');
    const submitScoreButton = document.getElementById('submit-score-button');

    let selectedStandName = null;
    let selectedTeamId = null;
    let pointsToAdd = 10;
    
    const showMessage = (message, type = 'error') => {
        messageContainer.textContent = message;
        messageContainer.className = type;
        messageContainer.classList.remove('hidden');
        setTimeout(() => {
            messageContainer.classList.add('hidden');
        }, 4000);
    };

    const fetchInitialData = async () => {
        try {
            const response = await fetch(`${API_URL}/init-data`);
            if (!response.ok) throw new Error('Erreur de chargement des données.');
            const data = await response.json();
            displayStands(data.stands);
            createTeamSquares(data.teams);
        } catch (error) {
            showMessage(error.message);
        }
    };

    const displayStands = (stands) => {
        standButtonsContainer.innerHTML = '';
        stands.forEach(stand => {
            const button = document.createElement('button');
            button.className = 'stand-button';
            button.textContent = stand.name;
            button.dataset.standName = stand.name;
            button.addEventListener('click', () => {
                selectedStandName = stand.name;
                pinModalTitle.textContent = `Stand: ${stand.name}`;
                pinModal.classList.remove('hidden');
                pinInput.focus();
            });
            standButtonsContainer.appendChild(button);
        });
    };
    
    const createTeamSquares = (teams) => {
        teamSelectionSquares.innerHTML = '';
        teams.forEach(team => {
            const square = document.createElement('div');
            square.className = 'team-square';
            square.dataset.teamId = team.id;
            square.dataset.teamName = team.name;
            square.style.backgroundColor = `var(--team-color-${team.name})`;
            square.title = team.name;
            
            square.addEventListener('click', () => {
                const currentSelected = document.querySelector('.team-square.selected');
                if (currentSelected) {
                    currentSelected.classList.remove('selected');
                }
                square.classList.add('selected');
                selectedTeamId = team.id;
            });
            teamSelectionSquares.appendChild(square);
        });
    };

    const updateTeamsDisplay = async () => {
        try {
            const response = await fetch(`${API_URL}/scores`);
            if (!response.ok) throw new Error('Impossible de rafraîchir les scores.');
            const teams = await response.json();
            
            teamsDisplayContainer.innerHTML = '';
            teams.forEach(team => {
                const card = document.createElement('div');
                card.className = 'team-score-card';
                card.innerHTML = `<div class="name">${team.name}</div><div class="score">${team.score} pts</div>`;
                teamsDisplayContainer.appendChild(card);
            });
        } catch (error) {
            showMessage(error.message);
        }
    };

    const handleLogin = async (event) => {
        event.preventDefault();
        const pin = pinInput.value;
        if (!selectedStandName || !pin) return;

        try {
            const response = await fetch(`${API_URL}/auth/stand`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ standName: selectedStandName, pin })
            });
            if (!response.ok) throw new Error('PIN incorrect.');

            const { accessToken } = await response.json();
            sessionStorage.setItem('jwt', accessToken);

            pinModal.classList.add('hidden');
            pinForm.reset();
            standSelectionSection.classList.add('hidden');
            scoreSection.classList.remove('hidden');
            welcomeStand.textContent = `Bienvenue, ${selectedStandName}`;
            
            await updateTeamsDisplay();
            showMessage('Connecté avec succès !', 'success');

        } catch (error) {
            showMessage(error.message);
            pinInput.value = '';
        }
    };

    const handleScoreSubmit = async () => {
        if (!selectedTeamId) {
            showMessage('Veuillez sélectionner une équipe.');
            return;
        }

        const token = sessionStorage.getItem('jwt');
        if (!token) {
            showMessage('Session expirée. Veuillez vous reconnecter.');
            handleLogout();
            return;
        }

        try {
            const response = await fetch(`${API_URL}/scores`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ teamId: selectedTeamId, points: pointsToAdd })
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.message || 'Erreur du serveur.');
            }
            
            showMessage('Score ajouté avec succès !', 'success');
            const currentSelected = document.querySelector('.team-square.selected');
            if (currentSelected) currentSelected.classList.remove('selected');
            selectedTeamId = null;
            await updateTeamsDisplay();

        } catch (error) {
            showMessage(`Erreur : ${error.message}`);
        }
    };
    
    const handleLogout = () => {
        sessionStorage.removeItem('jwt');
        selectedStandName = null;
        scoreSection.classList.add('hidden');
        standSelectionSection.classList.remove('hidden');
    };

    const updatePointsDisplay = () => {
        pointsDisplay.textContent = pointsToAdd;
    };
    
    btnPlus.addEventListener('click', () => {
        pointsToAdd += 1;
        updatePointsDisplay();
    });

    btnMinus.addEventListener('click', () => {
        if (pointsToAdd > 1) {
            pointsToAdd -= 1;
            updatePointsDisplay();
        }
    });

    pinForm.addEventListener('submit', handleLogin);
    submitScoreButton.addEventListener('click', handleScoreSubmit);
    cancelPinButton.addEventListener('click', () => pinModal.classList.add('hidden'));
    logoutButton.addEventListener('click', handleLogout);

    fetchInitialData();
    updatePointsDisplay();
});