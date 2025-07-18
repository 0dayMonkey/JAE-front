// Remplacez par l'URL de votre API backend
const API_URL = 'http://miaou.vps.webdock.cloud:3000/api';

document.addEventListener('DOMContentLoaded', () => {
    const leaderboardBody = document.getElementById('leaderboard-body');

    const fetchScores = async () => {
        try {
            const response = await fetch(`${API_URL}/scores`);
            if (!response.ok) throw new Error('Network response was not ok');
            const teams = await response.json();

            leaderboardBody.innerHTML = ''; // Vider le tableau
            
            teams.forEach((team, index) => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${index + 1}</td>
                    <td class="team-${team.name}">${team.name}</td>
                    <td>${team.score}</td>
                `;
                leaderboardBody.appendChild(row);
            });
        } catch (error) {
            leaderboardBody.innerHTML = '<tr><td colspan="3">Erreur de chargement des scores.</td></tr>';
            console.error('Fetch error:', error);
        }
    };

    // Charger les scores immédiatement et rafraîchir toutes les 10 secondes
    fetchScores();
    setInterval(fetchScores, 10000);
});