const API_URL = 'https://miaou.vps.webdock.cloud/api';

document.addEventListener('DOMContentLoaded', () => {
    const leaderboardContainer = document.getElementById('leaderboard-container');

    const fetchScores = async () => {
        try {
            const response = await fetch(`${API_URL}/scores`);
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            const teams = await response.json();

            leaderboardContainer.innerHTML = '';
            
            if (teams.length === 0) {
                leaderboardContainer.innerHTML = '<p>Les scores ne sont pas encore disponibles.</p>';
                return;
            }

            teams.forEach((team, index) => {
                const card = document.createElement('div');
                card.className = 'leaderboard-card';

                card.innerHTML = `
                    <div class="card-rank">#${index + 1}</div>
                    <h3 class="card-team-name team-${team.name}">${team.name}</h3>
                    <div class="card-score">${team.score}</div>
                `;
                leaderboardContainer.appendChild(card);
            });
        } catch (error) {
            leaderboardContainer.innerHTML = '<p>Erreur de chargement des scores.</p>';
        }
    };

    fetchScores();
    setInterval(fetchScores, 10000);
});